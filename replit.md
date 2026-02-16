# Replit Agent Configuration

## Overview

This is a **warehouse management system** (WMS) — a full-stack web application for tracking boxes, materials, orders, and warehouse locations. It's designed for industrial/warehouse environments with features like QR code scanning, camera capture for product photos, box registration wizards, material tracking, shipping workflows, and audit logging. The UI is built for high-contrast, large-button "gloved hands" usability. It supports English and Russian languages.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (industrial/high-contrast theme with dark mode support)
- **Animations**: Framer Motion for page transitions and interactions
- **Forms**: React Hook Form with Zod resolvers
- **Special Hardware**: react-webcam for camera capture, html5-qrcode for QR scanning
- **Charts**: Recharts for admin dashboard statistics
- **Build Tool**: Vite with HMR support

### Backend
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript, run with tsx in development
- **API Design**: RESTful API under `/api/*` prefix. Route definitions are shared between client and server in `shared/routes.ts` with Zod schemas for request/response validation
- **Session Management**: express-session with memorystore (development); connect-pg-simple available for production
- **Authentication**: Simple session-based auth. Users with "admin" in username get admin role, others get operator role. Mock/demo-style authentication

### Shared Code (`shared/`)
- `schema.ts` — Drizzle ORM table definitions and Zod insert schemas. This is the single source of truth for database structure
- `routes.ts` — API route definitions with paths, methods, and Zod validation schemas shared between frontend and backend

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **Schema Push**: Use `npm run db:push` (drizzle-kit push) to sync schema to database — no migration files needed for development
- **Key Tables**: users, orders, boxes, materials, locations, audit_logs, settings

### Data Model
- **Users**: admin and operator roles
- **Orders**: have status (active/completed), contain multiple boxes
- **Boxes**: belong to orders, have status (in_stock/shipped), linked to locations, store product/sticker photos as base64
- **Materials**: raw, client-supplied, or tool types with stock tracking
- **Locations**: warehouse rack/shelf positions identified by QR UUID
- **Audit Logs**: track all user actions with timestamps
- **Settings**: singleton row for org-wide configuration (org name, language)

### Build & Deployment
- Development: `npm run dev` — runs tsx with Vite middleware for HMR
- Production build: `npm run build` — Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Production start: `npm start` — serves built assets with Express static middleware
- SPA fallback: all non-API routes fall through to `index.html`

### Key Architectural Patterns
- **Shared validation**: Zod schemas defined once in `shared/` are used by both client and server
- **Storage interface**: `IStorage` interface in `server/storage.ts` abstracts database operations, making it possible to swap implementations
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Internationalization**: Custom hook-based i18n (`use-language`) with English and Russian translations stored in a context provider

## External Dependencies

### Required Services
- **PostgreSQL Database**: Required. Connection string must be provided via `DATABASE_URL` environment variable. The app will crash on startup without it.

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit` — ORM and schema management for PostgreSQL
- `express` v5 — HTTP server
- `express-session` + `memorystore` — Session handling
- `react-webcam` — Camera integration for product/sticker photos
- `html5-qrcode` — QR code scanning for orders and locations
- `recharts` — Dashboard charts and statistics
- `framer-motion` — UI animations
- `zod` + `drizzle-zod` — Schema validation and type generation
- `@tanstack/react-query` — Server state management
- `wouter` — Client-side routing
- Full shadcn/ui component library (Radix UI primitives)

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal` — Runtime error overlay
- `@replit/vite-plugin-cartographer` — Dev tooling (dev only)
- `@replit/vite-plugin-dev-banner` — Dev banner (dev only)