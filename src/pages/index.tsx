import Head from 'next/head'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { ClientLogos } from '../components/ClientLogos'

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleSubscribe = async () => {
    if (!user) {
      // Redirect to sign in if not authenticated
      window.location.href = '/signin?redirect=subscribe'
      return
    }

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <Head>
        <title>Folio — Your videos, beautifully presented</title>
        <meta name="description" content="Folio merges premium video hosting with industry-native credits and light CRM for film professionals." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Hero />
      <ClientLogos />
      <Features />
      <section id="pricing" className="pricing-section">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Simple, transparent pricing</h2>
              <p className="section-subtitle">Everything you need to showcase your work professionally. Cancel anytime.</p>
            </div>
            <div className="pricing-grid" style={{ justifyContent: 'center' }}>
              <div className="pricing-card pricing-card--featured" style={{ maxWidth: '400px' }}>
                <div className="pricing-badge">Professional Plan</div>
                <h3 className="pricing-title">Folio Pro</h3>
                <div className="pricing-price">$50<span>/month</span></div>
                <ul className="pricing-features">
                  <li>Unlimited video uploads</li>
                  <li>Professional portfolio</li>
                  <li>4K streaming quality</li>
                  <li>Automatic credit detection</li>
                  <li>Advanced analytics</li>
                  <li>Custom branding</li>
                  <li>Priority support</li>
                  <li>Collaboration tools</li>
                </ul>
                <button 
                  className="btn btn--primary pricing-btn" 
                  onClick={handleSubscribe}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Subscribe Now'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="demo-section">
          <div className="container">
            <div className="demo-content">
              <div className="demo-text">
                <h2 className="section-title">See Folio in action</h2>
                <p className="section-subtitle">Watch how easy it is to upload, organize, and share your work with industry professionals.</p>
                <div className="demo-features">
                  <div className="demo-feature">
                    <span className="demo-icon">⚡</span>
                    <span>Lightning-fast uploads</span>
                  </div>
                  <div className="demo-feature">
                    <span className="demo-icon">🎯</span>
                    <span>Automatic credit detection</span>
                  </div>
                  <div className="demo-feature">
                    <span className="demo-icon">📱</span>
                    <span>Beautiful on any device</span>
                  </div>
                </div>
                <button className="btn btn--primary btn--large">Watch 3-minute demo</button>
              </div>
              <div className="demo-video">
                <div className="video-placeholder">
                  <div className="play-button">▶</div>
                  <span>Demo Video</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="signup" className="cta-section">
          <div className="container">
            <div className="cta-content">
              <h2 className="cta-title">Ready to showcase your work?</h2>
              <p className="cta-subtitle">Join hundreds of film professionals already using Folio to grow their careers.</p>
              <div className="cta-actions">
                <button className="btn btn--primary btn--large">Start free trial</button>
                <button className="btn btn--ghost btn--large">Schedule a demo</button>
              </div>
              <p className="cta-note">14-day free trial • No credit card required • Cancel anytime</p>
            </div>
          </div>
        </section>
    </>
  )
}


