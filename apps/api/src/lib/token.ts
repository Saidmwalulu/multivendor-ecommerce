// // src/lib/token.ts
// // JWT signing/verifying and token generation for email verification + password reset.

// import crypto from 'crypto';
// import jwt from 'jsonwebtoken';
// import { Role } from '../generated/prisma/enums';
// import { env } from './env';

// export interface JwtPayload {
//   id: string;
//   name: string;
//   email: string;
//   role: Role;
//   emailVerified: boolean;
// }

// // rememberMe extends the token lifetime from the default (15m) to 30 days.
// export const signJwt = (payload: JwtPayload, rememberMe = false): string => {
//   return jwt.sign(payload, env.JWT_SECRET, {
//     expiresIn: rememberMe ? '30d' : (env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']),
//   });
// };

// export const verifyJwt = (token: string): JwtPayload | null => {
//   try {
//     return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
//   } catch {
//     return null;
//   }
// };

// // Generates a raw token (sent to the user) + a hashed version (stored in the DB).
// // We never store the raw token — only its hash. This way a DB leak
// // can't be used to verify accounts or reset passwords.
// // Used for both email verification and password reset.
// export const createSecureToken = (ttlMs = 24 * 60 * 60 * 1000) => {
//   const rawToken = crypto.randomBytes(32).toString('hex');
//   const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
//   const expiresAt = new Date(Date.now() + ttlMs);

//   return { rawToken, hashedToken, expiresAt };
// };

// // Kept as an alias so existing code (auth.controller signup/verify) doesn't break.
// export const createVerificationToken = createSecureToken;

// export const hashToken = (rawToken: string): string => {
//   return crypto.createHash('sha256').update(rawToken).digest('hex');
// };