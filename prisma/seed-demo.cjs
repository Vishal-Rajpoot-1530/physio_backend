const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const demoEmail = 'demo@gymtest.com';
const demoPassword = 'GymDemo123!';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to create the demo account in production.');
  }

  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const admin = await prisma.admin.upsert({
    where: { email: demoEmail },
    update: {
      name: 'Gym Demo User',
      passwordHash,
      type: 'online',
      phone: '0000000000',
      isActive: true,
    },
    create: {
      name: 'Gym Demo User',
      email: demoEmail,
      passwordHash,
      type: 'online',
      phone: '0000000000',
      isActive: true,
    },
  });

  for (const [months, fee] of [
    [1, 65],
    [3, 180],
    [6, 340],
    [12, 620],
  ]) {
    await prisma.plan.upsert({
      where: { adminId_months: { adminId: admin.id, months } },
      update: { fee },
      create: { adminId: admin.id, months, fee },
    });
  }

  const now = new Date();
  const existingSubscription = await prisma.appSubscription.findFirst({
    where: { adminId: admin.id },
    orderBy: { endDate: 'desc' },
  });
  const subscription = {
    plan: 'monthly',
    price: 150,
    startDate: now,
    endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    status: 'active',
  };

  if (existingSubscription) {
    await prisma.appSubscription.update({
      where: { id: existingSubscription.id },
      data: subscription,
    });
  } else {
    await prisma.appSubscription.create({
      data: { ...subscription, adminId: admin.id },
    });
  }

  console.log(`Demo account ready: ${demoEmail}`);
}

main()
  .catch((error) => {
    console.error('Could not seed the demo account:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
