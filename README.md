# DeedScan

A basic frontend and backend where:
- sellers can create house listings
- regular users can register/login and browse listings
- authentication is handled by Auth0
- relational data is managed with Prisma

## Stack
- Next.js (Pages Router, TypeScript)
- Auth0 (`@auth0/nextjs-auth0`)
- Prisma ORM + SQLite

## 1) Install

```bash
npm install
```

## 2) Configure environment

Copy `.env.example` to `.env` and fill in your Auth0 values.

```bash
cp .env.example .env
```

In Auth0, configure these app URLs:
- Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

## 3) Create DB

```bash
npm run prisma:migrate -- --name init
npm run prisma:generate
```

## 4) Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Main routes
- `/` browse listings
- `/seller` seller dashboard (requires login and seller role)

## Main APIs
- `GET /api/listings` list all houses
- `POST /api/listings` create a listing (seller-only)
- `POST /api/profile/role` set current user role (`BUYER` or `SELLER`)

## Prisma schema summary
- `User` (`id`, `auth0Id`, `email`, `name`, `role`)
- `Listing` (`id`, `title`, `description`, `address`, `price`, `imageUrl`, `sellerId`)

Relationship:
- one `User` (seller) -> many `Listing`
