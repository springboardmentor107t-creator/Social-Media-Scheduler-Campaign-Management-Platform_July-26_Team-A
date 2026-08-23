param(
    [Parameter(Mandatory=$true)][string]$BackupDirectory,
    [Parameter(Mandatory=$true)][string]$RecoveryMongoUrl
)

$ErrorActionPreference = "Stop"
$restoreDatabase = "socialpilot_recovery_test"
$postgresUrl = $env:DATABASE_URL -replace "/[^/]+$", "/$restoreDatabase"
$restoreMongoServerUrl = $RecoveryMongoUrl -replace "/[^/]+(?=\?|$)", ""

createdb --dbname="$env:DATABASE_URL" "$restoreDatabase"
try {
    pg_restore --dbname="$postgresUrl" --clean --if-exists (Join-Path $BackupDirectory "postgres.dump")
    mongorestore --uri="$restoreMongoServerUrl" --archive=(Join-Path $BackupDirectory "mongodb.archive.gz") --gzip --drop --nsFrom="socialpilot_db.*" --nsTo="socialpilot_recovery_test.*"
    $tableCount = psql --dbname="$postgresUrl" --tuples-only --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
    if ([int]$tableCount.Trim() -lt 1) { throw "PostgreSQL restore contains no public tables." }
    mongosh "$RecoveryMongoUrl" --quiet --eval "db.runCommand({ping: 1}).ok" | Out-Null
    Write-Output "PostgreSQL and MongoDB restore verification passed."
}
finally {
    dropdb --dbname="$env:DATABASE_URL" "$restoreDatabase"
}