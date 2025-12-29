# Geographic Service API

This document describes the geographic metadata service API for location-based filtering in Newsdeck.

## Overview

The Geographic Service provides structured data about countries, regions (counties), and municipalities. It supports:

- ✅ Multi-country support with ISO 3166-2 codes
- ✅ Hierarchical data (countries → regions → municipalities)
- ✅ Fuzzy location name matching for data ingestion
- ✅ Efficient in-memory caching for fast lookups
- ✅ Easy data updates via JSON imports

## Data Model

### Countries
```typescript
interface Country {
  code: string;          // ISO 3166-1 alpha-2 (e.g., "SE", "NO", "DK")
  name: string;          // English name (e.g., "Sweden")
  nameLocal?: string;    // Local name (e.g., "Sverige")
}
```

### Regions (Counties)
```typescript
interface Region {
  countryCode: string;   // "SE"
  code: string;          // ISO 3166-2 subdivision code without country prefix (e.g., "AB" for SE-AB)
  name: string;          // Full name (e.g., "Stockholms län")
  nameShort?: string;    // Short name (e.g., "Stockholm")
}
```

### Municipalities
```typescript
interface Municipality {
  countryCode: string;   // "SE"
  regionCode: string;    // "AB" (matches region code)
  code: string;          // Municipality code (e.g., "0114")
  name: string;          // Municipality name (e.g., "Upplands Väsby")
}
```

## Public API Endpoints

### GET /api/geo

Returns all geographic metadata for all countries.

**Query Parameters:** None

**Response:**
```json
{
  "countries": [
    {
      "code": "SE",
      "name": "Sweden",
      "nameLocal": null
    }
  ],
  "regions": [
    {
      "countryCode": "SE",
      "code": "AB",
      "name": "Stockholms län",
      "nameShort": "Stockholm"
    }
  ],
  "municipalities": [
    {
      "countryCode": "SE",
      "regionCode": "AB",
      "code": "0114",
      "name": "Upplands Väsby"
    }
  ]
}
```

**Cache Headers:**
- `Cache-Control: public, max-age=300, must-revalidate` (5 minutes)
- `CDN-Cache-Control: public, max-age=300`

**Rate Limiting:** 100 requests per minute per IP

### GET /api/geo?type=countries

Returns all countries.

**Response:**
```json
[
  {
    "code": "SE",
    "name": "Sweden",
    "nameLocal": null
  }
]
```

### GET /api/geo?type=regions&countryCode=SE

Returns all regions for a specific country.

**Query Parameters:**
- `countryCode` (required): ISO 3166-1 alpha-2 country code

**Response:**
```json
[
  {
    "countryCode": "SE",
    "code": "AB",
    "name": "Stockholms län",
    "nameShort": "Stockholm"
  }
]
```

### GET /api/geo?type=municipalities&countryCode=SE&regionCode=AB

Returns municipalities for a specific region.

**Query Parameters:**
- `countryCode` (required): ISO 3166-1 alpha-2 country code
- `regionCode` (required): Region code (e.g., "AB")

**Response:**
```json
[
  {
    "countryCode": "SE",
    "regionCode": "AB",
    "code": "0114",
    "name": "Upplands Väsby"
  }
]
```

### GET /api/geo?type=municipalities&countryCode=SE

Returns all municipalities for a country.

**Query Parameters:**
- `countryCode` (required): ISO 3166-1 alpha-2 country code

## Admin API Endpoints

### POST /api/admin/location-cache

Refreshes the in-memory location cache from the database.

**Authentication:** None (currently)
**Method:** POST
**Body:** None

**Response:**
```json
{
  "success": true,
  "count": 506,
  "timestamp": "2025-12-29T12:00:00.000Z"
}
```

**Use Cases:**
- After importing new geographic data
- After adding custom location name mappings
- When debugging location normalization issues

### POST /api/admin/location-mappings

Creates a new location name mapping for fuzzy matching.

**Authentication:** None (currently)
**Method:** POST
**Content-Type:** application/json

**Request Body:**
```json
{
  "variant": "Sthlm",
  "countryCode": "SE",
  "regionCode": "AB",
  "matchType": "fuzzy",
  "matchPriority": 10
}
```

**Parameters:**
- `variant` (required): The name variant to map (e.g., "Sthlm", "VG")
- `countryCode` (optional): Country code if mapping to a country
- `regionCode` (optional): Region code if mapping to a region
- `municipalityCode` (optional): Municipality code if mapping to a municipality
- `matchType` (required): Either "exact" or "fuzzy"
- `matchPriority` (optional): Lower = higher priority (default: 100)

**Response:**
```json
{
  "success": true,
  "mapping": {
    "id": 123,
    "variant": "sthlm",
    "countryCode": "SE",
    "regionCode": "AB",
    "matchType": "fuzzy",
    "matchPriority": 10
  }
}
```

## Data Import

### Import Geographic Data from JSON

Use the import script to load geographic data from structured JSON files:

```bash
node scripts/import-geo-data.mjs data/geo/SE.json
```

**JSON Format:**
```json
{
  "country": "SE",
  "subdivisions": [
    {
      "level": 1,
      "code": "SE-AB",
      "name": "Stockholms län",
      "type": "county"
    },
    {
      "level": 2,
      "code": "SE-0114",
      "name": "Upplands Väsby",
      "type": "municipality",
      "parent": "SE-AB"
    }
  ]
}
```

**Import Process:**
1. Validates JSON structure
2. Inserts countries, regions, and municipalities
3. Generates location name variants for fuzzy matching
4. Automatically refreshes the in-memory cache
5. Logs summary statistics

**Name Variant Generation:**

The import automatically creates variants for better matching:

- **Regions:**
  - Original: "Stockholms län"
  - Variants: "Stockholm", "Stockholms", "Sthlm" (if defined)

- **Municipalities:**
  - Original: "Upplands Väsby"
  - Variants: "Väsby", "Upplands Vasby" (ASCII), "Vasby" (ASCII)

### Clean Geographic Data

To remove all geographic data and start fresh:

```bash
node scripts/clean-geo-data.mjs
```

**Warning:** This will delete all countries, regions, municipalities, and location mappings. Use with caution!

## Location Normalization

The geographic service is used during news item ingestion to normalize location data. See `lib/services/ingestion.ts` for implementation details.

**Process:**
1. News item arrives with raw location data (e.g., `{name: "Stockholm"}`)
2. Location cache performs fuzzy lookup
3. Best match is selected based on priority
4. News item is enriched with normalized codes:
   ```typescript
   {
     countryCode: "SE",
     regionCode: "AB",
     municipalityCode: null  // if only region matched
   }
   ```

## Error Handling

**Rate Limit Exceeded (429):**
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```
Retry after 60 seconds.

**Invalid Parameters (400):**
```json
{
  "error": "Invalid parameters",
  "usage": {
    "all": "/api/geo",
    "countries": "/api/geo?type=countries",
    "regions": "/api/geo?type=regions&countryCode=SE"
  }
}
```

**Internal Server Error (500):**
```json
{
  "error": "Internal server error"
}
```

## Implementation Notes

### Code Format Conventions

- **In JSON files:** Full ISO codes with country prefix (e.g., `"SE-AB"`, `"SE-0114"`)
- **In database:** Codes without country prefix (e.g., `"AB"`, `"0114"`) stored separately from `country_code`
- **In API responses:** Codes without prefix, country code as separate field

This convention allows for efficient querying while maintaining international compatibility.

### Adding a New Country

1. Create `data/geo/<COUNTRY>.json` following the format above
2. Use official ISO 3166-2 codes for regions
3. Run import: `node scripts/import-geo-data.mjs data/geo/<COUNTRY>.json`
4. Verify data: `curl http://localhost:3000/api/geo?type=regions&countryCode=<COUNTRY>`

### Performance Considerations

- **In-memory cache:** All location name mappings loaded at server startup (~500 entries for Sweden)
- **Fast lookups:** O(1) hash lookups for exact matches
- **Low latency:** Synchronous lookups during ingestion (no DB queries)
- **Scalability:** Cache refreshes automatically after imports

## Future Enhancements

- [ ] JSON Schema validation for import files
- [ ] Authentication for admin endpoints
- [ ] Multi-instance cache synchronization (Redis)
- [ ] Versioned cache with automatic invalidation
- [ ] Admin UI for location mapping management
- [ ] Support for postal codes and coordinates

## References

- [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1) - Country codes
- [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2) - Subdivision codes
- [SCB Kommun- och länkkoder](https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/lan-och-kommuner/) - Swedish official codes
