import 'dotenv/config.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ROLES, USER_STATUS } from '../constants/index.js';

const createAdmin = async () => {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI) {
    console.error('Missing MONGO_URI in environment');
    process.exit(1);
  }

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);

    const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.role !== ROLES.ADMIN) {
        existing.role = ROLES.ADMIN;
      }
      existing.status = USER_STATUS.APPROVED;
      existing.name = ADMIN_NAME;
      if (ADMIN_PASSWORD) {
        existing.password = ADMIN_PASSWORD;
      }
      await existing.save();

      console.log(`Updated existing user as admin: ${existing.email}`);
    } else {
      const admin = await User.create({
        name: ADMIN_NAME,
        email: normalizedEmail,
        password: ADMIN_PASSWORD,
        role: ROLES.ADMIN,
        status: USER_STATUS.APPROVED,
      });

      console.log(`Created admin user: ${admin.email}`);
    }

    console.log('Done');
  } catch (error) {
    console.error(`Failed to create admin: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
