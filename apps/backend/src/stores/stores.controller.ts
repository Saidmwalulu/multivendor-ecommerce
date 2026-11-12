import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as Store from '@repo/shared';

const UpdateStoreSchema = Store.StoreFormSchema.partial();
type UpdateStoreDto = Partial<Store.StoreFormDto>;

type AuthUser = { userId: string; role: Role };

@Controller('stores')
export class StoresController {
    constructor(private storesService: StoresService) {}

    // Admin sees every store; seller sees only their own (see StoresService.findAll)
    @Get()
    @Roles(Role.ADMIN, Role.SELLER)
    @UseGuards(JwtAuthGuard)
    async findAll(@CurrentUser() user: { id: string; role: Role }) {
        const stores = await this.storesService.findAll(user.id, user.role);
        return { success: true, data: { stores } };
    }

    @Get('name/:url')
    @Roles(Role.SELLER)
    async findByUrl(@Param('url') url: string) {
        const store = await this.storesService.findByUrl(url);
        return { success: true, data: { store } };
    }

    @Get(':id')
    @Roles(Role.SELLER)
    async findById(@Param('id') id: string) {
        const store = await this.storesService.findById(id);
        return { success: true, data: { store } };
    }

    @Post()
    @Roles(Role.SELLER)
    @UseGuards(JwtAuthGuard)
    async create(
        @CurrentUser() user: AuthUser,
        @Body(new ZodValidationPipe(Store.StoreFormSchema)) dto: Store.StoreFormDto,
    ) {
        const store = await this.storesService.create(user.userId, dto);
        return { success: true, message: 'Store created and pending approval', data: { store } };
    }

    @Patch(':id')
    @Roles(Role.SELLER)
    @UseGuards(JwtAuthGuard)
    async update(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateStoreSchema)) dto: UpdateStoreDto,
    ) {
        const store = await this.storesService.update(id, user.userId, user.role, dto);
        return { success: true, message: 'Store updated', data: { store } };
    }

    @Delete(':id')
    @Roles(Role.SELLER)
    @UseGuards(JwtAuthGuard)
    async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        const result = await this.storesService.remove(id, user.userId, user.role);
        return { success: true, ...result };
    }

    @Get('name/:url/shipping-details')
    @Roles(Role.SELLER)
    @UseGuards(JwtAuthGuard)
    async getStoreDefaultShippingDetails(@Param('url') url: string) {
        const shippingDetails = await this.storesService.getStoreDefaultShippingDetails(url);
        return { success: true, data: { shippingDetails } };
    }

    @Patch('name/:url/shipping-details')
    @Roles(Role.SELLER)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async updateShippingDetails(@CurrentUser() user: AuthUser, @Param('url') url: string,
        @Body(new ZodValidationPipe(Store.ShippingDetailsSchema)) dto: Store.ShippingDetailsDto,
    ) {
        const shippingDetails = await this.storesService.updateStoreDefaultShippingDetails(
            url,
            user.userId,
            user.role,
            dto,
        );
        return { success: true, message: 'Shipping details updated', data: { shippingDetails } };
    }

    @Get('name/:url/shipping-rates')
    @Roles(Role.SELLER)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async getStoreShippingRates(@Param('url') url: string) {
        const shippingRates = await this.storesService.getStoreShippingRates(url);
        return { success: true, data: { shippingRates } };
    }

    @Put('name/:url/shipping-rates/:countryId')
    @Roles(Role.SELLER)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async saveShippingRate(
        @CurrentUser() user: AuthUser,
        @Param('url') url: string,
        @Param('countryId') countryId: string,
        @Body(new ZodValidationPipe(Store.ShippingRateSchema)) dto: Store.ShippingRateDto,
    ) {
        const result = await this.storesService.saveStoreShippingRate(
            url,
            countryId,
            user.userId,
            user.role,
            dto,
        );
        return { success: true, ...result };
    }

    @Delete('name/:url/shipping-rates/:countryId')
    @Roles(Role.SELLER)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async resetShippingRate(
        @CurrentUser() user: AuthUser,
        @Param('url') url: string,
        @Param('countryId') countryId: string,
    ) {
        const result = await this.storesService.resetStoreShippingRate(
            url,
            countryId,
            user.userId,
            user.role,
        );
        return { success: true, ...result };
    }

    // ---------- Admin-only ----------

    @Patch(':id/status')
    @Roles(Role.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async updateStatus(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(Store.UpdateStoreStatusSchema)) dto: Store.UpdateStoreStatusDto,
    ) {
        const store = await this.storesService.updateStatus(id, dto.status);
        return { success: true, message: 'Store status updated', data: { store } };
    }

    @Patch(':id/featured')
    @Roles(Role.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async updateFeatured(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(Store.UpdateStoreFeaturedSchema)) dto: Store.UpdateStoreFeaturedDto,
    ) {
        const store = await this.storesService.updateFeatured(id, dto.featured);
        return { success: true, message: 'Store featured flag updated', data: { store } };
    }
}
