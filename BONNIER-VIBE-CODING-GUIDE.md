# Bonnier News Vibe Coding Guide

En komplett guide för att bygga och deploya Next.js-applikationer med AI-assistans (Claude, Cursor, etc.) på Bonnier News GCP-infrastruktur.

---

## Filosofi

**Vibe Coding** handlar om att bygga snabbt med AI-assistans samtidigt som man följer best practices för produktion. Denna guide är baserad på erfarenheter från NewsDeck-projektet och är designad för att:

- Minimera manuell konfiguration
- Säkerställa produktionskvalitet från dag ett
- Möjliggöra snabb iteration med AI-verktyg
- Följa Bonnier News säkerhet- och infrastrukturkrav

---

## Innan du börjar

### Förutsättningar

- [ ] Tillgång till Bonnier News GCP-projekt
- [ ] GitHub-konto med access till Bonnier News organisation
- [ ] Docker installerat lokalt (för databas)
- [ ] Node.js 18+ installerat
- [ ] gcloud CLI installerat och konfigurerat
- [ ] VS Code installerat
- [ ] Claude Code CLI (rekommenderat för AI-assistans)

### Viktiga beslut att ta

1. **Projektnamn**: Kort, beskrivande (lowercase, inga specialtecken)
2. **Databas**: Behöver projektet persistent data?
3. **Autentisering**: Behövs inloggning? (Rekommendation: NextAuth v5 med Google OAuth)
4. **Real-time**: Behöver användare se uppdateringar live?

---

## Fas 0: Utvecklingsmiljö setup (20 min)

### 0.1 VS Code Installation och Konfiguration

**Installera VS Code:**
- Ladda ner från [code.visualstudio.com](https://code.visualstudio.com)
- Eller via Homebrew: `brew install --cask visual-studio-code`

**Rekommenderade Extensions:**

Installera via VS Code eller terminal:

```bash
# Essential extensions
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next

# AI & Produktivitet
code --install-extension GitHub.copilot
code --install-extension usernamehw.errorlens

# Database
code --install-extension mtxr.sqltools
code --install-extension mtxr.sqltools-driver-pg

# Git
code --install-extension eamodio.gitlens
```

**VS Code Settings för Next.js:**

Skapa `.vscode/settings.json` i projektroten:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**VS Code Workspace Extensions:**

Skapa `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "usernamehw.errorlens",
    "eamodio.gitlens"
  ]
}
```

### 0.2 Claude Code CLI Setup

Claude Code är Anthropics officiella CLI för AI-assisterad kodning. Det är betydligt mer kraftfullt än vanliga chat-gränssnitt eftersom det har full access till filsystemet, kan köra kommandon, och förstå hela projektets kontext.

**Installation:**

```bash
# macOS via Homebrew
brew tap anthropics/claude-code
brew install claude-code

# Eller via npm
npm install -g @anthropics/claude-code
```

**Autentisering:**

```bash
# Starta Claude Code första gången
claude-code

# Du kommer bli ombedd att logga in via browser
# Följ instruktionerna och authentisera med ditt Anthropic-konto
```

**Grundläggande användning:**

```bash
# Starta Claude Code i projektkatalogen
cd ditt-projekt
claude-code

# Eller öppna direkt från VS Code
# Öppna Command Palette (Cmd+Shift+P) och sök "Claude Code"
```

**Best Practices med Claude Code:**

1. **Använd CLAUDE.md:**
   ```bash
   # Skapa en CLAUDE.md fil som förklarar projektet
   # Claude läser denna automatiskt och får kontext
   ```

2. **Tydliga instruktioner:**
   ```
   Du: "Skapa en API endpoint för att hämta användare från databasen"
   Claude: *Skapar route.ts med TypeScript, error handling, och databas-query*
   ```

3. **Iterativ utveckling:**
   ```
   Du: "Lägg till paginering till user endpoint"
   Claude: *Uppdaterar befintlig kod med limit/offset parametrar*
   ```

4. **Kodgranskning:**
   ```
   Du: "Granska säkerheten i min auth-implementering"
   Claude: *Analyserar koden och ger konkreta förbättringsförslag*
   ```

**Exempel på arbetsflöde:**

```bash
# 1. Starta Claude Code
claude-code

# 2. Be om hjälp med setup
Du: "Hjälp mig sätta upp en Next.js app med PostgreSQL och NextAuth"

# 3. Claude skapar alla nödvändiga filer:
# - docker-compose.yml
# - lib/db.ts
# - auth.ts
# - Konfigurerar next.config.js
# - Skapar example .env file

# 4. Be om features
Du: "Skapa en dashboard-sida som visar användarstatistik från databasen"

# 5. Claude implementerar:
# - API route i app/api/stats/route.ts
# - Dashboard component i app/dashboard/page.tsx
# - Databas-query i lib/db.ts
# - TypeScript types i lib/types.ts

# 6. Fråga om best practices
Du: "Hur kan jag optimera denna query för många användare?"

# 7. Claude ger konkreta förbättringar och implementerar dem
```

**Tips och Tricks:**

1. **Använd /commands:**
   ```
   /help       - Visa alla tillgängliga kommandon
   /clear      - Rensa konversationen
   /model      - Byt AI-modell
   /diff       - Visa ändringar
   ```

2. **Fråga om projekt-specifika saker:**
   ```
   Du: "Hur ska jag strukturera mina React components i detta projekt?"
   Du: "Visa mig hur long-polling fungerar i vår implementation"
   Du: "Förklara hur Pub/Sub-integrationen fungerar"
   ```

3. **Be om kod-genomgångar:**
   ```
   Du: "Granska min PR innan jag mergar"
   Du: "Finns det några säkerhetsproblem i min API?"
   Du: "Kan du optimera denna komponent för performance?"
   ```

4. **Använd för dokumentation:**
   ```
   Du: "Skapa en README för denna feature"
   Du: "Dokumentera API-endpoints i OpenAPI format"
   Du: "Lägg till JSDoc kommentarer i mina funktioner"
   ```

### 0.3 Alternative: Google Gemini Code Assist (Beta)

Om du föredrar Google Gemini eller har tillgång till Bonnier News GCP Gemini integration:

**Installation via gcloud:**

```bash
# Installera Gemini Code Assist extension
gcloud components install gemini

# Autentisera med ditt Bonnier GCP-konto
gcloud auth login
gcloud config set project ditt-projekt-prod

# Aktivera Gemini API
gcloud services enable cloudaicompanion.googleapis.com
```

**VS Code Extension:**

```bash
# Installera Google Cloud Code extension (inkluderar Gemini)
code --install-extension GoogleCloudTools.cloudcode
```

**Använda Gemini i VS Code:**

1. Öppna Command Palette (Cmd+Shift+P)
2. Sök "Gemini: Start Chat"
3. Gemini har automatisk access till din GCP-projektkontext

**Fördelar med Gemini för Bonnier:**
- Integrerad med GCP-projekt
- Förstår Cloud Run, Cloud SQL, etc. automatiskt
- Kan generera gcloud-kommandon
- Gratis för GCP-kunder (ofta)

**Jämförelse: Claude vs Gemini**

| Feature | Claude Code | Gemini Code Assist |
|---------|-------------|-------------------|
| Kodkvalitet | Exceptionell | Mycket bra |
| GCP Integration | Via gcloud CLI | Native |
| Pris | Abonnemang | Ofta gratis med GCP |
| Filsystem access | Full | Full |
| Kontext-förståelse | Utmärkt | Bra |
| Rekommendation | **Generell utveckling** | **GCP-specifik utveckling** |

**Vår rekommendation:**
- **Claude Code** för huvudsaklig utveckling (bättre kodkvalitet)
- **Gemini** för GCP-specifika frågor och deployment

---

## Fas 1: Projekt-setup (15 min)

### 1.1 Skapa GitHub Repository

```bash
# Skapa nytt repo på github.com/bonnierNews
# Eller via GitHub CLI:
gh repo create bonnierNews/ditt-projekt --private
```

### 1.2 Initiera Next.js-projekt

```bash
npx create-next-app@latest ditt-projekt
# Välj följande:
# ✅ TypeScript
# ✅ ESLint
# ✅ Tailwind CSS
# ✅ App Router
# ✅ Turbopack (optional)
# ❌ src/ directory (använd root-struktur)
```

### 1.3 Installera grundläggande dependencies

```bash
cd ditt-projekt

# TypeScript och linting
npm install -D @types/node @types/react @types/react-dom

# UI-bibliotek
npm install lucide-react class-variance-authority clsx tailwind-merge

# shadcn/ui (optional men rekommenderat)
npx shadcn@latest init
```

---

## Fas 2: Lokal utvecklingsmiljö (30 min)

### 2.1 Databas med Docker (PostgreSQL)

**Skapa `docker-compose.yml`:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ditt-projekt-postgres
    environment:
      POSTGRES_USER: ditt-projekt-user
      POSTGRES_PASSWORD: local-dev-password-change-me
      POSTGRES_DB: ditt-projekt_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ditt-projekt-user"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Skapa `db/init.sql`:**

```sql
-- Skapa grundläggande tabeller
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lägg till dina tabeller här
```

**Lägg till npm-scripts i `package.json`:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",

    "db:start": "docker-compose up -d postgres",
    "db:stop": "docker-compose down",
    "db:reset": "docker-compose down -v && docker-compose up -d postgres",
    "db:logs": "docker-compose logs -f postgres",
    "db:connect": "docker exec -it ditt-projekt-postgres psql -U ditt-projekt-user -d ditt-projekt_dev"
  }
}
```

### 2.2 Databasadapter

**Skapa `lib/db.ts`:**

```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://ditt-projekt-user:local-dev-password-change-me@localhost:5432/ditt-projekt_dev'
})

export const query = async (text: string, params?: any[]) => {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

// Exempel på hjälpfunktioner
export const db = {
  async getUsers() {
    const result = await query('SELECT * FROM users')
    return result.rows
  }
}
```

**Installera dependencies:**

```bash
npm install pg @types/pg
```

### 2.3 Environment Variables

**Skapa `.env.local`:**

```bash
# Database
DATABASE_URL=postgresql://ditt-projekt-user:local-dev-password-change-me@localhost:5432/ditt-projekt_dev

# NextAuth (om du använder det)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth (om du använder det)
GOOGLE_CLIENT_ID=din-client-id
GOOGLE_CLIENT_SECRET=din-client-secret

# API Keys
API_KEY=local-dev-api-key
```

**Lägg till i `.gitignore`:**

```
.env*.local
node_modules
.next
```

### 2.4 Testa lokal miljö

```bash
# Starta databas
npm run db:start

# Vänta tills den är redo (ca 5 sek)
# Testa connection
npm run db:connect
# Kör: \dt för att se tabeller
# Kör: \q för att avsluta

# Starta utvecklingsserver
npm run dev
```

Öppna http://localhost:3000 - du bör se Next.js startsida.

---

## Fas 3: Autentisering (valfritt, 45 min)

Om din app behöver inloggning, använd NextAuth v5 med Google OAuth.

### 3.1 Installera NextAuth

```bash
npm install next-auth@beta
```

### 3.2 Konfigurera Google OAuth

1. Gå till [Google Cloud Console](https://console.cloud.google.com)
2. Välj Bonnier News GCP-projekt
3. Navigera till **APIs & Services → Credentials**
4. Skapa **OAuth 2.0 Client ID**:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (lokal)
     - `https://ditt-projekt-xxxxx.a.run.app/api/auth/callback/google` (produktion)
5. Kopiera Client ID och Client Secret till `.env.local`

### 3.3 Skapa NextAuth-konfiguration

**Skapa `auth.ts`:**

```typescript
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: 'bonniernews.se' // Begränsa till Bonnier-domänen
        }
      }
    })
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Endast tillåt @bonniernews.se och @bn.nr emails
      if (profile?.email?.endsWith('@bonniernews.se') ||
          profile?.email?.endsWith('@bn.nr')) {
        return true
      }
      return false
    }
  }
})
```

**Skapa `app/api/auth/[...nextauth]/route.ts`:**

```typescript
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

### 3.4 Skydda routes

**Middleware (`middleware.ts`):**

```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isApiRoute = req.nextUrl.pathname.startsWith('/api')
  const isPublicApi = req.nextUrl.pathname.startsWith('/api/public')

  // Tillåt publika API-endpoints
  if (isPublicApi) {
    return NextResponse.next()
  }

  // Kräv auth för alla andra routes utom login
  if (!isLoggedIn && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

---

## Fas 4: Google Cloud Platform Setup (60 min)

### 4.1 Skapa GCP-projekt

```bash
# Logga in
gcloud auth login

# Lista tillgängliga projekt
gcloud projects list

# Om du behöver skapa nytt projekt:
gcloud projects create ditt-projekt-prod --name="Ditt Projekt"

# Sätt active project
gcloud config set project ditt-projekt-prod
```

### 4.2 Aktivera nödvändiga APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

### 4.3 Skapa Cloud SQL (PostgreSQL)

```bash
# Skapa Cloud SQL-instans
gcloud sql instances create ditt-projekt-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --root-password=ändra-mig-i-produktionen

# Skapa databas
gcloud sql databases create ditt-projekt_prod \
  --instance=ditt-projekt-db

# Skapa användare
gcloud sql users create ditt-projekt-user \
  --instance=ditt-projekt-db \
  --password=generera-säker-lösenord
```

**Spara följande för senare:**
- Instance connection name: `ditt-projekt-prod:europe-west1:ditt-projekt-db`
- Database: `ditt-projekt_prod`
- User: `ditt-projekt-user`
- Password: (det du genererade)

### 4.4 Skapa Artifact Registry

```bash
gcloud artifacts repositories create cloud-run-source-deploy \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Docker images for Cloud Run"
```

### 4.5 Konfigurera Workload Identity (för GitHub Actions)

```bash
# 1. Skapa Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool"

# 2. Skapa provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='bonnierNews/ditt-projekt'"

# 3. Skapa service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account"

# 4. Ge behörigheter
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# 5. Bind till GitHub repo
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/bonnierNews/ditt-projekt"
```

**Spara Workload Identity Provider för GitHub Actions:**

```bash
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
```

---

## Fas 5: CI/CD med GitHub Actions (30 min)

### 5.1 Skapa Dockerfile

**Skapa `Dockerfile` i projektroten:**

```dockerfile
# Multi-stage build för optimal storlek
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Builder
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Uppdatera `next.config.js`:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // För Docker
}

module.exports = nextConfig
```

### 5.2 Skapa GitHub Actions Workflows

**Skapa `.github/workflows/ci.yml`:**

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test
        continue-on-error: true
```

**Skapa `.github/workflows/deploy.yml`:**

```yaml
name: Deploy to Cloud Run

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [ main ]

env:
  PROJECT_ID: ditt-projekt-prod  # ÄNDRA DETTA
  REGION: europe-west1
  SERVICE: ditt-projekt          # ÄNDRA DETTA
  REPOSITORY: cloud-run-source-deploy

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}

    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/XXX/locations/global/workloadIdentityPools/github-pool/providers/github-provider'  # ÄNDRA DETTA
          service_account: 'github-actions@ditt-projekt-prod.iam.gserviceaccount.com'  # ÄNDRA DETTA

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: |
          gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev

      - name: Build and push Docker image
        run: |
          IMAGE="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.SERVICE }}:${{ github.sha }}"
          docker build -t $IMAGE .
          docker push $IMAGE

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ${{ env.SERVICE }} \
            --image ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.SERVICE }}:${{ github.sha }} \
            --platform managed \
            --region ${{ env.REGION }} \
            --allow-unauthenticated \
            --add-cloudsql-instances ${{ env.PROJECT_ID }}:${{ env.REGION }}:ditt-projekt-db \
            --set-env-vars "NODE_ENV=production"
```

---

## Fas 6: Konfigurera Cloud Run (30 min)

### 6.1 Skapa Cloud Run Service

```bash
gcloud run deploy ditt-projekt \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances ditt-projekt-prod:europe-west1:ditt-projekt-db \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### 6.2 Konfigurera Environment Variables

```bash
# Sätt DATABASE_URL
gcloud run services update ditt-projekt \
  --region europe-west1 \
  --set-env-vars "DATABASE_URL=postgresql://ditt-projekt-user:PASSWORD@/ditt-projekt_prod?host=/cloudsql/ditt-projekt-prod:europe-west1:ditt-projekt-db"

# Sätt NEXTAUTH_URL (efter deploy för att få URL)
SERVICE_URL=$(gcloud run services describe ditt-projekt --region europe-west1 --format='value(status.url)')
gcloud run services update ditt-projekt \
  --region europe-west1 \
  --set-env-vars "NEXTAUTH_URL=${SERVICE_URL}"

# Sätt NEXTAUTH_SECRET (generera först: openssl rand -base64 32)
gcloud run services update ditt-projekt \
  --region europe-west1 \
  --set-env-vars "NEXTAUTH_SECRET=DIN-GENERERADE-SECRET"
```

**Alternativt: Använd Secret Manager (rekommenderat för produktion)**

```bash
# Skapa secret
echo -n "ditt-lösenord" | gcloud secrets create db-password --data-file=-

# Ge Cloud Run access
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:github-actions@ditt-projekt-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Montera i Cloud Run
gcloud run services update ditt-projekt \
  --region europe-west1 \
  --set-secrets="DB_PASSWORD=db-password:latest"
```

---

## Fas 7: Verifiera och testa (15 min)

### 7.1 Testa lokal miljö

```bash
# Starta allt lokalt
npm run db:start
npm run dev

# Testa API endpoints
curl http://localhost:3000/api/status
```

### 7.2 Testa produktion

```bash
# Hämta service URL
SERVICE_URL=$(gcloud run services describe ditt-projekt --region europe-west1 --format='value(status.url)')

# Testa health check
curl $SERVICE_URL/api/status

# Öppna i browser
open $SERVICE_URL
```

### 7.3 Testa deployment pipeline

```bash
# Gör en liten ändring
echo "Test deploy" >> README.md

# Commit och push
git add .
git commit -m "test: verify deployment pipeline"
git push origin main

# Följ deploy i GitHub Actions
# https://github.com/bonnierNews/ditt-projekt/actions
```

---

## Fas 8: Produktionsklar checklista

Innan du går live, verifiera att:

### Säkerhet
- [ ] Environment variables är satta i Cloud Run (ej hårdkodade)
- [ ] Database lösenord är starka och unika
- [ ] NextAuth är konfigurerat med Google OAuth
- [ ] API endpoints har autentisering
- [ ] CORS är konfigurerat korrekt
- [ ] Rate limiting implementerat (om publika endpoints)

### Performance
- [ ] Next.js standalone build fungerar
- [ ] Docker image är optimerad (multi-stage build)
- [ ] Database indexering konfigurerad
- [ ] Cloud Run min/max instances är rimliga

### Monitoring
- [ ] Logging fungerar (console.log syns i Cloud Run logs)
- [ ] Error tracking konfigurerat (optional: Sentry)
- [ ] Uptime monitoring (optional: Cloud Monitoring)

### Dokumentation
- [ ] README.md uppdaterad med projektinfo
- [ ] CLAUDE.md skapad för AI-assistans
- [ ] Environment variables dokumenterade
- [ ] Deployment process dokumenterad

---

## Vanliga problem och lösningar

### Problem: Cloud Run kan inte ansluta till Cloud SQL

**Lösning:**
```bash
# Verifiera att Cloud SQL connector är aktiverad
gcloud run services describe ditt-projekt --region europe-west1 | grep cloudsql

# Lägg till om den saknas
gcloud run services update ditt-projekt \
  --add-cloudsql-instances ditt-projekt-prod:europe-west1:ditt-projekt-db
```

### Problem: NextAuth callback URL mismatch

**Lösning:**
1. Gå till Google Cloud Console → APIs & Services → Credentials
2. Editera din OAuth 2.0 Client
3. Lägg till Cloud Run URL i Authorized redirect URIs:
   ```
   https://ditt-projekt-xxxxx.a.run.app/api/auth/callback/google
   ```

### Problem: Docker build timeout i GitHub Actions

**Lösning:**
```yaml
# Lägg till i deploy.yml
- name: Build and push Docker image
  timeout-minutes: 30  # Öka timeout
```

### Problem: Environment variables syns inte i Cloud Run

**Lösning:**
```bash
# Lista alla env vars
gcloud run services describe ditt-projekt --region europe-west1 --format="value(spec.template.spec.containers[0].env)"

# Sätt om dem saknas
gcloud run services update ditt-projekt \
  --region europe-west1 \
  --set-env-vars "KEY=VALUE"
```

---

## Best Practices för Vibe Coding

### 1. Använd CLAUDE.md

Skapa alltid en `CLAUDE.md` i projektroten som beskriver:
- Projektöversikt och arkitektur
- Teknikval och varför
- API-struktur
- Deployment-process
- Vanliga tasks och hur man gör dem

### 2. Strukturera för AI-förståelse

```
/app
  /api              # API routes
  /(routes)         # Next.js pages
/components         # React components
/lib
  /db.ts           # Database adapter
  /auth.ts         # Auth config
  /types.ts        # TypeScript types
/migrations        # SQL migrations
```

### 3. Dokumentera environment variables

**Skapa `.env.example`:**

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 4. Type safety överallt

```typescript
// lib/types.ts
export interface User {
  id: string
  email: string
  name?: string
}

// Använd i API
import { User } from '@/lib/types'

export async function GET() {
  const users: User[] = await db.getUsers()
  return Response.json({ users })
}
```

### 5. Använd TypeScript strict mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true
  }
}
```

---

## Kostnadsuppskattning

För en typisk app med måttlig trafik:

| Tjänst | Kostnad/månad | Beskrivning |
|--------|---------------|-------------|
| Cloud Run | 0-50 kr | Pay-per-use, gratis tier generös |
| Cloud SQL (db-f1-micro) | ~120 kr | Smallest instance |
| Artifact Registry | ~10 kr | Docker image storage |
| **Total** | **~180 kr/månad** | För låg-till-medel trafik |

**Tips för att hålla nere kostnader:**
- Använd Cloud Run min-instances: 0 (cold start OK för de flesta apps)
- Cloud SQL automatic backups: 7 dagar (ej 30)
- Artifact Registry: Ta bort gamla images regelbundet

---

## Nästa steg

1. **Lägg till övervkning:**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Implementera real-time features:**
   - Google Cloud Pub/Sub för event streaming
   - Long-polling som fallback

3. **Lägg till tester:**
   ```bash
   npm install -D vitest @testing-library/react
   ```

4. **Custom domain:**
   ```bash
   gcloud run domain-mappings create \
     --service ditt-projekt \
     --domain ditt-projekt.bonniernews.se \
     --region europe-west1
   ```

---

## Support och resurser

- **Intern Slack:** #tech-support
- **GCP Console:** https://console.cloud.google.com
- **Next.js Docs:** https://nextjs.org/docs
- **Cloud Run Docs:** https://cloud.google.com/run/docs

---

## Exempel-projekt

Se **NewsDeck** för fullständigt exempel:
- Repository: `bonnierNews/newsdeck`
- Live: https://newsdeck-ket27oveqq-ew.a.run.app
- Teknik: Next.js 15 + PostgreSQL + Pub/Sub + NextAuth

---

**Lycka till med din Bonnier News vibe coding-app!** 🚀
