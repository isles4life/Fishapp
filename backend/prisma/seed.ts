import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REGIONS = [
  // Continental US — 10 regions
  { name: 'Pacific Northwest',   minLat: 45.5,  maxLat: 49.0,  minLng: -124.8, maxLng: -116.9 }, // WA, OR
  { name: 'Pacific Southwest',   minLat: 32.5,  maxLat: 42.0,  minLng: -124.5, maxLng: -114.0 }, // CA, NV west
  { name: 'Mountain West',       minLat: 36.9,  maxLat: 49.0,  minLng: -117.0, maxLng: -102.0 }, // MT, ID, WY, UT, CO
  { name: 'Southwest',           minLat: 25.8,  maxLat: 37.0,  minLng: -114.8, maxLng: -103.0 }, // AZ, NM
  { name: 'Great Plains',        minLat: 25.8,  maxLat: 49.0,  minLng: -104.0, maxLng: -94.0  }, // ND, SD, NE, KS, OK, TX panhandle
  { name: 'Midwest',             minLat: 36.5,  maxLat: 49.0,  minLng: -97.0,  maxLng: -80.5  }, // MN, WI, IA, IL, IN, OH, MI, MO
  { name: 'South / Gulf Coast',  minLat: 24.5,  maxLat: 36.5,  minLng: -97.0,  maxLng: -80.0  }, // TX east, LA, MS, AL, AR, TN
  { name: 'Southeast',           minLat: 24.5,  maxLat: 36.6,  minLng: -85.0,  maxLng: -75.4  }, // GA, FL, SC, NC
  { name: 'Mid-Atlantic',        minLat: 36.5,  maxLat: 42.5,  minLng: -80.5,  maxLng: -73.9  }, // VA, WV, MD, DE, NJ, PA
  { name: 'Northeast',           minLat: 40.5,  maxLat: 47.5,  minLng: -79.8,  maxLng: -66.9  }, // NY, CT, RI, MA, VT, NH, ME
  // Territories
  { name: 'Alaska',              minLat: 51.2,  maxLat: 71.5,  minLng: -180.0, maxLng: -129.9 },
  { name: 'Hawaii',              minLat: 18.9,  maxLat: 22.2,  minLng: -160.3, maxLng: -154.8 },
];

async function main() {
  // Upsert all regions
  let firstRegion: { id: string; name: string } | null = null;
  for (const r of REGIONS) {
    const region = await prisma.region.upsert({
      where: { name: r.name },
      update: { minLat: r.minLat, maxLat: r.maxLat, minLng: r.minLng, maxLng: r.maxLng },
      create: r,
    });
    console.log('Seeded region:', region.name);
    if (!firstRegion) firstRegion = region;
  }

  // Seed mat serials MAT-0001 through MAT-0200 (more serials for more regions)
  const serials = Array.from({ length: 200 }, (_, i) => ({
    serialCode: `MAT-${String(i + 1).padStart(4, '0')}`,
    isActive: true,
  }));
  await prisma.matSerial.createMany({ data: serials, skipDuplicates: true });
  console.log('Seeded 200 mat serials');

  // Seed admin user (use Pacific Northwest region)
  const pnw = await prisma.region.findUnique({ where: { name: 'Pacific Northwest' } });
  await prisma.user.upsert({
    where: { email: 'admin@fishleague.com' },
    update: {},
    create: {
      email: 'admin@fishleague.com',
      authProvider: 'EMAIL',
      displayName: 'Admin',
      regionId: (pnw ?? firstRegion!).id,
    },
  });
  console.log('Seeded admin user');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
