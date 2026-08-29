---
title: "Leaving Windows or macOS for Shanios: The Complete Switcher's Guide"
date: 2026-08-25
author: Shrinivas Kumbhar
author_bio: Creator of Shanios. Building immutable Linux distributions.
author_initials: SK
author_linkedin: shrinivaskumbhar
author_github: shrinivasvkumbhar
author_website: https://shani.dev
tag: Guide
series: Shani OS Guides
slug: switching-from-windows-and-macos
cover: /assets/images/blog/switching-from-windows-and-macos.webp
category: Guide
readTime: "7 min"
---

Every week I hear the same two sentences. From Windows users: "I'm done with updates breaking my machine." From Mac users: "The hardware is fine, but everything else about the ecosystem is a walled garden." Both are really asking the same question — is Linux finally ready to be a daily operating system for someone who does not want to think about their operating system?

This guide answers that honestly, from the pre-flight checklist through the first week on Shanios. The full reference version lives in the docs; this post is the reasoning behind it.

## The Pre-Flight Checklist

The switch itself takes about 30 minutes. What actually goes wrong for people is data left behind on the old machine — encrypted drives, activation limits, passwords trapped in a browser profile. So before you touch a USB stick:

1. **Copy your files out first.** Documents, photos, videos — onto a USB drive formatted exFAT or NTFS (both fully readable and writable on Shanios) or into cloud storage. This step matters more than anything else in this post.
2. **Windows only:** turn off BitLocker or decrypt the drive. A wiped BitLocker volume without its recovery key is gone forever.
3. **macOS only:** disable FileVault beforehand — and know that Time Machine backups cannot be restored directly on any Linux distro. Bring your *files*, not the backup container. iPhone photos: download them from iCloud.com or copy them onto a drive on the Mac first.
4. Sign in to browser sync so bookmarks and passwords follow you automatically.
5. Note your IMAP email settings if they live only in your old mail client.
6. Deauthorize iTunes/Adobe activations while the old machine still boots.

Ten minutes of checklist beats weeks of regret.

## What You Keep, and What You Reinstall

Your files come with you — any exFAT or NTFS drive mounts read/write on Shanios. Your fonts come with you (copy them into `~/.local/share/fonts`). Your browser profile follows via sync. Even Outlook PST archives import cleanly into Thunderbird.

What does not come with you: the installed programs themselves. That sounds like a loss until you see the translation table below — nearly every program people actually use has a free equivalent, and most of them are one click away on Flathub.

## Everything Has an Equivalent

Switchers rarely miss the operating system itself — they miss their habits. Here is the full translation table:

| Windows / macOS | Shanios |
|---|---|
| File Explorer / Finder | Nautilus (GNOME), Dolphin (KDE Plasma), or COSMIC Files |
| Microsoft Store / Mac App Store | Flathub via Warehouse (pre-installed) |
| Control Panel / System Settings | Your edition's Settings app |
| Task Manager / Activity Monitor | Mission Center (pre-installed) or `htop` |
| cmd / PowerShell / Terminal.app | zsh with the Starship prompt, ready out of the box |
| Action Centre / Notification Centre | Desktop notification centre; update prompts via `shani-update` |
| `.exe` installers / `.dmg` images | Flatpak first, AppImage next, Bottles for Windows apps |
| MS Office | OnlyOffice — already installed — or LibreOffice |
| Photoshop / Illustrator | GIMP/Krita and Inkscape from Flathub |
| Time Machine | restic, borg, or Deja Dup (GNOME edition) |
| iCloud Drive | Nextcloud/self-hosted, or any cloud in the browser |
| Keychain | KeePassXC, or GNOME Keys with Seahorse/Secrets |

Notice what is *not* in that table: setup work. Vivaldi and OnlyOffice are pre-installed on every edition, so documents and browsing work on first boot. Thunderbird, LibreOffice, GIMP, Krita, Inkscape, KeePassXC, Discord, Spotify — all one click away on Flathub, which comes pre-configured. Nix ships pre-installed for CLI tools, Homebrew is supported if you know it from macOS, and Bottles runs the occasional Windows program that has no equivalent.

## The OnlyOffice Angle

The question every Office user asks first: "But my Word files?" Here is the part I enjoy telling people — **OnlyOffice is already installed**. Not "installable", not "supported": pre-installed on every edition — GNOME and KDE Plasma today, with COSMIC to follow — next to the Vivaldi browser which is also already there.

Your `.docx`, `.xlsx`, and `.pptx` open from the file manager on day one. For most documents the formatting round-trips cleanly; for edge cases, LibreOffice is one click away on Flathub. The two-week "can I do my actual work?" anxiety usually ends during the first hour.

Indian-language users get something neither Windows nor macOS does well: IBus input for Devanagari, Bengali, Gujarati, Gurmukhi, Kannada, Malayalam, Oriya, Tamil, and Telugu is pre-configured at install. Add your layout, start typing — no input-method package hunting, no forum archaeology.

## Why Immutable Is Ideal for Switchers

Switchers do not break operating systems on purpose — but traditional Linux hands you enough rope. You paste a command from a forum, add an unofficial repository, install a package that conflicts with another one, and three weeks later the machine will not boot. Every veteran Linux user has done this at least once. Newcomers should never have to learn it.

Shanios removes that entire failure class by design:

- The OS is a read-only, cryptographically verified image. Nothing you install, delete, or misconfigure can modify it.
- Updates are atomic. They either apply completely or not at all. There is no "update interrupted halfway" state.
- If an update ever misbehaves, `sudo shani-deploy -r` rolls back to the previous complete system in minutes.
- Worst case, `shani-reset` restores factory state without touching your files.

For a switcher this means the scariest part of changing operating systems — "what if I break it?" — simply does not apply. Explore freely. The system cannot hold a grudge.

This is also why Shanios suits shared and family machines. The person who "just clicks things" cannot degrade the system for everyone else, because there is nothing they can click that reaches the OS image.

## Dual-Boot: Honest Advice

Dual-booting is supported via the installer's manual partition step, and it is a reasonable safety net. Two caveats, stated plainly: major Windows updates sometimes rewrite the boot order and put Windows first (fixable, but annoying), and most people who keep Windows "just in case" stop booting it within a month. Secure Boot stays enabled either way — no BIOS gymnastics required.

If you want the safety net without the second OS, take it in a different form: keep your exFAT backup drive untouched for a month, then wipe it happily.

## The First Week

Expect different-but-equivalent rather than better-or-worse. The file manager opens files. Mission Center shows what is eating RAM. Warehouse finds software without a single web search for installers. Within days the new names become muscle memory; within a week the interesting question flips — not "can Shanios do X?" but "why did the old OS make X hard?"

Set up a real backup in week one — restic or borg for encrypted versioned backups, Deja Dup if you chose the GNOME edition. It is the Time Machine habit, kept.

When something seems off, run `shani-health` for a diagnosis. When something breaks... it does not.

## What Switchers Ask

**"Can I still open my old files?"** Yes — documents, photos, videos, PST archives, fonts. Nothing in your home directory cares which OS wrote it.

**"What about that one Windows program I need?"** Bottles (from Flathub) runs Windows applications in isolated Wine environments. For the rare kernel-dependent exception, use a VM.

**"Do I have to learn the terminal?"** No. Everything in this guide is doable from graphical apps. The terminal is there when you want it, and it is a good one — zsh with Starship, pre-configured.

**"Is gaming viable?"** Yes, and it has its own documented stack rather than a footnote here.

**"What if an update goes wrong?"** `sudo shani-deploy -r` returns the previous system in minutes. In practice, updates simply do not go wrong — they are atomic and verified.

## Resources

- [Full switching documentation](https://docs.shani.dev/doc/intro/switching-from-windows) — checklists, install verification, habit tables
- [Migrating to Shani OS](https://blog.shani.dev/post/migrating-to-shani-os) — coming from Ubuntu, Fedora, or Arch instead
- [Your First Week with Shani OS](https://blog.shani.dev/post/shani-os-first-week) — day-by-day setup walkthrough
- [Shani OS FAQ](https://blog.shani.dev/post/shani-os-faq) — rollback, dual-boot, and hardware questions answered

The switch is 30 minutes of work and ten minutes of checklist. The hard part was deciding to leave; everything after that is a table lookup.

[Download Shanios at shani.dev →](https://shani.dev)
