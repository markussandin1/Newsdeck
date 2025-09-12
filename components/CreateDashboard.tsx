'use client'

import { useState } from 'react'
import { Dashboard, DashboardColumn, WorkflowInfo } from '@/lib/types'
import { FAKE_WORKFLOWS } from '@/lib/workflows'

interface CreateDashboardProps {
  isOpen: boolean
  onClose: () => void
  onDashboardCreated: (dashboard: Dashboard) => void
}

export default function CreateDashboard({ isOpen, onClose, onDashboardCreated }: CreateDashboardProps) {
  const [name, setName] = useState('')
  const [columns, setColumns] = useState<DashboardColumn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const addColumn = () => {
    const newColumn: DashboardColumn = {
      id: `column-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId: '',
      title: '',
      order: columns.length
    }
    setColumns([...columns, newColumn])
  }

  const updateColumn = (columnId: string, updates: Partial<DashboardColumn>) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ))
  }

  const removeColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId))
  }

  const getWorkflowName = (workflowId: string) => {
    const workflow = FAKE_WORKFLOWS.find(w => w.id === workflowId)
    return workflow ? workflow.name : workflowId
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Dashboard-namn krävs')
      return
    }

    if (columns.length === 0) {
      setError('Lägg till minst en kolumn')
      return
    }

    // Validera att alla kolumner har valt workflow
    const invalidColumns = columns.filter(col => !col.workflowId)
    if (invalidColumns.length > 0) {
      setError('Alla kolumner måste ha ett valt workflow')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const dashboardData = {
        name: name.trim(),
        columns: columns.map((col, index) => ({
          ...col,
          order: index,
          title: col.title || getWorkflowName(col.workflowId)
        }))
      }

      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboardData)
      })

      const result = await response.json()

      if (response.ok) {
        onDashboardCreated(result.dashboard)
        onClose()
        // Reset form
        setName('')
        setColumns([])
      } else {
        setError(result.error || 'Failed to create dashboard')
      }
    } catch (error) {
      setError('Något gick fel vid skapandet av dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Skapa ny dashboard</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded border border-red-200">
                {error}
              </div>
            )}

            {/* Dashboard Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dashboard-namn *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="T.ex. Stockholm Breaking News"
                required
              />
            </div>

            {/* Columns Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Kolumner (TweetDeck-stil)
                </label>
                <button
                  type="button"
                  onClick={addColumn}
                  className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  + Lägg till kolumn
                </button>
              </div>

              {columns.length === 0 ? (
                <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-gray-500 mb-2">Inga kolumner tillagda ännu</p>
                  <p className="text-sm text-gray-400">Varje kolumn visar ett workflow-flöde</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {columns.map((column, index) => (
                    <div key={column.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-800">Kolumn {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeColumn(column.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Ta bort
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Workflow *
                          </label>
                          <select
                            value={column.workflowId}
                            onChange={(e) => updateColumn(column.id, { workflowId: e.target.value })}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Välj workflow...</option>
                            {FAKE_WORKFLOWS.map(workflow => (
                              <option key={workflow.id} value={workflow.id}>
                                {workflow.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Egen titel (valfritt)
                          </label>
                          <input
                            type="text"
                            value={column.title || ''}
                            onChange={(e) => updateColumn(column.id, { title: e.target.value })}
                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={column.workflowId ? getWorkflowName(column.workflowId) : 'Standardnamn'}
                          />
                        </div>
                      </div>

                      {column.workflowId && (
                        <div className="mt-2 text-xs text-gray-600">
                          {FAKE_WORKFLOWS.find(w => w.id === column.workflowId)?.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading || columns.length === 0}
                className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Skapar...' : 'Skapa Dashboard'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Avbryt
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}