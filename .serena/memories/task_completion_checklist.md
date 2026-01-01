# Task Completion Checklist

When completing a coding task, ALWAYS:

1. **Type Check**: `npm run type-check`
2. **Lint**: `npm run lint`
3. **Test locally**: `npm run dev`
4. **Build test**: `npm run build && npm run start`
5. **Update CLAUDE.md**: Add documentation for any new features or changes
6. **Commit**: Follow git commit conventions

## Before Committing
- Ensure all type errors are fixed
- Ensure linting passes
- Test the feature locally
- Update CLAUDE.md with changes

## Database Changes
When adding new fields to NewsItem:
1. Add column to `news_items` table
2. Add field to TypeScript interface
3. **MUST** add synchronization in `getColumnData` and `getColumnDataBatch` in `lib/db-postgresql.ts`
4. Otherwise filtering/display bugs will occur

## Geographic Data
- If modifying location normalization, test with various location formats
- Check `location_normalization_logs` table for unmatched locations
- Refresh location cache after imports: POST `/api/admin/location-cache`
