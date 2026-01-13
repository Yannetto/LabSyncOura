import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-300">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-xs text-gray-600 hover:text-gray-900 uppercase tracking-wide">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Experimental Nature and Risk Disclosure</h2>
            <p className="text-gray-700">
              <strong>This service is experimental in nature.</strong> The reports generated may contain 
              inaccuracies, and the system is under active development. You understand that health metrics 
              may be misrepresented or misinterpreted. We make no guarantees as to the accuracy of the 
              insights derived from raw Oura data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Collection</h2>
            <p className="text-gray-700">
              We collect and store the following data:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li><strong>Account Information:</strong> Your email address for account authentication</li>
              <li><strong>OAuth Credentials:</strong> OAuth tokens for accessing your Oura account (stored securely, encrypted)</li>
              <li><strong>Health-Related Data from Oura Ring:</strong>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Sleep data: duration, efficiency, latency, REM sleep percentage, deep sleep percentage, light sleep percentage, time in bed</li>
                  <li>Heart rate data: resting heart rate, lowest night-time heart rate, heart rate variability (HRV)</li>
                  <li>Activity data: steps, active calories, sedentary time</li>
                  <li>Oxygenation data: SpO2 (blood oxygen saturation) levels, breathing disturbance index</li>
                  <li>Temperature data: body temperature deviations</li>
                  <li>Stress indicators: high stress days</li>
                  <li>Readiness scores and related metrics</li>
                </ul>
              </li>
              <li><strong>Generated Reports:</strong> PDF reports containing your health metrics and analysis</li>
              <li><strong>Report Metadata:</strong> Report titles, dates, and saved report preferences</li>
            </ul>
            <p className="text-gray-700 mt-3">
              We collect this data through OAuth2 authorization with your Oura account. You control 
              access through your Oura account settings and can revoke access at any time.
            </p>
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
            <p className="text-gray-700 mt-2">
              <strong>Third-Party Services:</strong> We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li><strong>Supabase:</strong> For database storage, authentication, and file storage. 
                Supabase processes your data according to their privacy policy and security standards.</li>
              <li><strong>Oura API:</strong> We access your Oura data through Oura's official API. 
                Oura may collect usage data related to API access as described in their privacy policy.</li>
              <li><strong>Vercel:</strong> For hosting and deployment. Vercel may process request logs 
                and metadata but does not have access to your health data.</li>
            </ul>
            <p className="text-gray-700 mt-2">
              <strong>No Analytics or Tracking:</strong> We do not use analytics services, tracking 
              pixels, or third-party advertising services. We do not share your data with data brokers 
              or analytics companies.
            </p>
            <p className="text-gray-700 mt-3">
              <strong>Sensitive Data Handling:</strong> We do not infer, store, or process any diagnoses 
              or mental health conditions. Data processed is limited to raw metrics from the Oura API 
              (sleep duration, heart rate, activity levels, etc.). We do not analyze, interpret, or 
              draw conclusions about your health status beyond presenting the raw metrics in a formatted 
              report. Stress indicators and sleep-related data are processed as numerical metrics only, 
              without any diagnostic or clinical interpretation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Processing, Storage, and Protection</h2>
            <p className="text-gray-700">
              <strong>Processing:</strong> Your health data is processed to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>Calculate 7-day averages and 30-day reference ranges for metrics</li>
              <li>Generate formatted lab-style reports</li>
              <li>Store historical data for report generation</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>Storage:</strong> All data is stored securely using Supabase, a SOC 2 Type II 
              certified platform. Data is stored in encrypted databases with the following protections:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>OAuth tokens are encrypted and stored server-side only (never exposed to client)</li>
              <li>Health metrics are stored in a private database with row-level security (RLS) policies</li>
              <li>PDF reports are stored in private, encrypted storage buckets</li>
              <li>All data is encrypted at rest and in transit</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>Protection:</strong> We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>Encryption of data in transit (HTTPS/TLS) and at rest</li>
              <li>Row-level security policies ensuring users can only access their own data</li>
              <li>Secure authentication via Supabase Auth</li>
              <li>Regular security updates and monitoring</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Deletion and Your Rights</h2>
            <p className="text-gray-700">
              <strong>Right to Deletion:</strong> You can request deletion of your account and all 
              associated data at any time. This includes:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>All health metrics and daily data</li>
              <li>OAuth tokens and connection data</li>
              <li>Generated PDF reports</li>
              <li>Account information and email address</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>How to Delete:</strong> You can delete your data in two ways:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>Use the "Delete All Data" feature in the app dashboard</li>
              <li>Use the "Delete Account" feature to remove your entire account</li>
              <li>Contact us at <a href="mailto:info@simplewearablereport.com" className="text-gray-700 hover:text-gray-900 underline">info@simplewearablereport.com</a> to request deletion</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>Data Export:</strong> You can export all your data in JSON format using the 
              "Export All Data (GDPR)" feature in the app before deletion.
            </p>
            <p className="text-gray-700 mt-3">
              <strong>Processing Time:</strong> Deletion requests are processed immediately. 
              Backups may be retained for up to 30 days for disaster recovery purposes, after which 
              they are permanently deleted.
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
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Oura Usage Data Collection</h2>
            <p className="text-gray-700">
              Oura may collect certain use data and information related to your use of the Oura API Materials 
              and Oura Platform in connection with this application. Oura may use such Usage Data for any business 
              purpose, internal or external, including providing enhancements to the Oura API Materials or Oura 
              Platform, providing developer or user support, or otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">GDPR and Data Protection Rights</h2>
            <p className="text-gray-700">
              If you are located in the European Economic Area (EEA), United Kingdom, or other jurisdictions 
              with similar data protection laws, you have the following rights:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li><strong>Right to Access:</strong> You can request a copy of all personal data we hold about you</li>
              <li><strong>Right to Rectification:</strong> You can request correction of inaccurate data</li>
              <li><strong>Right to Erasure:</strong> You can request deletion of your data (as described above)</li>
              <li><strong>Right to Data Portability:</strong> You can export your data in a machine-readable format</li>
              <li><strong>Right to Object:</strong> You can object to processing of your data</li>
              <li><strong>Right to Restrict Processing:</strong> You can request we limit how we process your data</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>Legal Basis for Processing:</strong> We process your health data based on your explicit 
              consent, which you provide when connecting your Oura account. You can withdraw consent at any 
              time by disconnecting your Oura account or deleting your data.
            </p>
            <p className="text-gray-700 mt-3">
              <strong>Data Retention:</strong> We retain your data only as long as necessary to provide the 
              service. You can request deletion at any time, and we will comply within 30 days.
            </p>
            <p className="text-gray-700 mt-3">
              <strong>Data Transfers:</strong> Your data may be processed and stored in servers located 
              outside the EEA (including the United States). We ensure appropriate safeguards are in place 
              through our use of Supabase, which maintains appropriate data protection measures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">HIPAA Compliance</h2>
            <p className="text-gray-700">
              <strong>This service is not HIPAA-compliant.</strong> We are not a covered entity or business 
              associate under HIPAA. If you require HIPAA-compliant health data processing, you should not 
              use this service. We do not enter into Business Associate Agreements (BAAs).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Processing Disclosure</h2>
            <p className="text-gray-700">
              If our use of the Oura API Materials or Personal Data requires or will likely result in the provision 
              of Personal Data directly to Oura, we have obtained all necessary consents and authorizations from you 
              to provide such Personal Data to Oura. Oura will treat Personal Data obtained from us through our use 
              of the Oura API Materials in accordance with Oura's then-current Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <p className="text-gray-700">
              If you have questions about this privacy policy or data handling, please contact us at:
            </p>
            <p className="text-gray-700 mt-2">
              <strong>Email:</strong> <a href="mailto:info@simplewearablereport.com" className="text-gray-700 hover:text-gray-900 underline">info@simplewearablereport.com</a>
            </p>
            <p className="text-gray-700 mt-2">
              <strong>Website:</strong> <a href="https://simplewearablereport.com" className="text-gray-700 hover:text-gray-900 underline">https://simplewearablereport.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
