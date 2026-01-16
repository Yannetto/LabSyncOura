'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DebugPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/oura/diagnose')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Loading diagnostic data...</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error: {error}</h1>
          <button
            onClick={() => router.push('/app')}
            className="mt-4 px-4 py-2 bg-gray-900 text-white"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Check for new metrics
  const newMetrics = [
    'recovery_high',
    'readiness_temperature_trend_deviation',
    'active_calories',
    'total_calories',
    'sleep_latency_seconds',
    'sleep_efficiency_pct',
  ]

  const foundNewMetrics = newMetrics.filter(key => 
    data.all_metric_keys?.some((m: any) => m.key === key)
  )

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/app')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold mb-2">Database Diagnostic</h1>
          <p className="text-sm text-gray-600">
            This page shows what metrics are stored in your database
          </p>
        </div>

        {/* Summary */}
        <div className="mb-8 p-4 bg-gray-50 border border-gray-300">
          <h2 className="font-bold mb-2">Summary</h2>
          <ul className="text-sm space-y-1">
            <li>Total records: {data.summary?.total_records || 0}</li>
            <li>Unique days: {data.summary?.unique_days || 0}</li>
            <li>Unique metric keys: {data.summary?.unique_metric_keys || 0}</li>
            <li>Date range: {data.summary?.date_range?.earliest} to {data.summary?.date_range?.latest}</li>
          </ul>
        </div>

        {/* New Metrics Check */}
        <div className="mb-8 p-4 border border-gray-300">
          <h2 className="font-bold mb-2">New Metrics Status</h2>
          <p className="text-sm text-gray-600 mb-3">
            These are the metrics we just added to the report:
          </p>
          <div className="space-y-2">
            {newMetrics.map(key => {
              const exists = data.all_metric_keys?.some((m: any) => m.key === key)
              const metricData = data.all_metric_keys?.find((m: any) => m.key === key)
              return (
                <div key={key} className={`p-2 ${exists ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{key}</span>
                    <span className={`text-xs font-bold ${exists ? 'text-green-700' : 'text-red-700'}`}>
                      {exists ? `✓ Found (${metricData?.count || 0} records)` : '✗ Not Found'}
                    </span>
                  </div>
                  {exists && metricData?.samples && metricData.samples.length > 0 && (
                    <div className="mt-1 text-xs text-gray-600">
                      Sample: {metricData.samples[0].day} = {metricData.samples[0].value}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {foundNewMetrics.length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300">
              <p className="text-sm font-bold text-yellow-800">
                ⚠️ None of the new metrics were found in your database.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                This means your Oura account may not have this data, or you need to do a force resync.
              </p>
            </div>
          )}
        </div>

        {/* All Metrics */}
        <div className="mb-8">
          <h2 className="font-bold mb-2">All Metric Keys in Database</h2>
          <p className="text-sm text-gray-600 mb-3">
            Showing first 50 metrics (total: {data.all_metric_keys?.length || 0})
          </p>
          <div className="max-h-96 overflow-y-auto border border-gray-300">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left p-2 border-b">Metric Key</th>
                  <th className="text-left p-2 border-b">Count</th>
                  <th className="text-left p-2 border-b">Sample Value</th>
                </tr>
              </thead>
              <tbody>
                {data.all_metric_keys?.slice(0, 50).map((item: any) => (
                  <tr key={item.key} className="border-b">
                    <td className="p-2 font-mono text-xs">{item.key}</td>
                    <td className="p-2">{item.count}</td>
                    <td className="p-2 text-xs text-gray-600">
                      {item.samples?.[0]?.day}: {item.samples?.[0]?.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Keys Status */}
        <div className="mb-8">
          <h2 className="font-bold mb-2">Report Keys Status</h2>
          {data.report_keys && (
            <div className="space-y-4">
              {Object.entries(data.report_keys).map(([category, keys]: [string, any]) => (
                <div key={category} className="border border-gray-300 p-4">
                  <h3 className="font-bold mb-2 capitalize">{category.replace('_', ' ')}</h3>
                  <div className="space-y-1">
                    {keys?.map((item: any) => (
                      <div key={item.key} className={`text-sm ${item.found ? 'text-green-700' : 'text-red-700'}`}>
                        {item.found ? '✓' : '✗'} {item.key} ({item.count} records)
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
