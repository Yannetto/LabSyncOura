'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

interface DoctorSummary {
  sleepTable: Array<{
    metric: string
    value: string
    referenceRange: string
    flag: string
  }>
  cardiovascularTable: Array<{
    metric: string
    value: string
    referenceRange: string
    flag: string
  }>
  activityTable: Array<{
    metric: string
    value: string
    referenceRange: string
    flag: string
  }>
}

interface ReportMetadata {
  patientEmail: string
  reportDate: string
  dataPeriod: {
    start: string
    end: string
    days: number
  }
  referenceRange: {
    start: string
    end: string
    days: number
  }
}

export default function ReportPage() {
  const [summary, setSummary] = useState<DoctorSummary | null>(null)
  const [metadata, setMetadata] = useState<ReportMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [reportTitle, setReportTitle] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if loading a saved report
    const params = new URLSearchParams(window.location.search)
    const savedReportId = params.get('id')
    console.log('[ReportPage] useEffect - savedReportId:', savedReportId)
    if (savedReportId) {
      console.log('[ReportPage] Loading saved report with ID:', savedReportId)
      loadSavedReport(savedReportId)
    } else {
      // Check for report in sessionStorage (from report history)
      const savedReport = sessionStorage.getItem('savedReport')
      if (savedReport) {
        try {
          const reportData = JSON.parse(savedReport)
          
          // Handle backward compatibility
          if (reportData.summary) {
            setSummary(reportData.summary)
            setMetadata(reportData.metadata || null)
          } else if (reportData.sleepTable || reportData.cardiovascularTable || reportData.activityTable) {
            setSummary({
              sleepTable: reportData.sleepTable || [],
              cardiovascularTable: reportData.cardiovascularTable || [],
              activityTable: reportData.activityTable || [],
            })
            setMetadata(reportData.metadata || null)
          } else {
            console.error('Invalid report format in sessionStorage:', reportData)
            loadDoctorSummary()
            return
          }
          
          setLoading(false)
          sessionStorage.removeItem('savedReport')
        } catch (error) {
          console.error('Error parsing saved report from sessionStorage:', error)
          loadDoctorSummary()
        }
      } else {
        loadDoctorSummary()
      }
    }
  }, [router])

  const loadSavedReport = async (id: string) => {
    try {
      console.log('[ReportPage] Loading saved report:', id)
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/report/${id}`)
      const data = await response.json()
      
      console.log('[ReportPage] API response:', { ok: response.ok, hasReport: !!data.report, data })
      
      if (!response.ok) {
        console.error('[ReportPage] API error:', data.error)
        setError(data.error || 'Report not found')
        setLoading(false)
        return
      }
      
      if (!data.report) {
        console.error('[ReportPage] No report in response')
        setError('Report data is missing')
        setLoading(false)
        return
      }
      
      const reportData = data.report.report_data
      console.log('[ReportPage] Report data:', { hasReportData: !!reportData, hasSummary: !!reportData?.summary })
      
      if (!reportData) {
        console.error('[ReportPage] No report_data in report')
        setError('Report data structure is invalid. Please generate a new report.')
        setLoading(false)
        return
      }
      
      // Handle backward compatibility with old report formats
      if (reportData.summary) {
        // New format: has summary with tables
        const summary = reportData.summary
        console.log('[ReportPage] Using summary format:', { 
          hasSleep: !!summary.sleepTable, 
          hasCardio: !!summary.cardiovascularTable, 
          hasActivity: !!summary.activityTable 
        })
        
        // Validate summary structure
        if (!summary.sleepTable && !summary.cardiovascularTable && !summary.activityTable) {
          console.error('[ReportPage] Invalid summary structure')
          setError('Report format is invalid. Please generate a new report.')
          setLoading(false)
          return
        }
        
        setSummary({
          sleepTable: summary.sleepTable || [],
          cardiovascularTable: summary.cardiovascularTable || [],
          activityTable: summary.activityTable || [],
        })
        setMetadata(reportData.metadata || null)
        setReportId(id)
        setLoading(false)
      } else if (reportData.sleepTable || reportData.cardiovascularTable || reportData.activityTable) {
        // Alternative format: summary is at root level
        console.log('[ReportPage] Using root level format')
        setSummary({
          sleepTable: reportData.sleepTable || [],
          cardiovascularTable: reportData.cardiovascularTable || [],
          activityTable: reportData.activityTable || [],
        })
        setMetadata(reportData.metadata || null)
        setReportId(id)
        setLoading(false)
      } else {
        // Old format or invalid structure
        console.error('[ReportPage] Invalid report format:', reportData)
        setError('This report was saved in an older format and cannot be displayed. Please generate a new report.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('[ReportPage] Error loading saved report:', err)
      setError(err.message || 'Failed to load report')
      setLoading(false)
    }
  }

  const loadDoctorSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch doctor summary from API
      const response = await fetch('/api/report/doctor-summary', { method: 'POST' })
      const data = await response.json()

      if (response.ok && data.summary) {
        setSummary(data.summary)
        if (data.metadata) {
          setMetadata(data.metadata)
        }
      } else {
        setError(data.error || 'Failed to load report')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSaveReport = () => {
    if (!summary || !metadata) {
      setError('Cannot save: Report data is missing')
      return
    }
    // If report is already saved, don't show save modal
    if (reportId) {
      setError('This report is already saved.')
      return
    }
    // Set default title
    setReportTitle(`Report ${new Date(metadata.reportDate).toLocaleDateString()}`)
    setShowSaveModal(true)
  }

  const handleConfirmSave = async () => {
    if (!summary || !metadata) {
      setError('Cannot save: Report data is missing')
      return
    }

    setSaving(true)
    setShowSaveModal(false)
    
    try {
      const title = reportTitle.trim() || `Report ${new Date(metadata.reportDate).toLocaleDateString()}`
      
      const response = await fetch('/api/report/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, metadata, title }),
      })

      const data = await response.json()
      if (response.ok) {
        setReportId(String(data.reportId || data.report?.id))
        setError(null)
        setSuccessMessage('Report saved successfully!')
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null)
        }, 5000)
      } else {
        setError(data.error || 'Failed to save report')
        setSuccessMessage(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save report')
      setSuccessMessage(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  // Show error screen if we have an error and no summary (critical loading error)
  if (error && !summary && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/app')}
            className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
          >
            Back to App
          </button>
        </div>
      </div>
    )
  }

  // Show message if no summary and not loading (shouldn't happen, but handle gracefully)
  if (!summary && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No report data available</p>
          <button
            onClick={() => router.push('/app')}
            className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
          >
            Back to App
          </button>
        </div>
      </div>
    )
  }

  // Don't render report content if we don't have summary yet
  if (!summary) {
    return null
  }

  // Format dates for display
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatDateShort = (dateStr: string): string => {
    return dateStr // Already in YYYY-MM-DD format
  }

  const reportDateDisplay = metadata 
    ? formatDateDisplay(metadata.reportDate)
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  
  const patientEmail = metadata?.patientEmail || ''
  const dataPeriodStr = metadata
    ? `${formatDateShort(metadata.dataPeriod.start)} – ${formatDateShort(metadata.dataPeriod.end)} (${metadata.dataPeriod.days} days)`
    : ''
  const referenceRangeStr = metadata
    ? `${formatDateShort(metadata.referenceRange.start)} – ${formatDateShort(metadata.referenceRange.end)} (${metadata.referenceRange.days} days)`
    : ''

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="sticky top-0 z-50 bg-green-50 border-b border-green-200 print:hidden p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-green-800 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 font-bold text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="sticky top-0 z-50 bg-red-50 border-b border-red-200 print:hidden p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-red-800 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Print/Back Buttons - Hidden when printing */}
            <div className={`sticky ${successMessage || (error && !loading) ? 'top-16' : 'top-0'} z-40 bg-white border-b-2 border-gray-400 print:hidden p-4 flex gap-4 justify-end flex-wrap`}>
              {!reportId && (
                <button
                  onClick={handleSaveReport}
                  disabled={saving || !summary || !metadata}
                  className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Report'}
                </button>
              )}
              <button
                onClick={handlePrint}
                className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
              >
                Print / Save as PDF
              </button>
              <button
                onClick={() => router.push('/app')}
                className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
              >
                Back
              </button>
            </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 print:px-12 print:py-8">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-gray-300">
          <h1 className="text-3xl font-bold text-gray-900 mb-5">Wearable Health Summary Report</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
            <p><strong className="text-gray-900">Patient email:</strong> {patientEmail}</p>
            <p><strong className="text-gray-900">Report date:</strong> {reportDateDisplay}</p>
            {dataPeriodStr && (
              <p><strong className="text-gray-900">7 Days values:</strong> {dataPeriodStr}</p>
            )}
            {referenceRangeStr && (
              <p><strong className="text-gray-900">30 Days Reference Range:</strong> {referenceRangeStr}</p>
            )}
          </div>
        </div>

        {/* Sleep Table */}
        {summary.sleepTable.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Sleep Summary</h2>
            {/* Desktop Table */}
            <div className="hidden md:block border border-gray-300 overflow-hidden">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">Metric</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">7 Days values</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">30 Days Reference Range</th>
                    <th className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sleepTable.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ pageBreakInside: 'avoid' }}>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">{row.metric}</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">{row.value}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">{row.referenceRange}</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">{row.flag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {summary.sleepTable.map((row, idx) => (
                <div key={idx} className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">{row.metric}</div>
                    {row.flag && <div className="text-sm ml-2">{row.flag}</div>}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">{row.value}</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">{row.referenceRange}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cardiovascular & Oxygenation Table */}
        {summary.cardiovascularTable.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Cardiovascular & Oxygenation</h2>
            {/* Desktop Table */}
            <div className="hidden md:block border border-gray-300 overflow-hidden">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">Metric</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">7 Days values</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">30 Days Reference Range</th>
                    <th className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.cardiovascularTable.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ pageBreakInside: 'avoid' }}>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">{row.metric}</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">{row.value}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">{row.referenceRange}</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">{row.flag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {summary.cardiovascularTable.map((row, idx) => (
                <div key={idx} className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">{row.metric}</div>
                    {row.flag && <div className="text-sm ml-2">{row.flag}</div>}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">{row.value}</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">{row.referenceRange}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Table */}
        {summary.activityTable.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Activity</h2>
            {/* Desktop Table */}
            <div className="hidden md:block border border-gray-300 overflow-hidden">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">Metric</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">7 Days values</th>
                    <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide border-r border-gray-700 whitespace-nowrap">30 Days Reference Range</th>
                    <th className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.activityTable.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ pageBreakInside: 'avoid' }}>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">{row.metric}</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">{row.value}</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">{row.referenceRange}</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">{row.flag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {summary.activityTable.map((row, idx) => (
                <div key={idx} className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">{row.metric}</div>
                    {row.flag && <div className="text-sm ml-2">{row.flag}</div>}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">{row.value}</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">{row.referenceRange}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 mb-8 p-4 bg-gray-50 border border-gray-300">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Legend</h3>
          <div className="text-xs text-gray-700 space-y-1">
            <p><span className="font-semibold">🟥</span> Indicates that the 7-day average value is outside the 30-day reference range (25th–75th percentile).</p>
            <p><span className="font-semibold">Blank</span> Indicates that the value is within the normal reference range.</p>
            <p className="text-gray-600 mt-2">Reference ranges are calculated from your personal historical data (30-day period) using the interquartile range method.</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-xs text-gray-600 leading-relaxed">
          <p className="font-semibold text-gray-800 mb-2">Information only – not for diagnosis or treatment.</p>
          <p>This report is generated from personal health tracking data and is not a substitute for professional medical advice, diagnosis, or treatment.</p>
          <p className="mt-2 text-gray-500">Not affiliated with Oura Health.</p>
        </div>
            </div>

            {/* Save Report Modal */}
            {showSaveModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Save Report
                  </h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Report Title (optional)
                    </label>
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder={`Report ${metadata ? new Date(metadata.reportDate).toLocaleDateString() : ''}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleConfirmSave()
                        } else if (e.key === 'Escape') {
                          setShowSaveModal(false)
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-3">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 px-4 py-2 border-2 border-gray-400 text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    className="flex-1 px-4 py-2 bg-black text-white hover:bg-gray-900 text-sm"
                  >
                    Save
                  </button>
                  </div>
                </div>
              </div>
            )}

            {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          
          body {
            background: white;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background: white !important;
          }
          
          .print\\:px-12 {
            padding-left: 3rem;
            padding-right: 3rem;
          }
          
          .print\\:py-8 {
            padding-top: 2rem;
            padding-bottom: 2rem;
          }
        }
      `}</style>
    </div>
  )
}
