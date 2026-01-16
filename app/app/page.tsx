'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { 
  RefreshCw, 
  FileText, 
  Download, 
  Trash2, 
  UserX, 
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'

export const dynamic = 'force-dynamic'

export default function AppPage() {
  const [user, setUser] = useState<any>(null)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showConnectExplanation, setShowConnectExplanation] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [hasSyncedData, setHasSyncedData] = useState<boolean>(false) // Track if any data exists
  const [tosStatus, setTosStatus] = useState<{ needs_acceptance: boolean; tos_accepted: boolean } | null>(null)
  const [showTosModal, setShowTosModal] = useState(false)
  const [tosAcceptedLocally, setTosAcceptedLocally] = useState(false) // Track local acceptance to prevent reopening
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAccountDeleteConfirm, setShowAccountDeleteConfirm] = useState(false)
  const [reportHistory, setReportHistory] = useState<any[]>([])
  const [showReportHistory, setShowReportHistory] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Run auth check first, then load other data in parallel
    const initialize = async () => {
      await checkAuth()
      // Set loading to false immediately after auth check so page can render
      setLoading(false)
      // Load other data in parallel (non-blocking)
      Promise.all([
        checkConnection(),
        fetchLastSync(),
        checkTosStatus(),
        fetchReportHistory()
      ]).catch(console.error)
    }
    initialize()
  }, [])

  // Prevent checkTosStatus from running again if TOS was just accepted
  useEffect(() => {
    if (tosAcceptedLocally) {
      // Don't re-check TOS status if we just accepted it locally
      return
    }
  }, [tosAcceptedLocally])

  const fetchLastSync = async () => {
    try {
      const response = await fetch('/api/oura/last-sync')
      const data = await response.json()
      if (data.last_synced) {
        const date = new Date(data.last_synced)
        setLastSynced(date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }))
        setHasSyncedData(true)
      } else {
        setHasSyncedData(false)
      }
    } catch (error) {
      // Silently fail - assume no data on error
      setHasSyncedData(false)
    }
  }

  useEffect(() => {
    // Check for URL params
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')

    if (connected === '1') {
      toast.success('Oura account connected successfully')
      setIsConnected(true)
      // Clean URL
      router.replace('/app')
    } else if (connected === '0') {
      const errorMessage = params.get('message')
      let errorText = 'Failed to connect Oura account'
      
      if (error === 'access_denied') {
        errorText = 'Connection was not approved. You can try again at any time.'
      } else if (error === 'invalid_request') {
        errorText = errorMessage || 'Invalid OAuth request. Please check your Oura app configuration and ensure the redirect URI matches exactly.'
      } else if (error === 'invalid_state') {
        errorText = 'Security validation failed. Please try connecting again.'
      } else if (error === 'token_exchange_failed') {
        errorText = errorMessage || 'Failed to complete connection. Please try again.'
      } else if (error === 'configuration_error') {
        errorText = 'Oura app configuration error. Please contact support.'
      } else if (errorMessage) {
        errorText = errorMessage
      }
      
      toast.error(errorText)
    }
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    }
  }

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Check connection status (non-blocking)
      const response = await fetch('/api/oura/status')
      const data = await response.json()
      setIsConnected(data.connected || false)
    } catch (error) {
      setIsConnected(false)
    }
  }

  const handleConnect = () => {
    setShowConnectExplanation(true)
  }

  const handleProceedToOura = () => {
    setShowConnectExplanation(false)
    window.location.href = '/api/oura/start'
  }

  const handleSync = async (forceResync: boolean = false) => {
    setSyncing(true)
    setMessage(null)
    try {
      const url = forceResync ? '/api/oura/sync?force=1' : '/api/oura/sync'
      const response = await fetch(url, { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        const syncDate = data.synced_at 
          ? new Date(data.synced_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })
          : new Date().toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })
        toast.success(`Synced ${data.days_synced} days of data`)
        setLastSynced(syncDate)
        setHasSyncedData(true) // Data now exists
      } else {
        // Handle specific error cases
        if (response.status === 404) {
          toast.error('No sleep summaries available for the selected period. Please check your Oura account has data.')
        } else if (response.status === 403) {
          toast.error('Permission denied. Please reconnect your Oura account.')
        } else {
          toast.error(data.error || 'Sync failed')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setMessage(null)
    try {
      const response = await fetch('/api/report/generate', { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        toast.success('Report generated successfully')
        // Redirect to report view page
        router.push('/app/report')
      } else {
        toast.error(data.error || 'Report generation failed')
        setGenerating(false)
      }
    } catch (error: any) {
      toast.error(error.message || 'Report generation failed')
      setGenerating(false)
    }
  }

  const checkTosStatus = async () => {
    // Don't check if TOS was already accepted locally (prevents reopening modal)
    if (tosAcceptedLocally) {
      return
    }

    try {
      const response = await fetch('/api/user/tos')
      if (!response.ok) {
        // If API fails, don't show modal (might be schema issue)
        console.warn('[TOS] Failed to check TOS status, skipping modal')
        return
      }
      
      const data = await response.json()
      setTosStatus(data)
      // Only show modal if needs acceptance AND modal is not already shown AND TOS is not already accepted
      if (data.needs_acceptance && !showTosModal && !data.tos_accepted && !tosAcceptedLocally) {
        setShowTosModal(true)
      } else if (!data.needs_acceptance && showTosModal) {
        // Close modal if TOS is already accepted
        setShowTosModal(false)
        setTosAcceptedLocally(true)
      }
    } catch (error) {
      // Silently fail - don't block user if TOS check fails
      console.error('TOS status check failed:', error)
    }
  }

  const acceptTos = async () => {
    try {
      console.log('[TOS] Attempting to accept TOS...')
      
      const response = await fetch('/api/user/tos', { method: 'POST' })
      console.log('[TOS] Response status:', response.status, response.ok)
      
      const data = await response.json()
      console.log('[TOS] Response data:', data)
      
      // Check if request was successful (status 200-299)
      if (response.ok && data.ok !== false) {
        // Close modal and update state only on success
        setShowTosModal(false)
        setTosAcceptedLocally(true)
        setTosStatus({ needs_acceptance: false, tos_accepted: true })
        toast.success('Terms of Service accepted successfully')
        // Prevent checkTosStatus from running again
        return
      } else {
        console.error('[TOS] API returned error:', data)
        let errorMsg = data.error || 'Failed to accept Terms of Service'
        
        // If schema not updated, show helpful message and allow bypass
        if (data.code === 'SCHEMA_NOT_UPDATED' || data.details?.includes('schema')) {
          errorMsg = 'Database schema needs to be updated. ' + (data.details || '')
          // Offer to bypass TOS check temporarily
          if (confirm('Database schema not updated. Would you like to continue anyway? (You will need to update the schema later)')) {
            setShowTosModal(false)
            setTosAcceptedLocally(true)
            setTosStatus({ needs_acceptance: false, tos_accepted: false })
            toast.error('Please update database schema: Run supabase-schema-updates.sql in Supabase SQL Editor')
            return
          }
        }
        
        toast.error(errorMsg)
        // Keep modal open on error so user can see the error message
      }
    } catch (error: any) {
      console.error('[TOS] Accept TOS error:', error)
      toast.error(error.message || 'Failed to accept Terms of Service. Please check browser console for details.')
      // Keep modal open on error
    }
  }

  const handleDeclineTos = () => {
    // Close modal but show warning
    setShowTosModal(false)
    toast.error('You must accept the Terms of Service to use this application. Please refresh the page to accept.')
    // Optionally redirect to login or home
    // router.push('/')
  }

  const fetchReportHistory = async () => {
    try {
      const response = await fetch('/api/report/history')
      const data = await response.json()
      if (response.ok) {
        setReportHistory(data.reports || [])
      }
    } catch (error) {
      // Silently fail
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Oura account? You will need to reconnect to sync new data.')) {
      return
    }

    try {
      const response = await fetch('/api/oura/disconnect', { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        setIsConnected(false)
        toast.success('Oura account disconnected successfully')
      } else {
        toast.error(data.error || 'Failed to disconnect')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect')
    }
  }

  const handleDeleteAllData = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL your data including:\n- All synced Oura data\n- All saved reports\n- Oura connection\n\nThis action cannot be undone. Are you absolutely sure?')) {
      return
    }

    if (!confirm('This is your final warning. Click OK to permanently delete all your data.')) {
      return
    }

    try {
      const response = await fetch('/api/user/delete-all-data', { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        setIsConnected(false)
        setLastSynced(null)
        setHasSyncedData(false) // Reset data status
        setReportHistory([])
        toast.success('All data deleted successfully')
      } else {
        toast.error(data.error || 'Failed to delete data')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete data')
    }
  }

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/user/export-data')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `oura-data-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Data export downloaded successfully')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to export data')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to export data')
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete your entire account including:\n- All your data\n- All saved reports\n- Your account profile\n\nThis action cannot be undone. Are you absolutely sure?')) {
      return
    }

    if (!confirm('This is your final warning. Your account will be permanently deleted. Click OK to proceed.')) {
      return
    }

    try {
      const response = await fetch('/api/user/account', { method: 'DELETE' })
      const data = await response.json()
      if (response.ok) {
        await supabase.auth.signOut()
        router.push('/')
      } else {
        toast.error(data.error || 'Failed to delete account')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete account')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-300">
        <div className="max-w-5xl mx-auto px-8 py-6 flex justify-between items-center">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wide flex items-center gap-1">
            ← Home
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-xs text-gray-600">{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wide"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm text-gray-600">Generate clinical lab-style reports from your Oura ring data</p>
        </div>

        {/* Connection Status Card */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900">Oura Connection</h2>
              <StatusBadge connected={isConnected || false} />
            </div>
            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                Disconnect
              </button>
            )}
          </div>
          {isConnected ? (
            <div className="space-y-2">
              {lastSynced && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  <span>Last synced: {lastSynced}</span>
                </div>
              )}
              <a 
                href="https://cloud.ouraring.com/account" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                Manage your Oura account settings
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <Button onClick={handleConnect} disabled={isConnected === null}>
              Connect Oura account
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </Card>

        {/* Actions */}
        {isConnected && (
          <Card className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">Actions</h2>
            </div>
            {/* Workflow guidance */}
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
              <span className={`inline-flex items-center gap-1.5 ${hasSyncedData ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                <span className={`w-5 h-5 flex items-center justify-center text-xs border ${hasSyncedData ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-900'}`}>1</span>
                Sync
                {hasSyncedData && <span className="text-gray-400">✓</span>}
              </span>
              <span className="text-gray-300">→</span>
              <span className={`inline-flex items-center gap-1.5 ${hasSyncedData ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 flex items-center justify-center text-xs border ${hasSyncedData ? 'bg-white text-gray-900 border-gray-900' : 'bg-white text-gray-300 border-gray-300'}`}>2</span>
                Generate Report
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => handleSync(false)}
                disabled={syncing}
                loading={syncing}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4" />
                {hasSyncedData ? 'Refresh Data' : 'Sync Data'}
              </Button>
              <div className="relative flex-1 group">
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !hasSyncedData}
                  loading={generating}
                  className="w-full"
                >
                  <FileText className="h-4 w-4" />
                  Generate Report
                </Button>
                {/* Tooltip when disabled */}
                {!hasSyncedData && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Sync your data first to generate a report
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Report History */}
        <Card className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900">Report History</h2>
            {reportHistory.length > 0 && (
              <button
                onClick={() => setShowReportHistory(!showReportHistory)}
                className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wide"
              >
                {showReportHistory ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
          {reportHistory.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No saved reports yet"
              description="Generate a report to save it here"
            />
          ) : showReportHistory ? (
            <div className="space-y-2">
              {reportHistory.map((report) => (
                <div key={report.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.title || `Report ${new Date(report.period_end).toLocaleDateString()}`}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(report.period_start).toLocaleDateString()} – {new Date(report.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // Navigate directly to report page with ID - let the report page handle loading
                      router.push(`/app/report?id=${report.id}`)
                    }}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    View
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        {/* Data Management */}
        <Card className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Data Management</h2>
          <div className="space-y-3">
            <Button variant="ghost" onClick={handleExportData} className="justify-start">
              <Download className="h-4 w-4" />
              Export All Data (GDPR)
            </Button>
            <Button variant="ghost" onClick={handleDeleteAllData} className="justify-start text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
              Delete All Data
            </Button>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Account</h2>
          <Button variant="ghost" onClick={handleDeleteAccount} className="justify-start text-red-600 hover:text-red-700">
            <UserX className="h-4 w-4" />
            Delete Account
          </Button>
        </Card>

        {/* Terms of Service Modal */}
        <Modal
          isOpen={showTosModal}
          onClose={() => {}} // Don't allow closing
          title="Terms of Service"
          footer={
            <>
              <Button variant="secondary" onClick={handleDeclineTos} className="flex-1">
                Decline
              </Button>
              <Button onClick={acceptTos} className="flex-1">
                Accept & Continue
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>By using this service, you agree to the following:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>This service provides formatted reports of Oura data for informational purposes only.</li>
              <li>Reports are not intended to diagnose, treat, or prevent any medical condition.</li>
              <li>This service is not a substitute for professional medical advice.</li>
              <li>Your data is stored securely and used solely to generate reports.</li>
              <li>You can delete your data or account at any time.</li>
              <li>We do not sell, share, or use your data for any purpose other than report generation.</li>
            </ul>
            <p className="mt-4">
              <strong>Version 1.0</strong> - Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </Modal>

        {/* Oura Connection Explanation Modal */}
        <Modal
          isOpen={showConnectExplanation}
          onClose={() => setShowConnectExplanation(false)}
          title="Connect Your Oura Account"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowConnectExplanation(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleProceedToOura} className="flex-1">
                Continue to Oura
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>You'll be redirected to Oura's website</strong> to approve this connection.
            </p>
            <p>
              Approval happens on Oura's website, not inside this app. You'll log in directly with Oura.
            </p>
            <p>
              <strong>No Oura password is shared with this app.</strong> We use secure OAuth to connect.
            </p>
            <p className="text-gray-600 text-xs mt-4">
              You can revoke access at any time from your Oura app settings.
            </p>
          </div>
        </Modal>
      </main>
    </div>
  )
}
