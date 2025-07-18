import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import Head from 'next/head'

// Global types for Web3
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function App({ Component, pageProps }: AppProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Prevent hydration mismatch by only rendering on client
  if (!isClient) {
    return null
  }

  return (
    <>
      <Head>
        <title>Morpho RWA Liquidity Hub</title>
        <meta name="description" content="Borrow USDC against Real World Assets using Morpho Blue" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph meta tags */}
        <meta property="og:title" content="Morpho RWA Liquidity Hub" />
        <meta property="og:description" content="Instant liquidity for Real World Assets" />
        <meta property="og:type" content="website" />
        
        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Inter font */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Component {...pageProps} />
      </div>
    </>
  )
}