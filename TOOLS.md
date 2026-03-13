# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## OpenCode DAET (Design → Analyze → Execute → Test)

Local wrapper script to run the DAET multi-agent pipeline in `everything-claude-code` from OpenClaw workspace.

- Script: `scripts/run-daet.ps1`
- Repo default: `C:\Users\User\.openclaw\workspace\repos\everything-claude-code`
- OpenCode exe default: `C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\SST.opencode_Microsoft.Winget.Source_8wekyb3d8bbwe\opencode.exe`

Usage:

```powershell
./scripts/run-daet.ps1 -Task "implement X in Y repo with tests"
```

Optional overrides:

```powershell
./scripts/run-daet.ps1 -Task "..." -RepoPath "D:\\code\\everything-claude-code" -OpenCodeExe "C:\\path\\to\\opencode.exe"
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
