import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { logOut } from '../lib/auth';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function Layout({ children, showHeader = true, showFooter = true }: LayoutProps) {
  const { user, profile } = useAuth();

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showHeader && (
        <header className="topbar">
          <div className="topbar-container">
            <Link href="/" className="logo">
              <span className="logo-text">Folio</span>
            </Link>
            
            {user && profile ? (
              // Authenticated navigation
              <>
                <nav className="nav-desktop" aria-label="Main">
                  <ul className="nav-list">
                    <li><Link href="/dashboard" className="nav-link">Dashboard</Link></li>
                    <li><Link href={`/profile/${profile.handle}`} className="nav-link">My Profile</Link></li>
                    <li><Link href="/discover" className="nav-link">Discover</Link></li>
                  </ul>
                </nav>
                <div className="topbar-actions">
                  <Link href="/upload" className="btn btn--primary">Upload</Link>
                  <div className="user-menu">
                    <button className="user-menu-trigger">
                      <div className="user-avatar">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={profile.displayName} />
                        ) : (
                          <span>{profile.displayName?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    </button>
                    <div className="user-menu-dropdown">
                      <Link href={`/profile/${profile.handle}`} className="menu-item">
                        <span>👤</span> View Profile
                      </Link>
                      <Link href="/edit-profile" className="menu-item">
                        <span>⚙️</span> Settings
                      </Link>
                      <button onClick={handleLogout} className="menu-item menu-item--button">
                        <span>🚪</span> Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Public navigation
              <>
                <nav className="nav-desktop" aria-label="Main">
                  <ul className="nav-list">
                    <li><a className="nav-link" href="#features">Features</a></li>
                    <li><a className="nav-link" href="#pricing">Pricing</a></li>
                    <li><a className="nav-link" href="#demo">Demo</a></li>
                  </ul>
                </nav>
                <div className="topbar-actions">
                  <Link className="btn btn--ghost" href="/signin">Sign In</Link>
                  <Link className="btn btn--primary" href="/signup">Get Started</Link>
                </div>
              </>
            )}
          </div>
        </header>
      )}

      <main style={{ flex: 1 }}>
        {children}
      </main>

      {showFooter && (
        <footer className="footer">
          <div className="container">
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 'var(--space-6)', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <div>
                <Link href="/" className="logo" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                  <span className="logo-text">Folio</span>
                </Link>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 'var(--text-small-size)' }}>
                  Professional portfolios for film industry
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-6)' }}>
                <div>
                  <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-small-size)', fontWeight: 600 }}>
                    Product
                  </h4>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="#features" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        Features
                      </Link>
                    </li>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="#pricing" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        Pricing
                      </Link>
                    </li>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="/discover" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        Discover
                      </Link>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-small-size)', fontWeight: 600 }}>
                    Support
                  </h4>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="/help" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        Help Center
                      </Link>
                    </li>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="/contact" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        Contact
                      </Link>
                    </li>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="/feedback" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        Feedback
                      </Link>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-small-size)', fontWeight: 600 }}>
                    Legal
                  </h4>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="/privacy" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        Privacy
                      </Link>
                    </li>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="/terms" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        Terms
                      </Link>
                    </li>
                    <li style={{ marginBottom: 'var(--space-1)' }}>
                      <Link href="/dmca" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                        DMCA
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div style={{ 
              marginTop: 'var(--space-6)', 
              paddingTop: 'var(--space-4)', 
              borderTop: '1px solid var(--border-subtle)',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-small-size)'
            }}>
              © {new Date().getFullYear()} Folio. Built for film professionals.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
