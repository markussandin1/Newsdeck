# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **newsdeck-production** repository containing a news dashboard application called **Newsdeck**. The main codebase is located in this irectory. The root also contains a GCP migration plan.

## Development Commands

Navigate to the `Newsdeck/` directory for all development work:

```bash
cd Newsdeck/
```

### Essential Commands
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Development Workflow
1. Always run `npm run type-check` and `npm run lint` before committing changes
2. Test locally with `npm run dev`
3. Build and test production with `npm run build && npm run start`

## Architecture Overview

**Framework**: Next.js 15 with App Router, React 19, TypeScript, TailwindCSS

### Core Data Model
```typescript
interface NewsItem {
  id: string;
  workflowId: string;
  source: string;
  timestamp: string; // ISO 8601
  title: string;
  description?: string;
  newsValue: 1 | 2 | 3 | 4 | 5; // 5 = highest priority
  category?: string;
  severity?: "critical" | "high" | "medium" | "low" | null;
  location?: {
    municipality?: string;
    county?: string;
    name?: string;
    coordinates?: [number, number];
  };
  extra?: Record<string, any>;
  raw?: any;
}
```

### Key Architecture Components

**Database Layer** (`lib/`):
- `db-persistent.ts` - Vercel KV (Redis) storage implementation
- `db-upstash.ts` - Alternative Upstash Redis implementation
- `db.ts` - Database interface/abstraction
- Falls back to in-memory storage when KV credentials unavailable

**API Routes** (`app/api/`):
- `/api/columns` - Column management (CRUD)
- `/api/dashboards` - Dashboard management
- `/api/news-items` - NewsItem storage and retrieval

**Core Pages**:
- `/` - Dashboard listing homepage
- `/admin` - Data input interface
- `/dashboard/[id]` - Individual dashboard view with real-time updates
- `/test-persistence` - Database connectivity testing

### Visual Priority System
NewsValue determines visual styling:
- `newsValue: 5` - Red border + pulsing animation (critical)
- `newsValue: 4` - Orange border (high)
- `newsValue: 3` - Yellow border (medium)
- `newsValue: 1-2` - Gray border (low)

## Storage & Deployment

**Local Development**: Uses in-memory storage when KV credentials not set

**Production**: Uses Vercel KV (Redis) for persistence
- Environment variables: `KV_REST_API_URL`, `KV_REST_API_TOKEN`
- Alternative: Upstash Redis with different environment variables

**Deployment**: Designed for Vercel deployment, see `DEPLOYMENT.md` for complete guide

## External Integration

**API Endpoints** for workflow integration:
- `POST /api/columns/{id}` - Add news items to column
- `GET /api/columns/{id}` - Retrieve column data
- Compatible with n8n, Zapier, and custom workflows

## Current Status

The application is a **completed POC** with:
- ✅ Full dashboard and column management
- ✅ Real-time updates (5-second polling)
- ✅ Visual priority system
- ✅ Vercel KV persistence
- ✅ Admin interface for data input
- ✅ Responsive design for mobile/desktop/TV

