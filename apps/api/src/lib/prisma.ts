// import "dotenv/config";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "../generated/prisma/client";

// const connectionString = `${process.env.DATABASE_URL}`;

// const adapter = new PrismaPg({ connectionString });

// const globalWithPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };
// export const prisma = globalWithPrisma.prisma ?? new PrismaClient({ adapter });

// if (process.env.NODE_ENV !== 'production') {
//   globalWithPrisma.prisma = prisma;
// }