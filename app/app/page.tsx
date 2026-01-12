'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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
    checkAuth()
    checkConnection()
    fetchLastSync()
    checkTosStatus()
    fetchReportHistory()
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
      }
    } catch (error) {
      // Silently fail
    }
  }

  useEffect(() => {
    // Check for URL params
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')

    if (connected === '1') {
      setMessage({ type: 'success', text: 'Connected ✓ Oura account connected successfully!' })
      setIsConnected(true)
      // Clean URL
      router.replace('/app')
    } else if (connected === '0') {
      setMessage({ 
        type: 'error', 
        text: error === 'access_denied' 
          ? 'Connection was not approved. You can try again at any time.' 
          : 'Failed to connect Oura account' 
      })
    }
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
  }

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Check connection status
      const response = await fetch('/api/oura/status')
      const data = await response.json()
      setIsConnected(data.connected || false)
    } catch (error) {
      setIsConnected(false)
    } finally {
      setLoading(false)
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
        setMessage({ type: 'success', text: `Synced ${data.days_synced} days of data` })
        setLastSynced(syncDate)
      } else {
        // Handle specific error cases
        if (response.status === 404) {
          setMessage({ type: 'error', text: 'No sleep summaries available for the selected period. Please check your Oura account has data.' })
        } else if (response.status === 403) {
          setMessage({ type: 'error', text: 'Permission denied. Please reconnect your Oura account.' })
        } else {
          setMessage({ type: 'error', text: data.error || 'Sync failed' })
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Sync failed' })
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
        // Redirect to report view page
        router.push('/app/report')
      } else {
        setMessage({ type: 'error', text: data.error || 'Report generation failed' })
        setGenerating(false)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Report generation failed' })
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
        setMessage({ type: 'success', text: 'Terms of Service accepted successfully' })
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
            setMessage({ 
              type: 'error', 
              text: 'Please update database schema: Run supabase-schema-updates.sql in Supabase SQL Editor' 
            })
            return
          }
        }
        
        setMessage({ 
          type: 'error', 
          text: errorMsg
        })
        // Keep modal open on error so user can see the error message
      }
    } catch (error: any) {
      console.error('[TOS] Accept TOS error:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to accept Terms of Service. Please check browser console for details.' })
      // Keep modal open on error
    }
  }

  const handleDeclineTos = () => {
    // Close modal but show warning
    setShowTosModal(false)
    setMessage({ type: 'error', text: 'You must accept the Terms of Service to use this application. Please refresh the page to accept.' })
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
        setMessage({ type: 'success', text: 'Oura account disconnected successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect' })
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
        setReportHistory([])
        setMessage({ type: 'success', text: 'All data deleted successfully' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete data' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete data' })
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
        setMessage({ type: 'success', text: 'Data export downloaded successfully' })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to export data' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export data' })
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
        setMessage({ type: 'error', text: data.error || 'Failed to delete account' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete account' })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-2 border-gray-400">
        <div className="max-w-5xl mx-auto px-8 py-6 flex justify-between items-center">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wide">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-sm text-gray-600">Generate clinical lab-style reports from your Oura ring data</p>
        </div>

        {message && (
          <div className={`mb-6 p-3 text-sm border ${
            message.type === 'success' ? 'bg-gray-50 text-gray-800 border-gray-300' : 'bg-gray-50 text-gray-800 border-gray-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Connection Status */}
        <div className="mb-8 pb-6 border-b-2 border-gray-400">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Oura Connection</h2>
              <p className="text-xs text-gray-600">
                {isConnected ? (
                  <span className="text-gray-700">Connected • Last synced: {lastSynced || 'Never'}</span>
                ) : (
                  <span className="text-gray-500">Not connected</span>
                )}
              </p>
            </div>
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="text-xs text-gray-600 hover:text-gray-900 underline"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="text-sm text-gray-700 hover:text-gray-900 font-medium"
                disabled={isConnected === null}
              >
                Connect →
              </button>
            )}
          </div>
          {!isConnected && (
            <button
              onClick={handleConnect}
              className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
              disabled={isConnected === null}
            >
              Connect Oura account
            </button>
          )}
          {isConnected && (
            <div className="mt-2">
              <a 
                href="https://cloud.ouraring.com/account" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Manage your Oura account settings →
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        {isConnected && (
          <div className="mb-8 pb-6 border-b-2 border-gray-400">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleSync(false)}
                disabled={syncing}
                className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1 disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync last 30 days'}
              </button>
              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report History */}
        {reportHistory.length > 0 && (
          <div className="mb-8 pb-6 border-b-2 border-gray-400">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Report History</h2>
              <button
                onClick={() => setShowReportHistory(!showReportHistory)}
                className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wide"
              >
                {showReportHistory ? 'Hide' : 'Show'}
              </button>
            </div>
            {showReportHistory && (
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
                      className="text-xs text-gray-600 hover:text-gray-900 underline cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data Management */}
        <div className="mb-8 pb-6 border-b-2 border-gray-400">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Data Management</h2>
          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
            >
              Export All Data (GDPR)
            </button>
            <div className="pt-2">
              <button
                onClick={handleDeleteAllData}
                className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
              >
                Delete All Data
              </button>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Account</h2>
          <button
            onClick={handleDeleteAccount}
            className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
          >
            Delete Account
          </button>
        </div>

        {/* Terms of Service Modal */}
        {showTosModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // Close modal if clicking on backdrop
              if (e.target === e.currentTarget) {
                // Don't allow closing by clicking outside - user must accept or decline
              }
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Terms of Service
              </h3>
              <div className="space-y-3 text-sm text-gray-700 mb-6">
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
              <div className="flex gap-3">
                <button
                  onClick={handleDeclineTos}
                  className="flex-1 px-4 py-2 border-2 border-gray-400 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Decline
                </button>
                <button
                  onClick={acceptTos}
                  className="flex-1 px-4 py-2 bg-black text-white hover:bg-gray-900 text-sm"
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Oura Connection Explanation Modal */}
        {showConnectExplanation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Connect Your Oura Account
              </h3>
              <div className="space-y-3 text-sm text-gray-700 mb-6">
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
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConnectExplanation(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-400 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToOura}
                  className="flex-1 px-4 py-2 bg-black text-white hover:bg-gray-900 text-sm"
                >
                  Continue to Oura
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
