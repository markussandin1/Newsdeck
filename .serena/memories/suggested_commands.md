# Suggested Commands

## Development
```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm test                 # Run tests
```

## Database Proxy (Production Database)
```bash
npm run proxy:start      # Start Cloud SQL proxy
npm run proxy:stop       # Stop proxy
npm run proxy:restart    # Restart proxy
npm run proxy:status     # Check if running
npm run proxy:check      # Verify proxy
npm run proxy:logs       # View logs
npm run dev:full         # Start proxy + dev server
```

## Database Diagnostics
```bash
node scripts/check-all-duplicates.mjs       # Check duplicate source_ids
node scripts/diagnose-column.mjs COLUMN_ID  # Check column integrity
node scripts/fix-missing-dbids.mjs          # Fix missing dbIds
```

## Geographic Data
```bash
node scripts/import-geo-data.mjs data/geo/SE.json  # Import geo data
node scripts/clean-geo-data.mjs                     # Clean all geo data
```

## System Commands (macOS)
- Standard Unix commands: git, ls, find, grep, cat, etc.
- System: Darwin (macOS)
