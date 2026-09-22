import { Link, useLocation } from 'react-router-dom'
import '../styles/Header.css'

function Header() {
  const location = useLocation()

  return (
    <header className="header-container">
      <div className="header-content">
        <Link to="/" className="header-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" className="header-icon">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="header-title">Play Together</span>
        </Link>
        
        <nav className="header-nav">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header
