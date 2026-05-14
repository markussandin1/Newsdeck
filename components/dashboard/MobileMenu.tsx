'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Dashboard } from '@/lib/types'
import { Settings, X, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileMenuProps {
  isOpen: boolean
  isMobile: boolean
  dashboard: Dashboard
  allDashboards: Array<Dashboard & { columnCount?: number }>
  activeColumnCount: number
  totalNewsCount: number
  connectionStatus: string
  lastUpdate: Date
  onClose: () => void
  onNavigateToDashboard: (slug: string) => void
  onOpenAddColumn: () => void
  onOpenCreateDashboard: () => void
  onRefresh: () => void
}

export function MobileMenu({
  isOpen,
  isMobile,
  dashboard,
  allDashboards,
  activeColumnCount,
  totalNewsCount,
  connectionStatus,
  lastUpdate,
  onClose,
  onNavigateToDashboard,
  onOpenAddColumn,
  onOpenCreateDashboard,
  onRefresh,
}: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && isMobile && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />

          {/* Drawer from left */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card text-foreground z-50 shadow-2xl overflow-y-auto safe-area-left safe-area-top safe-area-bottom"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/newsdeck-icon.svg" alt="Newsdeck" width={40} height={40} className="w-10 h-10" />
                <h2 className="text-lg font-semibold text-foreground">Newsdeck</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg"
                aria-label="Stäng meny"
              >
                <X className="h-6 w-6 text-foreground" />
              </button>
            </div>

            {/* Current Dashboard Info */}
            <div className="p-4 bg-muted/50 border-b border-border">
              <div className="text-xs text-muted-foreground mb-1">Aktiv dashboard</div>
              <div className="font-semibold text-foreground">{dashboard.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {activeColumnCount} kolumner • {totalNewsCount} händelser
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {/* Dashboards Section */}
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dashboards
              </div>

              {allDashboards.map((dash) => (
                <button
                  key={dash.id}
                  onClick={() => {
                    if (dash.slug !== dashboard.slug) {
                      onNavigateToDashboard(dash.slug)
                    }
                    onClose()
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left smooth-transition ${
                    dash.id === dashboard.id
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{dash.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {dash.columnCount ?? 0} kolumner
                    </div>
                  </div>
                  {dash.id === dashboard.id && (
                    <Check className="h-5 w-5 text-blue-500" />
                  )}
                </button>
              ))}

              <button
                onClick={() => {
                  onOpenCreateDashboard()
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-muted text-foreground mt-1"
              >
                <div className="w-8 h-8 bg-emerald-500/15 text-emerald-500 rounded-lg flex items-center justify-center">
                  +
                </div>
                <span className="font-medium">Ny Dashboard</span>
              </button>

              {/* Actions Section */}
              <div className="px-3 py-2 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border pt-4">
                Åtgärder
              </div>

              <button
                onClick={() => {
                  onOpenAddColumn()
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-muted text-foreground"
              >
                <div className="w-8 h-8 bg-emerald-500/15 text-emerald-500 rounded-lg flex items-center justify-center">
                  +
                </div>
                <span className="font-medium">Lägg till kolumn</span>
              </button>

              <button
                onClick={async () => {
                  await onRefresh()
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-muted text-foreground"
              >
                <div className="w-8 h-8 bg-blue-500/15 text-blue-500 rounded-lg flex items-center justify-center">
                  🔄
                </div>
                <span className="font-medium">Uppdatera data</span>
              </button>

              <Link
                href="/docs"
                onClick={onClose}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-muted text-foreground"
              >
                <div className="w-8 h-8 bg-muted text-muted-foreground rounded-lg flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="font-medium">Dokumentation</span>
              </Link>
            </div>

            {/* Footer Info */}
            <div className="p-4 border-t border-border mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <span>
                  {connectionStatus === 'connected' ? 'Live-uppdateringar aktiva' : 'Ansluter...'}
                </span>
              </div>
              <div>Senast uppdaterad: {lastUpdate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
