import { hashPassword, comparePassword } from '../utils/password';
import { generateSecureToken, hashToken } from '../utils/token';
import { signAccessToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../errors';
import { VERIFICATION_TOKEN_TTL_MS, PASSWORD_RESET_TOKEN_TTL_MS } from '../constants/tokens';
import { Role } from '../constants/roles';
import { GoogleProfile } from '../lib/googleAuth';
import { prisma } from '../config/database';
import { RegisterInput, LoginInput, ResetPasswordInput, UpdateProfileInput, ChangePasswordInput, } from '@repo/shared';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  image: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new ConflictError('An account with this email already exists');
  }

  const hashedPassword = await hashPassword(input.password);
  const { rawToken, hashedToken } = generateSecureToken();

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: Role.USER,
      verificationToken: hashedToken,
      verificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
    select: PUBLIC_USER_SELECT,
  });

  await sendVerificationEmail(user.email, user.name, rawToken);

  return user;
}

export async function verifyEmail(rawToken: string) {
  const hashedToken = hashToken(rawToken);

  const user = await prisma.user.findUnique({ where: { verificationToken: hashedToken } });

  if (!user || !user.verificationExpires || user.verificationExpires < new Date()) {
    throw new BadRequestError('Verification link is invalid or has expired');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
    },
    select: PUBLIC_USER_SELECT,
  });

  return updated;
}

// after clicking resendVerificationEmail button
// toast.success(
//   "If your email is registered, a verification link has been sent."
// );
export async function resendVerificationEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Don't reveal whether the account exists
  if (!user || user.emailVerified) {
    return;
  }

  // Already verified - do nothing
  if (user.emailVerified) {
    return;
  }

  const { rawToken, hashedToken } = generateSecureToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: hashedToken,
      verificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  await sendVerificationEmail(user.email, user.name, rawToken);
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.password) {
    throw new UnauthorizedError('This account uses Google sign-in. Please continue with Google.');
  }

  const isPasswordValid = await comparePassword(input.password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.emailVerified) {
    throw new UnauthorizedError('Please verify your email before logging in');
  }

  const token = signAccessToken({ sub: user.id, role: user.role }, input.rememberMe ?? false);

  const { password: _password, verificationToken: _vt, passwordResetToken: _prt, ...publicUser } = user;

  return { user: publicUser, token };
}

export async function googleLogin(profile: GoogleProfile, rememberMe: boolean) {
  if (!profile.emailVerified) {
    throw new UnauthorizedError('Google account email is not verified');
  }

  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

  if (!user) {
    // No account linked to this Google ID yet — check if the email is
    // already registered locally and link the accounts, otherwise create
    // a brand-new, pre-verified account (Google already verified the email).
    const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.googleId,
          emailVerified: true,
          image: existingByEmail.image ?? profile.picture ?? null,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          googleId: profile.googleId,
          image: profile.picture ?? null,
          role: Role.USER,
          emailVerified: true,
        },
      });
    }
  }

  const token = signAccessToken({ sub: user.id, role: user.role }, rememberMe);

  const { password: _password, verificationToken: _vt, passwordResetToken: _prt, ...publicUser } = user;

  return { user: publicUser, token };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always behave the same way whether or not the account exists
  if (!user) {
    return;
  }

  const { rawToken, hashedToken } = generateSecureToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });

  await sendPasswordResetEmail(user.email, user.name, rawToken);
}

export async function resetPassword(input: ResetPasswordInput) {
  const hashedToken = hashToken(input.token);

  const user = await prisma.user.findUnique({ where: { passwordResetToken: hashedToken } });

  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw new BadRequestError('Password reset link is invalid or has expired');
  }

  const hashedPassword = await hashPassword(input.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_SELECT,
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

export async function updateUserAvatar(userId: string, imageUrl: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { image: imageUrl },
    select: PUBLIC_USER_SELECT,
  });

  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name },
    select: PUBLIC_USER_SELECT,
  });

  return user;
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.password) {
    // Normal case: user already has a password, so the current one must
    // be confirmed before setting a new one.
    if (!input.currentPassword) {
      throw new BadRequestError('Current password is required');
    }
    const isCurrentPasswordValid = await comparePassword(input.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }
  }
  // Else: Google-only account with no password yet — let them set an
  // initial one without a "current password" (there isn't one).

  const hashedPassword = await hashPassword(input.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}
