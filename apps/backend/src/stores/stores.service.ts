import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { resolveImage } from '../common/utils/resolve-image.util';
import type { ShippingDetailsDto, ShippingRateDto, StoreFormDto } from '@repo/shared';
import { Role, StoreStatus } from '@prisma/client';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService, private cloudinary: CloudinaryService) {}

  async create(userId: string, dto: StoreFormDto) {
    const [existingEmail, existingUrl] = await Promise.all([
      this.prisma.store.findUnique({ where: { email: dto.email } }),
      this.prisma.store.findUnique({ where: { url: dto.url } }),
    ]);
    if (existingEmail) throw new ConflictException('Store email already in use');
    if (existingUrl) throw new ConflictException('Store URL slug already exists');

    // logo/cover can each be a base64 data URI (we upload it to Cloudinary
    // ourselves and track the public_id) or an already-hosted URL (stored
    // as-is, no public_id — nothing for us to clean up later).
    const [logo, cover] = await Promise.all([
      resolveImage(this.cloudinary, dto.logo[0].url),
      resolveImage(this.cloudinary, dto.cover[0].url),
    ]);

    // status/featured are deliberately NOT taken from dto here — every store
    // starts PENDING and non-featured regardless of what was sent; those are
    // only ever changed through the admin-only endpoints below.
    const store = await this.prisma.store.create({
      data: {
        name: dto.name,
        description: dto.description,
        email: dto.email,
        phone: dto.phone,
        url: dto.url,
        logo: logo.url,
        logoId: logo.imageId,
        cover: cover.url,
        coverId: cover.imageId,
        userId,
      },
    });

    // First store makes a plain USER a SELLER — matches how the role-gated
    // parts of the app (e.g. product management) will check `role === SELLER`.
    await this.prisma.user.updateMany({
      where: { id: userId, role: Role.USER },
      data: { role: Role.SELLER },
    });

    return store;
   }

    // Admin sees every store regardless of status; a seller sees only
    // their own stores (any status); anyone else falls back to public browsing.
    async findAll(userId: string, role: Role) {
        if (role === Role.ADMIN) {
            return this.prisma.store.findMany({
                orderBy: { createdAt: 'desc' },
            });
        }

        if (role === Role.SELLER) {
            return this.prisma.store.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        }

        return this.prisma.store.findMany({
            where: { status: StoreStatus.ACTIVE },
            orderBy: { createdAt: 'desc' },
        });
    }

  async findByUrl(url: string) {
    const store = await this.prisma.store.findUnique({ where: { url } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

   async findById(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async assertOwnerOrAdmin(storeId: string, userId: string, role: Role) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.userId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('You do not own this store');
    }
    return store;
  }

  // Owner-editable fields only — status/featured excluded on purpose, same
  // reasoning as create(): those are admin-controlled, not owner-controlled.
  async update(
    storeId: string,
    userId: string,
    role: Role,
    dto: Partial<Pick<StoreFormDto, 'name' | 'description' | 'phone' | 'logo' | 'cover' | 'url'>>,
  ) {
    const store = await this.assertOwnerOrAdmin(storeId, userId, role);

    if (dto.url && dto.url !== store.url) {
      const existingUrl = await this.prisma.store.findUnique({ where: { url: dto.url } });
      if (existingUrl) throw new ConflictException('Store URL slug already exists');
    }

    // Replacing an image we previously uploaded ourselves — clean up the old
    // Cloudinary asset before storing the new one, same pattern as categories.
    let logoUpdate: { logo?: string; logoId?: string | null } = {};
    if (dto.logo) {
      if (store.logoId) await this.cloudinary.deleteImage(store.logoId);
      const logo = await resolveImage(this.cloudinary, dto.logo[0].url);
      logoUpdate = { logo: logo.url, logoId: logo.imageId };
    }

    let coverUpdate: { cover?: string; coverId?: string | null } = {};
    if (dto.cover) {
      if (store.coverId) await this.cloudinary.deleteImage(store.coverId);
      const cover = await resolveImage(this.cloudinary, dto.cover[0].url);
      coverUpdate = { cover: cover.url, coverId: cover.imageId };
    }

    return this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.url && { url: dto.url }),
        ...logoUpdate,
        ...coverUpdate,
      },
    });
  }

  async remove(storeId: string, userId: string, role: Role) {
    const store = await this.assertOwnerOrAdmin(storeId, userId, role);

    if (store.logoId) await this.cloudinary.deleteImage(store.logoId);
    if (store.coverId) await this.cloudinary.deleteImage(store.coverId);

    await this.prisma.store.delete({ where: { id: storeId } });
    return { message: 'Store deleted successfully' };
  }

  // ---------- Admin-only ----------

  async updateStatus(storeId: string, status: StoreStatus) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    return this.prisma.store.update({ where: { id: storeId }, data: { status } });
  }

  async updateFeatured(storeId: string, featured: boolean) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    return this.prisma.store.update({ where: { id: storeId }, data: { featured } });
  }

  async getStoreDefaultShippingDetails(storeUrl: string) {
    const store = await this.prisma.store.findUnique({
      where: { url: storeUrl },
        select: {
        defaultShippingService: true,
        defaultShippingFeePerItem: true,
        defaultShippingFeeForAdditionalItem: true,
        defaultShippingFeePerKg: true,
        defaultShippingFeeFixed: true,
        defaultDeliveryTimeMin: true,
        defaultDeliveryTimeMax: true,
        returnPolicy: true,
      },
    })
    if (!store) throw new NotFoundException('Store not found');

    return store;
  }
  
  async updateStoreDefaultShippingDetails( storeUrl: string, userId: string, role: Role, dto: ShippingDetailsDto,) {
    const store = await this.prisma.store.findUnique({ where: { url: storeUrl } });
    if (!store) throw new NotFoundException('Store not found');

    // Only the owner (or an admin) may change a store's shipping settings.
    await this.assertOwnerOrAdmin(store.id, userId, role);

    return this.prisma.store.update({
      where: { id: store.id },
      data: dto,
      select: {
        defaultShippingService: true,
        defaultShippingFeePerItem: true,
        defaultShippingFeeForAdditionalItem: true,
        defaultShippingFeePerKg: true,
        defaultShippingFeeFixed: true,
        defaultDeliveryTimeMin: true,
        defaultDeliveryTimeMax: true,
        returnPolicy: true,
      },
    });
  }

  async getStoreShippingRates(storeUrl: string) {
    // get the store by its url slug
    const store = await this.prisma.store.findUnique({
      where: { url: storeUrl },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Store not found');

    // countries (A-Z) and this store's rates don't depend on each other, so fetch together
    const [countries, shippingRates] = await Promise.all([
      this.prisma.country.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.shippingRate.findMany({ where: { storeId: store.id } }),
    ]);

    // map for quick lookup of a rate by countryId
    const ratesByCountryId = new Map(shippingRates.map((rate) => [rate.countryId, rate]));

    // every country, with its rate if the store has set one (null otherwise)
    return countries.map((country) => ({
      ...country,
      shippingRate: ratesByCountryId.get(country.id) ?? null,
    }));
  }

  async saveStoreShippingRate( storeUrl: string, countryId: string, userId: string, role: Role, dto: ShippingRateDto ) {
    
    const store = await this.prisma.store.findUnique({
      where: { url: storeUrl },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    await this.assertOwnerOrAdmin(store.id, userId, role);
  
    const country = await this.prisma.country.findUnique({ where: { id: countryId } });
    if (!country) throw new NotFoundException('Country not found');
  
    // One rate per store + country: update it if it exists, create it if not.
    const shippingRate = await this.prisma.shippingRate.upsert({
      where: { storeId_countryId: { storeId: store.id, countryId } },
      update: dto,
      create: { storeId: store.id, countryId, ...dto },
    });
  
    return { message: `Shipping rate saved for ${country.name}`, shippingRate };
  }

  async resetStoreShippingRate(storeUrl: string, countryId: string, userId: string, role: Role) {
    const store = await this.prisma.store.findUnique({
      where: { url: storeUrl },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    await this.assertOwnerOrAdmin(store.id, userId, role);
  
    const key = { storeId_countryId: { storeId: store.id, countryId } };
  
    const existing = await this.prisma.shippingRate.findUnique({ where: key });
    if (!existing) throw new NotFoundException('This country has no custom rate');
  
    await this.prisma.shippingRate.delete({ where: key });
  
    return { message: 'Shipping rate reset to the store default' };
  }
}
