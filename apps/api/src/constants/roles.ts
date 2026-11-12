import { Role } from '../generated/prisma/enums';

export { Role };

export const ROLES = [Role.ADMIN, Role.SELLER, Role.USER] as const;
