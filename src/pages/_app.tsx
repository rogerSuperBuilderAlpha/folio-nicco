import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../contexts/AuthContext'
import { Layout } from '../components/Layout'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  }, [])

  // Pages that should not use the global layout (have their own custom layout)
  const noLayoutPages = ['/signin', '/signup', '/onboarding'];
  const useLayout = !noLayoutPages.includes(router.pathname);

  return (
    <AuthProvider>
      {useLayout ? (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      ) : (
        <Component {...pageProps} />
      )}
    </AuthProvider>
  )
}


