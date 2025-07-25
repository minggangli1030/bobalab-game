// src/components/ChatContainer.jsx - Updated with preset response system
import React, { useState, useEffect, useRef } from 'react';
import { eventTracker } from '../utils/eventTracker';
import './ChatContainer.css';

export default function ChatContainer({ bonusPrompts = 0, currentTask = '' }) {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I\'m here to help with your tasks. Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const responseDataRef = useRef(null);
  const messagesEndRef = useRef(null);

  const totalPrompts = 3 + bonusPrompts;
  const remainingPrompts = totalPrompts - promptsUsed;

  // Load response data on mount
  useEffect(() => {
    loadResponseData();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadResponseData = async () => {
    try {
      // Try local first, then GitHub
      let response = await fetch('/data/chat-responses.json');
      
      if (!response.ok) {
        // Fallback to GitHub raw content (update with your repo URL)
        response = await fetch('https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/public/data/chat-responses.json');
      }
      
      if (!response.ok) {
        throw new Error('Failed to load response data');
      }
      
      responseDataRef.current = await response.json();
      console.log('Loaded response data:', responseDataRef.current.metadata);
    } catch (error) {
      console.error('Error loading response data:', error);
      // Fallback to embedded minimal responses
      responseDataRef.current = {
        responses: {
          counting: {
            workflow: {
              make_for_me: [{
                id: 'fallback-1',
                response: 'Count systematically from left to right. Tasks affect each other - try different orders!',
                triggers: ['how', 'count', 'strategy']
              }]
            },
            task: {
              find_for_me: [{
                id: 'fallback-2',
                response: 'Count every occurrence. Case-insensitive for letters, exact match for words.',
                triggers: ['what', 'rule', 'case']
              }]
            }
          },
          slider: {
            task: {
              find_for_me: [{
                id: 'fallback-3',
                response: 'Move the slider to match the target value. Easy=integers, Medium=1 decimal, Hard=2 decimals+hidden.',
                triggers: ['how', 'work', 'slider']
              }]
            }
          },
          typing: {
            task: {
              find_for_me: [{
                id: 'fallback-4',
                response: 'Type exactly as shown. Every character, space, and symbol must match.',
                triggers: ['type', 'exact', 'pattern']
              }]
            }
          }
        },
        general: {
          navigation: [{
            id: 'fallback-5',
            response: 'Complete tasks in any order. Each gives +1 prompt. Task order affects difficulty!',
            triggers: ['order', 'switch', 'navigate']
          }]
        },
        fallback: [{
          id: 'fallback-default',
          response: 'Ask about counting, slider, or typing tasks. Task order matters - experiment!',
          triggers: []
        }]
      };
    }
  };

  const findBestResponse = (userInput) => {
    if (!responseDataRef.current) {
      return { 
        response: 'Still loading... Please try again in a moment.', 
        metadata: { id: 'loading', level: 'Task-level', type: 'Find for me' }
      };
    }

    const input = userInput.toLowerCase().trim();
    const matches = [];

    // Determine current game type
    const gameType = currentTask ? 
      (currentTask.startsWith('g1') ? 'counting' : 
       currentTask.startsWith('g2') ? 'slider' : 
       currentTask.startsWith('g3') ? 'typing' : null) : null;

    console.log('Finding response for:', input, 'Current game:', gameType);

    // Search in current game responses first (higher weight)
    if (gameType && responseDataRef.current.responses && responseDataRef.current.responses[gameType]) {
      searchResponses(responseDataRef.current.responses[gameType], input, matches, 2.0);
    }

    // Search in general responses
    if (responseDataRef.current.general) {
      searchGeneralResponses(responseDataRef.current.general, input, matches, 1.0);
    }

    // Search in other game responses (lower weight)
    if (responseDataRef.current.responses) {
      Object.keys(responseDataRef.current.responses).forEach(game => {
        if (game !== gameType) {
          searchResponses(responseDataRef.current.responses[game], input, matches, 0.5);
        }
      });
    }

    console.log('Found matches:', matches.length, matches);

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    // If we have good matches, select based on score
    if (matches.length > 0 && matches[0].score > 0.3) {
      // Get all top-scoring matches
      const topScore = matches[0].score;
      const topMatches = matches.filter(m => m.score === topScore);
      
      // Randomly select from top matches
      const selected = topMatches[Math.floor(Math.random() * topMatches.length)];
      
      return {
        response: selected.response.response,
        metadata: {
          id: selected.response.id,
          level: selected.level || 'Task-level',
          type: selected.type || 'Find for me',
          triggers: selected.matchedTriggers,
          score: selected.score
        }
      };
    }

    // Return random fallback
    const fallbacks = responseDataRef.current.fallback || [];
    const fallback = fallbacks.length > 0 ? 
      fallbacks[Math.floor(Math.random() * fallbacks.length)] :
      { response: 'Ask about counting, slider, or typing tasks. Task order matters!', id: 'default-fallback' };
    
    return {
      response: fallback.response,
      metadata: {
        id: fallback.id,
        level: 'Task-level',
        type: 'Iterate with me',
        context: fallback.context || 'fallback'
      }
    };
  };

  const searchResponses = (gameResponses, input, matches, weight) => {
    // Search both workflow and task level
    ['workflow', 'task'].forEach(level => {
      if (!gameResponses[level]) return;
      
      // Search all 4 categories
      ['make_for_me', 'find_for_me', 'jumpstart_for_me', 'iterate_with_me'].forEach(type => {
        if (!gameResponses[level][type]) return;
        
        gameResponses[level][type].forEach(response => {
          const { score, matchedTriggers } = calculateTriggerScore(response.triggers, input);
          
          if (score > 0) {
            matches.push({
              response: response,
              score: score * weight * (response.priority || 1),
              level: level === 'workflow' ? 'Workflow-level' : 'Task-level',
              type: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              matchedTriggers: matchedTriggers
            });
          }
        });
      });
    });
  };

  const searchGeneralResponses = (generalResponses, input, matches, weight) => {
    Object.keys(generalResponses).forEach(category => {
      if (Array.isArray(generalResponses[category])) {
        generalResponses[category].forEach(response => {
          const { score, matchedTriggers } = calculateTriggerScore(response.triggers, input);
          
          if (score > 0) {
            matches.push({
              response: response,
              score: score * weight * (response.priority || 1),
              level: 'Workflow-level',
              type: 'Find for me',
              matchedTriggers: matchedTriggers
            });
          }
        });
      }
    });
  };

  const calculateTriggerScore = (triggers, input) => {
    if (!triggers || triggers.length === 0) return { score: 0, matchedTriggers: [] };
    
    let totalScore = 0;
    const matchedTriggers = [];
    
    triggers.forEach(trigger => {
      // Count occurrences of trigger in input
      const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
      const matches = input.match(regex);
      
      if (matches) {
        // Score based on trigger length and frequency
        const triggerScore = (trigger.length / input.length) * matches.length;
        totalScore += triggerScore;
        matchedTriggers.push({ trigger, count: matches.length });
      }
    });
    
    return { score: totalScore, matchedTriggers };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    if (remainingPrompts <= 0) {
      setMessages(msgs => [...msgs, {
        sender: 'system',
        text: '⚠️ No prompts remaining. Complete more tasks to earn additional prompts!'
      }]);
      return;
    }

    // Add user message
    const userMsg = { sender: 'user', text: input };
    setMessages(msgs => [...msgs, userMsg]);
    const userInput = input; // Store input before clearing
    setInput('');
    setPromptsUsed(prev => prev + 1);
    setIsTyping(true);

    // Small delay to ensure response data is loaded
    setTimeout(async () => {
      // Find best response
      const { response, metadata } = findBestResponse(userInput);
      
      // Log the interaction
      await eventTracker.trackChatInteraction(
        userInput,
        { 
          text: response, 
          ...metadata 
        },
        promptsUsed + 1,
        currentTask
      );

      // Simulate typing delay
      setTimeout(() => {
        setIsTyping(false);
        setMessages(msgs => [...msgs, {
          sender: 'bot',
          text: response,
          metadata: metadata
        }]);
      }, 500 + Math.random() * 500);
    }, 100);
  };

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
        {isTyping && (
          <div className="message bot">
            <div className="message-content">
              <strong>AI:</strong>
              <span className="typing-indicator">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
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
  );
}