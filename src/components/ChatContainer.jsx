// src/components/ChatContainer.jsx - Updated with AI task assistance
import React, { useState, useEffect, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import "./ChatContainer.css";

export default function ChatContainer({
  bonusPrompts = 0,
  currentTask = "",
  categoryPoints = null,
  categoryMultipliers = null,
  starGoals = null,
  timeRemaining = null,
  calculateStudentLearning,
  onAIHelp,
}) {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm your AI teaching assistant. I can help with tasks! Try 'slider help', 'count help', or 'type help' to get direct assistance!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [aiUseCount, setAiUseCount] = useState({
    counting: 0,
    slider: 0,
    typing: 0,
  });

  // Store task targets when they change
  const [taskTargets, setTaskTargets] = useState({});

  // Listen for task target updates
  useEffect(() => {
    const handleTaskTarget = (event) => {
      setTaskTargets(prev => ({
        ...prev,
        [event.detail.taskId]: event.detail.target
      }));
    };

    window.addEventListener('taskTarget', handleTaskTarget);
    return () => window.removeEventListener('taskTarget', handleTaskTarget);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate AI help based on task type
  const generateAIHelp = (taskType) => {
    const taskNum = currentTask ? parseInt(currentTask.substring(3)) : 1;
    const game = currentTask ? currentTask.substring(0, 2) : null;
    
    // Track AI usage
    const useCount = aiUseCount[taskType] || 0;
    setAiUseCount(prev => ({ ...prev, [taskType]: useCount + 1 }));

    // AI gets worse over time (except typing which is always perfect)
    const degradationFactor = taskType === 'typing' ? 0 : Math.min(useCount * 0.1, 0.5);

    if (taskType === 'slider' && game === 'g2') {
      // Slider AI: 50% accurate, 50% off by 1
      const actualTarget = taskTargets[currentTask] || 5;
      const errorChance = Math.random() + degradationFactor;
      
      let aiTarget;
      if (errorChance < 0.5) {
        aiTarget = actualTarget;
        
        // Trigger AI help animation
        if (onAIHelp) {
          setTimeout(() => {
            onAIHelp({ type: 'slider', taskId: currentTask, value: aiTarget });
          }, 1000);
        }
        
        return `I'll help move the slider! Moving to ${aiTarget}... Watch the slider!`;
      } else {
        const offset = Math.random() < 0.5 ? -1 : 1;
        aiTarget = Math.max(0, Math.min(10, actualTarget + offset));
        
        // Trigger AI help animation with wrong value
        if (onAIHelp) {
          setTimeout(() => {
            onAIHelp({ type: 'slider', taskId: currentTask, value: aiTarget });
          }, 1000);
        }
        
        return `Let me move that slider to ${aiTarget} for you... There!`;
      }
    }
    
    if (taskType === 'counting' && game === 'g1') {
      // Counting AI: Shows answer but gets progressively worse
      const actualTarget = taskTargets[currentTask];
      const errorChance = Math.random() + degradationFactor;
      
      // Predefined error patterns for consistency
      const errorPatterns = {
        1: { actual: 12, errors: [11, 13, 14] },
        2: { actual: 8, errors: [7, 9, 6] },
        3: { actual: 15, errors: [14, 16, 13] },
        4: { actual: 10, errors: [9, 11, 12] },
        5: { actual: 18, errors: [17, 19, 20] },
      };
      
      const pattern = errorPatterns[(taskNum - 1) % 5 + 1] || { actual: 10, errors: [9, 11] };
      
      if (errorChance < 0.3) {
        // Highlight some instances
        if (onAIHelp) {
          setTimeout(() => {
            onAIHelp({ type: 'counting', taskId: currentTask, highlight: true });
          }, 500);
        }
        return `I count ${pattern.actual} occurrences. I've highlighted some to help you verify!`;
      } else {
        const wrongAnswer = pattern.errors[Math.floor(Math.random() * pattern.errors.length)];
        if (onAIHelp) {
          setTimeout(() => {
            onAIHelp({ type: 'counting', taskId: currentTask, highlight: true, partial: true });
          }, 500);
        }
        return `Hmm, I see ${wrongAnswer} occurrences. I highlighted what I found, but I might have missed some...`;
      }
    }
    
    if (taskType === 'typing' && game === 'g3') {
      // Typing AI: Always perfect (as per requirement)
      const pattern = taskTargets[currentTask] || "Type this pattern";
      
      if (onAIHelp) {
        setTimeout(() => {
          onAIHelp({ type: 'typing', taskId: currentTask, text: pattern });
        }, 500);
      }
      
      return `I'll type that for you: "${pattern}". Copying to your input now...`;
    }
    
    return "I'm not sure what task you're on. Make sure you're on a task and try again!";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMsg = { sender: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    const userInput = input.toLowerCase();
    setInput("");
    setIsTyping(true);

    // Check for AI help keywords
    let response = "";
    if (userInput.includes('slider') && userInput.includes('help')) {
      response = generateAIHelp('slider');
    } else if (userInput.includes('count') && userInput.includes('help')) {
      response = generateAIHelp('counting');
    } else if (userInput.includes('type') && userInput.includes('help')) {
      response = generateAIHelp('typing');
    } else if (userInput.includes('strategy') || userInput.includes('order')) {
      // Flow-level strategic advice
      response = getStrategicAdvice();
    } else {
      // Default helpful response
      response = getGeneralHelp();
    }

    // Log the interaction
    await eventTracker.trackChatInteraction(
      input,
      { text: response, type: 'ai_help' },
      messages.length,
      currentTask
    );

    // Simulate typing delay
    setTimeout(() => {
      setIsTyping(false);
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "bot",
          text: response,
        },
      ]);
    }, 500 + Math.random() * 1000);
  };

  const getStrategicAdvice = () => {
    const studentLearning = calculateStudentLearning ? calculateStudentLearning() : 0;
    
    if (!categoryPoints) {
      return "Complete some tasks first and I can give you strategic advice!";
    }
    
    if (categoryPoints.materials < 10) {
      return "Focus on Materials tasks first - they're the foundation of student learning! Research and Engagement multiply these base points.";
    } else if (categoryPoints.research < 4) {
      return "Consider doing some Research tasks now. Each point adds 5% to your Materials score. Early investment pays off!";
    } else if (categoryPoints.engagement < 4) {
      return "Don't forget Engagement! It adds 1% per point to everything. Small but compounds nicely.";
    } else {
      return "Good balance! Keep completing tasks. Remember: Materials × Research Multiplier × Engagement Multiplier = Student Learning!";
    }
  };

  const getGeneralHelp = () => {
    const tips = [
      "Try 'slider help', 'count help', or 'type help' for direct task assistance!",
      "Student Learning = Materials × (1 + Research×0.05) × (1 + Engagement×0.01)",
      "Complete tasks with 95%+ accuracy for 2 points, 70%+ for 1 point!",
      "Checkpoint at 10 minutes! Get 30+ Student Learning for bonus points!",
      "Research multiplies your Materials points - invest early!",
      "Engagement compounds everything - don't neglect it!",
      "I can help with tasks but I'm not always accurate (except typing - I'm perfect at that!)",
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  };

  return (
    <div className="chat-container-sidebar">
      {/* Header */}
      <div className="chat-header">
        <h3>AI Teaching Assistant</h3>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
          Unlimited help (reliability varies by task)
        </div>
      </div>

      {/* Messages */}
      <div className="messages-sidebar">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.sender}`}>
            <div className="message-content">
              <strong>
                {m.sender === "user" ? "You" : "AI Assistant"}:
              </strong>
              <span>{m.text}</span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot">
            <div className="message-content">
              <strong>AI Assistant:</strong>
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
          placeholder="Ask for help... (try 'slider help')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}// src/components/ChatContainer.jsx - Updated with AI task assistance
import React, { useState, useEffect, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import "./ChatContainer.css";

export default function ChatContainer({
  bonusPrompts = 0,
  currentTask = "",
  categoryPoints = null,
  categoryMultipliers = null,
  starGoals = null,
  timeRemaining = null,
}) {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm your AI teaching assistant. I can help with slider, counting, and typing tasks. Try asking 'slider help', 'count help', or 'type help'!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [aiUseCount, setAiUseCount] = useState({
    counting: 0,
    slider: 0,
    typing: 0,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate AI help based on task type
  const generateAIHelp = (taskType) => {
    const taskNum = currentTask ? parseInt(currentTask.substring(3)) : 1;
    const game = currentTask ? currentTask.substring(0, 2) : null;
    
    // Track AI usage
    const useCount = aiUseCount[taskType] || 0;
    setAiUseCount(prev => ({ ...prev, [taskType]: useCount + 1 }));

    // AI gets worse over time (except typing which is always perfect)
    const degradationFactor = taskType === 'typing' ? 0 : Math.min(useCount * 0.1, 0.5);

    if (taskType === 'slider' && game === 'g2') {
      // Slider AI: 50% accurate, 50% off by 1
      const actualTarget = getSliderTarget(); // You'll need to implement this
      const errorChance = Math.random() + degradationFactor;
      
      if (errorChance < 0.5) {
        return `I'll help! Try moving the slider to ${actualTarget}. Start from 0 and drag slowly.`;
      } else {
        const offset = Math.random() < 0.5 ? -1 : 1;
        const wrongTarget = Math.max(0, Math.min(10, actualTarget + offset));
        return `I think you should move the slider to ${wrongTarget}. Hold and drag from 0!`;
      }
    }
    
    if (taskType === 'counting' && game === 'g1') {
      // Counting AI: Gets progressively worse
      const patterns = [
        { correct: 12, wrong: [11, 13, 10] }, // Example counts
        { correct: 8, wrong: [7, 9, 6] },
        { correct: 15, wrong: [14, 16, 13] },
      ];
      
      const pattern = patterns[taskNum % patterns.length];
      const errorChance = Math.random() + degradationFactor;
      
      if (errorChance < 0.3) {
        return `I count ${pattern.correct} occurrences. Some words are highlighted to help you verify!`;
      } else {
        const wrongAnswer = pattern.wrong[Math.floor(Math.random() * pattern.wrong.length)];
        return `Hmm, I see ${wrongAnswer} occurrences. Check the highlighted words carefully!`;
      }
    }
    
    if (taskType === 'typing' && game === 'g3') {
      // Typing AI: Always perfect (as per requirement)
      const pattern = getTypingPattern(); // You'll need to implement this
      return `Here's the exact pattern: "${pattern}". Just copy it exactly!`;
    }
    
    return "I'm not sure what task you're on. Try being more specific!";
  };

  // Get current task targets (these need to be passed from parent or stored)
  const getSliderTarget = () => {
    // This should get the actual target from the current SliderTask
    // For now, returning a placeholder
    return 5;
  };

  const getTypingPattern = () => {
    // This should get the actual pattern from the current TypingTask
    // For now, returning a placeholder
    return "Type this pattern";
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMsg = { sender: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    const userInput = input.toLowerCase();
    setInput("");
    setIsTyping(true);

    // Check for AI help keywords
    let response = "";
    if (userInput.includes('slider') && userInput.includes('help')) {
      response = generateAIHelp('slider');
    } else if (userInput.includes('count') && userInput.includes('help')) {
      response = generateAIHelp('counting');
    } else if (userInput.includes('type') && userInput.includes('help')) {
      response = generateAIHelp('typing');
    } else if (userInput.includes('strategy') || userInput.includes('order')) {
      // Flow-level strategic advice
      response = getStrategicAdvice();
    } else {
      // Default helpful response
      response = getGeneralHelp();
    }

    // Log the interaction
    await eventTracker.trackChatInteraction(
      input,
      { text: response, type: 'ai_help' },
      messages.length,
      currentTask
    );

    // Simulate typing delay
    setTimeout(() => {
      setIsTyping(false);
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "bot",
          text: response,
        },
      ]);
    }, 500 + Math.random() * 1000);
  };

  const getStrategicAdvice = () => {
    const studentLearning = calculateStudentLearning();
    
    if (categoryPoints.materials < 10) {
      return "Focus on Materials tasks first - they're the foundation of student learning! Research and Engagement multiply these base points.";
    } else if (categoryPoints.research < 4) {
      return "Consider doing some Research tasks now. Each point adds 5% to your Materials score. Early investment pays off!";
    } else if (categoryPoints.engagement < 4) {
      return "Don't forget Engagement! It adds 1% per point to everything. Small but compounds nicely.";
    } else {
      return "Good balance! Keep completing tasks. Remember: Materials × Research Multiplier × Engagement Multiplier = Student Learning!";
    }
  };

  const getGeneralHelp = () => {
    const tips = [
      "Try 'slider help', 'count help', or 'type help' for task-specific assistance!",
      "Student Learning = Materials × (1 + Research×0.05) × (1 + Engagement×0.01)",
      "Complete tasks with 95%+ accuracy for 2 points, 70%+ for 1 point!",
      "Checkpoint at 10 minutes! Get 30+ Student Learning for bonus points!",
      "Research multiplies your Materials points - invest early!",
      "Engagement compounds everything - don't neglect it!",
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  };

  const calculateStudentLearning = () => {
    if (!categoryPoints) return 0;
    const materials = categoryPoints.materials || 0;
    const researchMult = 1 + (categoryPoints.research || 0) * 0.05;
    const engagementMult = 1 + (categoryPoints.engagement || 0) * 0.01;
    return materials * researchMult * engagementMult;
  };

  return (
    <div className="chat-container-sidebar">
      {/* Header */}
      <div className="chat-header">
        <h3>AI Teaching Assistant</h3>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
          Unlimited help available! (reliability may vary)
        </div>
      </div>

      {/* Messages */}
      <div className="messages-sidebar">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.sender}`}>
            <div className="message-content">
              <strong>
                {m.sender === "user" ? "You" : "AI Assistant"}:
              </strong>
              <span>{m.text}</span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot">
            <div className="message-content">
              <strong>AI Assistant:</strong>
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
          placeholder="Ask for help... (try 'slider help')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}