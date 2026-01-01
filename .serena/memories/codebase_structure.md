# Codebase Structure

## Root Directory
```
/Users/marsan/Kod-projekt/newsdeck-production/
```

## Key Directories

### `/app`
- Next.js 15 App Router pages and API routes
- `/app/api/` - API endpoints
- `/app/dashboard/` - Dashboard pages

### `/components`
- React components
- UI components, headers, filters, etc.

### `/lib`
- Core business logic
- `/lib/db.ts` - Database interface
- `/lib/db-postgresql.ts` - PostgreSQL implementation
- `/lib/services/` - Service layer (ingestion, location cache)
- `/lib/dashboard/hooks/` - Dashboard-specific hooks
- `/lib/hooks/` - General React hooks

### `/scripts`
- Utility scripts for database diagnostics, imports, etc.

### `/data/geo`
- Geographic data JSON files for import

### `/docs`
- Documentation
- API schemas

### `/tests`
- Test files (TypeScript tests)

## Important Files
- `CLAUDE.md` - Development guidelines
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `instrumentation.ts` - Server startup (loads location cache)
