import { Body, Controller, Get, Patch, Post, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import * as User from '@repo/shared';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: { userId: string }) {
    return { success: true, data: { userId: user.userId } };
  }

  @Patch('me/username')
  async updateUsername(
    @CurrentUser() user: { userId: string },
    @Body(new ZodValidationPipe(User.UpdateUsernameSchema)) dto: User.UpdateUsernameDto,
  ) {
    const updated = await this.usersService.updateUsername(user.userId, dto.username);
    return { success: true, message: 'Username updated', data: { user: updated } };
  }

  // Body: { "image": "data:image/png;base64,...." }
  // Sent as plain JSON — no multipart/form-data, no multer dependency needed.
  @Post('me/profile-picture')
  async uploadPicture(
    @CurrentUser() user: { userId: string },
    @Body(new ZodValidationPipe(User.UploadProfilePictureSchema)) dto: User.UploadProfilePictureDto,
  ) {
    const updated = await this.usersService.uploadProfilePicture(user.userId, dto.image);
    return { success: true, message: 'Profile picture updated', data: { user: updated } };
  }

  @Delete('me/profile-picture')
  async deletePicture(@CurrentUser() user: { userId: string }) {
    const updated = await this.usersService.deleteProfilePicture(user.userId);
    return { success: true, message: 'Profile picture removed', data: { user: updated } };
  }
}
