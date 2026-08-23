param(
    [string]$OutputDirectory = "./backups"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDirectory = Join-Path $OutputDirectory $timestamp
New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null

pg_dump --dbname="$env:DATABASE_URL" --format=custom --file=(Join-Path $backupDirectory "postgres.dump")
mongodump --uri="$env:MONGODB_URL" --archive=(Join-Path $backupDirectory "mongodb.archive.gz") --gzip

Get-ChildItem $backupDirectory | Select-Object Name, Length
Write-Output "Backup created at $backupDirectory"