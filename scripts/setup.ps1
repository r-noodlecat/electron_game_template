# =============================================================================
# First-Time Project Setup - Windows
# Installs Node.js (via winget) if missing, then runs npm install.
# =============================================================================

$MIN_NODE_MAJOR = 18

# -- Helpers ------------------------------------------------------------------

function Write-Step  { param([string]$msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$msg) Write-Host "   OK: $msg" -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host "   WARN: $msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$msg) Write-Host "   ERR: $msg" -ForegroundColor Red }

function Refresh-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

function Get-NodeMajor {
  try {
    $raw = & node --version 2>&1
    if ($raw -match '^v(\d+)') { return [int]$Matches[1] }
  } catch { }
  return -1
}

# -- Node.js ------------------------------------------------------------------

Write-Step 'Checking Node.js...'
[int]$nodeMajor = Get-NodeMajor

if ($nodeMajor -lt 0) {
  Write-Warn 'Node.js not found - installing via winget...'

  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Err 'winget is not available on this system.'
    Write-Err 'Please install Node.js manually: https://nodejs.org/'
    exit 1
  }

  winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
  if ($LASTEXITCODE -ne 0) {
    Write-Err "winget install failed (exit code $LASTEXITCODE)."
    Write-Err 'Please install Node.js manually: https://nodejs.org/'
    exit 1
  }

  Refresh-Path
  [int]$nodeMajor = Get-NodeMajor

  if ($nodeMajor -lt 0) {
    Write-Err 'Node.js was installed but is not on PATH yet.'
    Write-Err 'Close and reopen VS Code, then run this task again.'
    exit 1
  }
}

if ($nodeMajor -lt $MIN_NODE_MAJOR) {
  Write-Err "Node.js v$nodeMajor detected - this project requires v$MIN_NODE_MAJOR or later."
  Write-Err 'Update at https://nodejs.org/ or run: winget upgrade OpenJS.NodeJS.LTS'
  exit 1
}

Write-Ok "Node.js $(node --version)"
Write-Ok "npm $(npm --version)"

# -- npm install ---------------------------------------------------------------

Write-Step 'Installing dependencies...'

$projectRoot = Split-Path $PSScriptRoot -Parent

Push-Location $projectRoot
try {
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Err "npm install failed (exit code $LASTEXITCODE)."
    exit 1
  }
  Write-Ok 'Dependencies installed'
} finally {
  Pop-Location
}

# -- Verify build --------------------------------------------------------------

Write-Step 'Verifying build...'
Push-Location $projectRoot
try {
  npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Err 'Build failed. Check the output above for errors.'
    exit 1
  }
  Write-Ok 'Build succeeded'
} finally {
  Pop-Location
}

# -- Done ----------------------------------------------------------------------

Write-Host ''
Write-Ok 'Setup complete!'
Write-Host ''
Write-Host '  Next steps:' -ForegroundColor White
Write-Host '    - Press F5 to build and debug the game'
Write-Host '    - Or run: npm start'
Write-Host ''
