'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        // If user is authenticated and landed here from magic link, redirect to app
        if (user && window.location.search.includes('type=magiclink')) {
          router.push('/app')
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err)
        setError(err.message || 'Failed to initialize authentication')
      }
    }
    
    initAuth()
  }, [router])

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
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center">
          <div className="flex gap-4 sm:gap-8">
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
              className="text-sm text-gray-700 hover:text-gray-900 font-medium flex items-center gap-1"
            >
              Dashboard
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-gray-700 hover:text-gray-900 font-medium flex items-center gap-1"
            >
              Sign In
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-12">
        {/* Hero */}
        <div className="mb-16 text-center max-w-4xl mx-auto">
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-10 tracking-tight leading-tight whitespace-nowrap">
            Doctor-ready wearable reports in seconds.
          </h1>
          
          {/* Primary CTA */}
          <div className="mb-6">
            {!user ? (
              <Link href="/login" className="inline-block">
                <button className="px-10 py-4 bg-gray-900 text-white font-medium hover:bg-gray-800 rounded-lg transition-all duration-200 inline-flex items-center gap-2 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Generate free report
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            ) : (
              <Link href="/app" className="inline-block">
                <button className="px-10 py-4 bg-gray-900 text-white font-medium hover:bg-gray-800 rounded-lg transition-all duration-200 inline-flex items-center gap-2 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Generate free report
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            )}
          </div>

          {/* Supporting UI - 3-step process */}
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 text-sm sm:text-[15px] text-gray-500 opacity-65">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span>💍</span>
              <span>Connect your wearable</span>
            </span>
            <span className="hidden sm:inline text-gray-400">·</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span>📄</span>
              <span>Get report</span>
            </span>
            <span className="hidden sm:inline text-gray-400">·</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span>🩺</span>
              <span>Share with doctor or AI</span>
            </span>
          </div>
        </div>

        {/* Example Report - Always Visible */}
        <div className="mb-12">
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600">
              Example report (sample data) — your report will use your wearable data.
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {/* Report Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-5">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3">Wearable Health Summary Report</h2>
              <div className="text-xs text-gray-600 space-y-2">
                <p><span className="font-medium text-gray-700">Patient email:</span> example@email.com • <span className="font-medium text-gray-700">Report date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-medium text-gray-700">7 Days values:</span> Jan 1, 2026 – Jan 7, 2026 (7 days)</p>
                <p><span className="font-medium text-gray-700">30 Days Reference Range:</span> Dec 2, 2025 – Jan 1, 2026 (30 days)</p>
              </div>
            </div>

            {/* Flag Summary */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-2">
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-600">
                <span className="font-medium text-gray-700">Flag summary:</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span>
                  <span>6 Above Range</span>
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span>
                  <span>5 Below Range</span>
                </span>
              </div>
            </div>

            {/* Sleep Table */}
            <div className="mb-10 sm:mb-12 px-4 sm:px-6">
              <h2 className="text-base sm:text-lg font-bold mb-2.5 text-gray-900">Sleep Summary</h2>
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
                    {/* Flagged metrics first (sorted by flags) */}
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Deep Sleep</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">17.4% (1h 20m)</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">12.3–16.7%</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Light Sleep</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">60.6% (4h 47m)</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">61.6–73.3%</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    {/* Unflagged metrics (in backend order) */}
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Time in Bed</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">9h 5m</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">8h 1m – 10h 9m</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Sleep Duration</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">7h 53m</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">7h 10m – 9h 0m</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Sleep Latency</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">18 min</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">9 min – 22 min</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Sleep Efficiency</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">86.8%</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">86.0–89.8%</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">REM Sleep</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">22.0% (1h 45m)</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">19.3–25.1%</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {/* Flagged metrics first */}
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Deep Sleep</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">17.4% (1h 20m)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">12.3–16.7%</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Light Sleep</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">60.6% (4h 47m)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">61.6–73.3%</span></div>
                  </div>
                </div>
                {/* Unflagged metrics */}
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Time in Bed</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">9h 5m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">8h 1m – 10h 9m</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Sleep Duration</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">7h 53m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">7h 10m – 9h 0m</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Sleep Latency</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">18 min</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">9 min – 22 min</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Sleep Efficiency</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">86.8%</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">86.0–89.8%</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">REM Sleep</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">22.0% (1h 45m)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">19.3–25.1%</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cardiovascular & Oxygenation Table */}
            <div className="mb-6 sm:mb-8 px-4 sm:px-6">
              <h2 className="text-base sm:text-lg font-bold mb-2.5 text-gray-900">Cardiovascular & Oxygenation</h2>
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
                    {/* Flagged metrics first (sorted by flags) */}
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Resting Heart Rate</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">51 bpm</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">56–64 bpm</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Lowest Night-time Heart Rate</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">51 bpm</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">56–64 bpm</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    {/* Unflagged metrics (in backend order) */}
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Night-time HRV</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">67 ms</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">46–67 ms</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Respiratory Rate</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">12 breaths/min</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">12–13 breaths/min</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Temperature Trend Deviation</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">0.01°C (0.02°F)</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">0.00–0.12°C (0.00–0.22°F)</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Resting Heart Rate</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                    </div>
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
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">28 ms</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">35–50 ms</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Respiratory Rate</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">12 breaths/min</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">12–18 breaths/min</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Oxygen Saturation (SpO2)</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">94.5%</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">96.0–99.0%</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Breathing Disturbance Index</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">8.2</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">5.0–8.0</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Temperature Trend Deviation</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">0.01°C (0.02°F)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">0.00–0.12°C (0.00–0.22°F)</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Table */}
            <div className="mb-10 sm:mb-12 px-4 sm:px-6">
              <h2 className="text-base sm:text-lg font-bold mb-2.5 text-gray-900">Activity</h2>
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
                    {/* Flagged metrics first (sorted by flags) */}
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Steps</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">8237 steps</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">2467–6008 steps</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Active Calories</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">537 kcal</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">227–332 kcal</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Total Calories</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">2772 kcal</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">2462–2518 kcal</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Sedentary Time</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">7h 30m</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">8h 27m – 9h 40m</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Medium Activity Time</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">1h 3m</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">3 min – 18 min</td>
                      <td className="px-5 py-3.5 text-center text-sm">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    {/* Unflagged metrics (in backend order) */}
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Low Activity Time</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">5h 2m</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">3h 57m – 5h 28m</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium border-r border-gray-200">Resting Time</td>
                      <td className="px-5 py-3.5 text-sm border-r border-gray-200">9h 4m</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 border-r border-gray-200">9h 17m – 10h 59m</td>
                      <td className="px-5 py-3.5 text-center text-sm text-gray-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Steps</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">8,500 steps</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">7,000–10,000 steps</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Active Calories</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">537 kcal</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">227–332 kcal</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Total Calories</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">2,772 kcal</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">2,462–2,518 kcal</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Sedentary Time</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">7h 30m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">8h 27m – 9h 40m</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">High Activity Time</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">0 min</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">0 min – 0 min</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Medium Activity Time</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">1h 3m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">3 min – 18 min</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Low Activity Time</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">5h 2m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">3h 57m – 5h 28m</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">Resting Time</div>
                    <div className="text-sm ml-2"></div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">9h 4m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">9h 17m – 10h 59m</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-8 mx-4 sm:mx-6 mb-4 sm:mb-6 p-4 bg-gray-50 border border-gray-300">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Legend</h3>
              <div className="text-xs text-gray-700 space-y-1">
                <p><span className="font-semibold text-yellow-700">Above Range</span> — The 7-day average is higher than the 75th percentile of your 30-day reference range.</p>
                <p><span className="font-semibold text-orange-700">Below Range</span> — The 7-day average is lower than the 25th percentile of your 30-day reference range.</p>
                <p><span className="font-semibold">—</span> — The value is within your normal reference range.</p>
                <p className="text-gray-600 mt-2">Reference ranges are calculated from your personal historical data (30-day period) using the interquartile range method.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-10 text-xs text-gray-600 leading-relaxed">
          <p className="font-semibold text-gray-800 mb-3">Experimental Report — Disclaimer and Limitation of Liability</p>
          <p className="mb-2">This report is generated by an experimental tool based on personal health tracking data. It is provided "as is" without any warranties, express or implied. The information herein may be incomplete, inaccurate, or outdated. No representations are made regarding the accuracy, reliability, or completeness of the data, metrics, or analysis presented.</p>
          <p className="mb-2">This report is for informational purposes only and does not constitute medical advice. It is not intended to diagnose, treat, cure, or prevent any disease or health condition. You should not rely on this report for any medical decisions. Always seek the advice of a qualified healthcare professional with any questions regarding your health or medical condition.</p>
          <p className="mb-2">By using this report, you acknowledge and accept that the creators disclaim all liability for any direct or indirect consequences arising from its use.</p>
          <p className="mt-2 text-gray-500">This service is not affiliated with, endorsed by, or sponsored by Oura Health.</p>
        </div>
      </main>
    </div>
  )
}
