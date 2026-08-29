/*
 * Creates one user per role so you can log in and test the full workflow
 * immediately after setup. Run with: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const SEED_USERS = [
  { name: 'Employee One', email: 'employee@demo.com', password: 'password123', role: 'employee', department: 'Engineering' },
  { name: 'Approver One', email: 'approver@demo.com', password: 'password123', role: 'approver', department: 'Engineering' },
  { name: 'Admin One', email: 'admin@demo.com', password: 'password123', role: 'admin', department: 'Operations' }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  for (const u of SEED_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (exists) { console.log(`Skipping ${u.email} (already exists)`); continue; }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, passwordHash });
    console.log(`Created ${u.role}: ${u.email} / ${u.password}`);
  }
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
