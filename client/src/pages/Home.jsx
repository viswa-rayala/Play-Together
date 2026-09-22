import '../styles/Home.css'
import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-wrapper">
      <main className="home-main">
        <div className="brand-section">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h1 className="brand-title">Play Together</h1>
          <p className="brand-subtitle">Watch and listen in sync. No internet required.</p>
        </div>

        <div className="action-section">
          <button
            className="btn-minimal btn-primary"
            onClick={() => navigate('/create')}
          >
            Create a Room
          </button>
          
          <button
            className="btn-minimal btn-outline"
            onClick={() => navigate('/join')}
          >
            Join a Room
          </button>
        </div>

        <footer className="home-footer">
          <p>Works seamlessly on your local network.</p>
        </footer>
      </main>
    </div>
  )
}

export default Home
