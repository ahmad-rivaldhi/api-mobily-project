<#
.SYNOPSIS
    FTTH Mobily Journey Runner (PowerShell)

.EXAMPLE
    .\run-journey.ps1 -Env "Dev 1" -Journey "mobily-activation" -ME 0
    .\run-journey.ps1 -Env "Dev 1" -Journey "mobily-activation" -ME 1
#>

param(
    [Parameter(Mandatory=$true)][string]$Env,
    [Parameter(Mandatory=$true)][string]$Journey,
    [int]$ME = 0,
    [string]$CustomerType = "Regular-Customer",
    [string]$PaymentType = "Postpaid"
)

$ErrorActionPreference = "Stop"
Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAll : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint sp, X509Certificate cert, WebRequest req, int problem) { return true; }
}
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAll
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

$ROOT = Split-Path -Parent $PSScriptRoot

function Write-Log($Tag, $Msg) {
    $ts = (Get-Date).ToString("HH:mm:ss")
    Write-Host "[$ts] [$($Tag.PadRight(8))] $Msg"
}

function Get-BrunoEnv($envName) {
    $f = Join-Path $ROOT "environments" "$envName.bru"
    if (-not (Test-Path $f)) { throw "Env file not found: $f" }
    $c = Get-Content $f -Raw
    $v = @{}
    if ($c -match "vars\s*\{([\s\S]*?)\}") {
        $Matches[1] -split "`n" | ForEach-Object {
            if ($_ -match "^\s*([\w-]+):\s*(.*)") { $v[$Matches[1]] = $Matches[2].Trim() }
        }
    }
    return $v
}

function Expand-Vars($text, $vars) {
    $r = $text
    foreach ($k in $vars.Keys) { $r = $r -replace "\{\{$k\}\}", $vars[$k] }
    return $r
}

function Get-BruBody($filePath) {
    $full = Join-Path $ROOT $filePath
    $c = Get-Content $full -Raw
    $idx = $c.IndexOf("body:json {")
    if ($idx -lt 0) { return $null }
    $search = $idx + "body:json {".Length
    $start = $c.IndexOf("{", $search)
    if ($start -lt 0) { return $null }
    $depth = 0; $end = -1
    for ($i = $start; $i -lt $c.Length; $i++) {
        if ($c[$i] -eq '{') { $depth++ }
        if ($c[$i] -eq '}') { $depth--; if ($depth -eq 0) { $end = $i + 1; break } }
    }
    if ($end -gt $start) { return $c.Substring($start, $end - $start) }
    return $null
}

function Get-BruMeta($filePath) {
    $full = Join-Path $ROOT $filePath
    $c = Get-Content $full -Raw
    $method = "GET"
    if ($c -match "(?m)^(post|get|put|patch|delete)\s*\{") { $method = $Matches[1].ToUpper() }
    $url = ""
    if ($c -match "url:\s*(.+)") { $url = $Matches[1].Trim() }
    return @{ Method = $method; Url = $url }
}

function Invoke-Api($method, $url, $headers, $body) {
    $p = @{ Uri = $url; Method = $method; Headers = $headers; UseBasicParsing = $true }
    if ($body) { $p["Body"] = [System.Text.Encoding]::UTF8.GetBytes($body) }
    try {
        $r = Invoke-WebRequest @p -ErrorAction Stop
        return ($r.Content | ConvertFrom-Json)
    } catch {
        Write-Log "WARN" "HTTP $method $url => $($_.Exception.Message)"
        return $null
    }
}

function Send-BruRequest($bruFile, $vars) {
    $meta = Get-BruMeta $bruFile
    $url = Expand-Vars $meta.Url $vars
    $headers = @{ "Authorization" = "Bearer $($vars.authToken)"; "Content-Type" = "application/json" }
    $rawBody = Get-BruBody $bruFile
    $body = $null
    if ($rawBody) {
        $body = Expand-Vars $rawBody $vars
        $body = $body -replace "//[^\n]*", ""
    }
    return Invoke-Api $meta.Method $url $headers $body
}

# ---- STEPS ----

function Do-Auth($vars, $envName) {
    Write-Log "AUTH" "Authenticating..."
    $authDir = Join-Path $ROOT "01-Authentication"
    $authFile = Get-ChildItem $authDir -Recurse -File -Filter "*.bru" |
      Where-Object { $_.Name -ne 'folder.bru' -and $_.Name -like "*$envName*" } |
      Select-Object -First 1
    if (-not $authFile) { throw "No auth file for env '$envName'" }


    $c = Get-Content $authFile.FullName -Raw
    $url = ""; if ($c -match "url:\s*(.+)") { $url = Expand-Vars $Matches[1].Trim() $vars }
    $form = @{}
    if ($c -match "body:form-urlencoded\s*\{([\s\S]*?)\}") {
        $Matches[1].Trim() -split "`n" | ForEach-Object {
            $sep = $_.IndexOf(":")
            if ($sep -gt 0) { $form[$_.Substring(0,$sep).Trim()] = Expand-Vars $_.Substring($sep+1).Trim() $vars }
        }
    }
    $body = ($form.GetEnumerator() | ForEach-Object { "$($_.Key)=$([uri]::EscapeDataString($_.Value))" }) -join "&"
    $r = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/x-www-form-urlencoded" -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    if (-not $json.access_token) { throw "Auth failed" }
    $vars.authToken = $json.access_token
    Write-Log "AUTH" "Token acquired (expires in $($json.expires_in)s)"
}

function Do-CreateOrder($vars, $bruFile) {
    $vars.eventTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $vars.eventDate = $vars.eventTime
    Write-Log "CREATE" "Creating order: $(Split-Path $bruFile -Leaf)"
    $result = Send-BruRequest $bruFile $vars
    if ($result -and $result.id) {
        $vars.orderId = $result.id
        Write-Log "CREATE" "orderId: $($vars.orderId)"
    } else { Write-Log "WARN" "No orderId in response" }
}

function Do-ExtractServiceOrderId($vars, $maxAttempts = 8, $intervalSec = 15) {
    Write-Log "BRIDGE" "Polling for Create Service Order Response..."
    $url = "$($vars['demo-mob-dev'])/portal/api/b2b/message?businessInteractionIds%5B%5D=$($vars.orderId)&maxRows=50&orderBy%5B%5D=%7B%22propertyName%22%3A%22DeliveredDate%22%2C%22direction%22%3A%22DESC%22%7D&startRowIndex=0"
    $headers = @{ "Authorization" = "Bearer $($vars.authToken)" }

    for ($a = 1; $a -le $maxAttempts; $a++) {
        try {
            $r = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
            $data = $r.Content | ConvertFrom-Json
            foreach ($msg in $data.data.Rows) {
                if ($msg.Action -eq "Create Service Order Response") {
                    $d = $msg.Message.Data | ConvertFrom-Json
                    if ($d.id) {
                        $vars.serviceOrderId = $d.id
                        Write-Log "BRIDGE" "serviceOrderId: $($d.id)"
                        return
                    }
                }
            }
        } catch { Write-Log "WARN" "Poll error: $($_.Exception.Message)" }
        if ($a -lt $maxAttempts) {
            Write-Log "BRIDGE" "Attempt $a/$maxAttempts - waiting ${intervalSec}s..."
            Start-Sleep -Seconds $intervalSec
        }
    }
    throw "Timed out waiting for Create Service Order Response"
}

function Do-Notification($vars, $bruFile) {
    $vars.eventTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $vars.eventDate = $vars.eventTime
    $label = [System.IO.Path]::GetFileNameWithoutExtension($bruFile)
    Write-Log "STEP" $label
    Send-BruRequest $bruFile $vars | Out-Null
}

# ---- MAIN ----

Write-Log "START" "Journey: $Journey | Env: $Env | ME: $ME"
Write-Log "START" ("=" * 60)

$vars = Get-BrunoEnv $Env
Do-Auth $vars $Env

# Step 2: Create order (paths mirror Automation/constants/paths.js Ã¢â‚¬â€ mobilyCreateOrderPath)
$meSuffix = if ($ME -gt 0) { "With-$ME-ME" } else { "No-ME" }
$meFolder = if ($ME -le 0) { "without ME" } else { "with $ME ME" }
if ($CustomerType -eq "Royal-Customer") {
    $createFile = "02-Activation Order/Mobily/TMF-622 Create Sales Order/FTTH RCY/$PaymentType/$meFolder/FTTH-Royal-$PaymentType-$meSuffix.bru"
} else {
    $createFile = "02-Activation Order/Mobily/TMF-622 Create Sales Order/FTTH Consumer/$meFolder/FTTH-$PaymentType-$meSuffix.bru"
}
Do-CreateOrder $vars $createFile

# Step 3: Generate workOrderIdCpe
$ts = (Get-Date).ToUniversalTime().ToString("yyyyMMddHHmmss")
$vars.workOrderIdCpe = "1-cpe-$($vars.orderId)$ts"
Write-Log "GEN" "workOrderIdCpe: $($vars.workOrderIdCpe)"
if ($ME -gt 0) {
    $vars.workOrderIdMe = "2-me-$($vars.orderId)$ts"
    Write-Log "GEN" "workOrderIdMe: $($vars.workOrderIdMe)"
}

# Step 4: WFM CPE Steps 01-08 (Phase 1 only; Step 09 is in Phase 2)
$cpeStepsDir = "02-Activation Order/Mobily/WFM CPE Installation - Notification/Phase 1"
$cpeSteps = @("Step-01-CPE-1000-OK","Step-02-CPE-Ready","Step-03-CPE-Acknowledged","Step-04-CPE-Accepted",
              "Step-05-CPE-Trip-Started","Step-06-CPE-Customer-Premises","Step-07-CPE-In-Work","Step-08-CPE-Installation-Completed")
$total = $cpeSteps.Count + 2 + $(if ($ME -gt 0) { 9 } else { 0 })
$n = 0
foreach ($s in $cpeSteps) {
    $n++; Write-Log "PROGRESS" "[$n/$total]"
    Do-Notification $vars "$cpeStepsDir/$s.bru"
    Start-Sleep -Seconds 2
}

if ($ME -gt 0) {
    $meSteps = @("Step-01-ME-1000-OK","Step-02-ME-Ready","Step-03-ME-Acknowledged","Step-04-ME-Accepted",
                 "Step-05-ME-Trip-Started","Step-06-ME-Customer-Premises","Step-07-ME-In-Work")
    foreach ($s in $meSteps) {
        $n++; Write-Log "PROGRESS" "[$n/$total]"
        Do-Notification $vars "13-Shared-Workflows/WFM-ME-Workflow/$s.bru"
        Start-Sleep -Seconds 2
    }
    $n++; Write-Log "PROGRESS" "[$n/$total]"
    Do-Notification $vars "13-Shared-Workflows/WFM-ME-Workflow/Step-08-ME-Installation-Completed-$ME-ME.bru"
    Start-Sleep -Seconds 2
}

# Step 5: Wait for Create Service Order Response
Write-Log "WAIT" "Waiting 45s for Create Service Order Response..."
Start-Sleep -Seconds 45

# Step 6: Extract serviceOrderId
Do-ExtractServiceOrderId $vars

# Step 7: TMF641 Completed
$n++; Write-Log "PROGRESS" "[$n/$total]"
Do-Notification $vars "13-Shared-Workflows/TMF641-Notifications/Service-Order-Completed.bru"

# Step 8: Wait for Pending UAT
Write-Log "WAIT" "Waiting 45s for order to reach Pending UAT..."
Start-Sleep -Seconds 45

# Step 9: WFM Step 09 Completed
$n++; Write-Log "PROGRESS" "[$n/$total]"
Do-Notification $vars "02-Activation Order/Mobily/WFM CPE Installation - Notification/Phase 2/Step-09-CPE-Completed.bru"

if ($ME -gt 0) {
    Do-Notification $vars "13-Shared-Workflows/WFM-ME-Workflow/Step-09-ME-UAT-Completed.bru"
}

Write-Log "DONE" ("=" * 60)
Write-Log "DONE" "Journey completed!"
Write-Log "DONE" "  orderId:          $($vars.orderId)"
Write-Log "DONE" "  serviceOrderId:   $($vars.serviceOrderId)"
Write-Log "DONE" "  workOrderIdCpe:   $($vars.workOrderIdCpe)"
Write-Log "DONE" "  workOrderIdMe:    $($vars.workOrderIdMe)"



