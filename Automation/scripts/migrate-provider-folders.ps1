# One-time migration: journey-first -> Provider x Journey + Shared
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root

function Ensure-Dir($path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

function Move-ItemSafe($src, $dst) {
  if (-not (Test-Path $src)) { Write-Host "SKIP (missing): $src"; return }
  Ensure-Dir (Split-Path $dst -Parent)
  if (Test-Path $dst) { Write-Host "SKIP (exists): $dst"; return }
  $moved = $false
  try {
    git mv $src $dst 2>$null
    if ($LASTEXITCODE -eq 0) { $moved = $true }
  } catch { }
  if (-not $moved) {
    Move-Item -Path $src -Destination $dst -Force
  }
  Write-Host "MOVED: $src -> $dst"
}

# --- Phase 1: Shared workflows (Shared-Workflows) ---
Ensure-Dir 'Shared-Workflows'

$sharedMoves = @(
  @{ s = '13-Shared-Workflows/TMF641-Notifications'; d = 'Shared-Workflows/TMF641-Notifications' },
  @{ s = '13-Shared-Workflows/SingleView-Integration'; d = 'Shared-Workflows/SingleView-Integration' },
  @{ s = '13-Shared-Workflows/WFM-ME-Workflow'; d = 'Shared-Workflows/WFM-ME' },
  @{ s = '13-Shared-Workflows/Create Service Order - OpenAccess'; d = 'Shared-Workflows/Create-Service-Order-OA' },
  @{ s = '13-Shared-Workflows/Device Swap - Notification'; d = 'Shared-Workflows/Device-Swap-Notification' }
)
foreach ($m in $sharedMoves) { Move-ItemSafe $m.s $m.d }

# WFM CPE from activation Mobily -> shared
Move-ItemSafe '02-Activation Order/Mobily/WFM CPE Installation - Notification' 'Shared-Workflows/WFM-CPE'

# --- Phase 2: Mobily provider root ---
Ensure-Dir 'Mobily'
Move-ItemSafe '02-Activation Order/Mobily/TMF-622 Create Sales Order' 'Mobily/Activation/TMF-622 Create Sales Order'

$mobilyJourneyMoves = @(
  @{ s = '03-Relocation/Mobily'; d = 'Mobily/Relocation' },
  @{ s = '04-Device-Swap/Mobily'; d = 'Mobily/Device-Swap' },
  @{ s = '05-Upgrade-Downgrade/Upgrade/Mobily'; d = 'Mobily/Upgrade' },
  @{ s = '05-Upgrade-Downgrade/Downgrade/Mobily'; d = 'Mobily/Downgrade' },
  @{ s = '06-Suspend-Resume/Suspend/Mobily'; d = 'Mobily/Suspend' },
  @{ s = '07-Termination/Mobily'; d = 'Mobily/Termination' },
  @{ s = '08-Rewiring/Mobily'; d = 'Mobily/Rewiring' },
  @{ s = '10-Request-Update/Mobily'; d = 'Mobily/Request-Update' },
  @{ s = '12-Mesh-Extender-Standalone/Mobily'; d = 'Mobily/Mesh-Extender-Standalone' },
  @{ s = '13-Shared-Workflows/Installation-Failure-Scenarios/Mobily'; d = 'Mobily/Installation-Failure' },
  @{ s = '13-Shared-Workflows/Installation-Failure-Scenarios/Mobily-Maintenance'; d = 'Mobily/Installation-Failure/Maintenance' }
)
foreach ($m in $mobilyJourneyMoves) { Move-ItemSafe $m.s $m.d }

# Maintenance create order -> Mobily/Maintenance
Ensure-Dir 'Mobily/Maintenance'
Move-ItemSafe '09-Maintenance/01-Create-Maintenance-Order-TMF622/Maintenance Order - Mobily.bru' 'Mobily/Maintenance/Maintenance Order - Mobily.bru'

# --- Phase 3: OpenAccess providers ---
$oaProviders = @('STC', 'ITC', 'ACES', 'DOWIYAT')
Ensure-Dir 'OpenAccess'

foreach ($p in $oaProviders) {
  $srcBase = "02-Activation Order/OpenAccess/$p"
  if (Test-Path $srcBase) {
    Get-ChildItem $srcBase -ErrorAction SilentlyContinue | ForEach-Object {
      $rel = $_.Name
      Move-ItemSafe "$srcBase/$rel" "OpenAccess/$p/Activation/$rel"
    }
  }
}

$oaFieldMaps = @(
  @{ old = '03-Relocation/OpenAccess'; journey = 'Relocation' },
  @{ old = '04-Device-Swap/OpenAccess'; journey = 'Device-Swap' },
  @{ old = '05-Upgrade-Downgrade/Upgrade/OpenAccess'; journey = 'Upgrade' },
  @{ old = '05-Upgrade-Downgrade/Downgrade/OpenAccess'; journey = 'Downgrade' },
  @{ old = '06-Suspend-Resume/Suspend/OpenAccess'; journey = 'Suspend' },
  @{ old = '06-Suspend-Resume/Resume/OpenAccess'; journey = 'Resume' },
  @{ old = '07-Termination/OpenAccess'; journey = 'Termination' },
  @{ old = '08-Rewiring/OpenAccess'; journey = 'Rewiring' }
)

foreach ($map in $oaFieldMaps) {
  if (-not (Test-Path $map.old)) { continue }
  Get-ChildItem "$($map.old)/*.bru" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Name -eq 'folder.bru') { return }
    if ($_.Name -match 'Request - (\w+)') {
      $prov = $Matches[1]
      Move-ItemSafe "$($map.old)/$($_.Name)" "OpenAccess/$prov/$($map.journey)/$($_.Name)"
    }
  }
}

# OA maintenance create files
Get-ChildItem '09-Maintenance/01-Create-Maintenance-Order-TMF622/*.bru' -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.Name -match 'Maintenance Order - (\w+)') {
    $prov = $Matches[1]
    if ($prov -ne 'Mobily') {
      Move-ItemSafe "09-Maintenance/01-Create-Maintenance-Order-TMF622/$($_.Name)" "OpenAccess/$prov/Maintenance/$($_.Name)"
    }
  }
}

# OA maintenance close/reopen -> provider Maintenance subfolders
foreach ($sub in @('02-Close-Maintenance-Order', '03-ReOpen-Maintenance-Order')) {
  Get-ChildItem "09-Maintenance/$sub/*.bru" -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Name -match '(ACES|DOWIYAT|ITC|STC)') {
      $prov = $Matches[1]
      Move-ItemSafe "09-Maintenance/$sub/$($_.Name)" "OpenAccess/$prov/Maintenance/$($_.Name)"
    }
  }
}

# OA open service request maintenance
Move-ItemSafe '09-Maintenance/04-Open-Service-Request-OA' 'Shared-Workflows/Open-Service-Request-OA'

# Installation failure per OA provider
$failureMap = @{
  'STC' = 'STC - Installation Failure Notification'
  'ITC' = 'ITC - Installation Failure Notification'
  'DOWIYAT' = 'DOWIYAT - Installation Failure Notification'
  'ACES' = 'ACES - Installation Failure Notification'
}
foreach ($p in $oaProviders) {
  $oldFolder = "13-Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/$($failureMap[$p])"
  Move-ItemSafe $oldFolder "OpenAccess/$p/Installation-Failure"
}

# Cancel order per OA provider
foreach ($p in @('STC', 'ITC', 'ACES')) {
  Move-ItemSafe "13-Shared-Workflows/Cancel Order Notification - OpenAccess/$p" "OpenAccess/$p/Cancel-Order"
}
Ensure-Dir 'Shared-Workflows/Cancel-Order-OA'
Move-ItemSafe '13-Shared-Workflows/Cancel Order Notification - OpenAccess/622 - Cancel Order.bru' 'Shared-Workflows/Cancel-Order-OA/622 - Cancel Order.bru'

# Mesh extender OA
foreach ($p in $oaProviders) {
  $src = "12-Mesh-Extender-Standalone/OpenAccess/$p"
  Move-ItemSafe $src "OpenAccess/$p/Mesh-Extender-Standalone"
}

# Request update OA files
if (Test-Path '10-Request-Update') {
  Get-ChildItem '10-Request-Update/*.bru' -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Name -match '(DOWIYAT|ITC|ACES|STC|Mobily|DAWIYAT)') {
      $prov = $Matches[1]
      if ($prov -eq 'DAWIYAT') { $prov = 'DOWIYAT' }
      if ($prov -eq 'Mobily') {
        Move-ItemSafe "10-Request-Update/$($_.Name)" "Mobily/Request-Update/$($_.Name)"
      } else {
        Move-ItemSafe "10-Request-Update/$($_.Name)" "OpenAccess/$prov/Request-Update/$($_.Name)"
      }
    }
  }
}

# ACES lifecycle folders under Activation -> respective journeys
$acesLifecycle = @{
  'Relocation-Service-Installation' = 'Relocation'
  'DeviceSwap-Service-Installation' = 'Device-Swap'
  'Modification-Service-Installation' = 'Upgrade'
  'Rewiring-Service-Installation' = 'Rewiring'
  'Suspend-Service-Installation' = 'Suspend'
  'Resume-Service-Installation' = 'Resume'
  'Termination-Service-Installation' = 'Termination'
}
foreach ($entry in $acesLifecycle.GetEnumerator()) {
  Move-ItemSafe "OpenAccess/ACES/Activation/$($entry.Key)" "OpenAccess/ACES/$($entry.Value)/$($entry.Key)"
}

Write-Host 'Migration script completed.'
