# Multivendor-Ecommerce

A multivendor ecommerce platform where multiple sellers run their own stores on a single marketplace. It is built as a Turborepo monorepo with a **NestJS** API and a **Next.js** frontend, sharing types and tooling across both apps.

## Overview

Multivendor-Ecommerce supports three kinds of users:

- **Customers** browse products from many vendors, manage a cart, and place orders.
- **Sellers** create and manage their own store, products, and orders.
- **Admins** oversee vendors, categories, and the marketplace as a whole.

## Tech Stack

- **Frontend:** Next.js, TypeScript
- **Backend:** NestJS, TypeScript
- **Monorepo:** Turborepo with pnpm workspaces
- **Database:** [e.g. PostgreSQL with Prisma]

## Repository Structure

```
apps/
  api/      # NestJS backend
  web/      # Next.js frontend
packages/
  ...       # Shared code (types, configs)
```

## Getting Started

```bash
pnpm install
pnpm dev
```
