import { StoreFormInput } from "@repo/shared";
import { prisma } from "../config/database";
import { ConflictError, NotFoundError } from "../errors";
import { deleteImage, uploadImageFromSource } from "./upload.service";

export async function CreateStore(input: StoreFormInput, userId: string) {
  // Check for conflicts first
  const conflict = await prisma.store.findFirst({
    where: {
      OR: [
        { name: input.name },
        { email: input.email },
        { phone: input.phone },
        { url: input.url },
      ],
    },
    select: { name: true, email: true, phone: true, url: true },
  });

  if (conflict) {
    if (conflict.name === input.name) {
      throw new ConflictError('A store with this name already exists');
    }
    if (conflict.email === input.email) {
      throw new ConflictError('A store with this email already exists');
    }
    if (conflict.phone === input.phone) {
      throw new ConflictError('A store with this phone number already exists');
    }
    if (conflict.url === input.url) {
      throw new ConflictError('A store with this URL already exists');
    }
  }

  // Upload images in parallel (independent operations, no need to serialize)
  const [{ secureUrl: logoUrl }, { secureUrl: coverUrl }] = await Promise.all([
    uploadImageFromSource(input.logo[0].url, {
      folder: 'auth-system/stores',
      transformation: [{ width: 400, height: 400, crop: 'limit' }],
    }),
    uploadImageFromSource(input.cover[0].url, {
      folder: 'auth-system/stores',
      transformation: [{ width: 1200, height: 600, crop: 'limit' }],
    }),
  ]);

  // Proceed with upsert (using email as the unique key)
  const store = await prisma.store.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      description: input.description,
      phone: input.phone,
      url: input.url,
      logo: logoUrl,
      cover: coverUrl,
      featured: input.featured,
      status: input.status as any,
    },
    create: {
      name: input.name,
      description: input.description,
      email: input.email,
      phone: input.phone,
      url: input.url,
      logo: logoUrl,
      cover: coverUrl,
      featured: input.featured,
      status: input.status as any,
      userId,
    },
  });

  return store;
}

export async function getStoreById(id: string) {
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) {
    throw new NotFoundError('Store not found');
  }
  return store;
}

export async function getStoreByUrl(url: string) {
  const store = await prisma.store.findUnique({ where: { url } });
  if (!store) {
    throw new NotFoundError('Store not found');
  }
  return store;
}

export async function listStores(filters: { featured?: boolean; status?: string }) {
  const stores = await prisma.store.findMany({
    where: {
      ...(filters.featured !== undefined ? { featured: filters.featured } : {}),
      ...(filters.status !== undefined ? { status: filters.status as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  return stores;
}

export async function deleteStore(id: string) {
  const existing = await prisma.store.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Store not found');
  }

  await prisma.store.delete({ where: { id } });

  // Clean up images
  await deleteImage(existing.logo);
  await deleteImage(existing.cover);
}
