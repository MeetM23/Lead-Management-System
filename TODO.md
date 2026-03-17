# Login API Fix - Progress Tracker

## Current Status
✅ **Backend controller already correct** (bcrypt.compare + async/await + JWT + proper responses)

## Steps Completed
- [x] Analyzed all files (controller, routes, models, frontend)
- [x] Created this TODO.md
- [x] Confirmed root cause (likely config/database, not code)

## Implementation Steps (Backend Polish)
- [ ] 1. Convert backend/utils/generateToken.js to ESM + update expiry to \"30d\"
- [ ] 2. **Delete legacy** backend/routes/auth.js (broken plain-text comparison)
- [ ] 3. Update backend/controllers/authController.js:
  - Import/use generateToken utility
  - Add debug console.logs (user found, password match)
- [ ] 4. Test API directly:
  ```
  curl -X POST http://localhost:5000/api/auth/login \\
  -H \"Content-Type: application/json\" \\
  -d \"{\\\"email\\\":\\\"admin@demo.com\\\",\\\"password\\\":\\\"password123\\\"}\"
  ```

## Post-Edit Steps
- [ ] 5. **Frontend config**: Verify frontend/.env has `VITE_API_URL=http://localhost:5000`
- [ ] 6. **Database check**: MongoDB User.password = hashed (~60 chars), not plain
- [ ] 7. Restart servers: backend (`cd backend && npm start`), frontend (`cd frontend && npm run dev`)
- [ ] 8. Test full login flow in browser
- [ ] 9. ✅ Task complete!

## Common Fixes Applied
- ✅ bcrypt.compare(plain, hash) order correct
- ✅ async/await on findOne/compare
- ✅ Proper error messages
- ✅ JWT token generation
- ✅ User data on success

---

**Next Action**: Update generateToken.js → Delete auth.js → Edit controller → Test
