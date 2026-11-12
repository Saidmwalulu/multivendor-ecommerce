import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client'; // use the same import as your PrismaService
import countries from './countries.json';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.country.createMany({
    data: countries,
    skipDuplicates: true, // safe to run more than once
  });

  console.log(`Seeded ${result.count} new countries (${countries.length} in file)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());