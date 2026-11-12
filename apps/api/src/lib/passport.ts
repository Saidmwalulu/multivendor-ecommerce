// // Sets up the Google OAuth strategy.
// // When a user signs in with Google we either find their existing account
// // or create a new one — both cases end up calling done(null, user).

// import passport from 'passport';
// import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// import { prisma } from './prisma';
// import { env } from './env';

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: env.GOOGLE_CLIENT_ID,
//       clientSecret: env.GOOGLE_CLIENT_SECRET,
//       callbackURL: `${env.API_URL}/api/auth/google/callback`,
//     },
//     async (_accessToken, _refreshToken, profile, done) => {
//       try {
//         const googleEmail = profile.emails?.[0]?.value;
//         const image = profile.photos?.[0]?.value ?? null;

//         if (!googleEmail) {
//           return done(new Error('No email returned from Google'));
//         }

//         // Check if a user with this googleId already exists
//         let user = await prisma.user.findUnique({
//           where: { googleId: profile.id },
//         });

//         if (user) {
//           // Update avatar in case they changed their Google profile picture
//           user = await prisma.user.update({
//             where: { googleId: profile.id },
//             data: { image },
//           });
//           return done(null, user);
//         }

//         // Check if a user with this email already exists (signed up with password)
//         // If so, link the Google account to the existing account and save avatar
//         user = await prisma.user.findUnique({
//           where: { email: googleEmail },
//         });

//         if (user) {
//           user = await prisma.user.update({
//             where: { email: googleEmail },
//             data: { googleId: profile.id, image },
//           });
//           return done(null, user);
//         }

//         // New user — create an account (no password, email is already verified via Google)
//         user = await prisma.user.create({
//           data: {
//             name: profile.displayName,
//             email: googleEmail,
//             googleId: profile.id,
//             image,
//             emailVerified: true, // Google already verified this email
//           },
//         });

//         return done(null, user);
//       } catch (err) {
//         return done(err as Error);
//       }
//     }
//   )
// );

// export default passport;