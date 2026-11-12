import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { RegisterDto, LoginDto } from '@repo/shared';
import * as bcrypt from 'bcrypt';
import { generateRawToken, hashToken } from './utils/token.util';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TTL_DEFAULT_DAYS = 1;
const REFRESH_TTL_REMEMBER_DAYS = 30;
const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
    constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  private toPublicUser(user: User) {
    const { password, ...safe } = user;
    return safe;
  }

  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingUsername = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        role: Role.USER,
      },
    });

    await this.sendVerificationEmail(user.id, user.email);

    return this.toPublicUser(user);
  }

  async sendVerificationEmail(userId: string, email: string) {
    const raw = generateRawToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000),
      },
    });

    const link = `${this.config.get('FRONTEND_URL')}/verify-email?token=${raw}`;
    await this.mail.sendVerificationEmail(email, link);
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.isEmailVerified) {
      return { message: 'If an account exists, a verification email has been sent.' };
    }
    await this.sendVerificationEmail(user.id, user.email);
    return { message: 'If an account exists, a verification email has been sent.' };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } }),
      this.prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    return { message: 'Email verified successfully' };
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const matches = await bcrypt.compare(password, user.password);
    if (!matches) throw new UnauthorizedException('Invalid email or password');
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto.email, dto.password);
    return this.issueTokens(user, dto.rememberMe);
  }

  async issueTokens(user: User, rememberMe = false) {
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: ACCESS_TOKEN_TTL },
    );

    const days = rememberMe ? REFRESH_TTL_REMEMBER_DAYS : REFRESH_TTL_DEFAULT_DAYS;
    const rawRefresh = generateRawToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawRefresh),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    const store = user.role === Role.SELLER ? await this.prisma.store.findFirst({
      where: { userId: user.id },
      select: { id: true, url: true }
    }) : null

    return {
      accessToken,
      refreshToken: rawRefresh,
      refreshTokenTtlMs: days * 24 * 60 * 60 * 1000,
      user: this.toPublicUser(user),
      store,
    };
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record || record.revoked || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new UnauthorizedException('User no longer exists');

    const remainingMs = record.expiresAt.getTime() - Date.now();
    const rememberMe = remainingMs > REFRESH_TTL_DEFAULT_DAYS * 24 * 60 * 60 * 1000;

    return this.issueTokens(user, rememberMe);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If an account exists, a reset email has been sent.' };

    const raw = generateRawToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
      },
    });

    const link = `${this.config.get('FRONTEND_URL')}/reset-password?token=${raw}`;
    await this.mail.sendPasswordResetEmail(user.email, link);

    return { message: 'If an account exists, a reset email has been sent.' };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { password: hashedPassword } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
      this.prisma.refreshToken.updateMany({ where: { userId: record.userId }, data: { revoked: true } }),
    ]);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) throw new BadRequestException('This account has no password set');

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) throw new UnauthorizedException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    return { message: 'Password changed successfully' };
  }

  async findOrCreateGoogleUser(profile: { googleId: string; email: string; name: string }) {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (user) return user;

    user = await this.prisma.user.findUnique({ where: { email: profile.email } });
    if (user) {
      return this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, isEmailVerified: true },
      });
    }

    let username = profile.name.replace(/\s+/g, '').toLowerCase().slice(0, 25) || 'user';
    let suffix = 0;
    while (await this.prisma.user.findUnique({ where: { username } })) {
      suffix += 1;
      username = `${username}${suffix}`;
    }

    return this.prisma.user.create({
      data: {
        username,
        email: profile.email,
        googleId: profile.googleId,
        role: Role.USER,
        isEmailVerified: true,
      },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
     const store = user.role === Role.SELLER ? await this.prisma.store.findFirst({
            where: { userId: user.id },
            select: { id: true, url: true },
          })
        : null;

    return { ...this.toPublicUser(user), store };
  }
  
}
