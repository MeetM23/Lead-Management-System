
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import { ROLES } from "../constants/index.js";

const firstNames = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "James", "Isabella", "Oliver"
];

const lastNames = [
    "Sharma", "Patel", "Verma", "Singh", "Kumar", "Gupta", "Malhotra", "Bhatia", "Mehta", "Joshi",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"
];

const sources = ["Referral", "LinkedIn", "Advertisement", "Manual", "Website"];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - getRandomInt(0, 30));
    return d;
};

// Pad number to 4 digits
const padId = (num) => String(num).padStart(4, '0');

const MIN_DEMO_PASSWORD_LENGTH = 8;

// Returns why seeding must not run, or null when it is explicitly allowed.
// Seeding needs ALL of: ENABLE_SEEDING=true, NODE_ENV of development/test, and a password for the demo accounts.
// Production is always blocked, whatever the other settings are.
export const getSeedingBlockReason = (env = process.env) => {
    if (env.NODE_ENV === 'production') return 'seeding is never allowed in production';
    if (env.ENABLE_SEEDING !== 'true') return 'ENABLE_SEEDING is not set to "true"';
    if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') return 'NODE_ENV must be "development" or "test"';
    if (!env.SEED_DEMO_PASSWORD || env.SEED_DEMO_PASSWORD.length < MIN_DEMO_PASSWORD_LENGTH) {
        return `SEED_DEMO_PASSWORD must be set (at least ${MIN_DEMO_PASSWORD_LENGTH} characters)`;
    }
    return null;
};

const seedDummyData = async (env = process.env) => {
    const blockReason = getSeedingBlockReason(env);
    if (blockReason) {
        console.log(`🚫 Seeding skipped: ${blockReason}`);
        return false;
    }

    try {
        console.log('🌱 Starting dummy data seeding...');

        // 1. Create/Verify Admin (USR-0000)
        let adminUser = await User.findFirstByRole(ROLES.ADMIN);
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash(env.SEED_DEMO_PASSWORD, 10);
            adminUser = await User.createUser({
                name: 'Admin User',
                email: 'admin@demo.com',
                password: hashedPassword,
                role: ROLES.ADMIN,
                employeeId: 'USR-0000',
                isActive: true
            });
            console.log('➕ Created Admin: USR-0000', adminUser.email);
        }

        // 2. Create Sales Users if needed (USR-0001+)
        const existingSalesCount = await User.countByRole(ROLES.SALES);
        const targetSalesCount = 10;

        if (existingSalesCount < targetSalesCount) {
            console.log(`➕ Need ${targetSalesCount - existingSalesCount} sales users...`);
            const hashedPassword = await bcrypt.hash(env.SEED_DEMO_PASSWORD, 10);
            const newUsers = [];

            for (let i = 0; i < targetSalesCount - existingSalesCount; i++) {
                const nextIdNum = existingSalesCount + i + 1;
                const name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
                const email = `sales${nextIdNum}@demo.com`;

                // Check if email already exists (idempotent)
                if (!(await User.findByEmail(email))) {
                    newUsers.push({
                        name,
                        email,
                        password: hashedPassword,
                        role: ROLES.SALES,
                        employeeId: `USR-${padId(nextIdNum)}`,
                        isActive: true,
                        phone: `+91 98${getRandomInt(10000000, 99999999)}`
                    });
                } else {
                    console.log(`⏭️ Skipping existing: ${email}`);
                }
            }

            if (newUsers.length > 0) {
                const createdCount = await User.createManyUsers(newUsers);
                console.log(`✅ Created ${createdCount} sales users`);
                newUsers.forEach(user => {
                    console.log(`  📋 ${user.employeeId}: ${user.email}`);
                });
            }
        }

        // 3. Get all sales users for lead assignment
        const salesUsers = await User.listByRole(ROLES.SALES);
        if (salesUsers.length === 0) {
            console.log('❌ No sales users - cannot create leads');
            return;
        }

        // 4. Check if leads exist
        const leadCount = await Lead.countAll();
        if (leadCount > 50) {
            console.log(`✅ Enough leads exist (${leadCount}) - skipping`);
            return;
        }

        // 5. Generate Leads (IDs come from the same generator as real leads)
        console.log('➕ Creating dummy leads...');
        const leads = [];
        const numLeads = 300;

        for (let i = 0; i < numLeads; i++) {
            const name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
            const assignedUser = getRandomElement(salesUsers);
            const createdAt = getRandomDate();

            const notes = [];
            if (Math.random() > 0.5) {
                notes.push({
                    content: 'Initial contact made via LinkedIn.',
                    createdBy: assignedUser._id,
                    createdAt: createdAt
                });
            }

            leads.push({
                name,
                email: name.toLowerCase().replace(/ /g, '.') + '@example.com',
                phone: `+91 9${getRandomInt(100000000, 999999999)}`,
                source: getRandomElement(sources),
                priority: 'Medium',
                createdBy: adminUser._id,
                assignedTo: assignedUser._id,
                notes,
                createdAt,
                updatedAt: createdAt
            });
        }

        await Lead.createDemoLeads(leads);
        console.log(`✨ Seeded ${leads.length} leads successfully!`);
        console.log('🎉 All dummy data seeded!');

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        throw error;
    }
};

export default seedDummyData;
