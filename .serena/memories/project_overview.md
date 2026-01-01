# Project Overview

**Project Name**: Newsdeck
**Purpose**: News dashboard application that receives events from a "Workflows" AI-agent system and displays them in real-time

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Frontend**: React 19, TypeScript, TailwindCSS
- **Database**: PostgreSQL (Cloud SQL on GCP)
- **Deployment**: Google Cloud Run
- **Key Libraries**: 
  - Radix UI for components
  - Framer Motion for animations
  - Leaflet for maps
  - uuid, pg for database

## Architecture
- Local development uses production database via Cloud SQL Proxy
- Denormalized database design (news_items + column_data tables)
- Real-time updates via long-polling
- Geographic filtering with ISO 3166-2 codes
- PWA support with desktop notifications
