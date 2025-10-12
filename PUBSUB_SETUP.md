# Pub/Sub Setup Guide

Detta dokument beskriver hur man sätter upp Google Cloud Pub/Sub för real-time uppdateringar i Newsdeck.

## Översikt

Newsdeck använder nu **Google Cloud Pub/Sub + Long Polling** istället för Server-Sent Events (SSE) för real-time uppdateringar. Detta fungerar betydligt bättre i Cloud Run eftersom:

- ✅ Long polling fungerar genom load balancers
- ✅ Ingen buffering-problem
- ✅ Pub/Sub sköter distribution till alla Cloud Run instanser
- ✅ Fungerar både lokalt (med event queue) och i produktion (med Pub/Sub)

## Arkitektur

```
Workflow/API → Ingestion → Pub/Sub Topic → Push Subscription
                  ↓                              ↓
              Event Queue ← ← ← ← ← Pub/Sub Webhook
                  ↓
              Long Polling ← Frontend
```

**Lokalt**: Event queue används direkt (ingen Pub/Sub)
**Produktion**: Pub/Sub → Webhook → Event queue → Long polling

## Steg 1: Autentisera med Google Cloud

```bash
gcloud auth login
gcloud config set project newsdeck-473620
```

## Steg 2: Skapa Pub/Sub Topic

```bash
# Skapa topic för news items
gcloud pubsub topics create newsdeck-news-items
```

## Steg 3: Skapa Push Subscription

**VIKTIGT**: Ersätt `YOUR_CLOUD_RUN_URL` med din faktiska Cloud Run URL

```bash
# Skapa push subscription som skickar till webhook endpoint
gcloud pubsub subscriptions create newsdeck-news-items-sub \
  --topic=newsdeck-news-items \
  --push-endpoint=https://newsdeck-ket27oveqq-ew.a.run.app/api/pubsub/news-items \
  --ack-deadline=60
```

## Steg 4: Ge Permissions

```bash
# Ge Cloud Run service account rätt att publicera till topic
gcloud pubsub topics add-iam-policy-binding newsdeck-news-items \
  --member="serviceAccount:389280113319-compute@developer.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Ge Pub/Sub rätt att skicka push requests till Cloud Run
gcloud run services add-iam-policy-binding newsdeck \
  --region=europe-west1 \
  --member="serviceAccount:service-389280113319@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

## Steg 5: Verifiera Setup

```bash
# Testa att topic finns
gcloud pubsub topics list

# Testa att subscription finns
gcloud pubsub subscriptions list

# Testa att publicera ett meddelande (manuellt test)
gcloud pubsub topics publish newsdeck-news-items \
  --message='{"columnIds":["test-column"],"items":[],"timestamp":"2025-01-01T00:00:00Z"}'
```

## Steg 6: Lokal Utveckling

För lokal utveckling använder vi bara event queue (ingen Pub/Sub krävs):

```bash
# Starta dev server
npm run dev

# Systemet kommer automatiskt använda event queue direkt utan Pub/Sub
# (se lib/pubsub.ts - skippar Pub/Sub i development mode)
```

### Alternativ: Lokal Utveckling med Pub/Sub Emulator

Om du vill testa Pub/Sub lokalt:

```bash
# Installera Pub/Sub emulator
gcloud components install pubsub-emulator

# Starta emulator
gcloud beta emulators pubsub start --project=newsdeck-473620

# I ett annat terminal, sätt environment variable
export PUBSUB_EMULATOR_HOST=localhost:8085

# Skapa topic i emulator
gcloud pubsub topics create newsdeck-news-items --project=newsdeck-473620

# Starta dev server
npm run dev
```

## Test i Produktion

### 1. Skicka Testdata

Använd curl för att skicka testdata till workflows endpoint:

```bash
curl -X POST https://newsdeck-ket27oveqq-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: ON/pBHKq/rAvFLdFP8riSarzITiR6aAY5vGyT7VeVw8=" \
  -d '{
    "items": [{
      "title": "Test från Pub/Sub",
      "description": "Detta är ett test av real-time uppdateringar",
      "newsValue": 4,
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }],
    "events": {
      "workflowId": "DIN_WORKFLOW_ID"
    }
  }'
```

### 2. Kontrollera Loggar

```bash
# Visa loggar från Cloud Run
gcloud run services logs read newsdeck --region=europe-west1 --limit=50

# Filtrera för Pub/Sub-relaterade loggar
gcloud run services logs read newsdeck --region=europe-west1 --limit=50 | grep -i pubsub
```

### 3. Kontrollera Pub/Sub Metrics

```bash
# Visa subscription metrics
gcloud pubsub subscriptions describe newsdeck-news-items

# Visa topic metrics i Cloud Console
# https://console.cloud.google.com/cloudpubsub/topic/detail/newsdeck-news-items?project=newsdeck-473620
```

## Felsökning

### Problem: Long polling får 401 Unauthorized

**Orsak**: Middleware blockerar requests
**Lösning**: Lägg till `/api/columns/*/updates` i middleware matcher exclusions

### Problem: Pub/Sub push requests får 403 Forbidden

**Orsak**: Pub/Sub service account har inte rätt permissions
**Lösning**: Kör permission-kommandot från Steg 4 igen

### Problem: Inga uppdateringar i frontend

**Debug**:
1. Öppna Browser Console och kolla efter `LongPoll:` loggar
2. Öppna Network tab och filtrera på `updates` - ska se long polling requests
3. Kontrollera Cloud Run loggar för `pubsub.published` och `longpoll.response`

### Problem: "Topic not found" error

**Orsak**: Topic har inte skapats i rätt projekt
**Lösning**:
```bash
gcloud config set project newsdeck-473620
gcloud pubsub topics create newsdeck-news-items
```

## Monitoring

### Event Queue Stats

Besök `/api/pubsub/news-items` för att se event queue statistics:

```bash
curl https://newsdeck-ket27oveqq-ew.a.run.app/api/pubsub/news-items
```

Response:
```json
{
  "success": true,
  "service": "pubsub-webhook",
  "stats": {
    "queuedColumns": 3,
    "totalQueuedItems": 15,
    "pendingRequests": 4
  }
}
```

### Pub/Sub Metrics i Cloud Console

- **Message count**: Antal meddelanden som publicerats
- **Publish rate**: Hur många meddelanden/sekund
- **Oldest unacked message**: Om subscription ligger efter
- **Delivery rate**: Hur många push requests/sekund

## Environment Variables

Följande environment variables används:

```bash
# Används av lib/pubsub.ts
GCP_PROJECT_ID=newsdeck-473620

# Används endast för lokal development med emulator (optional)
PUBSUB_EMULATOR_HOST=localhost:8085
```

## Nästa Steg

1. ✅ Kör gcloud-kommandona för att sätta upp Pub/Sub
2. ✅ Deploya till Cloud Run
3. ✅ Testa genom att skicka testdata
4. ✅ Verifiera i browser console att long polling fungerar
5. ✅ Övervaka Pub/Sub metrics i Cloud Console

## Cleanup (om du vill ta bort allt)

```bash
# Ta bort subscription
gcloud pubsub subscriptions delete newsdeck-news-items-sub

# Ta bort topic
gcloud pubsub topics delete newsdeck-news-items
```
