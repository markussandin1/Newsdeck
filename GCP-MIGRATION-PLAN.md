# GCP Migration Plan - Lift and Shift

## Översikt
Migrera befintlig Newsdeck POC till Google Cloud Platform med minimal förändring av funktionalitet. Total tidsåtgång: 3-4 dagar.

## Phase 1: Database Migration (1-2 dagar)

### 1.1 Ersätt in-memory storage med PostgreSQL
**Fil att uppdatera:** `lib/db-persistent.ts`

**Nuvarande:**
```typescript
// In-memory storage arrays
let newsItems: NewsItem[] = []
let dashboards: Dashboard[] = []
```

**Nytt:**
```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})
```

### 1.2 Skapa databastabeller
```sql
-- news_items table
CREATE TABLE news_items (
  id VARCHAR(255) PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL,
  source VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  news_value INTEGER NOT NULL CHECK (news_value BETWEEN 1 AND 5),
  category VARCHAR(100),
  severity VARCHAR(50),
  location JSONB,
  extra JSONB,
  raw JSONB,
  created_in_db TIMESTAMPTZ DEFAULT NOW()
);

-- dashboards table
CREATE TABLE dashboards (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  layout VARCHAR(50) DEFAULT '3-col',
  filters JSONB,
  columns JSONB,
  view_count INTEGER DEFAULT 0,
  last_viewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- column_data table (för column-specific storage)
CREATE TABLE column_data (
  column_id VARCHAR(255),
  news_item_id VARCHAR(255),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (column_id, news_item_id)
);

-- Indexes för performance
CREATE INDEX idx_news_items_workflow_id ON news_items(workflow_id);
CREATE INDEX idx_news_items_timestamp ON news_items(timestamp DESC);
CREATE INDEX idx_news_items_news_value ON news_items(news_value);
CREATE INDEX idx_dashboards_slug ON dashboards(slug);
CREATE INDEX idx_column_data_column_id ON column_data(column_id);
```

### 1.3 Uppdatera environment variables
**Fil att skapa:** `.env.local`
```env
DATABASE_URL=postgresql://username:password@localhost:5432/newsdeck
NODE_ENV=development
```

**För production:**
```env
DATABASE_URL=postgresql://username:password@CLOUD_SQL_PROXY:5432/newsdeck
NODE_ENV=production
```

## Phase 2: Deploy to Cloud Run (1 dag)

### 2.1 Skapa Dockerfile
**Fil att skapa:** `Dockerfile`
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### 2.2 Skapa Cloud Build config
**Fil att skapa:** `cloudbuild.yaml`
```yaml
steps:
  # Build container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/newsdeck:$COMMIT_SHA', '.']

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/newsdeck:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'newsdeck'
      - '--image'
      - 'gcr.io/$PROJECT_ID/newsdeck:$COMMIT_SHA'
      - '--region'
      - 'europe-west1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'NODE_ENV=production'
      - '--set-cloudsql-instances'
      - '$PROJECT_ID:europe-west1:newsdeck-db'

options:
  logging: CLOUD_LOGGING_ONLY
```

### 2.3 Deploy commands
```bash
# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com

# Build and deploy
gcloud builds submit --config cloudbuild.yaml
```

## Phase 3: Environment Config (1 dag)

### 3.1 Skapa Cloud SQL instans
```bash
# Create PostgreSQL instance
gcloud sql instances create newsdeck-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=europe-west1

# Create database
gcloud sql databases create newsdeck --instance=newsdeck-db

# Create user
gcloud sql users create newsdeck-user \
  --instance=newsdeck-db \
  --password=SECURE_PASSWORD_HERE
```

### 3.2 Konfigurera secrets
```bash
# Store database password in Secret Manager
gcloud secrets create db-password --data-file=-
# Enter password when prompted

# Grant Cloud Run access to secrets
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3.3 Uppdatera Cloud Run service
```bash
# Update with database connection
gcloud run services update newsdeck \
  --region=europe-west1 \
  --set-env-vars="DATABASE_URL=postgresql://newsdeck-user:PASSWORD@/newsdeck?host=/cloudsql/PROJECT_ID:europe-west1:newsdeck-db" \
  --add-cloudsql-instances=PROJECT_ID:europe-west1:newsdeck-db
```

## Implementeringsordning

### Dag 1: Lokal PostgreSQL setup
1. Installera PostgreSQL lokalt
2. Skapa databas och tabeller
3. Uppdatera `lib/db-persistent.ts` med PostgreSQL-anslutning
4. Testa att applikationen fungerar lokalt

### Dag 2: Database migration slutförd
1. Implementera alla CRUD-operationer med PostgreSQL
2. Testa alla API endpoints
3. Verifiera att data persisterar korrekt

### Dag 3: Cloud deployment
1. Skapa Dockerfile och testa lokalt
2. Sätt upp GCP-projekt och services
3. Skapa Cloud SQL instans
4. Deploy till Cloud Run

### Dag 4: Production ready
1. Konfigurera secrets och environment variables
2. Testa production deployment
3. Sätt upp monitoring och logging
4. Dokumentera deployment process

## Viktiga filer att uppdatera

1. **`lib/db-persistent.ts`** - Ersätt in-memory med PostgreSQL
2. **`package.json`** - Lägg till `pg` dependency
3. **`.env.local`** - Database connection string
4. **`Dockerfile`** - Container image definition
5. **`cloudbuild.yaml`** - Build and deploy pipeline

## Dependencies att lägga till

```bash
npm install pg @types/pg
```

## Environment Variables för production

```env
DATABASE_URL=postgresql://user:password@/db?host=/cloudsql/project:region:instance
NODE_ENV=production
PORT=3000
```

## Inga nya features

Detta är en ren "lift and shift" migration:
- ✅ Behåll all befintlig funktionalitet
- ✅ Samma API endpoints
- ✅ Samma UI/UX
- ✅ Samma dataformat
- ❌ Inga nya features
- ❌ Inga UI-ändringar
- ❌ Inga nya API endpoints

## Success criteria

1. **Funktionalitet:** All befintlig funktionalitet fungerar identiskt
2. **Performance:** Svarstider under 2 sekunder för alla endpoints
3. **Reliability:** 99.9% uptime på Cloud Run
4. **Data:** All data persisterar korrekt i PostgreSQL
5. **Deployment:** Automatisk deploy via Cloud Build

## Rollback plan

Om något går fel:
1. **Cloud Run:** Rollback till tidigare revision via Console
2. **Database:** Restore från backup
3. **Code:** Revert commits och redeploy
4. **Emergency:** Fallback till Vercel deployment med in-memory storage

---

**Total tidsåtgång: 3-4 dagar för komplett migration från POC till production på GCP**