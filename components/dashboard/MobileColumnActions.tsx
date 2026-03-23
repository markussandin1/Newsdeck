'use client'

import { DashboardColumn } from '@/lib/types'
import { ColumnData } from '@/lib/dashboard/types'
import { Settings, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileColumnActionsProps {
  isOpen: boolean
  isMobile: boolean
  activeColumn: DashboardColumn | undefined
  filteredColumnData: ColumnData
  isSoundMuted: boolean
  onClose: () => void
  onToggleSound: (columnId: string) => void
  onStartEditing: (column: DashboardColumn) => void
  onRefresh: () => Promise<void>
}

export function MobileColumnActions({
  isOpen,
  isMobile,
  activeColumn,
  filteredColumnData,
  isSoundMuted,
  onClose,
  onToggleSound,
  onStartEditing,
  onRefresh,
}: MobileColumnActionsProps) {
  if (!activeColumn) return null

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

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 right-0 bottom-0 bg-white z-50 rounded-t-2xl shadow-2xl safe-area-bottom safe-area-left safe-area-right"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-slate-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 text-center">
                {activeColumn.title}
              </h3>
              <p className="text-xs text-slate-500 text-center mt-1">
                {filteredColumnData[activeColumn.id]?.length || 0} händelser
              </p>
            </div>

            {/* Actions */}
            <div className="p-2 pb-4">
              <button
                onClick={() => {
                  onToggleSound(activeColumn.id)
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
              >
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                  {isSoundMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {isSoundMuted ? 'Aktivera ljud' : 'Stäng av ljud'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isSoundMuted
                      ? 'Notisljud är avstängt för denna kolumn'
                      : 'Ljudnotiser för nya händelser'}
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  onStartEditing(activeColumn)
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Inställningar</div>
                  <div className="text-xs text-slate-500">Redigera kolumn och workflow</div>
                </div>
              </button>

              <button
                onClick={async () => {
                  await onRefresh()
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
              >
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  🔄
                </div>
                <div className="flex-1">
                  <div className="font-medium">Uppdatera</div>
                  <div className="text-xs text-slate-500">Hämta nya händelser</div>
                </div>
              </button>

              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
              >
                Avbryt
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
