---
slug: shani-os-shell-and-terminal
title: 'The Shell Experience on Shani OS — Zsh, Starship, McFly, FZF, and More'
date: '2026-04-22'
tag: 'Guide'
excerpt: 'Shani OS ships a fully configured, modern shell environment — Zsh with syntax highlighting and autosuggestions, Starship prompt, McFly neural-network history, FZF fuzzy search, and a complete toolkit of CLI tools. Here is how it all fits together.'
cover: ''
author: 'Shrinivas Vishnu Kumbhar'
author_role: 'Founder & Lead Developer, Shani OS'
author_bio: 'Shrinivas is a cloud expert, DevOps engineer, and creator of Shani OS.'
author_initials: 'SK'
author_linkedin: 'https://linkedin.com/in/shrinivasvkumbhar'
author_github: 'https://github.com/shrinivasvkumbhar'
author_website: 'https://shani.dev'
readTime: '7 min'
series: 'Shani OS Guides'
---

Most Linux distributions ship a minimal shell environment and leave the rest to you. Shani OS takes the opposite approach: the shell is configured properly from the start, with tools that developers and power users usually spend hours assembling themselves.

Everything described in this post is pre-installed and active on first boot — no configuration required unless you want to customise further. Your shell configuration lives in your home directory (`~/.zshrc`, `~/.config/starship.toml`), completely independent of the OS. It survives every OS update and rollback untouched.

Full reference: [docs.shani.dev — Shell & Environment](https://docs.shani.dev/doc/updates/shell).

---

## The Default Shell: Zsh

Zsh is the default shell on Shani OS. Every new user account is automatically configured with `/bin/zsh`. Bash and Fish are also installed and available — switch with `chsh -s /bin/bash` or `chsh -s /bin/fish` if you prefer.

Zsh is configured with three plugins that bring Fish-style interactivity:

**Syntax highlighting** (`zsh-syntax-highlighting`): commands turn green as you type them if they are valid, red if they are not. Typos are visible before you press Enter.

**Autosuggestions** (`zsh-autosuggestions`): as you type, a ghost-text suggestion appears based on your command history. Press the right arrow key or `End` to accept the suggestion. The longer you use the shell, the more accurate the suggestions become.

**History substring search** (`zsh-history-substring-search`): press the up arrow with a partial command typed to cycle through every history entry that contains that substring — not just entries that start with what you typed.

Zsh completions (`zsh-completions`) are configured for hundreds of commands including `git`, `systemctl`, `podman`, `flatpak`, `nix-env`, and `shani-deploy`.

---

## Starship Prompt

[Starship](https://starship.rs) replaces the default Zsh prompt with a fast, informative, and configurable one. It is written in Rust and adds no perceptible latency to the prompt.

What Starship shows by default:
- Current directory (shortened to the last two components)
- Git branch and status (modified files, ahead/behind remote)
- Active Python virtualenv
- Node.js version (when in a Node project directory)
- Rust toolchain version (when `Cargo.toml` is present)
- Exit code of the last command (when non-zero)
- Command duration (for long-running commands)

To customise your Starship configuration:

```bash
# Starship config file
nano ~/.config/starship.toml

# Example: change the prompt character
# [character]
# success_symbol = "[❯](green)"
# error_symbol = "[❯](red)"

# Full configuration reference
starship config
```

---

## McFly: Neural Network Command History

[McFly](https://github.com/cantino/mcfly) replaces the standard `Ctrl+R` history search with a local, on-device neural network that learns from your usage patterns. It runs entirely on your machine — no data leaves your system.

Standard `Ctrl+R` gives you a linear search through history, most recent first. McFly gives you:
- **Context-aware results**: commands relevant to your current directory are ranked higher
- **Exit-code awareness**: failed commands are deprioritised
- **Pattern learning**: commands you run frequently in a given context surface at the top
- **Search as you type**: fuzzy matching across your full history

Press `Ctrl+R` to activate McFly. Type any fragment of the command you want. Navigate with arrow keys. Press Enter to execute.

McFly's database lives in `~/.local/share/mcfly/history.db` — a SQLite file in your home directory that persists across everything and grows more useful over time.

---

## FZF: Fuzzy Finder

[FZF](https://github.com/junegunn/fzf) is integrated into the Zsh configuration and provides fuzzy search for files, history, and directories via keyboard shortcuts.

**`Ctrl+R`** — History search (McFly is bound here by default; if you prefer pure FZF, switch in `.zshrc`)

**`Ctrl+T`** — Insert a file path. Opens a fuzzy file finder for the current directory tree. Navigate with arrow keys, type to filter. Press Enter to insert the selected path at the cursor position.

**`Alt+C`** — Change directory. Opens a fuzzy directory finder. Navigate with arrow keys, type to filter. Press Enter to `cd` to the selected directory.

FZF can also be used directly in scripts and pipelines:

```bash
# Interactively select from a list
ls | fzf

# Select a running process to kill
ps aux | fzf | awk '{print $2}' | xargs kill

# Select a git branch to checkout
git branch | fzf | xargs git checkout

# Search and preview files
fzf --preview 'cat {}'
```

---

## Pre-Installed CLI Tools

These tools are available immediately without installing anything:

### File Search and Navigation

```bash
# ripgrep — faster grep with better defaults
rg "search term"           # search recursively from current dir
rg "pattern" src/          # search in a specific directory
rg -l "pattern"            # list only file names
rg --type py "import"      # search only Python files

# fd — modern find replacement
fd "filename"              # find files by name
fd -e py                   # find by extension
fd --type d                # find directories only
fd -x command {}           # run a command on each result

# fzf (covered above)
fzf
```

### File Viewing

```bash
# bat — cat with syntax highlighting and line numbers
bat file.py
bat --language json file.json
bat -n file.txt            # with line numbers only

# eza — modern ls replacement
eza                        # basic listing
eza -l                     # long format
eza --tree                 # tree view
eza -la --git              # with git status per file
```

### System Monitoring

```bash
# htop — interactive process viewer
htop

# fastfetch — system information summary
fastfetch

# ncdu — disk usage analyser (interactive)
ncdu

# tree — directory tree view
tree
tree -L 2                  # limit depth
tree --gitignore           # respect .gitignore
```

### Text Processing

```bash
# jq — JSON processor
echo '{"key": "value"}' | jq .
curl api.example.com/data | jq '.results[].name'

# Awk, sed, grep — standard tools all present
awk '{print $1}' file.txt
sed 's/old/new/g' file.txt
grep -r "pattern" .
```

### Compression

```bash
# 7zip handles everything
7z a archive.7z file.txt
7z x archive.7z

# Standard tools
tar xzf archive.tar.gz
unzip archive.zip
unrar x archive.rar
```

---

## Shell Configuration Files

Your shell configuration lives in your home directory:

```
~/.zshrc               — Zsh configuration (plugins, aliases, env vars)
~/.bashrc              — Bash configuration
~/.profile             — login shell config (shared between shells)
~/.config/starship.toml — Starship prompt configuration
~/.local/share/mcfly/  — McFly history database
```

All of these are in `@home` — completely independent of the OS. They are never touched by OS updates or rollbacks.

### Adding Aliases

```bash
# Add to ~/.zshrc
nano ~/.zshrc

# Examples
alias ll='eza -la'
alias cat='bat'
alias find='fd'
alias grep='rg'
alias update='sudo shani-deploy update'
alias status='cat /data/current-slot'
```

### Environment Variables

```bash
# In ~/.zshrc or ~/.profile
export EDITOR=vim
export PATH="$HOME/.local/bin:$PATH"
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock
```

---

## Multiple Shells

All three major shells are installed:

```bash
# Check available shells
cat /etc/shells

# Switch default shell
chsh -s /bin/bash    # switch to Bash
chsh -s /bin/fish    # switch to Fish
chsh -s /bin/zsh     # switch back to Zsh (default)
```

Fish has its own syntax (not POSIX-compatible) but excellent interactive features built-in — autosuggestions, syntax highlighting, and web-based configuration all come standard. If you prefer Fish, switch with `chsh` and your entire interactive experience becomes Fish-based.

---

## Tmux

Tmux (terminal multiplexer) is pre-installed. It lets you split your terminal into panes, create multiple windows, and detach from sessions that keep running in the background.

```bash
# Start a new session
tmux

# Start a named session
tmux new -s work

# Split horizontally
Ctrl+B then %

# Split vertically
Ctrl+B then "

# Switch panes
Ctrl+B then arrow keys

# Detach from session (session keeps running)
Ctrl+B then D

# List sessions
tmux ls

# Reattach to a session
tmux attach -t work
```

Tmux configuration lives in `~/.tmux.conf`. The default configuration on Shani OS is minimal — add your own preferences there.

---

## Installing Additional Shell Tools via Nix

Nix is the right tool for installing additional CLI utilities that are not pre-installed:

```bash
# Set up Nix channel first (once)
nix-channel --add https://nixos.org/channels/nixpkgs-unstable nixpkgs
nix-channel --update

# Install additional tools
nix-env -iA nixpkgs.tldr          # simplified man pages
nix-env -iA nixpkgs.bottom        # better htop
nix-env -iA nixpkgs.delta         # better git diff
nix-env -iA nixpkgs.lazygit       # terminal UI for git
nix-env -iA nixpkgs.zoxide        # smarter cd with frecency
nix-env -iA nixpkgs.starship      # update Starship if needed
```

All Nix-installed tools survive OS updates and rollbacks, are immediately on your `$PATH`, and do not touch the immutable OS root.

---

## Resources

- [Shani OS Troubleshooting Guide](https://blog.shani.dev/post/shani-os-troubleshooting-guide) — when things go wrong
- [The Shani OS Software Ecosystem](https://blog.shani.dev/post/shani-os-software-ecosystem) — what to use for each type of software
- [Your First Week with Shani OS](https://blog.shani.dev/post/shani-os-first-week) — day-by-day setup guide
- [docs.shani.dev — Shell & Environment](https://docs.shani.dev/doc/updates/shell) — full shell configuration reference
- [Nix on Shani OS](https://blog.shani.dev/post/nix-on-shani-os) — installing additional CLI tools
- [Distrobox on Shani OS](https://blog.shani.dev/post/distrobox-on-shani-os) — tools that need a full distro environment
- [Telegram community](https://t.me/shani8dev)

---

> **Built in India** 🇮🇳 · **Immutable** · **Atomic** · **Zero Telemetry**
