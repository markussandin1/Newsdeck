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

1. **Create a KV Database:**
   - In your Vercel project dashboard, go to the "Storage" tab
   - Click "Create Database" 
   - Choose "KV" (Redis)
   - Give your database a name (e.g., "newsdeck-storage")
   - Select a region close to your users

2. **Get KV credentials:**
   - After creating the database, you'll see the connection details
   - Copy the `KV_REST_API_URL` and `KV_REST_API_TOKEN`

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

2. **Test persistence:**
   - Visit `your-domain.vercel.app/test-persistence`
   - Run the test suite to verify database connectivity
   - Create some columns and add data
   - Refresh the page to verify data persists

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
- Use the `/test-persistence` endpoint to diagnose database connectivity
- Review the browser console for client-side errors