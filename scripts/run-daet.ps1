param(
  [Parameter(Mandatory = $true)]
  [string]$Task,

  [string]$RepoPath = "C:\Users\User\.openclaw\workspace\repos\everything-claude-code",

  [string]$OpenCodeExe = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\SST.opencode_Microsoft.Winget.Source_8wekyb3d8bbwe\opencode.exe"
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path $RepoPath)) {
  throw "Repo path not found: $RepoPath"
}

if (!(Test-Path $OpenCodeExe)) {
  throw "OpenCode executable not found: $OpenCodeExe"
}

Write-Host "Running DAET in repo: $RepoPath" -ForegroundColor Cyan
Write-Host "Task: $Task" -ForegroundColor Yellow

Push-Location $RepoPath
try {
  # Ensure the branch containing /daet exists locally
  git fetch origin --quiet

  # Run OpenCode command non-interactively
  & $OpenCodeExe run "/daet $Task" --format default
}
finally {
  Pop-Location
}
