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

// Generate realistic dummy data
const seedDummyData = async () => {
    // Only run in development
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    try {
        console.log("🌱 Checking if we need to seed data...");

        const leadCount = await Lead.countDocuments();
        if (leadCount > 5) {
            console.log("✅ Database already has leads (" + leadCount + "). Skipping seed.");
            return;
        }

        console.log("🚀 Seeding dummy data...");

        // 1. Ensure we have sales users
        const salesUsersCount = await User.countDocuments({ role: "sales" });
        let salesUsers = await User.find({ role: "sales" });
        let adminUser = await User.findOne({ role: "admin" });

        // If no admin, find ANY user to be the 'creator', or create one
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash("password123", 10);
            adminUser = await User.create({
                name: "Admin User",
                email: "admin@demo.com",
                password: hashedPassword,
                role: "admin",
                isActive: true
            });
            console.log("➕ Created Dummy Admin: admin@demo.com");
        }

        if (salesUsersCount < 5) {
            console.log("➕ Creating dummy sales users...");
            const hashedPassword = await bcrypt.hash("password123", 10);
            const newUsers = [];

            for (let i = 0; i < 10; i++) {
                const name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
                newUsers.push({
                    name,
                    email: `sales${salesUsersCount + i + 1}@demo.com`,
                    password: hashedPassword,
                    role: "sales",
                    isActive: true,
                    phone: `+91 98${getRandomInt(10000000, 99999999)}`
                });
            }

            const createdUsers = await User.insertMany(newUsers);
            salesUsers = [...salesUsers, ...createdUsers];
            console.log(`✅ Added ${createdUsers.length} sales users.`);
        }

        // 2. Refresh lists
        salesUsers = await User.find({ role: "sales" });
        if (salesUsers.length === 0) {
            console.log("❌ Error: No sales users available to assign leads.");
            return;
        }

        // 3. Generate Leads
        const leads = [];
        const numLeads = 300; // Updated to 300 as requested

        // Distributions intended:
        // 30% New, 50% Converted, 20% Lost

        for (let i = 0; i < numLeads; i++) {
            const rand = Math.random();
            let status;
            // Distribution: 30% New, 50% Converted, 20% Lost
            if (rand < 0.3) status = "New";
            else if (rand < 0.8) status = "Converted";
            else status = "Lost";

            const name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
            const assignedUser = getRandomElement(salesUsers);
            const createdAt = getRandomDate(); // Random date in last 30 days

            // Fix createdAt for the status flow if needed? 
            // Actually random date is fine, just ensures charts look populated.

            // Construct notes
            const notes = [];
            if (Math.random() > 0.5) {
                notes.push({
                    content: "Initial contact made via LinkedIn.",
                    createdBy: assignedUser._id,
                    createdAt: createdAt
                });
            }
            if (status === 'Converted') {
                notes.push({
                    content: "Deal closed successfully!",
                    createdBy: assignedUser._id,
                    createdAt: new Date()
                });
            } else if (status === 'Lost') {
                notes.push({
                    content: "Client budget constraints.",
                    createdBy: assignedUser._id,
                    createdAt: new Date()
                });
            }

            leads.push({
                leadId: `LEAD-${1000 + i}`,
                name: name,
                email: name.toLowerCase().replace(" ", ".") + "@example.com",
                phone: `+91 9${getRandomInt(100000000, 999999999)}`,
                source: getRandomElement(sources),
                priority: "Medium", // Default to Medium per request
                status: status,
                createdBy: adminUser._id,
                assignedTo: assignedUser._id,
                notes: notes,
                createdAt: createdAt,
                updatedAt: createdAt
            });
        }

        await Lead.insertMany(leads);
        console.log(`✨ Successfully seeded ${leads.length} dummy leads!`);
        console.log("✅ Seeding Complete.");

    } catch (error) {
        console.error("❌ Seeding failed:", error);
    }
};

export default seedDummyData;
