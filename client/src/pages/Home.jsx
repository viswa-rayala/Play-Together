import '../styles/Home.css'
import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-logo" aria-hidden="true">▶</div>

        <h1 className="home-title">PLAY TOGETHER</h1>
        <p className="home-tagline">Watch &amp; Listen Together — No Internet Required</p>

        <div className="home-buttons">
          <button
            id="btn-create-room"
            className="btn btn-primary home-btn"
            onClick={() => navigate('/create')}
          >
            🎬 Create Room
          </button>
          <button
            id="btn-join-room"
            className="btn btn-secondary home-btn"
            onClick={() => navigate('/join')}
          >
            🔗 Join Room
          </button>
        </div>

        <p className="home-note">📶 Works on the same local Wi-Fi or hotspot — no internet needed</p>
      </div>
    </div>
  )
}

export default Home
