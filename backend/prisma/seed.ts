import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed one region – Pacific Northwest
  const region = await prisma.region.upsert({
    where: { name: 'Pacific Northwest' },
    update: {},
    create: {
      name: 'Pacific Northwest',
      minLat: 45.5,
      maxLat: 49.0,
      minLng: -124.5,
      maxLng: -116.9,
    },
  });

  console.log('Seeded region:', region.name);

  // Seed mat serials (QR codes)
  const serials = Array.from({ length: 50 }, (_, i) => ({
    serialCode: `MAT-${String(i + 1).padStart(4, '0')}`,
    isActive: true,
  }));

  await prisma.matSerial.createMany({ data: serials, skipDuplicates: true });
  console.log('Seeded 50 mat serials');

  // Seed admin user
  await prisma.user.upsert({
    where: { email: 'admin@fishleague.com' },
    update: {},
    create: {
      email: 'admin@fishleague.com',
      authProvider: 'EMAIL',
      displayName: 'Admin',
      regionId: region.id,
    },
  });

  console.log('Seeded admin user');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
