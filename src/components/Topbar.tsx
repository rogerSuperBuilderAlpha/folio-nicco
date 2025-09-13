import Link from 'next/link'

export function Topbar() {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-container">
        <Link href="/" aria-label="Folio home" className="logo">
          <span className="logo-text">Folio</span>
        </Link>
        <nav className="nav-desktop" aria-label="Primary">
          <ul className="nav-list">
            <li><a className="nav-link" href="#features">Features</a></li>
            <li><a className="nav-link" href="#pricing">Pricing</a></li>
            <li><a className="nav-link" href="#demo">Demo</a></li>
          </ul>
        </nav>
        <div className="topbar-actions">
          <Link className="btn btn--ghost" href="#demo">Watch demo</Link>
          <Link className="btn btn--primary" href="/signup">Get started</Link>
        </div>
      </div>
    </header>
  )
}


