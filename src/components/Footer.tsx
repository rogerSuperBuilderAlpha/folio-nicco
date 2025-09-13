import Link from 'next/link'

export function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'var(--text-secondary)' }}>© {new Date().getFullYear()} Folio</div>
        <nav aria-label="Footer">
          <ul style={{ display: 'flex', gap: '16px', listStyle: 'none', margin: 0, padding: 0 }}>
            <li><Link href="#support">Support</Link></li>
            <li><Link href="#security">Security</Link></li>
            <li><Link href="#privacy">Privacy</Link></li>
            <li><Link href="#terms">Terms</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}


