import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Simple Wearable Report',
  description: 'Transform your Oura ring data into clinical lab-style health reports',
  metadataBase: new URL('https://simplewearablereport.com'),
  openGraph: {
    title: 'Simple Wearable Report',
    description: 'Clinical lab-style health reports from your Oura ring',
    url: 'https://simplewearablereport.com',
    siteName: 'Simple Wearable Report',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
