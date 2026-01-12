import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Collection</h2>
            <p className="text-gray-700">
              We collect and store the following data:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Your email address for account authentication</li>
              <li>OAuth tokens for accessing your Oura account (stored securely)</li>
              <li>Daily summary data from your Oura ring (last 30 days)</li>
              <li>Generated PDF reports</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">OAuth Authorization</h2>
            <p className="text-gray-700">
              We use OAuth2 to securely connect to your Oura account. You can revoke access at any time 
              through your Oura account settings. We only request the minimal scopes needed to generate 
              your lab-style reports.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Usage</h2>
            <p className="text-gray-700">
              Your data is used solely to generate lab-style reports. We do not sell, share, or use 
              your data for advertising purposes. We practice data minimization, only collecting what 
              is necessary for the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Storage</h2>
            <p className="text-gray-700">
              All data is stored securely using Supabase. OAuth tokens are encrypted and stored 
              server-side only. PDF reports are stored in private storage buckets.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Deletion</h2>
            <p className="text-gray-700">
              You can request deletion of your account and all associated data at any time. 
              To delete your account, please contact us or use the account deletion feature in the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Disclaimers</h2>
            <p className="text-gray-700">
              <strong>Informational only. Not medical advice.</strong> This service provides 
              formatted reports of your Oura data for informational purposes only. It is not 
              intended to diagnose, treat, or prevent any medical condition.
            </p>
            <p className="text-gray-700 mt-3">
              <strong>Not affiliated with Oura.</strong> This service is not affiliated with, 
              endorsed by, or sponsored by Oura.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <p className="text-gray-700">
              If you have questions about this privacy policy, please contact us through the app.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
