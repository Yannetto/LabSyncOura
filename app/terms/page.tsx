import Link from 'next/link'

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Acceptance of Terms</h2>
            <p className="text-gray-700">
              By using this service, you agree to be bound by these Terms & Conditions. 
              If you do not agree, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Service Description</h2>
            <p className="text-gray-700">
              This service provides a formatting utility that generates lab-style reports from 
              your Oura ring data. It is a data visualization and summarization tool only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Medical Disclaimer</h2>
            <p className="text-gray-700">
              <strong>IMPORTANT: Informational only. Not medical advice.</strong>
            </p>
            <p className="text-gray-700 mt-2">
              This service is for informational purposes only. The reports generated are not 
              medical advice, diagnosis, or treatment recommendations. Always consult with a 
              qualified healthcare provider for medical concerns.
            </p>
            <p className="text-gray-700 mt-2">
              We make no claims about the accuracy, completeness, or usefulness of the data 
              or reports. The service is provided "as is" without warranty of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Oura Affiliation</h2>
            <p className="text-gray-700">
              <strong>Not affiliated with Oura.</strong> This service is independently operated 
              and is not affiliated with, endorsed by, or sponsored by Oura. Oura is a trademark 
              of Oura Health Oy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Third-Party Service Providers</h2>
            <p className="text-gray-700">
              Your use of this service is subject to third-party service providers, including Oura. We disclaim all 
              warranties on behalf of third-party service providers, including a disclaimer of implied warranties of 
              merchantability, fitness for a particular purpose and non-infringement. Third-party service providers 
              are excluded from all liability for consequential, special, punitive, indirect damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">User Responsibilities</h2>
            <p className="text-gray-700">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>Maintaining the security of your account credentials</li>
              <li>Authorizing and managing OAuth access to your Oura account</li>
              <li>Using the service in compliance with all applicable laws</li>
              <li>Not using the service for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by law, we shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of 
              the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Service Availability</h2>
            <p className="text-gray-700">
              We reserve the right to modify, suspend, or discontinue the service at any time without notice. 
              We do not guarantee uninterrupted or error-free service. This service depends on third-party APIs, 
              including the Oura API. We make no warranty that the service will be uninterrupted, timely, secure, 
              or error-free. The service is provided "as is" without warranty of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these terms at any time. Continued use of the 
              service after changes constitutes acceptance of the modified terms.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
