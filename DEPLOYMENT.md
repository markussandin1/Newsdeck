# Newsdeck Deployment Guide

This guide covers deploying Newsdeck to Google Cloud Run with Cloud SQL (PostgreSQL) for persistent data storage.

## Overview

Newsdeck deployment architecture:
- **Application**: Next.js on Google Cloud Run (containerized)
- **Database**: PostgreSQL on Google Cloud SQL
- **Authentication**: NextAuth.js with Google OAuth
- **CI/CD**: GitHub Actions for automated deployments
- **Real-time**: Server-Sent Events (SSE) for live updates

## Prerequisites

- Google Cloud account with billing enabled
- Node.js 18+
- Docker (for local testing)
- gcloud CLI installed and configured
- GitHub repository

## Step 1: Set up Google Cloud SQL (PostgreSQL)

1. **Create a Cloud SQL instance:**
   ```bash
   gcloud sql instances create newsdeck-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=europe-west1
   ```

2. **Create a database:**
   ```bash
   gcloud sql databases create newsdeck --instance=newsdeck-db
   ```

3. **Create a database user:**
   ```bash
   gcloud sql users create newsdeck-user \
     --instance=newsdeck-db \
     --password=YOUR_SECURE_PASSWORD
   ```

4. **Get connection details:**
   ```bash
   gcloud sql instances describe newsdeck-db
   ```
   - Note the `connectionName` (format: `project:region:instance`)

## Step 2: Run Database Migrations

1. **Connect to Cloud SQL:**
   ```bash
   gcloud sql connect newsdeck-db --user=newsdeck-user --database=newsdeck
   ```

2. **Run migrations manually or via script:**
   ```bash
   # Set DATABASE_URL
   export DATABASE_URL="postgresql://newsdeck-user:PASSWORD@/cloudsql/PROJECT:REGION:INSTANCE/newsdeck"

   # Run migrations
   npm run migrate
   ```

## Step 3: Configure Secrets with GCP Secret Manager 🔒

**NEW:** Newsdeck now uses GCP Secret Manager for enterprise-grade security.

### Setup Secrets (One-time)

Follow the complete guide: **[GCP_SECRET_MANAGER_SETUP.md](./GCP_SECRET_MANAGER_SETUP.md)**

Quick setup:
```bash
# 1. Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# 2. Create secrets (see GCP_SECRET_MANAGER_SETUP.md for details)
echo -n "postgresql://user:pass@/cloudsql/project:region:instance/dbname" | \
  gcloud secrets create newsdeck-database-url --data-file=-

echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create newsdeck-nextauth-secret --data-file=-

echo -n "your-google-client-id" | \
  gcloud secrets create newsdeck-google-client-id --data-file=-

echo -n "your-google-client-secret" | \
  gcloud secrets create newsdeck-google-client-secret --data-file=-

echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create newsdeck-api-key --data-file=-

# 3. Grant Cloud Run access
PROJECT_NUMBER=$(gcloud projects describe newsdeck-473620 --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SECRET in newsdeck-database-url newsdeck-nextauth-secret newsdeck-google-client-id newsdeck-google-client-secret newsdeck-api-key; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Environment Variables (Cloud Run)

Only these env vars are needed in Cloud Run:

```bash
# GCP Project ID (for Secret Manager)
GCP_PROJECT_ID=newsdeck-473620

# Build flag
DOCKER_BUILD=true

# Optional: NextAuth URL (auto-detected from Cloud Run URL)
NEXTAUTH_URL=https://your-app-url.run.app
```

**Note:** DATABASE_URL, API_KEY, Google OAuth credentials are automatically loaded from Secret Manager in production.

## Step 4: Build and Deploy to Cloud Run

### Option 1: Using GitHub Actions (Recommended)

The repository includes a CI/CD pipeline in `.github/workflows/deploy.yml`:

1. **Set up GitHub Secrets:**
   - `GCP_PROJECT_ID`: Your Google Cloud project ID
   - `GCP_SA_KEY`: Service account key JSON

   **Note:** The following secrets are NO LONGER needed in GitHub (they're in Secret Manager):
   - ~~`DATABASE_URL`~~ - Now in Secret Manager
   - ~~`NEXTAUTH_SECRET`~~ - Now in Secret Manager
   - ~~`GOOGLE_CLIENT_ID`~~ - Now in Secret Manager
   - ~~`GOOGLE_CLIENT_SECRET`~~ - Now in Secret Manager
   - ~~`API_KEY`~~ - Now in Secret Manager

2. **Push to main branch:**
   - GitHub Actions will automatically build and deploy

### Option 2: Manual Deployment

1. **Build the Docker image:**
   ```bash
   docker build --build-arg DOCKER_BUILD=true -t gcr.io/PROJECT_ID/newsdeck .
   ```

2. **Push to Google Container Registry:**
   ```bash
   docker push gcr.io/PROJECT_ID/newsdeck
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy newsdeck \
     --image gcr.io/PROJECT_ID/newsdeck \
     --platform managed \
     --region europe-west1 \
     --add-cloudsql-instances PROJECT:REGION:INSTANCE \
     --set-env-vars GCP_PROJECT_ID=newsdeck-473620,NEXTAUTH_URL="https://your-app.run.app" \
     --allow-unauthenticated
   ```

   **Note:** No need to set DATABASE_URL, API_KEY, or OAuth secrets - they're loaded from Secret Manager!

## Step 5: Configure Google OAuth

1. **Go to Google Cloud Console > APIs & Services > Credentials**

2. **Create OAuth 2.0 Client ID:**
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://your-app.run.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` (for dev)

3. **Save Client ID and Secret** to environment variables

## Step 6: Verify Deployment

1. **Test the application:**
   - Visit your Cloud Run URL
   - Sign in with Google
   - Create a dashboard and column
   - Test API endpoint with your API key

2. **Check API logs:**
   - Go to `/admin/api-logs` to see request logging
   - Verify successful requests are logged

3. **Monitor Cloud Run:**
   ```bash
   gcloud run services describe newsdeck --region europe-west1
   ```

## Local Development Setup

1. **Set up local PostgreSQL:**
   ```bash
   # Using Docker
   docker run --name newsdeck-postgres \
     -e POSTGRES_PASSWORD=localpass \
     -e POSTGRES_DB=newsdeck \
     -p 5432:5432 -d postgres:15
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with local database credentials
   DATABASE_URL=postgresql://postgres:localpass@localhost:5432/newsdeck
   ```

3. **Run migrations:**
   ```bash
   npm run migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Database Schema

The application uses PostgreSQL with the following main tables:

- **dashboards**: Dashboard configurations and metadata
- **news_items**: News items with db_id as primary key
- **column_data**: Column-specific news items (references news_items)
- **api_request_logs**: API request logging for debugging
- **user_preferences**: User settings and preferences
- **user_dashboard_follows**: Dashboard following relationships

## API Endpoints

The following endpoints are available for external workflows:

### Workflow Ingestion
- `POST /api/workflows` - Main endpoint for workflow data (requires API key)
  - Headers: `x-api-key: your-api-key`
  - Body: See API documentation in README.md

### Column Management
- `POST /api/columns` - Create a new column
- `GET /api/columns` - List all columns
- `POST /api/columns/{id}` - Add data to a specific column
- `GET /api/columns/{id}` - Get data from a specific column
- `DELETE /api/columns/{id}` - Clear data from a column

### Dashboard Management
- `GET /api/dashboards` - List all dashboards
- `GET /api/dashboards/{slug}` - Get dashboard by slug
- `PUT /api/dashboards/{slug}` - Update dashboard
- `POST /api/dashboards/{slug}/follow` - Follow a dashboard

### Admin Endpoints
- `GET /api/admin/logs` - View API request logs
- `POST /api/admin/migrate-logs` - Run API logs migration

## Monitoring and Maintenance

1. **Monitor Cloud Run:**
   ```bash
   # View logs
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=newsdeck" --limit 50

   # Monitor metrics
   gcloud monitoring dashboards list
   ```

2. **Monitor Cloud SQL:**
   ```bash
   # Check database connections
   gcloud sql operations list --instance=newsdeck-db

   # View database logs
   gcloud logging read "resource.type=cloudsql_database" --limit 50
   ```

3. **Data backup:**
   - Cloud SQL automatically creates backups
   - Configure backup retention:
     ```bash
     gcloud sql instances patch newsdeck-db \
       --backup-start-time=03:00 \
       --retained-backups-count=7
     ```

4. **API Request Logging:**
   - View logs at `/admin/api-logs`
   - Filter by success/failure
   - Debug rejected payloads

5. **Scaling considerations:**
   - Cloud Run auto-scales based on traffic
   - Monitor database connections and optimize queries
   - Consider connection pooling for high traffic
   - Archive old news items periodically

## Alternative Deployment Options

While the primary deployment is on Google Cloud, you can also deploy to:

### Vercel (with external PostgreSQL)
1. Deploy to Vercel as usual
2. Connect to external PostgreSQL (Supabase, Railway, etc.)
3. Set `DATABASE_URL` in Vercel environment variables
4. Note: SSE may have limitations on Vercel's serverless platform

### Railway
1. Create a Railway project
2. Add PostgreSQL service
3. Deploy from GitHub repository
4. Configure environment variables

### Render
1. Create a new Web Service
2. Add PostgreSQL database
3. Connect GitHub repository
4. Set environment variables

### Docker / Self-hosted
1. Build Docker image: `docker build -t newsdeck .`
2. Run with PostgreSQL connection
3. Configure reverse proxy (nginx/Caddy) for HTTPS

## Performance Optimization

### Database Optimization
- Add indexes on frequently queried columns
- Use connection pooling (already configured)
- Archive old news items (>7 days)
- Implement read replicas for high traffic

### Cloud Run Optimization
- Set minimum instances for zero cold starts
- Increase memory for faster response times
- Use VPC connector for database access
- Enable HTTP/2 for better performance

### Caching Strategy
- Implement Redis/Memcached for session storage
- Cache dashboard configurations
- Use CDN for static assets

## Troubleshooting

### Common Issues:

1. **Database connection errors:**
   ```bash
   # Check Cloud SQL instance is running
   gcloud sql instances describe newsdeck-db

   # Test connection
   gcloud sql connect newsdeck-db --user=newsdeck-user
   ```

2. **API requests being rejected:**
   - Check `/admin/api-logs` for detailed error messages
   - Verify API key in request headers
   - Check request body format matches schema

3. **Build failures:**
   - Ensure `DOCKER_BUILD=true` when building for production
   - Check all environment variables are set
   - Verify PostgreSQL connection during build

4. **Authentication issues:**
   - Verify Google OAuth credentials
   - Check authorized redirect URIs in Google Console
   - Ensure NEXTAUTH_SECRET is set and secure (min 32 chars)

5. **Real-time updates not working:**
   - SSE requires persistent connections
   - Check if proxy/load balancer supports SSE
   - Verify EventSource connection in browser DevTools

### Debug Commands:

```bash
# View Cloud Run logs in real-time
gcloud logging tail "resource.type=cloud_run_revision"

# Check database connection pool
gcloud sql operations list --instance=newsdeck-db

# Test API endpoint
curl -X POST https://your-app.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{"items":[...],"events":{"workflowId":"test"}}'
```

## Support

For deployment issues:
- Check Google Cloud Console logs
- View API request logs at `/admin/api-logs`
- Monitor Cloud SQL performance metrics
- Review GitHub Actions workflow runs for CI/CD issues
