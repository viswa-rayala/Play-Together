import '../styles/Footer.css'

function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <p className="footer-text">
          &copy; {new Date().getFullYear()} Play Together. Built for seamless media sharing.
        </p>
        <div className="footer-links">
          <a href="#" className="footer-link">GitHub</a>
          <a href="#" className="footer-link">Twitter</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
