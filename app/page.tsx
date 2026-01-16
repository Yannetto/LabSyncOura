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
        <div className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 tracking-tight">
            Turn your wearable data into a doctor-ready report — in seconds.
          </h1>
          
          {/* Primary CTA */}
          <div className="mb-4">
            {!user ? (
              <Link href="/login" className="inline-block">
                <button className="px-8 py-3.5 bg-gray-900 text-white font-medium hover:bg-gray-800 rounded-md transition-colors inline-flex items-center gap-2 text-base shadow-md">
                  Generate free report
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            ) : (
              <Link href="/app" className="inline-block">
                <button className="px-8 py-3.5 bg-gray-900 text-white font-medium hover:bg-gray-800 rounded-md transition-colors inline-flex items-center gap-2 text-base shadow-md">
                  Generate free report
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            )}
          </div>

          {/* Microcopy */}
          <p className="text-sm text-gray-600 mb-3">
            Connect your wearable → get a lab-style report → share with your doctor or AI
          </p>

          {/* Trust line */}
          <p className="text-xs text-gray-500">
            100% free • Secure OAuth • No password
          </p>
        </div>

        {/* Example Report - Always Visible */}
        <div className="mb-12">
          <div className="mb-3 text-center">
            <p className="text-sm text-gray-600">
              Example report (sample data) — your report will use your wearable data.
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {/* Report Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Wearable Health Summary Report</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                <p><span className="font-medium text-gray-700">Patient email:</span> example@email.com</p>
                <p><span className="font-medium text-gray-700">Report date:</span> {new Date().toLocaleDateString()}</p>
                <p><span className="font-medium text-gray-700">7 Days values:</span> Jan 1, 2026 – Jan 7, 2026 (7 days)</p>
                <p><span className="font-medium text-gray-700">30 Days Reference Range:</span> Dec 2, 2025 – Jan 1, 2026 (30 days)</p>
              </div>
            </div>

            {/* Flag Summary */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700">
                <span className="font-semibold text-gray-900">Flag summary:</span>
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
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Sleep Duration</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">6h 45m</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">7h 30m – 9h 0m</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Sleep Latency</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">18 min</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">9 min – 22 min</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Sleep Efficiency</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">86.8%</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">86.0–89.8%</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Deep Sleep</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">10.5% (52m)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">12.0–18.0% (1h 0m – 1h 30m)</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">REM Sleep</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">27.0% (2h 17m)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">18.0–25.0% (1h 30m – 2h 15m)</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Light Sleep</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">62.5% (5h 17m)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">55.0–70.0% (4h 30m – 6h 0m)</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
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
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">6h 45m</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">7h 30m – 9h 0m</span></div>
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
                    <div className="font-semibold text-sm text-gray-900 flex-1">Deep Sleep</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">10.5% (52m)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">12.0–18.0% (1h 0m – 1h 30m)</span></div>
                  </div>
                </div>
                <div className="border border-gray-300 p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900 flex-1">REM Sleep</div>
                    <div className="text-sm ml-2">
                      <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">7 Days values:</span> <span className="font-medium">27.0% (2h 17m)</span></div>
                    <div><span className="text-gray-600">30 Days Reference Range:</span> <span className="text-gray-700">18.0–25.0% (1h 30m – 2h 15m)</span></div>
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
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Lowest Night-time Heart Rate</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">45 bpm</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">42–50 bpm</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Night-time HRV</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">28 ms</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">35–50 ms</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Respiratory Rate</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">12 breaths/min</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">12–18 breaths/min</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Oxygen Saturation (SpO2)</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">94.5%</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">96.0–99.0%</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Breathing Disturbance Index</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">8.2</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">5.0–8.0</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Temperature Trend Deviation</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">0.01°C (0.02°F)</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">0.00–0.12°C (0.00–0.22°F)</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
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
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">8,500 steps</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">7,000–10,000 steps</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Active Calories</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">537 kcal</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">227–332 kcal</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Total Calories</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">2,772 kcal</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">2,462–2,518 kcal</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Sedentary Time</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">7h 30m</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">8h 27m – 9h 40m</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">Below Range</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">High Activity Time</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">0 min</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">0 min – 0 min</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Medium Activity Time</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">1h 3m</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">3 min – 18 min</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Above Range</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Low Activity Time</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">5h 2m</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">3h 57m – 5h 28m</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-semibold border-r border-gray-200 whitespace-nowrap">Resting Time</td>
                      <td className="px-4 py-2 text-sm border-r border-gray-200 whitespace-nowrap">9h 4m</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">9h 17m – 10h 59m</td>
                      <td className="px-4 py-2 text-center text-sm whitespace-nowrap text-gray-400">—</td>
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
            <div className="mt-8 p-4 bg-gray-50 border border-gray-300">
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
