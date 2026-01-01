# Code Style and Conventions

## TypeScript
- Strict type checking enabled
- Use interfaces for data models
- Avoid `any` types where possible

## Naming Conventions
- Components: PascalCase (e.g., `GeoFilterPanel.tsx`)
- Files: kebab-case for utilities, PascalCase for components
- Hooks: `use` prefix (e.g., `useGeoFilters.ts`)
- Database fields: snake_case (e.g., `country_code`)
- TypeScript/API: camelCase (e.g., `countryCode`)

## Database Conventions
- **CRITICAL**: `source_id` is NOT unique (can be NULL or AI-generated)
- Unique identifier: `db_id` (UUID)
- Geographic codes stored without country prefix in database
- Full ISO codes used in JSON import files

## Component Organization
- Hooks in `lib/` or `lib/dashboard/hooks/`
- Components in `components/`
- API routes in `app/api/`
- Database layer in `lib/`

## Key Patterns
- Use semantic HTML
- Radix UI for accessible components
- TailwindCSS for styling
- TypeScript for type safety
