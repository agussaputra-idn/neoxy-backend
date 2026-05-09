const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Neoxy.io Database Connection Test ---');

  try {
    // 1. Create a Global Test User
    const testUser = await prisma.user.upsert({
      where: { email: 'global.hero@neoxy.io' },
      update: {},
      create: {
        email: 'global.hero@neoxy.io',
        name: 'Eco Warrior',
      },
    });
    console.log('✅ User created or verified:', testUser.name);

    // 2. Create a Test Device for this user
    const testDevice = await prisma.device.create({
      data: {
        userId: testUser.id,
        deviceName: 'MacBook Pro Retina',
        deviceType: 'laptop',
        operatingSystem: 'macOS',
        isIotEnabled: false,
      },
    });
    console.log('✅ Test Device registered:', testDevice.deviceName);

    // 3. Create an initial Sustainability Log
    const initialLog = await prisma.sustainabilityLog.create({
      data: {
        deviceId: testDevice.id,
        actionType: 'unplugged_manual',
        energySavedWh: 0.0, // Initializing
        carbonSaved: 0.0,
      },
    });
    console.log('✅ Initial Sustainability Log generated.');

    console.log('\n🚀 CONNECTION SUCCESSFUL! Neoxy is ready to save the planet.');
  } catch (error) {
    console.error('❌ CONNECTION FAILED:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();