import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService, private cloudinary: CloudinaryService) {}

  async updateUsername(userId: string, username: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== userId) throw new ConflictException('Username already taken');

    const user = await this.prisma.user.update({ where: { id: userId }, data: { username } });
    const { password, ...safe } = user;
    return safe;
  }

  // dataUri looks like: "data:image/png;base64,iVBORw0KGgo..."
  private decodeDataUri(dataUri: string): { buffer: Buffer; mime: string } {
    const match = dataUri.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) throw new BadRequestException('Invalid image data URI');

    const [, mime, base64] = match;
    const buffer = Buffer.from(base64, 'base64');

    if (!ALLOWED_MIME.includes(mime)) throw new BadRequestException('Unsupported image type');
    if (buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException('Image must be under 5MB');

    return { buffer, mime };
  }

  async uploadProfilePicture(userId: string, dataUri: string) {
    const { buffer } = this.decodeDataUri(dataUri);

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.profileImageId) {
      await this.cloudinary.deleteImage(user.profileImageId);
    }

    const { url, publicId } = await this.cloudinary.uploadImage(buffer);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage: url, profileImageId: publicId },
    });
    const { password, ...safe } = updated;
    return safe;
  }

  async deleteProfilePicture(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.profileImageId) {
      await this.cloudinary.deleteImage(user.profileImageId);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage: null, profileImageId: null },
    });
    const { password, ...safe } = updated;
    return safe;
  }
}
