# Newsdeck Deployment Guide

This guide covers deploying Newsdeck to Vercel with persistent data storage using Vercel KV (Redis).

## Overview

Newsdeck uses a hybrid storage approach:
- **Local Development**: Falls back to in-memory storage when KV credentials are not available
- **Production**: Uses Vercel KV (Redis) for persistent data storage

## Prerequisites

- Vercel account
- Node.js 18+ 
- Git repository connected to Vercel

## Step 1: Deploy to Vercel

1. **Connect your repository to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "New Project"
   - Import your Git repository
   - Choose "Next.js" as the framework preset

2. **Configure build settings:**
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install`

## Step 2: Set up Vercel KV Database

**Note:** Vercel KV is now available through the Vercel Marketplace.

1. **Access the Vercel Marketplace:**
   - Go to [Vercel Marketplace](https://vercel.com/marketplace/category/storage)
   - Find "Vercel KV" in the storage category
   - Click "Add Integration" or "Install"

2. **Create a KV Database:**
   - Follow the marketplace integration flow
   - Choose your Vercel project
   - Give your database a name (e.g., "newsdeck-storage")
   - Select a region close to your users
   - Complete the setup process

3. **Get KV credentials:**
   - After creating the database, go to your project dashboard
   - Navigate to "Settings" > "Environment Variables"
   - The KV environment variables should be automatically added:
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`
   - If not automatically added, you can find them in the KV dashboard

## Step 3: Configure Environment Variables

1. **Add environment variables to Vercel:**
   - In your project dashboard, go to "Settings" > "Environment Variables"
   - Add the following variables:

   ```
   KV_REST_API_URL=your_kv_rest_api_url_here
   KV_REST_API_TOKEN=your_kv_rest_api_token_here
   ```

2. **For all environments:**
   - Make sure to add these variables for Production, Preview, and Development environments
   - This ensures consistent behavior across all deployments

## Step 4: Deploy and Test

1. **Deploy your project:**
   - Push your code to the main branch
   - Vercel will automatically deploy
   - Or manually trigger a deployment from the Vercel dashboard

2. **Verify persistence manually:**
   - Open the admin dashboard at `/admin`
   - Create a column and push test events through your workflow
   - Reload the dashboard to ensure items remain after refresh

## Local Development Setup

For local development, you have two options:

### Option 1: Use Vercel KV locally (Recommended for testing)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel env pull .env.local` to download environment variables
3. Start development: `npm run dev`

### Option 2: Use fallback in-memory storage
1. Don't set KV environment variables
2. The app will automatically use in-memory storage
3. Data will reset on server restart (good for development)

## Data Structure

The application stores the following data in Vercel KV:

- **Dashboards**: `dashboard:{id}` and `dashboards` (list)
- **Column Data**: `column_data:{columnId}`  
- **News Items**: `news_items` (general storage)

## API Endpoints

The following endpoints are available for external workflows:

- `POST /api/columns` - Create a new column
- `GET /api/columns` - List all columns  
- `POST /api/columns/{id}` - Add data to a specific column
- `GET /api/columns/{id}` - Get data from a specific column
- `DELETE /api/columns/{id}` - Clear data from a column

## Monitoring and Maintenance

1. **Monitor KV usage:**
   - Check your Vercel dashboard for KV usage statistics
   - Monitor request counts and storage usage

2. **Data backup:**
   - Vercel KV is managed and backed up automatically
   - For additional backup, consider periodic exports via API

3. **Scaling considerations:**
   - Current implementation stores all data in Redis
   - For production scale, consider:
     - Implementing data archiving for old news items
     - Adding pagination for large datasets
     - Moving to a full database solution (as planned for GCP migration)

## Alternative Storage Solutions

If you prefer not to use Vercel KV or want other options:

### Option 1: Upstash Redis (Free tier available)
1. Sign up at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Get the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Replace `@vercel/kv` with `@upstash/redis` in the code
5. Update the import in `lib/db-persistent.ts`

### Option 2: PlanetScale MySQL (Free tier)
1. Sign up at [planetscale.com](https://planetscale.com)
2. Create a database
3. Install `@planetscale/database`
4. Update the database layer to use SQL instead of Redis

### Option 3: Supabase (Free tier)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a project
3. Install `@supabase/supabase-js`
4. Update the database layer to use PostgreSQL

### Option 4: Railway PostgreSQL
1. Sign up at [railway.app](https://railway.app)
2. Deploy a PostgreSQL database
3. Use with `pg` or `prisma` packages

## Future Migration to GCP

This setup is designed for POC/MVP. For production scaling:

- Database: Cloud SQL (PostgreSQL) or Firestore
- Authentication: Firebase Auth or Cloud Identity
- Storage: Cloud Storage for media files
- Monitoring: Cloud Monitoring and Logging

The current database abstraction layer (`lib/db-persistent.ts`) makes this migration easier by providing a consistent interface.

## Troubleshooting

### Common Issues:

1. **"Internal server error" when creating columns:**
   - Check that KV environment variables are set correctly
   - Verify KV database is active in Vercel dashboard

2. **Data not persisting:**
   - Confirm you're not in fallback mode (check server logs)
   - Test the KV connection using the test page

3. **Build failures:**
   - Ensure all dependencies are in `package.json`
   - Check that `@vercel/kv` is installed

### Debug Mode:
Add this to your environment variables for more verbose logging:
```
DEBUG=true
```

## Support

For deployment issues:
- Check Vercel deployment logs
- Use the admin dashboard to confirm data writes and reads
- Review the browser console for client-side errors
