# GCP Secret Manager Setup Guide

This guide walks you through setting up Google Cloud Secret Manager for secure secrets management in production.

## 🎯 Why Secret Manager?

**Before (Plain Text):**
```bash
# GitHub Secrets (exposed in logs, hard to rotate)
DATABASE_URL=postgresql://user:password@...
API_KEY=super-secret-key
GOOGLE_CLIENT_SECRET=oauth-secret
```

**After (Secret Manager):**
- ✅ Centralized secret management
- ✅ Automatic rotation support
- ✅ Audit logging (who accessed what, when)
- ✅ Version history
- ✅ Fine-grained IAM permissions
- ✅ No secrets in GitHub or logs

## 📋 Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured
- Project ID: `newsdeck-473620` (or your project)
- Permissions: `roles/secretmanager.admin` (for setup)

---

## 🚀 Step 1: Enable Secret Manager API

```bash
# Enable the Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Verify it's enabled
gcloud services list --enabled | grep secretmanager
```

---

## 🔐 Step 2: Create Secrets

### 2.1 Database URL

```bash
# For Cloud SQL Unix socket format
echo -n "postgresql://USER:PASSWORD@/cloudsql/PROJECT:REGION:INSTANCE/DATABASE" | \
  gcloud secrets create newsdeck-database-url \
    --replication-policy="automatic" \
    --data-file=-

# Example:
# postgresql://newsdeck:SecurePass123@/cloudsql/newsdeck-473620:europe-west1:newsdeck-db/newsdeck
```

**Verify:**
```bash
gcloud secrets describe newsdeck-database-url
```

### 2.2 NextAuth Secret

```bash
# Generate a secure random secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create newsdeck-nextauth-secret \
    --replication-policy="automatic" \
    --data-file=-
```

### 2.3 Google OAuth Client ID

```bash
# Get this from: https://console.cloud.google.com/apis/credentials
echo -n "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets create newsdeck-google-client-id \
    --replication-policy="automatic" \
    --data-file=-
```

### 2.4 Google OAuth Client Secret

```bash
echo -n "YOUR_GOOGLE_CLIENT_SECRET" | \
  gcloud secrets create newsdeck-google-client-secret \
    --replication-policy="automatic" \
    --data-file=-
```

### 2.5 API Key

```bash
# Generate a secure API key
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create newsdeck-api-key \
    --replication-policy="automatic" \
    --data-file=-
```

---

## 🔑 Step 3: Set IAM Permissions

Grant Cloud Run service account access to secrets:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe newsdeck-473620 --format="value(projectNumber)")

# Service account that Cloud Run uses
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant access to all secrets
for SECRET in newsdeck-database-url newsdeck-nextauth-secret newsdeck-google-client-id newsdeck-google-client-secret newsdeck-api-key; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
done
```

**Verify permissions:**
```bash
gcloud secrets get-iam-policy newsdeck-database-url
```

---

## ✅ Step 4: Verify Setup

### 4.1 List all secrets
```bash
gcloud secrets list
```

Expected output:
```
NAME                          CREATED              REPLICATION_POLICY  LOCATIONS
newsdeck-api-key             2024-XX-XX XX:XX:XX  automatic           -
newsdeck-database-url        2024-XX-XX XX:XX:XX  automatic           -
newsdeck-google-client-id    2024-XX-XX XX:XX:XX  automatic           -
newsdeck-google-client-secret 2024-XX-XX XX:XX:XX automatic           -
newsdeck-nextauth-secret     2024-XX-XX XX:XX:XX  automatic           -
```

### 4.2 Test access (read a secret)
```bash
gcloud secrets versions access latest --secret="newsdeck-api-key"
```

This should output your API key. **Don't run this in shared environments!**

---

## 🚢 Step 5: Deploy to Cloud Run

The application is now configured to automatically load secrets from Secret Manager in production.

```bash
# Deploy with only GCP_PROJECT_ID env var
gcloud run deploy newsdeck \
  --image gcr.io/newsdeck-473620/newsdeck:latest \
  --platform managed \
  --region europe-west1 \
  --add-cloudsql-instances newsdeck-473620:europe-west1:newsdeck-db \
  --set-env-vars GCP_PROJECT_ID=newsdeck-473620 \
  --service-account ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --allow-unauthenticated
```

**Note:** No DATABASE_URL, API_KEY, or other secrets needed! They're loaded from Secret Manager.

---

## 🔄 Step 6: Secret Rotation

### Manual Rotation

```bash
# Create a new version of a secret
echo -n "new-secret-value" | \
  gcloud secrets versions add newsdeck-api-key --data-file=-

# The application will automatically pick up the new version
# within 5 minutes (cache TTL)
```

### View Secret Versions

```bash
gcloud secrets versions list newsdeck-api-key
```

### Disable Old Version (optional)

```bash
gcloud secrets versions disable 1 --secret="newsdeck-api-key"
```

---

## 📊 Step 7: Monitoring & Audit Logs

### View Access Logs

```bash
# See who accessed secrets and when
gcloud logging read \
  'protoPayload.serviceName="secretmanager.googleapis.com"
   AND protoPayload.methodName="google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion"' \
  --limit 50 \
  --format json
```

### Set Up Alerts

```bash
# Create alert if secret is accessed more than 1000 times/hour
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Secret Manager High Access Rate" \
  --condition-display-name="High access rate" \
  --condition-threshold-value=1000 \
  --condition-threshold-duration=3600s
```

---

## 🧪 Testing Locally

Secrets are **NOT** loaded from Secret Manager in development mode.

```bash
# Local development uses .env file
cp .env.example .env.local

# Edit .env.local with your local values
DATABASE_URL=postgresql://localhost:5432/newsdeck_dev
API_KEY=local-dev-key
# ... etc
```

The application automatically detects `NODE_ENV=development` and uses environment variables instead.

---

## 🔧 Troubleshooting

### Problem: "Permission denied" when accessing secrets

**Solution:**
```bash
# Verify service account has secretAccessor role
gcloud secrets get-iam-policy newsdeck-database-url

# Re-add permission if missing
gcloud secrets add-iam-policy-binding newsdeck-database-url \
  --member="serviceAccount:YOUR_SA@PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Problem: "Secret not found"

**Solution:**
```bash
# Verify secret exists
gcloud secrets describe newsdeck-database-url

# If not found, create it (see Step 2)
```

### Problem: Application using old secret value

**Solution:**
```bash
# Secrets are cached for 5 minutes
# Wait 5 minutes or restart the application

# Force restart Cloud Run service
gcloud run services update newsdeck --region europe-west1
```

### Problem: "Failed to initialize secrets" error on startup

**Solution:**
```bash
# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=newsdeck" --limit 50

# Common issues:
# 1. GCP_PROJECT_ID not set (should be in env vars)
# 2. Service account doesn't have secretAccessor role
# 3. Secret doesn't exist or has no versions
```

---

## 📚 Additional Resources

- [GCP Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Best Practices for Secret Management](https://cloud.google.com/secret-manager/docs/best-practices)
- [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing)
- [Audit Logging](https://cloud.google.com/secret-manager/docs/audit-logging)

---

## 💰 Cost Estimate

With caching (5 min TTL):
- **Access operations:** ~300/day = 9,000/month
- **Cost:** $0.06 per 10,000 accesses = **~$0.05/month**
- **Storage:** 5 secrets × 1 version × $0.06/month = **$0.30/month**
- **Total:** **~$0.35/month** for enterprise-grade security 🎉

---

## ✅ Checklist

- [ ] Enable Secret Manager API
- [ ] Create all 5 secrets (database, nextauth, google client id/secret, api key)
- [ ] Set IAM permissions for Cloud Run service account
- [ ] Verify secrets are accessible
- [ ] Deploy to Cloud Run without secret env vars
- [ ] Test application startup and secret loading
- [ ] Verify secrets are loaded in production logs
- [ ] Set up monitoring/alerts (optional)
- [ ] Document secret rotation process for team

---

## 🎓 How It Works

1. **Application Starts:** `instrumentation.ts` runs before any requests
2. **Secrets Initialized:** All secrets pre-loaded from Secret Manager
3. **Cached:** Secrets cached for 5 minutes to reduce API calls
4. **Used:** Application code uses cached secrets
5. **Rotated:** New versions automatically picked up after cache expires

```
┌─────────────────────┐
│  Application Start  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Load from Secret    │◄─── Only in production
│ Manager (GCP)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Cache (5 min TTL)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Application Code   │
└─────────────────────┘
```

---

## 🔒 Security Notes

1. **Never log secret values** - Use `logger.info('secrets.fetched', { secretName })` instead
2. **Use least privilege** - Only grant `secretAccessor`, not `secretAdmin`
3. **Enable audit logging** - Track who accesses secrets
4. **Rotate regularly** - Update secrets at least annually
5. **Use automatic replication** - For high availability

---

**Questions?** Check the troubleshooting section or contact the DevOps team.
