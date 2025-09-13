import Head from 'next/head'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { ClientLogos } from '../components/ClientLogos'

export default function HomePage() {
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
              <p className="section-subtitle">Choose the plan that fits your needs. No hidden fees, cancel anytime.</p>
            </div>
            <div className="pricing-grid">
              <div className="pricing-card">
                <h3 className="pricing-title">Creator</h3>
                <div className="pricing-price">$15<span>/month</span></div>
                <ul className="pricing-features">
                  <li>10 videos</li>
                  <li>Basic portfolio</li>
                  <li>HD streaming</li>
                  <li>Email support</li>
                </ul>
                <button className="btn btn--secondary pricing-btn">Start free trial</button>
              </div>
              <div className="pricing-card pricing-card--featured">
                <div className="pricing-badge">Most Popular</div>
                <h3 className="pricing-title">Pro</h3>
                <div className="pricing-price">$39<span>/month</span></div>
                <ul className="pricing-features">
                  <li>Unlimited videos</li>
                  <li>Advanced portfolio</li>
                  <li>4K streaming</li>
                  <li>Credit automation</li>
                  <li>Analytics</li>
                  <li>Priority support</li>
                </ul>
                <button className="btn btn--primary pricing-btn">Start free trial</button>
              </div>
              <div className="pricing-card">
                <h3 className="pricing-title">Team</h3>
                <div className="pricing-price">$199<span>/month</span></div>
                <ul className="pricing-features">
                  <li>Everything in Pro</li>
                  <li>Team collaboration</li>
                  <li>Custom branding</li>
                  <li>API access</li>
                  <li>Dedicated support</li>
                </ul>
                <button className="btn btn--secondary pricing-btn">Contact sales</button>
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


