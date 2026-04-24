# Ubuntu 24.04 LTS Migration Guide — Dell Precision 3551 + FIDELIO

---

## Section 1 — Migrating from Windows to Ubuntu 24.04 LTS

### Step 0 — Back Up Everything First

Before touching anything, preserve what matters:

- **FIDELIO repo** — already on git. Push any unpushed commits now.
- **`.env` files** — these are gitignored. Copy them manually:
  - `packages/web/.env`
  - `packages/backend/.env` (if it exists)
  - Any `.env.local` files
- **PostgreSQL data** — dump your dev database:
  ```bash
  pg_dump fidelio_dev > fidelio_dev_backup.sql
  ```
- **SSH keys** — copy `~/.ssh/` to a USB drive
- **GPG keys** (if any) — `gpg --export-secret-keys > my_keys.gpg`
- **Browser bookmarks / passwords** — export from Edge/Chrome before wipe
- **Any files on Desktop, Documents, Downloads** — copy to USB

---

### Step 1 — Create the Ubuntu 24.04 LTS USB Installer

1. Download the ISO from the official Ubuntu site:
   `https://ubuntu.com/download/desktop` → Ubuntu 24.04.x LTS
2. Download **Rufus** (Windows tool) → `https://rufus.ie`
3. Insert a USB drive (8GB minimum, 16GB recommended)
4. Open Rufus:
   - Device: your USB
   - Boot selection: select the Ubuntu ISO
   - Partition scheme: **GPT** (your Dell Precision uses UEFI)
   - File system: FAT32
   - Click **START** → write in ISO Image mode when prompted
5. Wait until complete. Do not remove USB during writing.

---

### Step 2 — BIOS Setup on Dell Precision 3551

1. Reboot → press **F2** repeatedly to enter BIOS Setup
2. Make these changes:
   - **Secure Boot** → Disabled (required for Nvidia drivers)
   - **Boot Mode** → UEFI
   - **Boot Sequence** → move USB to the top
   - **SATA Operation** → AHCI (should already be set)
3. Save and Exit (F10)

---

### Step 3 — Install Ubuntu 24.04 LTS

1. Boot from USB → select **"Try or Install Ubuntu"**
2. Select language → **English**
3. Installation type → **"Erase disk and install Ubuntu"** (full wipe)
4. On the "Applications" screen → select **"Default selection"**
5. Check **"Install third-party software for graphics and Wi-Fi hardware"** — this auto-installs the Nvidia driver
6. Set your timezone → **Central Time (Americas/Tegucigalpa)**
7. Create your user account → use a strong password (this doubles as sudo password)
8. Let it install → reboot when prompted → remove USB when it asks

---

### Step 4 — First Boot & System Update

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ubuntu-restricted-extras
sudo reboot
```

---

### Step 5 — Nvidia Quadro P620 Driver

Ubuntu may have already installed a driver via the third-party option. Verify and upgrade:

```bash
# Check what's installed
nvidia-smi

# If not working, install via driver manager
sudo ubuntu-drivers install

# Or manually target the recommended driver
sudo apt install -y nvidia-driver-550
sudo reboot
```

After reboot, confirm:
```bash
nvidia-smi
# Should show: Quadro P620, driver version, CUDA version
```

For performance:
```bash
# Set Nvidia to performance mode permanently
sudo nvidia-settings --assign "[gpu:0]/GpuPowerMizerMode=1"
```

---

### Step 6 — TrackPoint (The Circle Between G and H)

This is a **PS/2 pointing stick** — it works out of the box on Ubuntu. No driver needed.

To tune sensitivity and enable middle-click scrolling:

```bash
# Install xinput tools
sudo apt install -y xinput

# Find the TrackPoint device ID
xinput list | grep -i "TrackPoint\|pointer"

# Set speed (adjust 0.5 to taste, range -1 to 1)
xinput set-prop "TPPS/2 IBM TrackPoint" "libinput Accel Speed" 0.5
```

To make it permanent, create:
```bash
sudo nano /etc/X11/xorg.conf.d/20-trackpoint.conf
```
```
Section "InputClass"
    Identifier "TrackPoint"
    MatchProduct "TrackPoint"
    Driver "libinput"
    Option "AccelSpeed" "0.5"
EndSection
```

The **extra buttons above the touchpad** (left/right click + middle) are part of the same TrackPoint device and work natively.

---

### Step 7 — Fingerprint Reader + Smart Card (Dell ControlVault)

Your Dell Precision 3551 uses a **Dell ControlVault w/ Fingerprint Touch Sensor** — a Broadcom chip that bundles fingerprint, smart card, and NFC into a single USB device. This is different from a standalone Goodix sensor.

#### 7a — Get your exact Hardware ID (do this before wiping Windows)

In PowerShell:
```powershell
Get-PnpDevice | Where-Object {$_.FriendlyName -like "*ControlVault*"} | Get-PnpDeviceProperty -KeyName DEVPKEY_Device_HardwareIds | Select-Object -ExpandProperty Data
```
Save the output (e.g. `USB\VID_0A5C&PID_5843`) — you'll need it to confirm driver compatibility on Ubuntu.

#### 7b — Ubuntu setup

```bash
# Install fprintd and PAM integration
sudo apt install -y fprintd libpam-fprintd

# Install ControlVault / Broadcom smart card support
sudo apt install -y pcscd pcsc-tools libccid

# Start smart card daemon (ControlVault depends on it)
sudo systemctl enable pcscd
sudo systemctl start pcscd

# Enable fingerprint for sudo and login
sudo pam-auth-update
# In the menu, enable "Fingerprint authentication"

# Enroll your fingerprint
fprintd-enroll

# Verify enrollment
fprintd-verify
```

#### 7c — ControlVault fingerprint driver (your exact device: Broadcom BCM5880)

Your Hardware IDs confirmed:
- `USB\VID_0A5C&PID_5841` → **Broadcom BCM5880 fingerprint sensor**
- `USB\VID_0A5C&PID_5843` → ControlVault smart card interface

The BCM5880 requires the Dell OEM binary driver (`libfprint-2-tod1-broadcom`). This is **not** in the default Ubuntu repos — download it from Dell Support before or after the wipe.

```bash
# Step 1 — install libfprint-tod support layer
sudo apt install -y libfprint-2-2 libfprint-2-tod1

# Step 2 — download the Dell OEM blob
# Go to: https://www.dell.com/support/home/en-us/product-support/product/precision-15-3551-laptop/drivers
# Search: "fingerprint" → download the Linux .deb package
# Filename will be similar to: libfprint-2-tod1-broadcom_5.12.018_amd64.deb

sudo dpkg -i libfprint-2-tod1-broadcom_*.deb
sudo systemctl restart fprintd

# Step 3 — verify the device is detected
fprintd-list $USER
# Should show: "Broadcom Corp. 5880" or similar

# Step 4 — enroll
fprintd-enroll
fprintd-verify
```

> **Note:** Smart card half (`PID_5843`) works natively via pcscd — no extra driver needed for that.

---

### Step 8 — NFC Reader

Your NFC capability is also part of the **Dell ControlVault** — same device, same USB connection. If pcscd is running (Step 7b), NFC smart card detection is already active.

```bash
sudo apt install -y pcscd pcsc-tools libpcsclite-dev libnfc-bin libnfc-dev

# Start the smart card daemon
sudo systemctl enable pcscd
sudo systemctl start pcscd

# Test NFC reader detection
pcsc_scan
```

For MerL1nk NFC support (when the time comes):
```bash
sudo apt install -y libnfc-dev
# nfc_reader.cpp already uses libnfc — same library, same API
```

---

### Step 9 — Webcam

Works out of the box via the `uvcvideo` kernel module.

Verify:
```bash
ls /dev/video*
# Should show /dev/video0 or similar

# Test with a quick viewer
sudo apt install -y cheese
cheese
```

---

### Step 10 — Sound & Sound Recording

Ubuntu 24.04 uses **PipeWire** (replaces PulseAudio) — Dell Precision audio works natively.

```bash
# Verify PipeWire is running
systemctl --user status pipewire

# Install audio tools
sudo apt install -y pavucontrol audacity

# pavucontrol = GUI mixer for input/output routing
# audacity = professional sound recorder/editor
```

For command-line recording:
```bash
sudo apt install -y ffmpeg
# Record audio:
ffmpeg -f pulse -i default output.mp3
```

---

### Step 11 — Keyboard Backlight

Dell Precision 3551 keyboard backlight is controlled via ACPI:

```bash
# Check if the backlight is exposed
ls /sys/class/leds/ | grep kbd

# Toggle / set brightness (0 = off, 1 = dim, 2 = bright)
echo 2 | sudo tee /sys/class/leds/dell::kbd_backlight/brightness
```

For persistent control with a GUI:
```bash
sudo apt install -y gnome-tweaks
# Settings → Keyboard → Backlight
```

To bind keyboard shortcuts to backlight toggle, use **GNOME Settings → Keyboard → Custom Shortcuts**.

---

### Step 12 — Performance Tuning (Squeeze the Juice)

```bash
# Install TLP for CPU/battery power management
sudo apt install -y tlp tlp-rdw
sudo systemctl enable tlp
sudo tlp start

# Install thermald for thermal management
sudo apt install -y thermald
sudo systemctl enable thermald

# Install CPU frequency tools
sudo apt install -y cpufrequtils
# Set to performance mode
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
sudo systemctl restart cpufrequtils

# Enable zRAM (compressed RAM swap — great for dev workloads)
sudo apt install -y zram-config
```

---

## Section 2 — FIDELIO Full Setup on Ubuntu 24.04 LTS

### Base System Dependencies

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  cmake \
  git \
  curl \
  wget \
  libcurl4-openssl-dev \
  libssl-dev \
  pkg-config \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release
```

---

### Node.js 20 LTS (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # should be v20.x.x
npm -v
```

---

### PostgreSQL 16

```bash
# Add official PostgreSQL apt repo
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16

# Start and enable
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create fidelio user and database
sudo -u postgres psql -c "CREATE USER fidelio WITH PASSWORD 'your_password_here';"
sudo -u postgres psql -c "CREATE DATABASE fidelio_dev OWNER fidelio;"

# Restore backup (from the dump you made in Step 0)
psql -U fidelio -d fidelio_dev < fidelio_dev_backup.sql
```

---

### Foundry (for Smart Contracts)

```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Verify
forge --version
cast --version
```

---

### FIDELIO Repo Setup

```bash
# Clone the repo
git clone https://github.com/thetrovadour/HNDA---FIDELIO.git
cd HNDA---FIDELIO

# Restore your .env files from the USB backup here
# packages/web/.env
# packages/backend/.env

# Update NEXT_PUBLIC_BACKEND_URL to localhost for local dev
# NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Install all dependencies
npm install

# Build MerL1nk C++ core
cd packages/merlink/core
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
ctest

# Return to root and run full test suite
cd ../../../../
npm test

# Start dev servers
npm run dev
```

---

### Optional Dev Tools

```bash
# Docker (for isolated test environments)
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker

# VS Code
sudo snap install --classic code

# Postman (API testing)
sudo snap install postman

# pgAdmin 4 (PostgreSQL GUI)
sudo apt install -y pgadmin4

# GitHub CLI
sudo apt install -y gh
gh auth login
```

---

## Section 3 — Ubuntu Perks for Your Dell Precision 3551

### Performance

| Perk | Detail |
|---|---|
| **No background Windows telemetry** | Windows Update, Defender, telemetry services consume RAM and disk I/O constantly. Ubuntu has none of that. Your 16GB RAM goes to FIDELIO. |
| **Native filesystem** | ext4 is faster than NTFS for read-heavy workloads like `npm install` and PostgreSQL. |
| **No WSL2 overhead** | WSL2 runs inside a Hyper-V VM. On native Ubuntu, Node, PostgreSQL, and the C++ core all run on bare metal. Builds will be measurably faster. |
| **Real network interface** | `eth0` has a fixed IP. No more dynamic WSL2 addresses breaking your `.env` on every reboot. |
| **`make -j$(nproc)`** | CMake can now use all physical cores for C++ compilation without Hyper-V CPU virtualization overhead. |

### Developer Quality of Life

| Perk | Detail |
|---|---|
| **inotify works properly** | Next.js and TypeScript hot reload rely on file system watchers. WSL2 has known inotify limitations. Native Ubuntu: instant hot reload. |
| **`apt` for everything** | `libcurl`, `libnfc`, `libpcsclite`, PostgreSQL — all installable in one command, no hunting for Windows DLLs. |
| **Native Docker** | No Docker Desktop license concerns, no VM network hops. Containers talk directly to your host network. |
| **SSH just works** | `~/.ssh/` is your SSH config. No WSL2 path translation, no Windows OpenSSH conflicts. |
| **cron and systemd** | Schedule reconciliation jobs, MerL1nk polling, and health checks as native systemd services — the same way they'll run in production. |

### Hardware Specific

| Perk | Detail |
|---|---|
| **Quadro P620 compute** | With the Nvidia driver installed, you get CUDA access. Not needed for FIDELIO now, but available for future ML tooling or local AI (Ollama/Qwen3 on aiControl). |
| **TrackPoint middle-click scroll** | Works natively on Linux — smoother than on Windows. |
| **Fingerprint sudo** | `fprintd` lets you authenticate `sudo` commands with your fingerprint instead of typing your password every time. |
| **NFC hardware ready** | `pcscd` + `libnfc` gives you the same libraries MerL1nk's `nfc_reader.cpp` is built against — you can test NFC tap-to-pay directly on this machine. |

---

## Memory Transfer — What Carries Over to Ubuntu

These are the parts of Claude's memory about your setup that survive the migration unchanged:

| Memory | Transfers? | Note |
|---|---|---|
| FIDELIO architecture, phases, invariants | ✅ Yes | Lives in `CLAUDE.md` and the repo — nothing OS-specific |
| How Cristian thinks and collaborates | ✅ Yes | Stored in `~/.claude/` memory files — copy this folder to USB and restore it after install |
| Session log archive | ✅ Yes | `Organization and Research/Seasons/Session-Log-Archive.md` — in the repo |
| `.env` files | ✅ Yes | Manual copy to USB — restore after clone |
| PostgreSQL data | ✅ Yes | `pg_dump` backup — restore after PostgreSQL install |
| SSH keys | ✅ Yes | Copy `~/.ssh/` to USB — restore after install |
| `~/.claude/` (Claude Code config, memory, skills) | ✅ Yes | Copy entire folder to USB — restore to `~/.claude/` on Ubuntu |
| oh-my-claudecode install | ⚠️ Reinstall | Run `omc update` after Claude Code is installed on Ubuntu |
| WSL2-specific `.env` IPs | ❌ Delete | `192.168.0.115` is gone. Use `localhost` or the new Ubuntu LAN IP |
| Windows PATH entries | ❌ Gone | Irrelevant on Ubuntu |

### The One Command to Back Up Claude Memory

```bash
cp -r ~/.claude ~/usb-backup/claude-memory
```

Restore on Ubuntu after install:
```bash
cp -r ~/usb-backup/claude-memory ~/.claude
```

---

*Generated 2026-04-24 — Dell Precision 3551 → Ubuntu 24.04 LTS migration plan for FIDELIO development.*
