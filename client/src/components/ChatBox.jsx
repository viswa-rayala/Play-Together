import { useEffect, useRef, useState } from 'react'
import '../styles/ChatBox.css'

function ChatBox({ messages, onSend }) {
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (event) => {
    event.preventDefault()
    const message = draft.trim()
    if (!message) return
    onSend?.(message)
    setDraft('')
  }

  return (
    <section className="chat-box" aria-label="Room chat">
      <div className="chat-header">
        <div>
          <h2>Room chat</h2>
          <span>{messages.length} messages</span>
        </div>
        <span className="chat-live-dot" aria-label="Chat connected" />
      </div>

      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">Start the conversation.</p>
        ) : (
          messages.map((item) => (
            <p className="chat-message" key={item.id}>
              <strong>{item.name}:</strong> {item.message}
            </p>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message..."
          maxLength={500}
          aria-label="Chat message"
          autoComplete="off"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Send message">
          Send
        </button>
      </form>
    </section>
  )
}

export default ChatBox
