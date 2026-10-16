# Contributing to Play Together 🤝

First off, thank you for considering contributing to **Play Together**! It's people like you that make open-source software such an incredible space to build, learn, and collaborate.

All types of contributions are welcome:
- 🐛 **Reporting bugs & edge-case sync issues**
- 💡 **Suggesting new features or enhancements**
- 🎨 **UI/UX improvements and responsive design tweaks**
- 📖 **Improving documentation, guides, or code comments**
- 🛠️ **Submitting Pull Requests with fixes and features**

---

## 🚀 Getting Started

1. **Fork the Repository** on GitHub:
   Visit [https://github.com/viswa-rayala/Play-Together](https://github.com/viswa-rayala/Play-Together) and click **Fork**.

2. **Clone your fork locally**:
   ```bash
   git clone https://github.com/<your-username>/Play-Together.git
   cd Play-Together
   ```

3. **Install all dependencies**:
   ```bash
   npm run install:all
   ```

4. **Start the local development environment**:
   ```bash
   npm run dev
   ```
   - Frontend runs at: `http://localhost:5173`
   - Backend API & WebSockets run at: `http://localhost:3000`

---

## 🛠️ Contribution Workflow

1. **Create a new branch**:
   Always branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```

2. **Make your changes**:
   - Write clean, readable code.
   - Maintain the existing architecture (`client/` for frontend, `server/` for backend, `database/` for schemas).
   - Test your changes locally across both desktop and mobile viewports.

3. **Verify the build**:
   Before committing, ensure the frontend builds cleanly without errors:
   ```bash
   npm run build
   ```

4. **Commit your changes**:
   Write clear, descriptive commit messages:
   ```bash
   git commit -m "feat(player): add volume memory across track changes"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**:
   Go to [https://github.com/viswa-rayala/Play-Together/pulls](https://github.com/viswa-rayala/Play-Together/pulls) and click **New Pull Request**. Fill out the PR template with a description of your changes.

---

## 💡 Ideas for Contributions

Looking for something to work on? Here are some features on our radar:
- [ ] **YouTube / External Video Stream Sync**: Support pasting a YouTube / Twitch / Vimeo link for synchronized streaming.
- [ ] **Room Passwords**: Allow hosts to set optional room PINs/passwords.
- [ ] **Reactions & Soundboard**: Allow participants to send floating emojis or quick sound reactions.
- [ ] **Persistent Cloud Storage**: Add optional adapters for Cloudflare R2 or AWS S3 for long-term media storage.
- [ ] **Dark / Light Theme Toggle**: User-selectable themes and accent colors.
- [ ] **PWA Support**: Offline app shell caching and install prompt.

---

## 📜 Code of Conduct

Please help us keep this project a welcoming, friendly, and harassment-free community for everyone regardless of background, identity, or experience level. Be respectful and constructive in issues, discussions, and code reviews.
