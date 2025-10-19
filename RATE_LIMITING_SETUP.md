# Rate Limiting Setup Guide

## Översikt

NewsDeck använder **PostgreSQL** för rate limiting (INGEN extra tjänst behövs!). Detta skyddar systemet mot:
- Buggar i Workflows som genererar för många requests
- Oavsiktlig överbelastning av databasen
- DoS-attacker

**Gräns:** 100 requests per minut per workflow (lätt att justera)

## ✅ Ingen Setup Krävs!

Rate limiting använder er **befintliga PostgreSQL-databas** (DATABASE_URL).

**Tabell skapas automatiskt** vid första requesten:
- `rate_limit_log` - Enkel logg för tracking av requests
- Auto-cleanup av gamla poster (sliding window)

## Produktion

### Verifiera att det fungerar

Efter deploy, kolla loggarna:
```bash
gcloud logging read "resource.type=cloud_run_revision" --limit 10

# Du ska se:
# ✅ Rate limiting enabled with PostgreSQL
```

### Prestanda

**PostgreSQL rate limiting är:**
- ✅ **GRATIS** (använder befintlig databas)
- ✅ **Enkel** (ingen extra tjänst)
- ✅ **Snabb nog** för 100 req/min (< 10ms overhead)
- ⚠️ **Inte optimal** för 1000+ req/min (då behövs Redis)

**För era interna workflows (100 req/min) är detta PERFEKT.**

## Testa Rate Limiting

### Test 1: Verify Normal Operation

```bash
# Skicka en normal request (ska lyckas)
curl -X POST https://newsdeck-xxxxxx-ew.a.run.app/api/workflows \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "workflowId": "test-workflow",
    "items": [{
      "title": "Test",
      "source": "test",
      "newsValue": 3,
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }]
  }'

# Förväntat svar:
# {"success":true,"message":"Workflow payload processed",...}
```

### Test 2: Trigger Rate Limit

```bash
# Skicka 1001 requests snabbt (ska trigga rate limit efter 1000)
for i in {1..1001}; do
  curl -X POST https://newsdeck-xxxxxx-ew.a.run.app/api/workflows \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d '{
      "workflowId": "test-workflow",
      "items": [{
        "title": "Test '$i'",
        "source": "test",
        "newsValue": 3,
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }]
    }' &
done
wait

# Efter ~1000 requests ska du få:
# {
#   "success": false,
#   "error": "Rate limit exceeded",
#   "message": "Maximum 1000 requests per minute. Try again in 42 seconds.",
#   "limit": 1000,
#   "remaining": 0,
#   "reset": 1234567890
# }
```

### Test 3: Check Rate Limit Headers

```bash
# Headers visar remaining requests
curl -i -X POST https://newsdeck-xxxxxx-ew.a.run.app/api/workflows \
  -H "x-api-key: $API_KEY" \
  -d '{"workflowId":"test","items":[]}'

# Headers:
# X-RateLimit-Limit: 1000
# X-RateLimit-Remaining: 999
# X-RateLimit-Reset: 1234567890
# Retry-After: 60  (om rate limited)
```

## Övervaka Rate Limiting

### Upstash Dashboard

- **Requests/sec:** Se trafik i realtid
- **Storage:** Redis memory usage (borde vara minimal)
- **Latency:** P99 latency (borde vara <10ms)

### Cloud Logging

```bash
# Se rate limit events
gcloud logging read "jsonPayload.message=~'rateLimited'" --limit 20

# Output:
# {
#   "identifier": "workflow:test-workflow",
#   "limit": 1000,
#   "reset": "2025-10-19T12:34:56Z"
# }
```

### API Request Logs (i databasen)

```sql
-- Räkna rate limited requests per workflow
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as rate_limited_count,
  metadata->>'identifier' as workflow
FROM api_request_logs
WHERE status_code = 429
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, workflow
ORDER BY hour DESC, rate_limited_count DESC;
```

## Justera Rate Limit

### Ändra Gräns (från 1000 req/min)

Redigera `lib/rate-limit.ts`:

```typescript
// Från:
const RATE_LIMIT_MAX_REQUESTS = 1000
const RATE_LIMIT_WINDOW = '1 m'

// Till (exempel: 5000 req/min):
const RATE_LIMIT_MAX_REQUESTS = 5000
const RATE_LIMIT_WINDOW = '1 m'

// Eller (100 req/10 sekunder):
const RATE_LIMIT_MAX_REQUESTS = 100
const RATE_LIMIT_WINDOW = '10 s'
```

Deploy ny version för att aktivera.

### Per-Workflow Limits (Future Enhancement)

För att ha olika limits per workflow, uppdatera `checkRateLimit()`:

```typescript
// I lib/rate-limit.ts
export async function checkRateLimit(
  identifier: string,
  customLimit?: number  // ← Ny parameter
): Promise<RateLimitResult> {
  const limit = customLimit || RATE_LIMIT_MAX_REQUESTS

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, RATE_LIMIT_WINDOW),
    // ...
  })
}

// I app/api/workflows/route.ts
const customLimit = getWorkflowLimit(workflowId)  // Lookup från databas/config
const rateLimit = await checkRateLimit(identifier, customLimit)
```

## Kostnader

### Upstash Free Tier
- **10,000 commands/day** (räcker för 6.9 req/minut hela dagen)
- **256 MB storage** (mer än tillräckligt för rate limiting)

**OBS:** Med 1000 req/minut = ~1.44M commands/dag → **Behöver betalt plan**

### Upstash Pro Plan
- **$10/månad**
- **1M commands/day** → Räcker ej för 1000 req/min
- **Pay-as-you-go:** $0.20 per 100k commands över gräns

### Rekommenderad Plan för Produktion

**Upstash Pro ($10/mo) + PAYG:**
- 1000 req/min = ~1.44M commands/dag
- Extra cost: ~440k commands × $0.20/100k = **~$1/dag**
- **Total: ~$40/månad**

**Alternativ: Minska till 500 req/min:**
- ~720k commands/dag
- Ryms i Pro plan ($10/mo)
- **Total: $10/månad**

## Troubleshooting

### Rate limiting fungerar inte (alla requests går igenom)

**Check 1:** Verifiera att environment variables är satta
```bash
gcloud run services describe newsdeck --region=europe-west1 --format=json | jq '.spec.template.spec.containers[0].env'

# Ska innehålla:
# {"name":"UPSTASH_REDIS_REST_URL","value":"https://..."}
# {"name":"UPSTASH_REDIS_REST_TOKEN","value":"..."}
```

**Check 2:** Kolla logs för Redis connection
```bash
gcloud logging read "resource.type=cloud_run_revision" --limit 5

# Ska visa:
# ✅ Rate limiting enabled with Upstash Redis
```

### "Rate limit check failed" errors

**Orsak:** Redis connection problem eller timeout

**Lösning:** Rate limiter "fails open" (tillåter request vid fel)
- Kolla Upstash dashboard för downtime
- Verifiera credentials är korrekta
- Kontrollera network connectivity från Cloud Run

### För många false positives (legitima requests blockeras)

**Lösning 1:** Öka rate limit (se "Justera Rate Limit" ovan)

**Lösning 2:** Använd längre window
```typescript
// Från: 1000 per 1 minut
// Till: 5000 per 5 minuter (samma genomsnitt, mer burst-tolerant)
const RATE_LIMIT_MAX_REQUESTS = 5000
const RATE_LIMIT_WINDOW = '5 m'
```

## Support

- **Upstash Support:** [support.upstash.com](https://support.upstash.com)
- **Upstash Docs:** [upstash.com/docs/redis](https://upstash.com/docs/redis)
- **Upstash Discord:** [discord.gg/upstash](https://discord.gg/upstash)

---

*Uppdaterad: 2025-10-19*
