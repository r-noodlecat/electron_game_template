# Package the project into a zip, excluding files that shouldn't be shared.

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$projectName = Split-Path -Leaf $projectRoot
$timestamp = Get-Date -Format 'yyyy-MM-dd'
$zipName = "${projectName}_${timestamp}.zip"
$outDir = Join-Path $projectRoot 'out'
$zipPath = Join-Path $outDir $zipName

# Folders and files to exclude (relative to project root)
$excludeDirs = @(
    '.git',
    '.copilot-tracking',
    'node_modules',
    'dist',
    'out'
)

$excludeFiles = @(
    '.env',
    '.env.local',
    '.env.production',
    '.env.development'
)

Write-Host "Packaging project: $projectName"
Write-Host "Output: $zipPath"
Write-Host ""

# Build the list of items to include
$items = Get-ChildItem -Path $projectRoot -Force | Where-Object {
    $name = $_.Name
    if ($_.PSIsContainer) {
        $name -notin $excludeDirs
    } else {
        $name -notin $excludeFiles
    }
}

# Create output directory if needed
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

# Remove old zip if it exists
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Stage files in a temp directory to get a clean folder inside the zip
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "pkg_$projectName"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
$stageDir = Join-Path $tempDir $projectName
New-Item -ItemType Directory -Path $stageDir | Out-Null

foreach ($item in $items) {
    $dest = Join-Path $stageDir $item.Name
    if ($item.PSIsContainer) {
        Copy-Item -Path $item.FullName -Destination $dest -Recurse -Force
    } else {
        Copy-Item -Path $item.FullName -Destination $dest -Force
    }
}

# Create the zip
Compress-Archive -Path $stageDir -DestinationPath $zipPath -Force

# Cleanup temp staging
Remove-Item $tempDir -Recurse -Force

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "[OK] Created $zipName ($sizeMB MB) in out/"
