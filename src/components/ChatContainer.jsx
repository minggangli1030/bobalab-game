// src/components/ChatContainer.jsx - Updated for sidebar layout
import React, { useState } from 'react'
import './ChatContainer.css'

export default function ChatContainer({ bonusPrompts = 0, currentTask = '' }) {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I\'m here to help with your tasks. Ask me anything!' }
  ])
  const [input, setInput] = useState('')
  const [promptsUsed, setPromptsUsed] = useState(0)

  const totalPrompts = 3 + bonusPrompts
  const remainingPrompts = totalPrompts - promptsUsed

  const handleSend = () => {
    if (!input.trim()) return
    
    if (remainingPrompts <= 0) {
      setMessages(msgs => [...msgs, {
        sender: 'system',
        text: '⚠️ No prompts remaining. Complete more tasks to earn additional prompts!'
      }])
      return
    }

    const userMsg = { sender: 'user', text: input }
    setMessages(msgs => [...msgs, userMsg])
    setInput('')
    setPromptsUsed(prev => prev + 1)

    // Placeholder bot reply; replace with real API call
    const botReply = {
      sender: 'bot',
      text: '🤖 This is a placeholder response. In the real game, I would provide helpful hints about your current task!'
    }
    
    setTimeout(() => {
      setMessages(msgs => [...msgs, botReply])
    }, 1000)
  }

  return (
    <div className="chat-container-sidebar">
      {/* Header */}
      <div className="chat-header">
        <h3>AI Assistant</h3>
        <div className="prompt-counter">
          {remainingPrompts} prompts left
        </div>
      </div>
      
      {/* Messages */}
      <div className="messages-sidebar">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.sender}`}>
            <div className="message-content">
              <strong>{m.sender === 'user' ? 'You' : m.sender === 'bot' ? 'AI' : 'System'}:</strong>
              <span>{m.text}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Input */}
      <div className="chat-input-sidebar">
        <input
          type="text"
          placeholder={remainingPrompts > 0 ? "Ask for help..." : "No prompts left"}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={remainingPrompts <= 0}
        />
        <button 
          onClick={handleSend}
          disabled={remainingPrompts <= 0 || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}