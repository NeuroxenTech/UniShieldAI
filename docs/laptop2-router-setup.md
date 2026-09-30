# Laptop 2 — Router-Level Lab Setup (PS 26145)

Sets up the lab that monitors a **router/gateway's** unidirectional traffic
(Router between WAN and LAN), matching Problem Statement **26145** ("AI-Based
Detection of Cyber Threats in Unidirectional IP Traffic"). The UniShield
enclave is **passive and read-only**: it receives a one-way copy of the
router's crossing traffic — no return path into the lab.

```
Laptop 1 = ENCLAVE (analytics only, no path back)
  backend :8000  ·  frontend :5173  ·  NetFlow listener UDP :2055

Laptop 2 = the LAB (VirtualBox)
  attacker(wan) ──► ROUTER ◄── target(lan)
                       │  ┌────────────────────────────────────────────┐
                       │  │ (a) packet mirror: iptables TEE → sensor VM│  pcap path
                       │  │ (b) flow export: softflowd → L1 :2055      │  flow path
                       └──└────────────────────────────────────────────┘
```

Two independent input paths, both feeding the same engine:
- **(a) Packet mirror (pcap):** the router TEEs a byte copy of wan+lan onto a
  `mirror` LAN, the `uni-shield` sensor VM sniffs that NIC and POSTs
  flows/records to the backend. Gives DNS/tls detail (DNS tunneling,
  Slowloris etc.).
- **(b) Flow export (NetFlow/IPFIX/sFlow):** `softflowd` on the router sends
  UDP exports straight to the enclave's `:2055` listener. Covers floods,
  scanning, C2, exfiltration from pure flow metadata.

---

## 0. Prereqs

On **Laptop 2**:
1. VirtualBox >= 7 installed.
2. OS ISOs ready (Ubuntu 22.04/24.04 for `router`; Ubuntu/Kali for
   `attacker`; Ubuntu for `uni-shield`).
3. Repo present: `git clone` of UniShieldAI (so you have the scripts).
4. Laptop 1's Tailscale IP (mesh): `100.126.22.58` (saran-pc). Get the live
   value: on Laptop 1 run `tailscale ip | head -1`. Referred to below as
   `<L1-TS-IP>`.

On **Laptop 1** (enclave):
```sh
cd backend && PYTHONPATH=$PWD /home/saranraj/.venvs/unishield/bin/python -u app/main.py
```
Confirm the listener is up:
```sh
curl -s localhost:8000/api/v1/metrics/engine   # flow_export.udp_port == 2055
```

---

## 1. Create the lab VMs (Laptop 2)

| VM | NIC1 | NIC2 | NIC3 | NIC4 |
|----|------|------|------|------|
| `router`    | `wan`    | `lan`    | `mirror` | nat (installs only) |
| `attacker`  | `wan`    | nat      | —        | — |
| `target`    | `lan`    | nat      | —        | — |
| `uni-shield`| `mirror` | nat      | —        | — (sensor keeps NIC2 config) |

```bash
# LAN + WAN + mirror nets; NAT for package installs.
# router VM (3 internal nets wan/lan/mirror + nat, promiscuous allow-all):
cd UniShieldAI
./backend/app/scripts/setup-router-vm.sh router

# attacker (on wan), target (on lan), sensor (on mirror);
# the existing 2-VM script creates uni-shield + attacker on lablan/tapbridge —
# for the router lab just re-point their NICs (VirtualBox GUI) to wan/mirror:
./backend/app/scripts/setup-vm-lab.sh        # creates uni-shield + attacker
```

> If you already have the `uni-shield`/`attacker` VMs, edit their Network
> settings in VirtualBox:
> - attacker: NIC1 `wan`, NIC2 nat.
> - uni-shield: NIC1 `mirror`, NIC2 nat (sniffs mirror).

Attach ISOs to each VM's SATA controller (VirtualBox GUI) and install the OS.

---

## 2. Router VM — in-OS bootstrap

Ubuntu netplan (`/etc/netplan/99-router.yaml`):

```yaml
network:
  version: 2
  ethernets:
    eth0: {dhcp4: no, addresses: [10.0.1.1/24]}      # wan
    eth1: {dhcp4: no, addresses: [10.0.2.1/24]}      # lan
    eth2: {dhcp4: no, addresses: [192.168.10.1/24]}  # mirror (one-way lane)
    eth3: {dhcp4: true}                              # nat (installs only)
```

```bash
sudo netplan apply
# the router actually forwards:
sudo sysctl -w net.ipv4.ip_forward=1
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.d/99-router.conf
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# (a) packet mirror -> sensor on the mirror lane (192.168.10.2):
sudo iptables -t mangle -A PREROUTING -i eth0 -j TEE --gateway 192.168.10.2
sudo iptables -t mangle -A PREROUTING -i eth1 -j TEE --gateway 192.168.10.2

# (b) flow export -> enclave NetFlow listener (Laptop 1), NetFlow v5:
sudo apt install -y softflowd
sudo softflowd -i eth0 -v 5 -n <L1-TS-IP>:2055 &
sudo softflowd -i eth1 -v 5 -n <L1-TS-IP>:2055 &
```

Expected: attacking traffic crossing wan⇄lan is mirrored onto `mirror` and
exported as NetFlow to the enclave. The mirror has **no route back** into
wan/lan — unidirectional by design.

---

## 3. Sensor VM (uni-shield) — mirrors the router link into the enclave

Static IP on the mirror NIC so it receives the TEE'd copy:
`/etc/netplan/99-sensor.yaml`:

```yaml
network:
  version: 2
  ethernets:
    enp0s3: {dhcp4: no, addresses: [192.168.10.2/24]} # mirror lane
    enp0s8: {dhcp4: true}                            # nat
```

```bash
sudo netplan apply
# one-time tools:
pip install scapy requests
python3 -m http.server 80 &     # slowloris target listener (on target VM, see §4)
nc -lk 4444 &                   # C2 listener (on target VM, see §4)

# stream mirrored packets -> backend (Laptop 1 over Tailscale):
python3 /tmp/run_sensor_standalone.py \
  -i enp0s3 -u http://<L1-TS-IP>:8000 --local-ip 10.0.2.10
```

> `--local-ip` is the LAN host behind the router (the traffic's true dest), so
> inbound-only filtering keeps the mirror feed clean.

---

## 4. Attacker (wan) + target (lan) VMs

`target` (behind the router on `10.0.2.0/24`) runs the servers the attacks hit:
```bash
sudo apt install -y hping3 netcat
python3 -m http.server 80 &     # slowloris needs a real :80 listener
nc -lk 4444 &                   # C2 beacon receiver
```

`attacker` (on wan `10.0.1.0/24`) runs the attack suite against the lan host:
```bash
cd UniShieldAI
./backend/scripts/attack-suite.sh 10.0.2.10
```
(or point it at `10.0.2.10` = the lan server / `10.0.2.20` = target vm)

Each numbered scenario must show up in the enclave within the streaming window
(floods ~2s, C2 after 3 samples).

---

## 5. Verify on the enclave (Laptop 1)

```sh
# ingest accounting — expect 0 rejected:
curl -s localhost:8000/api/v1/metrics/engine | python3 -m json.tool | grep -A4 flow_export

# alerts fired by router exports:
curl -s localhost:8000/api/v1/alerts | python3 -m json.tool | grep -E 'threat_type|risk_score'

# phone alerts (Telegram to +917826809233, +919500287715, +919597940143):
grep "sendMessage" /tmp/opencode/backend.log | tail
```

**No-VM smoke test** (proves the enclave flow path without touching Laptop 2),
run on Laptop 1:
```sh
cd backend
PYTHONPATH=$PWD python scripts/router_export_sim.py --scenario mix --duration 12 --seed 777
# -> flow_export: received 3407 / parsed 5375 / rejected 0; 17 alerts
```

---

## 6. Quick reference

| What | Where |
|------|-------|
| Router VM creator | `backend/app/scripts/setup-router-vm.sh` |
| Old 2-VM lab creator | `backend/app/scripts/setup-vm-lab.sh` |
| NetFlow/v9/IPFIX/sFlow parsers + `:2055` listener | `backend/app/ingestion/netflow.py`, `flow_export_listener.py` |
| Router export simulator (no VM) | `backend/scripts/router_export_sim.py` |
| Sensor (packet mirror path) | `backend/scripts/run_sensor_standalone.py`, `backend/app/scripts/run-sensor.sh` |
| Attack suite | `backend/scripts/attack-suite.sh` |
| Full design doc | `docs/implementation-plan-router-monitor.md` |