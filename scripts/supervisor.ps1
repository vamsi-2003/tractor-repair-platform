<#
.SYNOPSIS
    Tractor Repair App - 1-Second Process Watchdog (PowerShell)
    Keeps admin-web and customer-mobile running and inspects their status every second.
#>

$ErrorActionPreference = "Continue"

$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Tractor Repair App - 1-Second Process Watchdog    " -ForegroundColor White
Write-Host "  Interval: Every 1 second                          " -ForegroundColor Gray
Write-Host "  Target Services: admin-web, customer-mobile       " -ForegroundColor Gray
Write-Host "====================================================" -ForegroundColor Cyan

# Configuration of services to keep alive
$services = @(
    @{
        Name = "admin-web"
        Command = "pnpm"
        Arguments = "--filter admin-web dev"
        Process = $null
        Restarts = 0
    },
    @{
        Name = "customer-mobile"
        Command = "pnpm"
        Arguments = "--filter customer-mobile start"
        Process = $null
        Restarts = 0
    }
)

function Start-WatchedProcess($svc) {
    $time = (Get-Date).ToString("HH:mm:ss")
    Write-Host "[$time] [$($svc.Name)] Starting process: $($svc.Command) $($svc.Arguments)" -ForegroundColor Green
    
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $svc.Command
    $pinfo.Arguments = $svc.Arguments
    $pinfo.WorkingDirectory = $rootDir
    $pinfo.UseShellExecute = $true
    
    $proc = [System.Diagnostics.Process]::Start($pinfo)
    $svc.Process = $proc
}

# Initial Launch
foreach ($svc in $services) {
    Start-WatchedProcess $svc
}

# 1-second watchdog loop
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        foreach ($svc in $services) {
            $proc = $svc.Process
            if ($null -eq $proc -or $proc.HasExited) {
                $svc.Restarts++
                $time = (Get-Date).ToString("HH:mm:ss")
                Write-Host "[$time] [$($svc.Name)] Process has exited! (Restarts: $($svc.Restarts)). Reviving..." -ForegroundColor Yellow
                Start-WatchedProcess $svc
            }
        }
    }
}
finally {
    Write-Host "`nStopping all watched processes..." -ForegroundColor Red
    foreach ($svc in $services) {
        if ($svc.Process -and -not $svc.Process.HasExited) {
            Stop-Process -Id $svc.Process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
