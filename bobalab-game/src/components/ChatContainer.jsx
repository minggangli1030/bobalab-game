import React, { useState } from 'react'
import './ChatContainer.css'

export default function ChatContainer() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello, I’m your AI assistant!' }
  ])
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg = { sender: 'user', text: input }
    setMessages(msgs => [...msgs, userMsg])
    setInput('')

    // Placeholder bot reply; replace with real API call
    const botReply = {
      sender: 'bot',
      text: '🦾 This is a placeholder. Hook up your OpenAI/Claude call here.'
    }
    setMessages(msgs => [...msgs, botReply])
  }

  return (
    <div className="chat-container">
      <h2>Chat with AI</h2>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.sender}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}