---
slug: shani-os-printing-and-scanning
title: 'Printing and Scanning on Shani OS — CUPS, Driverless Printing, and SANE'
date: '2026-04-24'
tag: 'Guide'
excerpt: 'How printing and scanning work on Shani OS — driverless IPP-over-USB and network discovery, CUPS configuration, manufacturer-specific drivers for HP, Epson, Brother, Canon, and scanner setup via SANE and sane-airscan.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '6 min'
series: 'Shani OS Guides'
---

Shani OS ships a comprehensive printing and scanning stack that handles most modern hardware without any driver installation. The CUPS print system, `ipp-usb` for driverless USB printing, `sane-airscan` for driverless network scanning, and manufacturer-specific drivers for HP, Epson, Brother, and Canon are all pre-installed.

Printer and scanner configuration persists across every OS update and rollback via bind mounts from `@data` — you set up your printer once and it stays set up forever.

Full reference: [docs.shani.dev — Printing & Scanning](https://docs.shani.dev/doc/troubleshooting).

---

## Driverless Printing (Most Modern Printers)

Any printer manufactured after roughly 2016 that supports IPP Everywhere (AirPrint, Mopria) works without any driver installation. Plug in via USB or connect to your network and CUPS discovers it automatically.

### USB Printers

`ipp-usb` is pre-installed and enabled. When you plug in a modern USB printer, `ipp-usb` creates a network-accessible IPP endpoint for it. CUPS then sees the printer as a network printer.

```bash
# Check if ipp-usb detected your printer
systemctl status ipp-usb
journalctl -u ipp-usb -n 20

# List detected ipp-usb devices
ippusbxd --list   # if available
ls /dev/usb/
```

Most USB printers appear automatically in GNOME Printers or KDE Print Manager.

### Network Printers

Network printers (Wi-Fi and Ethernet) are discovered via Avahi (mDNS/DNS-SD), which is active from first boot. Printers on the same network appear automatically in GNOME Printers (Settings → Printers) and KDE System Settings → Printers.

```bash
# Manually discover network printers
avahi-browse -r _ipp._tcp
avahi-browse -r _ipps._tcp    # secure IPP

# Add a printer by its network address (when auto-discovery fails)
lpadmin -p "MyPrinter" -E -v "ipp://192.168.1.100/ipp/print" -m everywhere
```

### Adding Printers via GUI

**GNOME:** Settings → Printers → Unlock → click `+`

**KDE:** System Settings → Printers → Add Printer

Both interfaces show discovered printers. Select one, confirm the settings, and print a test page.

---

## Manufacturer-Specific Drivers

For older printers or printers that need a proprietary driver, the following are pre-installed:

### HP Printers (hplip-minimal)

```bash
# HP printer setup tool
hp-setup

# Check HP device status
hp-check

# HP print and scan tool
hp-toolbox

# List detected HP devices
hp-info
```

For full HP functionality including ink levels and alignment, `hp-setup` handles most HP LaserJet and DeskJet models.

### Epson Printers (epson-inkjet-printer-escpr2)

Epson's ESC/P-R2 driver covers most modern Epson inkjet printers. The driver is pre-installed — connect your printer and it should be detected.

```bash
# Check if Epson driver is loaded
lpinfo -m | grep -i epson
```

### Brother Printers (brlaser)

```bash
# Check available Brother models
lpinfo -m | grep -i brother

# Add a Brother printer with the brlaser driver
lpadmin -p "BrotherHL" -E -v "usb://Brother/..." -m brother/brhl1110.ppd
```

### Canon Printers (cnijfilter2)

```bash
# List available Canon models
lpinfo -m | grep -i canon
```

### Generic PCL Printers

`foo2zjs-nightly` and `splix` cover many generic PCL and SPL printers. If your printer is not covered by a specific driver, try:

```bash
lpinfo -m | grep -i "postscript\|pcl\|generic"
```

---

## CUPS Web Interface

CUPS provides a web administration interface at `http://localhost:631`:

```bash
# Ensure CUPS is running
systemctl status cups.socket

# Open the web interface
xdg-open http://localhost:631
```

From the CUPS web interface you can add printers, manage print queues, view job history, and configure printer options.

---

## Command-Line Printing

```bash
# Print a file
lpr document.pdf
lpr -P "PrinterName" document.pdf

# Print with options
lpr -o sides=two-sided-long-edge document.pdf   # duplex
lpr -o media=A4 document.pdf                    # paper size
lpr -o number-up=2 document.pdf                 # 2 pages per sheet

# List available printers
lpstat -p

# Check print queue
lpq
lpq -P "PrinterName"

# Cancel a job
lprm <job-id>
lprm -P "PrinterName" -

# List available printer options
lpoptions -p "PrinterName" -l
```

---

## Scanning with SANE

SANE (Scanner Access Now Easy) is the Linux scanning backend. `sane-airscan` extends it with support for network scanners that use IPP Scan (AirScan) — most modern multi-function printers.

### Discovering Scanners

```bash
# List all detected scanners
scanimage -L

# List network scanners discovered by sane-airscan
sudo journalctl -u saned -n 20
```

**GNOME:** Simple Scan is pre-installed. Open it from your application launcher — it detects available scanners automatically.

**KDE:** Skanlite is pre-installed. Open it from your application launcher.

### Command-Line Scanning

```bash
# Scan to a file (auto-detects the first available scanner)
scanimage > scan.pnm

# Scan to PNG
scanimage --format=png > scan.png

# Scan at 300 DPI
scanimage --resolution=300 > scan.pnm

# Scan a specific area (in mm)
scanimage --scan-area="A4" > scan.pnm

# List available scanner options
scanimage --help -d "SCANNER_DEVICE_NAME"
```

---

## Network Scanning (sane-airscan)

`sane-airscan` discovers and uses network scanners automatically, no configuration required for most devices. If auto-discovery does not work:

```bash
# Create manual configuration
sudo nano /etc/sane.d/airscan.conf

# Add your scanner manually
[devices]
"My Scanner" = http://192.168.1.100:9095/
```

---

## Troubleshooting Printing

### Printer Appears Offline

```bash
# Check CUPS status
lpstat -r

# Restart CUPS
sudo systemctl restart cups

# Enable a printer that shows as disabled
sudo cupsenable "PrinterName"
sudo cupsaccept "PrinterName"
```

### USB Printer Not Detected

```bash
# Check if the kernel sees the printer
lsusb | grep -i "printer\|hp\|epson\|brother\|canon"

# Check ipp-usb
systemctl restart ipp-usb
journalctl -u ipp-usb -n 30

# Check CUPS permissions
ls -la /dev/usb/
```

### Scanner Not Detected

```bash
# Check scanner permissions
lsusb | grep -i "scanner\|hp\|epson"

# Try with sudo to rule out permissions
sudo scanimage -L

# If found with sudo but not as user, add yourself to the scanner group
# (Shani OS does this automatically for new users, but check)
groups | grep scanner
```

Full troubleshooting reference: [docs.shani.dev — Printing & Scanning](https://docs.shani.dev/doc/troubleshooting).

---

## Persistence Across Updates

CUPS printer configuration lives in `/var/lib/cups/` and `/etc/cups/`. Both persist via Shani OS's bind mount system:
- `/var/lib/cups` is bind-mounted from `/data/varlib/cups`
- `/etc/cups` changes persist via the OverlayFS

You configure your printer once. OS updates and rollbacks leave your printer configuration completely untouched.

---

## Resources

- [docs.shani.dev — Printing & Scanning](https://docs.shani.dev/doc/troubleshooting) — troubleshooting reference
- [CUPS documentation](https://www.cups.org/documentation.html)
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
