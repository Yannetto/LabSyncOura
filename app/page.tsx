'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFullExample, setShowFullExample] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        // If user is authenticated and landed here from magic link, redirect to app
        if (user && window.location.search.includes('type=magiclink')) {
          window.location.href = '/app'
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err)
        setError(err.message || 'Failed to initialize authentication')
      }
    }
    
    initAuth()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-300">
        <div className="max-w-5xl mx-auto px-8 py-6 flex justify-between items-center">
          <div className="flex gap-8">
            <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wide">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wide">
              Terms
            </Link>
          </div>
          {user ? (
            <Link
              href="/app"
              className="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Dashboard →
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Sign In →
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        {/* Value Proposition */}
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Wearable Health Summary Report
          </h1>
          <p className="text-sm sm:text-base text-gray-700 max-w-2xl mx-auto leading-relaxed px-4">
            Transform your Oura ring data into clinical lab-style reports. 
            View your health metrics in a format familiar to healthcare professionals.
          </p>
        </div>

        {/* How it works - Simplified */}
        <div className="mb-8 sm:mb-12 text-center text-xs sm:text-sm text-gray-600 px-4">
          <p>Connect your Oura account → Sync your data → Generate your report</p>
        </div>

        {/* Small Table Preview */}
        <div className="mb-8">
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-900 px-4 sm:px-0">Example Report</h2>
          <div className="border border-gray-300 overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '600px' }}>
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
                <tr>
                  <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Sleep Duration</td>
                  <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">8h 26m</td>
                  <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">7h 30m – 9h 0m</td>
                  <td className="px-4 py-2 text-center text-sm whitespace-nowrap"></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Resting Heart Rate</td>
                  <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">95 bpm</td>
                  <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">55–65 bpm</td>
                  <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Above Range</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Steps</td>
                  <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">8,500 steps</td>
                  <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">7,000–10,000 steps</td>
                  <td className="px-4 py-2 text-center text-sm whitespace-nowrap"></td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowFullExample(!showFullExample)}
              className="text-sm text-gray-700 hover:text-gray-900 border-b border-gray-400 pb-1"
            >
              {showFullExample ? 'Hide' : 'See'} full example report →
            </button>
          </div>
        </div>

        {/* Full Example Report - Expandable */}
        {showFullExample && (
          <div className="mb-12 pb-8 border-b border-gray-300">
            {/* Report Header */}
            <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-gray-300">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Wearable Health Summary Report</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-700">
                <p><strong className="text-gray-900">Patient email:</strong> example@email.com</p>
                <p><strong className="text-gray-900">Report date:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong className="text-gray-900">7 Days values:</strong> Jan 1, 2026 – Jan 7, 2026 (7 days)</p>
                <p><strong className="text-gray-900">30 Days Reference Range:</strong> Dec 2, 2025 – Jan 1, 2026 (30 days)</p>
              </div>
            </div>

            {/* Sleep Table */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-gray-900 px-4 sm:px-0">Sleep Summary</h2>
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
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Time in Bed</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">9h 36m</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">8h 45m – 10h 15m</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap"></td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Sleep Duration</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">6h 45m</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">7h 30m – 9h 0m</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Below Range</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Deep Sleep</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">10.5% (52m)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">12.0–18.0% (1h 0m – 1h 30m)</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Below Range</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Light Sleep</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">62.5% (5h 17m)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">55.0–70.0% (4h 30m – 6h 0m)</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap"></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">REM Sleep</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">27.0% (2h 17m)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">18.0–25.0% (1h 30m – 2h 15m)</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Above Range</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Time in Bed</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">9h 36m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">8h 45m – 10h 15m</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Sleep Duration</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Below Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">6h 45m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">7h 30m – 9h 0m</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Deep Sleep</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Below Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">10.5% (52m)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">12.0–18.0% (1h 0m – 1h 30m)</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Light Sleep</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">62.5% (5h 17m)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">55.0–70.0% (4h 30m – 6h 0m)</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">REM Sleep</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Above Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">27.0% (2h 17m)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">18.0–25.0% (1h 30m – 2h 15m)</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cardiovascular & Oxygenation Table */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-gray-900 px-4 sm:px-0">Cardiovascular & Oxygenation</h2>
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
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Resting Heart Rate</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">95 bpm</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">55–65 bpm</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Above Range</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Lowest Night-time Heart Rate</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">45 bpm</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">42–50 bpm</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap"></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Night-time HRV</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">28 ms</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">35–50 ms</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Below Range</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Oxygen Saturation (SpO2)</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">94.5%</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">96.0–99.0%</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Below Range</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Breathing Disturbance Index</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">8.2</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">5.0–8.0</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Above Range</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Temperature Deviation</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">-0.04°C</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">-0.2–0.2°C</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Resting Heart Rate</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Above Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">95 bpm</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">55–65 bpm</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Lowest Night-time Heart Rate</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">45 bpm</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">42–50 bpm</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Night-time HRV</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Below Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">28 ms</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">35–50 ms</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Oxygen Saturation (SpO2)</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Below Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">94.5%</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">96.0–99.0%</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Breathing Disturbance Index</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Above Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">8.2</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">5.0–8.0</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Temperature Deviation</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">-0.04°C</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">-0.2–0.2°C</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Table */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-gray-900 px-4 sm:px-0">Activity</h2>
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
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Steps</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">5,200 steps</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">7,000–10,000 steps</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Below Range</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Sedentary Time</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">11h 30m</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">7h 30m – 10h 0m</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-red-600 font-medium">Above Range</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Steps</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Below Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">5,200 steps</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">7,000–10,000 steps</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Sedentary Time</div>
                    <div className="text-sm ml-2 text-red-600 font-medium">Above Range</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">11h 30m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">7h 30m – 10h 0m</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-8 p-4 bg-gray-50 border border-gray-300">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Legend</h3>
              <div className="text-xs text-gray-700 space-y-1">
                <p><span className="font-semibold text-red-600">Above Range</span> — The 7-day average is higher than the 75th percentile of your 30-day reference range.</p>
                <p><span className="font-semibold text-red-600">Below Range</span> — The 7-day average is lower than the 25th percentile of your 30-day reference range.</p>
                <p><span className="font-semibold">Blank</span> — The value is within your normal reference range.</p>
                <p className="text-gray-600 mt-2">Reference ranges are calculated from your personal historical data (30-day period) using the interquartile range method.</p>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center mb-12">
          {!user && (
            <Link
              href="/login"
              className="inline-block text-sm text-gray-700 hover:text-gray-900 font-medium border-b border-gray-400 pb-1"
            >
              Connect Oura to generate your report →
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-8 text-xs text-gray-600 leading-relaxed">
          <p className="font-semibold text-gray-800 mb-2">Information only – not for diagnosis or treatment.</p>
          <p>This service generates formatted reports from personal health tracking data and is not a substitute for professional medical advice, diagnosis, or treatment.</p>
          <p className="mt-2 text-gray-500">Not affiliated with Oura Health.</p>
        </div>
      </main>
    </div>
  )
}
