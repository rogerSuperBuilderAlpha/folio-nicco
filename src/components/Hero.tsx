import Link from 'next/link'

export function Hero() {
  return (
    <section className="hero" aria-labelledby="home-hero-title">
      <div className="container">
        <div className="hero-content">
          <div className="hero-eyebrow">Built for film professionals</div>
          <h1 id="home-hero-title" className="hero-title">Your videos, beautifully presented.</h1>
          <p className="hero-subtitle">Upload once. Share anywhere. Track what matters. Folio combines premium video hosting with industry-native credits and light CRM—so you can focus on the work.</p>
          <div className="hero-actions">
            <Link href="/signup" className="btn btn--primary btn--large">Start free trial</Link>
            <Link href="#demo" className="btn btn--secondary btn--large">Watch demo</Link>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">10k+</div>
              <div className="stat-label">Videos hosted</div>
            </div>
            <div className="stat">
              <div className="stat-number">500+</div>
              <div className="stat-label">Professionals</div>
            </div>
            <div className="stat">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


