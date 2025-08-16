// src/components/ChatContainer.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import "./ChatContainer.css";

// AI Task Helper Class with FIXED logic
class AITaskHelper {
  constructor() {
    this.usageCount = {
      materials: 0,
      research: 0,
      engagement: 0,
    };

    this.vagueResponses = [
      "I've analyzed the task and provided assistance!",
      "My calculations are complete!",
      "I've done my best to help!",
      "Task assistance delivered!",
      "Here's what I came up with!",
      "Analysis complete!",
      "I hope this helps!",
      "Processed and ready!",
    ];
  }

  getVagueResponse() {
    return this.vagueResponses[
      Math.floor(Math.random() * this.vagueResponses.length)
    ];
  }

  helpWithSlider(targetValue) {
    this.usageCount.materials++;
    const accuracy = Math.max(0.3, 0.5 - (this.usageCount.materials - 1) * 0.1);

    let suggestedValue;
    if (Math.random() < accuracy) {
      suggestedValue = targetValue;
    } else {
      const error =
        (Math.random() < 0.5 ? -1 : 1) *
        (this.usageCount.materials > 3 ? 2 : 1);
      suggestedValue = Math.max(0, Math.min(10, targetValue + error));
    }

    return {
      action: "moveSlider",
      value: suggestedValue,
      animate: true,
      message: this.getVagueResponse(),
    };
  }

  helpWithCounting(text, targetPattern) {
    this.usageCount.research++;
    const accuracy = Math.max(0.2, 0.6 - (this.usageCount.research - 1) * 0.1);

    // Parse the text properly
    const words = text.split(/\s+/);
    const highlightWords = [];
    let aiCount = 0;

    // Find matches with some errors
    words.forEach((word) => {
      const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
      const shouldBeHighlighted = cleanWord === targetPattern.toLowerCase();

      if (shouldBeHighlighted) {
        if (Math.random() < accuracy) {
          highlightWords.push(word);
          aiCount++;
        }
      } else {
        if (Math.random() < (1 - accuracy) * 0.2) {
          highlightWords.push(word);
          aiCount++;
        }
      }
    });

    // Add counting error
    if (Math.random() < 0.3) {
      aiCount += Math.random() < 0.5 ? 1 : -1;
      aiCount = Math.max(0, aiCount);
    }

    return {
      action: "highlightAndCount",
      highlightWords: highlightWords,
      suggestedCount: aiCount,
      message: this.getVagueResponse(),
    };
  }

  helpWithTyping(pattern) {
    this.usageCount.engagement++;

    // ALWAYS return the exact pattern (perfect for typing)
    return {
      action: "autoType",
      text: pattern,
      typeSpeed: 50,
      message: this.getVagueResponse(),
      perfect: true,
    };
  }
}

const aiTaskHelper = new AITaskHelper();

export default function ChatContainer({
  bonusPrompts = 0,
  currentTask = "",
  categoryPoints = null,
  timeRemaining = null,
  calculateStudentLearning = () => 0,
}) {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm your AI teaching assistant. Click the help buttons below for task assistance!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastHelpTime, setLastHelpTime] = useState({
    materials: 0,
    research: 0,
    engagement: 0,
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Determine current game type
  const getCurrentGameType = () => {
    if (!currentTask) return null;
    if (currentTask.startsWith("g1")) return "research";
    if (currentTask.startsWith("g2")) return "materials";
    if (currentTask.startsWith("g3")) return "engagement";
    return null;
  };

  // Smart help function that detects current task
  const handleSmartHelp = (type = null) => {
    const gameType = type || getCurrentGameType();

    if (!gameType) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Please start a task first, then I can help you!",
        },
      ]);
      return;
    }

    // Rate limiting (3 seconds between helps)
    const now = Date.now();
    if (now - lastHelpTime[gameType] < 3000) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Please wait a moment before requesting help again!",
        },
      ]);
      return;
    }
    setLastHelpTime((prev) => ({ ...prev, [gameType]: now }));

    switch (gameType) {
      case "materials":
        handleSliderHelp();
        break;
      case "research":
        handleCountingHelp();
        break;
      case "engagement":
        handleTypingHelp();
        break;
      default:
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "I'm not sure which task you're on. Please try again!",
          },
        ]);
    }
  };

  // Handler for slider help (Materials)
  const handleSliderHelp = () => {
    const sliderTarget =
      document
        .querySelector("[data-target-value]")
        ?.getAttribute("data-target-value") ||
      document.querySelector(".target-value")?.textContent ||
      5;

    const help = aiTaskHelper.helpWithSlider(parseFloat(sliderTarget));

    window.dispatchEvent(
      new CustomEvent("aiSliderHelp", {
        detail: help,
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: `📊 Materials Help: ${help.message}`,
      },
    ]);
  };

  // Handler for counting help (Research) - FIXED
  const handleCountingHelp = () => {
    const textElement = document.querySelector(".text-to-count");
    const patternElement = document.querySelector(".count-target");

    if (textElement && patternElement) {
      const text = textElement.getAttribute("data-counting-text") || "";
      const pattern =
        patternElement
          .getAttribute("data-pattern")
          ?.replace(/['"]/g, "")
          .trim() || "";

      const help = aiTaskHelper.helpWithCounting(text, pattern);

      // Dispatch the event for the counting component to handle
      window.dispatchEvent(
        new CustomEvent("aiCountingHelp", {
          detail: help,
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `🔬 Research Help: ${help.message}`,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Please navigate to the research tab first!",
        },
      ]);
    }
  };

  // Handler for typing help (Engagement) - FIXED
  const handleTypingHelp = () => {
    const patternElement = document.querySelector("[data-typing-pattern]");

    if (patternElement) {
      const pattern = patternElement.getAttribute("data-typing-pattern");

      if (pattern) {
        const help = aiTaskHelper.helpWithTyping(pattern);

        window.dispatchEvent(
          new CustomEvent("aiTypingHelp", {
            detail: help,
          })
        );

        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `✉️ Engagement Help: ${help.message}`,
          },
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Please navigate to the engagement tab first!",
        },
      ]);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.toLowerCase().trim();
    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let response = "";

      // Check for text-based help commands (backward compatibility)
      if (userMessage.includes("help")) {
        if (
          userMessage.includes("material") ||
          userMessage.includes("slider")
        ) {
          handleSmartHelp("materials");
          setIsTyping(false);
          return;
        } else if (
          userMessage.includes("research") ||
          userMessage.includes("count")
        ) {
          handleSmartHelp("research");
          setIsTyping(false);
          return;
        } else if (
          userMessage.includes("engagement") ||
          userMessage.includes("typ")
        ) {
          handleSmartHelp("engagement");
          setIsTyping(false);
          return;
        } else {
          response = "Click the help buttons below for task assistance!";
        }
      } else if (userMessage.includes("strategy")) {
        response =
          "Pro tip: Research multiplies your materials by 5% per point! Build materials first, then amplify with research. Engagement adds 1% to everything!";
      } else if (userMessage.includes("order")) {
        response =
          "Strategic order: Materials → Research → Engagement. This maximizes your multipliers!";
      } else {
        const genericResponses = [
          "Keep pushing! You're doing great!",
          "Remember: Materials × Research × Engagement = Success!",
          "Focus on accuracy for those 2-point rewards!",
          "The checkpoint at minute 10 can give huge bonuses!",
          "Try the help buttons below for task assistance!",
        ];
        response =
          genericResponses[Math.floor(Math.random() * genericResponses.length)];
      }

      setMessages((prev) => [...prev, { sender: "bot", text: response }]);
      setIsTyping(false);
    }, 800);
  };

  const currentGameType = getCurrentGameType();

  return (
    <div className="chat-container-sidebar">
      <div className="chat-header">
        <h3>AI Teaching Assistant</h3>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
          Unlimited help (reliability varies by task)
        </div>

        {/* Student Learning Score Display */}
        <div
          style={{
            marginTop: "10px",
            padding: "8px",
            background: "#e3f2fd",
            borderRadius: "6px",
            border: "1px solid #2196F3",
          }}
        >
          <div
            style={{ fontSize: "12px", color: "#1976d2", fontWeight: "bold" }}
          >
            Student Learning: {Math.round(calculateStudentLearning())} pts
          </div>
          <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
            {categoryPoints && (
              <>
                M:{categoryPoints.materials} × R:
                {(1 + (categoryPoints.research || 0) * 0.05).toFixed(2)} × E:
                {(1 + (categoryPoints.engagement || 0) * 0.01).toFixed(2)}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="messages-sidebar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="message-sender">
              {msg.sender === "user" ? "You" : "AI"}:
            </div>
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot">
            <div className="message-sender">AI:</div>
            <div className="message-text typing">...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* SMART HELP BUTTONS */}
      <div
        style={{
          padding: "15px",
          borderTop: "1px solid #e0e0e0",
          background: "#f8f9fa",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          {/* Smart Auto-Detect Button */}
          <button
            onClick={() => handleSmartHelp()}
            disabled={!currentGameType}
            style={{
              gridColumn: "1 / -1",
              padding: "12px",
              background: currentGameType ? "#2196F3" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: currentGameType ? "pointer" : "not-allowed",
              fontWeight: "bold",
              fontSize: "14px",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              if (currentGameType) {
                e.currentTarget.style.background = "#1976d2";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentGameType) {
                e.currentTarget.style.background = "#2196F3";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            <span style={{ fontSize: "18px" }}>🤖</span>
            {currentGameType
              ? `Help with Current Task (${
                  currentGameType === "materials"
                    ? "Materials"
                    : currentGameType === "research"
                    ? "Research"
                    : "Engagement"
                })`
              : "Start a task to enable help"}
          </button>

          {/* Individual Task Buttons */}
          <button
            onClick={() => handleSmartHelp("materials")}
            disabled={!currentTask.startsWith("g2")}
            style={{
              padding: "10px",
              background: currentTask.startsWith("g2") ? "#4CAF50" : "#e0e0e0",
              color: currentTask.startsWith("g2") ? "white" : "#999",
              border: "none",
              borderRadius: "6px",
              cursor: currentTask.startsWith("g2") ? "pointer" : "not-allowed",
              fontWeight: "bold",
              fontSize: "12px",
              transition: "all 0.2s",
            }}
            title="Help with Materials (Slider) task"
          >
            🎯 Materials
          </button>

          <button
            onClick={() => handleSmartHelp("research")}
            disabled={!currentTask.startsWith("g1")}
            style={{
              padding: "10px",
              background: currentTask.startsWith("g1") ? "#9C27B0" : "#e0e0e0",
              color: currentTask.startsWith("g1") ? "white" : "#999",
              border: "none",
              borderRadius: "6px",
              cursor: currentTask.startsWith("g1") ? "pointer" : "not-allowed",
              fontWeight: "bold",
              fontSize: "12px",
              transition: "all 0.2s",
            }}
            title="Help with Research (Counting) task"
          >
            📚 Research
          </button>

          <button
            onClick={() => handleSmartHelp("engagement")}
            disabled={!currentTask.startsWith("g3")}
            style={{
              padding: "10px",
              background: currentTask.startsWith("g3") ? "#f44336" : "#e0e0e0",
              color: currentTask.startsWith("g3") ? "white" : "#999",
              border: "none",
              borderRadius: "6px",
              cursor: currentTask.startsWith("g3") ? "pointer" : "not-allowed",
              fontWeight: "bold",
              fontSize: "12px",
              transition: "all 0.2s",
            }}
            title="Help with Engagement (Typing) task"
          >
            ✉️ Engage
          </button>
        </div>

        {/* Help Status Indicator */}
        <div
          style={{
            fontSize: "11px",
            color: "#666",
            textAlign: "center",
            marginBottom: "8px",
            padding: "4px",
            background: "white",
            borderRadius: "4px",
          }}
        >
          {currentGameType ? (
            <span style={{ color: "#4CAF50" }}>
              ✓ AI ready to help with{" "}
              {currentGameType === "materials"
                ? "Materials"
                : currentGameType === "research"
                ? "Research"
                : "Engagement"}{" "}
              task
            </span>
          ) : (
            <span style={{ color: "#999" }}>
              ⏸ Navigate to a task to enable AI help
            </span>
          )}
        </div>
      </div>

      {/* Chat Input */}
      <div className="chat-input-sidebar">
        <input
          type="text"
          placeholder="Ask about strategy, tips, or type 'help'..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
