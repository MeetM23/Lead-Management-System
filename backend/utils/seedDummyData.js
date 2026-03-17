import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Lead from "../models/Lead.js";

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

const seedDummyData = async () => {
    if (process.env.NODE_ENV === 'production') {
        console.log('🚫 Production mode - skipping seed');
        return;
    }

    try {
        console.log('🌱 Starting dummy data seeding...');

        // 1. Create/Verify Admin (USR-0000)
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            adminUser = await User.create({
                name: 'Admin User',
                email: 'admin@demo.com',
                password: hashedPassword,
                role: 'admin',
                employeeId: 'USR-0000',
                isActive: true
            });
            console.log('➕ Created Admin: USR-0000', adminUser.email);
        }

        // 2. Create Sales Users if needed (USR-0001+)
        const existingSalesCount = await User.countDocuments({ role: 'sales' });
        const targetSalesCount = 10;
        
        if (existingSalesCount < targetSalesCount) {
            console.log(`➕ Need ${targetSalesCount - existingSalesCount} sales users...`);
            const hashedPassword = await bcrypt.hash('password123', 10);
            const newUsers = [];

            for (let i = 0; i < targetSalesCount - existingSalesCount; i++) {
                const nextIdNum = existingSalesCount + i + 1;
                const name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
                const email = `sales${nextIdNum}@demo.com`;
                
                // Check if email already exists (idempotent)
                const existingUser = await User.findOne({ email });
                if (!existingUser) {
                    newUsers.push({
                        name,
                        email,
                        password: hashedPassword,
                        role: 'sales',
                        employeeId: `USR-${padId(nextIdNum)}`,
                        isActive: true,
                        phone: `+91 98${getRandomInt(10000000, 99999999)}`
                    });
                } else {
                    console.log(`⏭️ Skipping existing: ${email}`);
                }
            }

            if (newUsers.length > 0) {
                const createdUsers = await User.insertMany(newUsers);
                console.log(`✅ Created ${createdUsers.length} sales users`);
                createdUsers.forEach(user => {
                    console.log(`  📋 USR-${padId(user.employeeId.split('-')[1])}: ${user.email}`);
                });
            }
        }

        // 3. Get all sales users for lead assignment
        const salesUsers = await User.find({ role: 'sales' });
        if (salesUsers.length === 0) {
            console.log('❌ No sales users - cannot create leads');
            return;
        }

        // 4. Check if leads exist
        const leadCount = await Lead.countDocuments();
        if (leadCount > 50) {
            console.log(`✅ Enough leads exist (${leadCount}) - skipping`);
            return;
        }

        // 5. Generate Leads
        console.log('➕ Creating dummy leads...');
        const leads = [];
        const numLeads = 300;

        for (let i = 0; i < numLeads; i++) {
            const rand = Math.random();
            let status = rand < 0.3 ? 'New' : rand < 0.8 ? 'Converted' : 'Lost';

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
            if (status === 'Converted') {
                notes.push({
                    content: 'Deal closed successfully!',
                    createdBy: assignedUser._id,
                    createdAt: new Date()
                });
            } else if (status === 'Lost') {
                notes.push({
                    content: 'Client budget constraints.',
                    createdBy: assignedUser._id,
                    createdAt: new Date()
                });
            }

            leads.push({
                leadId: `LD-${padId(i + 1)}`,
                name,
                email: name.toLowerCase().replace(/ /g, '.') + '@example.com',
                phone: `+91 9${getRandomInt(100000000, 999999999)}`,
                source: getRandomElement(sources),
                priority: 'Medium',
                status,
                createdBy: adminUser._id,
                assignedTo: assignedUser._id,
                notes,
                createdAt,
                updatedAt: createdAt
            });
        }

        await Lead.insertMany(leads);
        console.log(`✨ Seeded ${leads.length} leads successfully!`);
        console.log('🎉 All dummy data seeded!');

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        if (error.name === 'ValidationError') {
            console.error('Validation issues:', Object.keys(error.errors));
        }
        throw error; // Re-throw for connectDB caller
    }
};

export default seedDummyData;

