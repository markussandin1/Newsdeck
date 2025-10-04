'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ApiLog {
  id: number
  endpoint: string
  method: string
  statusCode: number
  success: boolean
  requestBody?: Record<string, unknown>
  responseBody?: Record<string, unknown>
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export default function ApiLogsPage() {
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null)

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })

      if (filter === 'success') {
        params.append('success', 'true')
      } else if (filter === 'failed') {
        params.append('success', 'false')
      }

      const response = await fetch(`/api/admin/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600'
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600'
    if (statusCode >= 500) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">API Request Logs</h1>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Tillbaka till Admin
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Alla ({logs.length})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-4 py-2 rounded transition-colors ${
                filter === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Lyckade
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded transition-colors ${
                filter === 'failed'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Misslyckade
            </button>
            <button
              onClick={loadLogs}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Uppdatera
            </button>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Laddar loggar...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Inga loggar att visa</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tidpunkt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Felmeddelande
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detaljer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {log.method} {log.endpoint}
                        </code>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${getStatusColor(log.statusCode)}`}>
                        {log.statusCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600 max-w-md truncate">
                        {log.errorMessage || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Visa detaljer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Tidpunkt</h3>
                    <p className="text-sm text-gray-600">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
                    <p className={`text-sm font-semibold ${getStatusColor(selectedLog.statusCode)}`}>
                      {selectedLog.statusCode} - {selectedLog.success ? 'Success' : 'Failed'}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">IP Address</h3>
                    <p className="text-sm text-gray-600">{selectedLog.ipAddress}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">User Agent</h3>
                    <p className="text-sm text-gray-600 truncate">{selectedLog.userAgent}</p>
                  </div>
                </div>

                {/* Error Message */}
                {selectedLog.errorMessage && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Error Message</h3>
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-700">{selectedLog.errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {selectedLog.requestBody && Object.keys(selectedLog.requestBody).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Request Body</h3>
                    <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.requestBody, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Response Body */}
                {selectedLog.responseBody && Object.keys(selectedLog.responseBody).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Response Body</h3>
                    <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.responseBody, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
