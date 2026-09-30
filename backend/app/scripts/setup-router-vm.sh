#!/usr/bin/env bash
#
# setup-router-vm.sh  (run on LAPTOP 2, where VirtualBox hosts the lab)
#
# Creates the ROUTER VM for the PS 26145 unidirectional-monitoring layout.
# The router forwards traffic between a WAN net and a LAN net (NAT/masq), and
# the UniShield enclave watches ONLY the one-way copy of that crossing link:
#
#   attacker(wan) ──► ROUTER ◄── host(lan)      crossed link = the monitored feed
#                        │  ┌───────────────────────────────┐
#                        └──┤ (a) packet mirror: iptables TEE │→ monitor/tap box
#                           ├ (b) flow export: softflowd NetFlow→ backend :2055
#                           └───────────────────────────────┘
#
# The enclave has no route back into wan/lan/mirror (data-diode discipline).
# The separate 'attacker' + 'monitor' VMs are created by setup-vm-lab.sh.
#
# In-VM bootstrap (paste on the router after the OS boots):
#   sudo ip addr add 10.0.1.1/24 dev eth0     # wan
#   sudo ip addr add 10.0.2.1/24 dev eth1     # lan
#   sudo ip addr add 192.168.10.1/24 dev eth2 # mirror (one-way lane)
#   sudo sysctl -w net.ipv4.ip_forward=1
#   sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
#   # (a) packet mirror → monitor at 192.168.10.2 (enclave receiver):
#   sudo iptables -t mangle -A PREROUTING -i eth0 -j TEE --gateway 192.168.10.2
#   sudo iptables -t mangle -A PREROUTING -i eth1 -j TEE --gateway 192.168.10.2
#   # (b) flow export → backend enclave (tailscale IP of Laptop 1), NetFlow v5:
#   sudo apt install softflowd
#   sudo softflowd -i eth0 -v 5 -n 100.101.1.1:2055 &
#   sudo softflowd -i eth1 -v 5 -n 100.101.1.1:2055 &
#
# Usage:
#   ./scripts/setup-router-vm.sh [router]       # create the router VM
#
set -euo pipefail

VM="${1:-router}"
OSTYPE="${OSTYPE_:-Ubuntu_64}"
DISK_GB="${DISK_GB:-10}"
MEM_MB="${MEM_MB:-1024}"
CPU="${CPU:-1}"

WAN="${WAN:-wan}"
LAN="${LAN:-lan}"
MIRROR="${MIRROR:-mirror}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }

main() {
  need VBoxManage
  if VBoxManage showvminfo "$VM" >/dev/null 2>&1; then
    echo "VM '$VM' already exists; skipping creation."
    return 0
  fi
  echo "== Creating router VM: $VM =="
  VBoxManage createvm --name "$VM" --ostype "$OSTYPE" --register
  VBoxManage modifyvm "$VM" \
    --memory "$MEM_MB" --cpus "$CPU" \
    --nic1 intnet --intnet1 "$WAN"    --nicpromisc1 allow-all \
    --nic2 intnet --intnet2 "$LAN"    --nicpromisc2 allow-all \
    --nic3 intnet --intnet3 "$MIRROR" --nicpromisc3 allow-all \
    --nic4 nat   --cableconnected4 on

  local vdi="$HOME/VirtualBox VMs/$VM/$VM.vdi"
  VBoxManage createmedium disk --filename "$vdi" --size "$((DISK_GB * 1024))" --format VDI
  VBoxManage storagectl "$VM" --name SATA --add sata --controller IntelAhci
  VBoxManage storageattach "$VM" --storagectl SATA --port 0 --device 0 \
    --type hdd --medium "$vdi"

  echo
  echo "Attach the OS ISO to '$VM' SATA, install, then run the in-VM bootstrap"
  echo "block printed at the top of this script. Attacker + monitor VMs:"
  echo "  ./scripts/setup-vm-lab.sh       # builds uni-shield + attacker"
}

main "$@"