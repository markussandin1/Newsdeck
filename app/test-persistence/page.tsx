'use client'

import { useState, useEffect } from 'react'

interface TestResult {
  test: string
  status: 'success' | 'error'
  message: string
  data?: any
}

export default function TestPersistencePage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const runTests = async () => {
    setIsLoading(true)
    setResults([])
    const testResults: TestResult[] = []

    try {
      // Test 1: Create a column
      testResults.push({ test: 'Creating column...', status: 'success', message: 'Starting test' })
      const createColumnResponse = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Column',
          description: 'Test column for persistence testing'
        })
      })
      const createColumnResult = await createColumnResponse.json()
      
      if (createColumnResult.success) {
        testResults.push({
          test: 'Create Column',
          status: 'success',
          message: 'Column created successfully',
          data: createColumnResult.column
        })
      } else {
        testResults.push({
          test: 'Create Column',
          status: 'error',
          message: `Failed to create column: ${createColumnResult.error}`
        })
      }

      // Test 2: Fetch columns
      const fetchColumnsResponse = await fetch('/api/columns')
      const fetchColumnsResult = await fetchColumnsResponse.json()
      
      if (fetchColumnsResult.success) {
        testResults.push({
          test: 'Fetch Columns',
          status: 'success',
          message: `Found ${fetchColumnsResult.columns.length} columns`,
          data: fetchColumnsResult.columns
        })
      } else {
        testResults.push({
          test: 'Fetch Columns',
          status: 'error',
          message: `Failed to fetch columns: ${fetchColumnsResult.error}`
        })
      }

      // Test 3: Add data to column (if we have columns)
      if (fetchColumnsResult.success && fetchColumnsResult.columns.length > 0) {
        const testColumn = fetchColumnsResult.columns[0]
        const testData = [
          {
            id: `test-${Date.now()}`,
            title: 'Test News Item',
            description: 'This is a test news item for persistence testing',
            source: 'test',
            timestamp: new Date().toISOString(),
            newsValue: 3,
            category: 'test',
            severity: 'low'
          }
        ]

        const addDataResponse = await fetch(`/api/columns/${testColumn.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        })
        const addDataResult = await addDataResponse.json()

        if (addDataResult.success) {
          testResults.push({
            test: 'Add Data to Column',
            status: 'success',
            message: `Added ${addDataResult.itemsAdded} items to column`,
            data: addDataResult
          })
        } else {
          testResults.push({
            test: 'Add Data to Column',
            status: 'error',
            message: `Failed to add data: ${addDataResult.error}`
          })
        }

        // Test 4: Fetch column data
        const fetchDataResponse = await fetch(`/api/columns/${testColumn.id}`)
        const fetchDataResult = await fetchDataResponse.json()

        if (fetchDataResult.success) {
          testResults.push({
            test: 'Fetch Column Data',
            status: 'success',
            message: `Retrieved ${fetchDataResult.count} items from column`,
            data: fetchDataResult.items
          })
        } else {
          testResults.push({
            test: 'Fetch Column Data',
            status: 'error',
            message: `Failed to fetch column data: ${fetchDataResult.error}`
          })
        }
      }

      // Test 5: Fetch main dashboard
      const dashboardResponse = await fetch('/api/dashboards/main-dashboard')
      const dashboardResult = await dashboardResponse.json()

      if (dashboardResult.success) {
        testResults.push({
          test: 'Fetch Main Dashboard',
          status: 'success',
          message: 'Main dashboard fetched successfully',
          data: dashboardResult.dashboard
        })
      } else {
        testResults.push({
          test: 'Fetch Main Dashboard',
          status: 'error',
          message: `Failed to fetch dashboard: ${dashboardResult.error}`
        })
      }

    } catch (error) {
      testResults.push({
        test: 'General Error',
        status: 'error',
        message: `Unexpected error: ${error}`
      })
    }

    setResults(testResults)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Persistence Test Suite</h1>
          <p className="text-gray-600 mb-6">
            This page tests the database persistence layer functionality. 
            It will create columns, add data, and verify that everything works correctly.
          </p>
          
          <div className="flex gap-4 items-center">
            <button
              onClick={runTests}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Running Tests...' : 'Run Tests'}
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← Back to Newsdeck
            </a>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Test Results</h2>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.status === 'success'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-3 h-3 rounded-full ${
                      result.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <h3 className="font-semibold text-gray-800">{result.test}</h3>
                  </div>
                  <p className={`text-sm ${
                    result.status === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.message}
                  </p>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        View Data
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}