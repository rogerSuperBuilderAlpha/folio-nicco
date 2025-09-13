export function Features() {
  const features = [
    {
      icon: '🎬',
      title: 'Portfolio & Hosting',
      desc: 'High-quality video hosting with embeddable playback and a beautiful public portfolio that showcases your work professionally.',
    },
    {
      icon: '⭐',
      title: 'Industry-native Credits',
      desc: 'Treat videos as credentials with roles, collaborators, and verified history via call sheets and IMDb integration.',
    },
    {
      icon: '📊',
      title: 'Light CRM & Workflow',
      desc: 'Manage clients and projects with optional add-ons like contracts, invoicing, and payment tracking.',
    },
    {
      icon: '🔍',
      title: 'Smart Discovery',
      desc: 'Search and discover talent by role, camera, location, collaborators, and more with film-industry specific filters.',
    },
    {
      icon: '📈',
      title: 'Analytics & Insights',
      desc: 'Track video performance, portfolio views, and engagement metrics to understand your audience better.',
    },
    {
      icon: '🔒',
      title: 'Enterprise Security',
      desc: 'Bank-level security with signed playback URLs, DMCA protection, and compliance with industry standards.',
    },
  ]

  return (
    <section id="features" className="features-section" aria-labelledby="features-title">
      <div className="container">
        <div className="section-header">
          <h2 id="features-title" className="section-title">What makes Folio different</h2>
          <p className="section-subtitle">Everything you need to showcase your work and manage your film career in one platform</p>
        </div>
        <div className="features-grid">
          {features.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


