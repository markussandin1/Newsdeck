/**
 * Konstanter som används över flera DB-moduler (P2-1 steg 2).
 *
 * MAIN_DASHBOARD_ID är UUID:n som alltid representerar huvuddashboarden i
 * databasen — när användare loggar in första gången och inte har någon
 * dashboard alls får de denna automatiskt.
 */
import type { Dashboard } from '../types'

export const MAIN_DASHBOARD_ID = '00000000-0000-4000-a000-000000000001'

export const DEFAULT_DASHBOARD: Dashboard = {
  id: MAIN_DASHBOARD_ID,
  name: 'Huvuddashboard',
  slug: 'main',
  description: 'Din huvuddashboard för nyhetsövervakning',
  columns: [],
  createdAt: new Date().toISOString(),
  viewCount: 0,
  isDefault: true,
  createdBy: 'system',
  createdByName: 'System',
}
