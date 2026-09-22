import '../styles/About.css'

function About() {
  return (
    <div className="about-container">
      <div className="about-content">
        <div className="about-header">
          <h1 className="about-title">About <span className="highlight-text">Play Together</span></h1>
          <p className="about-subtitle">Experience media in perfect sync.</p>
        </div>
        
        <div className="about-grid">
          <div className="about-card card-blue">
            <div className="card-icon">🚀</div>
            <h3>Real-time Sync</h3>
            <p>Watch videos and listen to music perfectly synced with your friends without relying on external servers.</p>
          </div>
          
          <div className="about-card card-pink">
            <div className="card-icon">📶</div>
            <h3>Local Network</h3>
            <p>Works seamlessly on your local Wi-Fi or hotspot. No internet required once the app is loaded.</p>
          </div>

          <div className="about-card card-yellow">
            <div className="card-icon">🔒</div>
            <h3>Private & Secure</h3>
            <p>Your media stays on your network. Play Together only coordinates the playback state.</p>
          </div>
        </div>

        <div className="about-footer">
          <h2>How it Works</h2>
          <p>
            One person creates a room and becomes the host. The host can upload media files. 
            Others join using the unique Room ID. When the host plays, pauses, or seeks, 
            everyone else's player instantly updates to match!
          </p>
        </div>
      </div>
    </div>
  )
}

export default About
