import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import * as Auth from '@repo/shared';


const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; 

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

  private setRefreshCookie(res: Response, token: string, maxAge: number) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
  }

  private setAccessCookie(res: Response, token: string, maxAge: number) {
    res.cookie(ACCESS_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
  }

  @Post('register')
  async register(@Body(new ZodValidationPipe(Auth.RegisterSchema)) dto: Auth.RegisterDto) {
    const user = await this.authService.register(dto);
    return { success: true, message: 'Registered. Check your email to verify your account.', data: { user } };
  }

  @Post('resend-verification')
  @HttpCode(200)
  async resend(@Body(new ZodValidationPipe(Auth.ResendVerificationSchema)) dto: Auth.ResendVerificationDto) {
    const result = await this.authService.resendVerification(dto.email);
    return { success: true, ...result };
  }

  @Get('verify-email')
  async verifyEmail(@Query(new ZodValidationPipe(Auth.VerifyEmailSchema)) query: Auth.VerifyEmailDto) {
    const result = await this.authService.verifyEmail(query.token);
    return { success: true, ...result };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(Auth.LoginSchema)) dto: Auth.LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, refreshTokenTtlMs, user, store } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken, refreshTokenTtlMs);
    this.setAccessCookie(res, accessToken, ACCESS_TOKEN_TTL_MS)
    return { success: true, message: 'Login successful', data: { user, accessToken, store } };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    const { accessToken, refreshToken, refreshTokenTtlMs, user } = await this.authService.refresh(token);
    this.setRefreshCookie(res, refreshToken, refreshTokenTtlMs);
    return { success: true, message: 'Token refreshed', data: { user, accessToken } };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await this.authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { success: true, message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body(new ZodValidationPipe(Auth.ForgotPasswordSchema)) dto: Auth.ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email);
    return { success: true, ...result };
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body(new ZodValidationPipe(Auth.ResetPasswordSchema)) dto: Auth.ResetPasswordDto) {
    const result = await this.authService.resetPassword(dto.token, dto.newPassword);
    return { success: true, ...result };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: { userId: string },
    @Body(new ZodValidationPipe(Auth.ChangePasswordSchema)) dto: Auth.ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
    return { success: true, ...result };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { userId: string }) {
    const data = await this.authService.getMe(user.userId);
    return { success: true, message: 'OK', data: { user: data } };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    // Guard redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const googleProfile = req.user as { googleId: string; email: string; name: string };
    const user = await this.authService.findOrCreateGoogleUser(googleProfile);
    const { accessToken, refreshToken, refreshTokenTtlMs } = await this.authService.issueTokens(user);

    this.setRefreshCookie(res, refreshToken, refreshTokenTtlMs);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?accessToken=${accessToken}`);
  }
}
