# 6-Step Database Rollback Checklist

## ⚡ Emergency Database Rollback - Quick Reference

### ✅ Step 1: Assess Situation (2-3 min)
```bash
# Quick health checks
psql $DATABASE_URL -c "\dt"  # List tables
psql $DATABASE_URL -c "SELECT count(*) FROM users;" # Test data
```
**Decision:** Database accessible? → Go to Step 3 | Database broken? → Go to Step 2

### ✅ Step 2: Emergency Backup (3-5 min)
```bash
# Create emergency backup if possible
./scripts/db-backup.sh
# OR manual: pg_dump $DATABASE_URL > emergency_$(date +%Y%m%d_%H%M%S).sql
```
**Checkpoint:** Backup created and verified non-zero size

### ✅ Step 3: Stop Services (1-2 min)
```bash
# Stop application
pkill -f "npm run dev" || kill -9 $(lsof -t -i:5000)
# Verify no database connections
lsof -i :5432
```
**Checkpoint:** Application stopped, no active DB connections

### ✅ Step 4: Execute Rollback (5-10 min)
**Choose rollback strategy:**

**Option A - Full Restore (Most Common):**
```bash
# List available backups
ls -la backups/database/nexspace_backup_*.sql
# Restore latest stable backup
./scripts/db-restore.sh TIMESTAMP --force
```

**Option B - Schema Only (Data Preserved):**
```bash
./scripts/db-restore.sh TIMESTAMP --force --schema-only
npm run db:push
```

**Option C - Nuclear Reset (Last Resort):**
```bash
./scripts/db-reset.sh --force
```

**Checkpoint:** Rollback completed without errors

### ✅ Step 5: Verify Integrity (3-5 min)
```bash
# Check critical data
psql $DATABASE_URL << 'EOF'
SELECT count(*) as users FROM users;
SELECT count(*) as facilities FROM facilities; 
SELECT count(*) as staff FROM staff;
SELECT count(*) as shifts FROM shifts;
\dt
EOF
```
**Checkpoint:** Expected row counts, all tables present, no errors

### ✅ Step 6: Restart & Monitor (2-3 min)
```bash
# Restart application
npm run dev
# Test critical endpoints
curl -f http://localhost:5000/health
curl -f http://localhost:5000/api/users/me
```
**Checkpoint:** Application healthy, API responding, users can login

---

## 🚨 Quick Commands Reference

```bash
# Emergency backup
./scripts/db-backup.sh

# Emergency restore (latest)
LATEST=$(ls -t backups/database/nexspace_backup_*.sql | head -1 | sed 's/.*backup_\(.*\)\.sql/\1/')
./scripts/db-restore.sh $LATEST --force

# Nuclear reset
./scripts/db-reset.sh --force

# Health check
psql $DATABASE_URL -c "SELECT 'Database OK' as status;"
```

## 📋 Pre-Incident Checklist

- [ ] Backup scripts are executable (`chmod +x scripts/*.sh`)
- [ ] DATABASE_URL is configured in `.env`
- [ ] PostgreSQL client tools installed (`psql`, `pg_dump`, `dropdb`, `createdb`)
- [ ] Recent backups exist in `backups/database/`
- [ ] Team knows rollback procedure
- [ ] Monitoring alerts configured

## 🎯 Success Criteria

**Rollback is successful when:**
- [ ] Database accessible via `psql $DATABASE_URL`
- [ ] Expected table count present
- [ ] Critical data row counts match expectations
- [ ] Application starts without errors
- [ ] Health endpoints respond
- [ ] Users can authenticate
- [ ] No constraint violations or foreign key errors

## 📞 Escalation

**Escalate immediately if:**
- Rollback fails after 3 attempts
- Data corruption detected in backups
- Application won't start after successful DB restore
- Users report data loss after rollback

**Emergency Contacts:**
- Database Team: [Your DBA contact]
- Platform Team: [Your platform team]
- On-Call Engineer: [Your on-call contact]

---

**Total Time Estimate:** 15-25 minutes for complete rollback  
**Critical Path:** Steps 1, 4, 5 (assessment → rollback → verification)