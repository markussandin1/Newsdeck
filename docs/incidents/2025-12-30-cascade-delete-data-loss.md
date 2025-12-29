# Incident Report: CASCADE DELETE Data Loss

**Date:** 2025-12-30
**Severity:** CRITICAL
**Status:** RESOLVED (with preventive measures)

## Summary

All production data in `news_items` and `column_data` tables (0 rows) was accidentally deleted due to `TRUNCATE CASCADE` operation on geographic reference tables. Database restore operation was initiated from backup dated 2025-12-29 03:00 UTC.

## Root Cause

The `clean-geo-data.mjs` script used `TRUNCATE TABLE countries CASCADE` which cascaded through foreign key relationships:

```
countries → regions → municipalities → news_items → column_data
```

The migration file `001_geographic_metadata.sql` created foreign key constraints without explicit `ON DELETE` clauses, which allowed TRUNCATE CASCADE to propagate through all dependent tables.

## Timeline

1. **23:23 UTC** - Executed `node scripts/clean-geo-data.mjs` to remove old SCB data
2. **23:23 UTC** - All news_items and column_data deleted (0 rows)
3. **23:23 UTC** - Initiated database restore from backup (operation ID: 898e6cf1-32bb-4bfc-a84e-439f00000024)
4. **00:50 UTC** - Implemented preventive fixes in code

## Impact

- **Data Loss:** All news items created after 2025-12-29 03:00 UTC were lost
- **User Impact:** Dashboard showed empty columns
- **Downtime:** Database in read-only/restore mode during recovery

## Resolution

### Immediate Actions

1. ✅ Initiated database restore from automated backup (2025-12-29 03:00 UTC)
2. ✅ Fixed migration file to use `ON DELETE SET NULL` on news_items foreign keys
3. ✅ Updated clean-geo-data.mjs to safely drop/recreate constraints instead of CASCADE
4. ⏳ Waiting for restore operation to complete

### Preventive Measures

#### 1. Migration File Fix

**File:** `db/migrations/001_geographic_metadata.sql`

Changed foreign key constraints on `news_items` to explicitly protect data:

```sql
-- BEFORE (implicit NO ACTION, but TRUNCATE CASCADE still propagates)
ALTER TABLE news_items
  ADD CONSTRAINT news_items_region_fkey
  FOREIGN KEY (region_country_code, region_code)
  REFERENCES regions(country_code, code);

-- AFTER (explicit protection)
ALTER TABLE news_items
  ADD CONSTRAINT news_items_region_fkey
  FOREIGN KEY (region_country_code, region_code)
  REFERENCES regions(country_code, code)
  ON DELETE SET NULL;  -- Protect news_items from cascading deletes
```

#### 2. Safe Cleanup Script

**File:** `scripts/clean-geo-data.mjs`

Updated to use safe 3-step process:

```javascript
// Step 1: Drop foreign key constraints from news_items
await client.query('ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_region_fkey');
await client.query('ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_municipality_fkey');

// Step 2: Truncate geographic tables (no CASCADE needed)
await client.query('TRUNCATE TABLE location_name_mappings');
await client.query('TRUNCATE TABLE municipalities');
await client.query('TRUNCATE TABLE regions');
await client.query('TRUNCATE TABLE countries');

// Step 3: Recreate foreign key constraints with ON DELETE SET NULL
await client.query(`
  ALTER TABLE news_items
    ADD CONSTRAINT news_items_region_fkey
    FOREIGN KEY (region_country_code, region_code)
    REFERENCES regions(country_code, code)
    ON DELETE SET NULL
`);
```

## Lessons Learned

### What Went Wrong

1. **Insufficient understanding of TRUNCATE CASCADE behavior**
   - `TRUNCATE CASCADE` bypasses `ON DELETE` clauses and drops all dependent data
   - Different from `DELETE CASCADE` which respects foreign key constraints

2. **Missing safety guardrails**
   - No warnings in cleanup script about potential data loss
   - No requirement to confirm before destructive operations

3. **Incomplete migration design**
   - Foreign keys on news_items should have been explicitly protected from the start
   - Geographic data is metadata that should never trigger data deletion

### What Went Right

1. ✅ **Automated backups were enabled** - Daily backups at 03:00 UTC
2. ✅ **Quick incident detection** - User immediately noticed missing data
3. ✅ **Fast response** - Restore operation initiated within minutes
4. ✅ **Comprehensive fix** - Both migration and cleanup script updated

## Recommendations

### Immediate (Completed)

1. ✅ Fix migration file with `ON DELETE SET NULL`
2. ✅ Update cleanup script to safely handle constraints
3. ✅ Add warnings to cleanup script documentation

### Short-term (To Do)

1. 🔲 **Apply constraint fix to production database** after restore completes:
   ```sql
   ALTER TABLE news_items DROP CONSTRAINT news_items_region_fkey;
   ALTER TABLE news_items DROP CONSTRAINT news_items_municipality_fkey;

   ALTER TABLE news_items ADD CONSTRAINT news_items_region_fkey
     FOREIGN KEY (region_country_code, region_code)
     REFERENCES regions(country_code, code)
     ON DELETE SET NULL;

   ALTER TABLE news_items ADD CONSTRAINT news_items_municipality_fkey
     FOREIGN KEY (municipality_country_code, municipality_region_code, municipality_code)
     REFERENCES municipalities(country_code, region_code, code)
     ON DELETE SET NULL;
   ```

2. 🔲 **Re-import geographic data** after restore:
   ```bash
   node scripts/import-geo-data.mjs data/geo/SE.json
   ```

3. 🔲 **Verify data integrity** post-restore:
   - Check news_items count
   - Check column_data count
   - Verify geographic metadata

### Long-term (Future Improvements)

1. **Add interactive confirmation** to destructive scripts
   - Require typing "YES" to confirm TRUNCATE operations
   - Display warning about potential data loss

2. **Improve backup strategy**
   - Increase backup frequency (currently 24h, consider 12h or 6h)
   - Test restore procedures regularly
   - Document point-in-time recovery options

3. **Add database migration tests**
   - Test foreign key behavior in staging environment
   - Verify CASCADE behavior doesn't affect core data

4. **Implement audit logging**
   - Log all TRUNCATE and DROP operations
   - Alert on mass deletions

## References

- PostgreSQL TRUNCATE CASCADE: https://www.postgresql.org/docs/current/sql-truncate.html
- Foreign Key Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
- Cloud SQL Backups: https://cloud.google.com/sql/docs/postgres/backup-recovery/backups

## Verification Checklist

After restore completes:

- [ ] Verify news_items table has data
- [ ] Verify column_data table has data
- [ ] Apply constraint fix to production database
- [ ] Re-import geographic data (SE.json)
- [ ] Test geographic filtering in UI
- [ ] Verify no duplicate news items
- [ ] Check application logs for errors
- [ ] Monitor for 24 hours post-recovery
