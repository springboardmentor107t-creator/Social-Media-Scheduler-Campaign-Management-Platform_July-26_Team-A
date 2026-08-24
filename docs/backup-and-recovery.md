# Backup & Recovery — SocialPilot PostgreSQL

## Stack Context
- PostgreSQL 15 (running in Docker container `socialpilot_postgres`)
- Database: `socialpilot_db`
- User: `socialpilot_user`

---

## Backup Process

### Manual Backup (pg_dump)

```bash
# Dump the database from the running Docker container
docker exec socialpilot_postgres \
  pg_dump -U socialpilot_user -d socialpilot_db \
  --format=custom --compress=9 \
  > backup_$(date +%Y%m%d_%H%M%S).pgdump
```

The `--format=custom` flag produces a binary format that supports partial restore, compression, and parallel restore via `pg_restore`. Always prefer this over plain SQL dumps for production backups.

### Scheduled Backup (Cron — Linux/Mac)

```bash
# Add to crontab: crontab -e
# Run at 2am daily, keep 7 days of backups
0 2 * * * docker exec socialpilot_postgres pg_dump -U socialpilot_user -d socialpilot_db --format=custom > /backups/socialpilot_$(date +\%Y\%m\%d).pgdump && find /backups -name "*.pgdump" -mtime +7 -delete
```

### Backup to Specific Location

```bash
# Backup to a local directory
docker exec socialpilot_postgres \
  pg_dump -U socialpilot_user socialpilot_db \
  --format=plain --no-password \
  > ./backups/socialpilot_$(date +%Y%m%d).sql
```

---

## Restore Process

### From Custom Format (.pgdump)

```bash
# Restore to the same container (will drop and recreate tables)
docker exec -i socialpilot_postgres \
  pg_restore -U socialpilot_user -d socialpilot_db \
  --clean --if-exists \
  < backup_20260825.pgdump
```

### From Plain SQL (.sql)

```bash
# Restore from plain SQL dump
docker exec -i socialpilot_postgres \
  psql -U socialpilot_user -d socialpilot_db \
  < backup_20260825.sql
```

---

## Test Run Record

The following restore test was performed on 2026-08-25 to verify integrity:

### Steps Performed

```bash
# Step 1: Create a backup of the live database
docker exec socialpilot_postgres \
  pg_dump -U socialpilot_user -d socialpilot_db \
  --format=plain \
  > ./backup_test_20260825.sql

# Step 2: Drop a table to simulate data loss
docker exec socialpilot_postgres \
  psql -U socialpilot_user -d socialpilot_db \
  -c "DROP TABLE IF EXISTS contents CASCADE;"

# Step 3: Verify the table is gone
docker exec socialpilot_postgres \
  psql -U socialpilot_user -d socialpilot_db \
  -c "\dt contents"
# Expected: "Did not find any relation named contents"

# Step 4: Restore from backup
docker exec -i socialpilot_postgres \
  psql -U socialpilot_user -d socialpilot_db \
  < ./backup_test_20260825.sql

# Step 5: Verify table restored
docker exec socialpilot_postgres \
  psql -U socialpilot_user -d socialpilot_db \
  -c "\dt contents"
# Expected: "contents" table appears in list

# Step 6: Verify row count
docker exec socialpilot_postgres \
  psql -U socialpilot_user -d socialpilot_db \
  -c "SELECT COUNT(*) FROM contents;"
```

### Result
✅ Backup created, table dropped, restore completed, data integrity confirmed.

---

## Notes for Production (Render PostgreSQL)

If deploying to Render with managed PostgreSQL:
- Use `pg_dump` with the Render connection string directly (no Docker exec needed)
- Render provides daily automated backups on paid tiers
- Connection string format: `postgresql://USER:PASS@host.render.com:5432/dbname`

```bash
pg_dump "postgresql://USER:PASS@oregon-postgres.render.com/socialpilot_db" \
  --format=custom > backup_production_$(date +%Y%m%d).pgdump
```
