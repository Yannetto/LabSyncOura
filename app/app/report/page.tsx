'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Printer, Clipboard, Mail, ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { generateTextReport } from '@/lib/report/text-export'
import toast from 'react-hot-toast'

export const dynamic = 'force-dynamic'

interface DoctorSummary {
  sleepTable: Array<{
    metric: string
    value: string
    referenceRange: string
    clinicalRange?: string
    flag: string
  }>
  cardiovascularTable: Array<{
    metric: string
    value: string
    referenceRange: string
    clinicalRange?: string
    flag: string
  }>
  activityTable: Array<{
    metric: string
    value: string
    referenceRange: string
    clinicalRange?: string
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
  dataQuality?: {
    completeness: number
    daysCollected: number
    quality: 'Good' | 'Fair' | 'Poor'
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

  const handleCopyToClipboard = async () => {
    if (!summary || !metadata) {
      toast.error('Cannot copy: Report data is missing')
      return
    }
    
    try {
      const textReport = generateTextReport(summary, metadata)
      await navigator.clipboard.writeText(textReport)
      toast.success('Report copied to clipboard')
    } catch (err: any) {
      toast.error('Failed to copy report')
    }
  }

  const handleEmailShare = () => {
    if (!summary || !metadata) {
      toast.error('Cannot share: Report data is missing')
      return
    }
    
    const subject = encodeURIComponent(`Health Report - ${metadata.reportDate}`)
    const body = encodeURIComponent(`Please find my health report attached.\n\nReport Date: ${metadata.reportDate}\nPatient: ${metadata.patientEmail}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
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
    const isNoDataError = error.toLowerCase().includes('sync') || error.toLowerCase().includes('no data')
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-gray-400 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isNoDataError ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isNoDataError ? 'No Data Available' : 'Unable to Load Report'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isNoDataError 
              ? 'You need to sync your Oura data before generating a report. Head back to the dashboard and click "Sync Data" first.'
              : error
            }
          </p>
          <button
            onClick={() => router.push('/app')}
            className="px-6 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            {isNoDataError ? '← Go to Dashboard & Sync' : '← Back to Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  // Show message if no summary and not loading (shouldn't happen, but handle gracefully)
  if (!summary && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-gray-400 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Report Data</h2>
          <p className="text-gray-600 mb-6">
            To generate a report, first sync your Oura ring data from the dashboard.
          </p>
          <button
            onClick={() => router.push('/app')}
            className="px-6 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            ← Go to Dashboard
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

  // Helper to get flag colors: Below Range = orange, Above Range = yellow
  const getFlagColors = (flag: string) => {
    if (flag === 'Below Range') {
      return {
        badge: 'bg-orange-100 text-orange-700',
        border: 'border-l-orange-400'
      }
    } else if (flag === 'Above Range') {
      return {
        badge: 'bg-yellow-100 text-yellow-700',
        border: 'border-l-yellow-400'
      }
    }
    return {
      badge: 'bg-amber-100 text-amber-700',
      border: 'border-l-amber-400'
    }
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="sticky top-0 z-50 bg-gray-100 border-b border-gray-300 print:hidden p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-gray-800 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-gray-600 hover:text-gray-900 font-bold text-lg leading-none"
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
      
      {/* Action Buttons - Hidden when printing */}
      <div className={`sticky ${successMessage || (error && !loading) ? 'top-16' : 'top-0'} z-40 bg-white border-b border-gray-300 print:hidden p-4`}>
        <div className="max-w-5xl mx-auto flex gap-3 justify-end flex-wrap">
          {!reportId && (
            <Button
              onClick={handleSaveReport}
              disabled={saving || !summary || !metadata}
              loading={saving}
            >
              <Save className="h-4 w-4" />
              Save Report
            </Button>
          )}
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
          <Button variant="secondary" onClick={handleCopyToClipboard}>
            <Clipboard className="h-4 w-4" />
            Copy for AI
          </Button>
          <Button variant="ghost" onClick={() => router.push('/app')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 print:px-12 print:py-8">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Wearable Health Summary Report</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-gray-700">
            <p><strong className="text-gray-900">Patient email:</strong> {patientEmail}</p>
            <p><strong className="text-gray-900">Report date:</strong> {reportDateDisplay}</p>
            {dataPeriodStr && (
              <p><strong className="text-gray-900">7 Days values:</strong> {dataPeriodStr}</p>
            )}
            {referenceRangeStr && (
              <p><strong className="text-gray-900">30 Days Reference Range:</strong> {referenceRangeStr}</p>
            )}
            {metadata?.dataQuality && (
              <p><strong className="text-gray-900">Data Quality:</strong> {metadata.dataQuality.quality} ({metadata.dataQuality.completeness}% complete, {metadata.dataQuality.daysCollected} days)</p>
            )}
          </div>
        </div>

        {/* Flag Summary */}
        {summary && (() => {
          const allRows = [...summary.sleepTable, ...summary.cardiovascularTable, ...summary.activityTable]
          const flaggedRows = allRows.filter(r => r.flag)
          const aboveRangeCount = flaggedRows.filter(r => r.flag === 'Above Range').length
          const belowRangeCount = flaggedRows.filter(r => r.flag === 'Below Range').length
          const sleepFlagged = summary.sleepTable.filter(r => r.flag).length
          const cardioFlagged = summary.cardiovascularTable.filter(r => r.flag).length
          const activityFlagged = summary.activityTable.filter(r => r.flag).length
          
          if (flaggedRows.length === 0) {
            return null
          }
          
          return (
            <div className="mb-8 print:mb-6 border-b border-gray-200 pb-6">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-900">{flaggedRows.length}</span>
                  <span className="text-sm font-medium text-gray-700">Flagged Metrics</span>
                </div>
                {aboveRangeCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-400"></span>
                    <span className="text-sm text-gray-600">{aboveRangeCount} Above Range</span>
                  </div>
                )}
                {belowRangeCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-orange-400"></span>
                    <span className="text-sm text-gray-600">{belowRangeCount} Below Range</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                {sleepFlagged > 0 && (
                  <span>{sleepFlagged} Sleep</span>
                )}
                {cardioFlagged > 0 && (
                  <span>{cardioFlagged} Cardiovascular</span>
                )}
                {activityFlagged > 0 && (
                  <span>{activityFlagged} Activity</span>
                )}
              </div>
            </div>
          )
        })()}

        {/* Sleep Table */}
        {summary.sleepTable.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Sleep Summary</h2>
            {/* Desktop Table */}
            <div className="hidden md:block border border-gray-200 overflow-hidden rounded-sm">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">Metric</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">7 Days values</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">30 Days Reference Range</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary.sleepTable]
                    .sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0))
                    .map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100" style={{ pageBreakInside: 'avoid' }}>
                      <td className="px-5 py-3 text-sm font-medium border-r border-gray-200">{row.metric}</td>
                      <td className="px-5 py-3 text-sm border-r border-gray-200">
                        {row.value}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 border-r border-gray-200">{row.referenceRange}</td>
                      <td className="px-5 py-3 text-center text-sm">
                        {row.flag ? (
                          <span className={`inline-block px-2 py-1 ${getFlagColors(row.flag).badge} text-xs font-medium rounded`}>{row.flag}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {[...summary.sleepTable]
                .sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0))
                .map((row, idx) => (
                <div key={idx} className={`border-l-4 ${row.flag ? getFlagColors(row.flag).border : 'border-l-gray-200'} border-r border-t border-b border-gray-200 bg-white p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm text-gray-900 flex-1">{row.metric}</div>
                    {row.flag && (
                      <span className={`inline-block px-2 py-1 ${getFlagColors(row.flag).badge} text-xs font-medium rounded ml-2`}>{row.flag}</span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium text-gray-900">{row.value}</span></div>
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
            <div className="hidden md:block border border-gray-200 overflow-hidden rounded-sm">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">Metric</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">7 Days values</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">30 Days Reference Range</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary.cardiovascularTable]
                    .sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0))
                    .map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100" style={{ pageBreakInside: 'avoid' }}>
                      <td className="px-5 py-3 text-sm font-medium border-r border-gray-200">{row.metric}</td>
                      <td className="px-5 py-3 text-sm border-r border-gray-200">
                        {row.value}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 border-r border-gray-200">{row.referenceRange}</td>
                      <td className="px-5 py-3 text-center text-sm">
                        {row.flag ? (
                          <span className={`inline-block px-2 py-1 ${getFlagColors(row.flag).badge} text-xs font-medium rounded`}>{row.flag}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {[...summary.cardiovascularTable]
                .sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0))
                .map((row, idx) => (
                <div key={idx} className={`border-l-4 ${row.flag ? getFlagColors(row.flag).border : 'border-l-gray-200'} border-r border-t border-b border-gray-200 bg-white p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm text-gray-900 flex-1">{row.metric}</div>
                    {row.flag && (
                      <span className={`inline-block px-2 py-1 ${getFlagColors(row.flag).badge} text-xs font-medium rounded ml-2`}>{row.flag}</span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium text-gray-900">{row.value}</span></div>
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
            <div className="hidden md:block border border-gray-200 overflow-hidden rounded-sm">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead className="bg-gray-900 text-white">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">Metric</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">7 Days values</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide border-r border-gray-700">30 Days Reference Range</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {[...summary.activityTable]
                    .sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0))
                    .map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100" style={{ pageBreakInside: 'avoid' }}>
                      <td className="px-5 py-3 text-sm font-medium border-r border-gray-200">{row.metric}</td>
                      <td className="px-5 py-3 text-sm border-r border-gray-200">
                        {row.value}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 border-r border-gray-200">{row.referenceRange}</td>
                      <td className="px-5 py-3 text-center text-sm">
                        {row.flag ? (
                          <span className={`inline-block px-2 py-1 ${getFlagColors(row.flag).badge} text-xs font-medium rounded`}>{row.flag}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {[...summary.activityTable]
                .sort((a, b) => (b.flag ? 1 : 0) - (a.flag ? 1 : 0))
                .map((row, idx) => (
                <div key={idx} className={`border-l-4 ${row.flag ? getFlagColors(row.flag).border : 'border-l-gray-200'} border-r border-t border-b border-gray-200 bg-white p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm text-gray-900 flex-1">{row.metric}</div>
                    {row.flag && (
                      <span className={`inline-block px-2 py-1 ${getFlagColors(row.flag).badge} text-xs font-medium rounded ml-2`}>{row.flag}</span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium text-gray-900">{row.value}</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">{row.referenceRange}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 mb-8 p-5 bg-gray-50 border border-gray-200 rounded-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Legend</h3>
          <div className="text-xs text-gray-700 space-y-1.5">
            <p><span className="font-medium text-yellow-700">Above Range</span> — The 7-day average is higher than the 75th percentile of your 30-day reference range.</p>
            <p><span className="font-medium text-orange-700">Below Range</span> — The 7-day average is lower than the 25th percentile of your 30-day reference range.</p>
            <p><span className="font-medium text-gray-900">—</span> — The value is within your normal reference range.</p>
            <p className="text-gray-600 mt-3 pt-3 border-t border-gray-200">Reference ranges are calculated from your personal historical data (30-day period) using the interquartile range method.</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-xs text-gray-600 leading-relaxed">
          <p className="font-semibold text-gray-800 mb-2">Experimental Report – Disclaimer and Limitation of Liability</p>
          <p className="mb-2">This report is generated by an experimental tool based on personal health tracking data. It is provided "as is" without any warranties, express or implied. The information herein may be incomplete, inaccurate, or outdated. No representations are made regarding the accuracy, reliability, or completeness of the data, metrics, or analysis presented.</p>
          <p className="mb-2">This report is for informational purposes only and does not constitute medical advice. It is not intended to diagnose, treat, cure, or prevent any disease or health condition. You should not rely on this report for any medical decisions. Always seek the advice of a qualified healthcare professional with any questions regarding your health or medical condition.</p>
          <p className="mb-2">By using this report, you acknowledge and accept that the creators disclaim all liability for any direct or indirect consequences arising from its use.</p>
          <p className="mt-2 text-gray-500">This service is not affiliated with, endorsed by, or sponsored by Oura Health.</p>
        </div>
            </div>

            {/* Save Report Modal */}
            <Modal
              isOpen={showSaveModal}
              onClose={() => setShowSaveModal(false)}
              title="Save Report"
              footer={
                <>
                  <Button variant="secondary" onClick={() => setShowSaveModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmSave} className="flex-1">
                    Save
                  </Button>
                </>
              }
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Title (optional)
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={`Report ${metadata ? new Date(metadata.reportDate).toLocaleDateString() : ''}`}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900"
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
            </Modal>

            {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          
          body {
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
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
          
          /* Reduce font sizes for print */
          h1 {
            font-size: 14pt !important;
          }
          
          h2 {
            font-size: 12pt !important;
          }
          
          table {
            font-size: 9pt !important;
          }
          
          th, td {
            font-size: 9pt !important;
            padding: 0.25rem 0.5rem !important;
          }
          
          /* Ensure colors print */
          .bg-amber-100 {
            background-color: #fef3c7 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .bg-orange-100 {
            background-color: #ffedd5 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .bg-yellow-100 {
            background-color: #fef9c3 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .text-amber-700 {
            color: #b45309 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .text-orange-700 {
            color: #c2410c !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .text-yellow-700 {
            color: #a16207 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .text-amber-600 {
            color: #d97706 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .text-green-600 {
            color: #16a34a !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Page breaks */
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          /* Hide icons in print */
          svg {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
