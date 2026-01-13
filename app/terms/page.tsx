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
              <strong>This is an early-stage experimental product.</strong> The accuracy and completeness 
              of data processing are not guaranteed. Errors may occur. This service provides a formatting 
              utility to generate lab-style reports from your Oura ring data. It is a data visualization 
              and summarization tool only. The service is provided "as is" without warranties of any kind, 
              and may contain errors, inaccuracies, or incomplete information.
            </p>
            <p className="text-gray-700 mt-2">
              <strong>AI and Automated Processing:</strong> Parts of this service may use automated or 
              AI-assisted methods for formatting and presentation. These systems do not provide verified 
              medical analysis. All calculations, formatting, and data presentation are automated and 
              have not been reviewed or verified by medical professionals.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Medical Disclaimer</h2>
            <p className="text-gray-700">
              <strong>IMPORTANT: Informational only. Not medical advice.</strong>
            </p>
            <p className="text-gray-700 mt-2">
              This service is for informational purposes only and does not constitute medical advice. 
              The reports generated are not medical advice, diagnosis, treatment recommendations, or 
              a substitute for professional medical care. Always consult with a qualified healthcare 
              provider for medical concerns, diagnosis, or treatment decisions.
            </p>
            <p className="text-gray-700 mt-2">
              We make no claims about the accuracy, completeness, reliability, or usefulness of the 
              data, metrics, calculations, or reports. The service is provided "as is" without 
              warranty of any kind, express or implied.
            </p>
            <p className="text-gray-700 mt-2">
              <strong>You should not rely on this service or its reports for any medical decisions.</strong> 
              The information presented may be incomplete, inaccurate, or outdated. No representations 
              are made regarding the accuracy, reliability, or completeness of any data or analysis.
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
              <li><strong>Independently verifying and validating all information</strong> presented in reports before making any health-related decisions</li>
              <li><strong>Interpreting and using the output at your own risk</strong> - you acknowledge that you are solely responsible for how you use or interpret any reports or data</li>
              <li>Seeking professional medical advice for any health concerns or questions</li>
              <li><strong>You understand and agree that the reports provided by this service are not intended for clinical or diagnostic use.</strong> You agree not to present or use these reports as medical documentation in any healthcare or insurance setting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by law, we shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of 
              the service.
            </p>
            <p className="text-gray-700 mt-2">
              <strong>Health Data Errors:</strong> We specifically disclaim all liability for 
              any errors, inaccuracies, omissions, or incomplete information in health data, 
              metrics, calculations, or reports. This includes, but is not limited to, errors 
              in sleep data, heart rate measurements, HRV values, activity metrics, SpO2 readings, 
              or any other health-related information. We are not responsible for any consequences 
              arising from reliance on inaccurate or incomplete data.
            </p>
            <p className="text-gray-700 mt-2">
              By using this service, you acknowledge and accept that the creators disclaim all 
              liability for any direct or indirect consequences, including but not limited to 
              health-related decisions, medical outcomes, or financial losses, arising from the 
              use or misuse of this service or its reports.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Usage Restrictions</h2>
            <p className="text-gray-700">
              This service is provided for <strong>personal, non-commercial use only</strong>. 
              You may not:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-2">
              <li>Use this service or its reports for any commercial purpose</li>
              <li>Resell, redistribute, or sublicense access to the service</li>
              <li>Use the service to provide medical or health advice to others</li>
              <li>Use the service in any way that violates applicable laws or regulations</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code</li>
            </ul>
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
