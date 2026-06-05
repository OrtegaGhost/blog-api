'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seed...');

  const hashedPassword = await bcrypt.hash('Admin1234', 12);

  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@blog.com',
      username: 'admin',
      password: hashedPassword,
      profilePhoto: null,
    },
  });

  await prisma.comment.createMany({
    skipDuplicates: true,
    data: [
      { content: 'Welcome to the blog!', userId: user.id },
      { content: 'This is a sample comment.', userId: user.id },
    ],
  });

  console.log('[Seed] Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
