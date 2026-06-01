# MongoDB Seed Script Fix - Progress

✅ **Plan approved** - Fix seedDummyData.js employeeId validation error

## Steps 
- [x] Analyze seed script + User schema
- [ ] 1. Update backend/utils/seedDummyData.js:
  - Add required `employeeId` (USR-0000 for admin, USR-0001+ for sales)
  - Idempotent: Skip existing emails  
  - Per-user try-catch + enhanced logging
- [ ] 2. Test: `node backend/utils/seedDummyData.js`
- [ ] 3. Verify DB: Users have employeeId + hashed passwords
- [ ] 4. Git: New branch + commit + PR

## Test Commands
```bash
# Direct test (clears if needed first)
node backend/utils/seedDummyData.js

# Or restart backend (auto-seeds on connectDB)
cd backend && npm start
```

## Expected Success
```
🌱 Checking if we need to seed data...
➕ Creating Dummy Admin: USR-0000 admin@demo.com  
➕ Creating dummy sales users: USR-0001 sales1@demo.com
✨ Successfully seeded 300 dummy leads!
```

**Common seed mistakes fixed:**
- Missing required fields (employeeId)
- No uniqueness checks  
- Bulk insertMany without validation
