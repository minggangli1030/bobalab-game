// src/components/ChatContainer.jsx - COMPLETE FILE
import React, { useState, useEffect, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import "./ChatContainer.css";

// AI Task Helper Class (embedded here for simplicity)
class AITaskHelper {
  constructor() {
    this.usageCount = {
      slider: 0,
      counting: 0,
      typing: 0,
    };

    this.vagueResponses = [
      "I've helped you complete the task!",
      "Task assistance provided!",
      "There you go!",
      "Done! I've given my input.",
      "I've made my attempt!",
      "Task completed with AI assistance.",
      "My work here is done!",
      "AI help delivered!",
      "I've done what I can!",
      "Assistance complete!",
    ];
  }

  getVagueResponse() {
    return this.vagueResponses[
      Math.floor(Math.random() * this.vagueResponses.length)
    ];
  }

  helpWithSlider(targetValue) {
    this.usageCount.slider++;
    const accuracy = Math.max(0.3, 0.5 - (this.usageCount.slider - 1) * 0.1);

    let suggestedValue;
    if (Math.random() < accuracy) {
      suggestedValue = targetValue;
    } else {
      const error =
        (Math.random() < 0.5 ? -1 : 1) * (this.usageCount.slider > 3 ? 2 : 1);
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
    this.usageCount.counting++;
    const accuracy = Math.max(0.2, 0.6 - (this.usageCount.counting - 1) * 0.1);

    const words = text.split(/(\s+)/);
    const highlights = new Set();
    let aiCount = 0;

    words.forEach((word, idx) => {
      if (word.toLowerCase().includes(targetPattern.toLowerCase())) {
        if (Math.random() < accuracy) {
          highlights.add(idx);
          aiCount++;
        }
      } else {
        if (Math.random() < (1 - accuracy) * 0.3) {
          highlights.add(idx);
          aiCount++;
        }
      }
    });

    if (Math.random() < 0.4) {
      aiCount += Math.random() < 0.5 ? 1 : -1;
    }

    return {
      action: "highlightAndCount",
      highlightIndices: Array.from(highlights),
      suggestedCount: Math.max(0, aiCount),
      message: this.getVagueResponse(),
      actualText: words,
    };
  }

  helpWithTyping(pattern) {
    this.usageCount.typing++;

    return {
      action: "autoType",
      text: pattern,
      typeSpeed: 50,
      message: this.getVagueResponse(),
      perfect: true,
    };
  }
}

// Create singleton instance
const aiTaskHelper = new AITaskHelper();

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handler for slider help
  const handleSliderHelp = () => {
    const sliderTarget =
      document
        .querySelector("[data-target-value]")
        ?.getAttribute("data-target-value") ||
      document.querySelector(".target-value")?.textContent ||
      document.querySelector(".slider-target")?.textContent ||
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
        text: help.message,
      },
    ]);
  };

  // Handler for counting help
  const handleCountingHelp = () => {
    const textElement =
      document.querySelector(".text-to-count") ||
      document.querySelector(".counting-text") ||
      document.querySelector("[data-counting-text]");
    const patternElement =
      document.querySelector(".count-target") ||
      document.querySelector("[data-pattern]") ||
      document.querySelector(".counting-pattern");

    if (textElement && patternElement) {
      const text =
        textElement.textContent ||
        textElement.getAttribute("data-counting-text");
      const pattern = (
        patternElement.textContent ||
        patternElement.getAttribute("data-pattern")
      ).replace(/['"]/g, "");

      const help = aiTaskHelper.helpWithCounting(text, pattern);

      window.dispatchEvent(
        new CustomEvent("aiCountingHelp", {
          detail: help,
        })
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: help.message,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Make sure you're on the counting tab to use counting help!",
        },
      ]);
    }
  };

  // Handler for typing help
  const handleTypingHelp = () => {
    const patternElement =
      document.querySelector(".typing-pattern") ||
      document.querySelector("[data-typing-pattern]") ||
      document.querySelector(".pattern-to-type");

    if (patternElement) {
      const pattern = (
        patternElement.textContent ||
        patternElement.getAttribute("data-typing-pattern")
      ).replace(/['"]/g, "");
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
          text: help.message,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Make sure you're on the typing tab to use typing help!",
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

      // Check for specific help commands
      if (userMessage.includes("slider") && userMessage.includes("help")) {
        handleSliderHelp();
        setIsTyping(false);
        return;
      } else if (
        userMessage.includes("count") &&
        userMessage.includes("help")
      ) {
        handleCountingHelp();
        setIsTyping(false);
        return;
      } else if (
        (userMessage.includes("type") || userMessage.includes("typing")) &&
        userMessage.includes("help")
      ) {
        handleTypingHelp();
        setIsTyping(false);
        return;
      } else if (userMessage.includes("help")) {
        response =
          "I can help with specific tasks! Try 'slider help', 'count help', or 'type help'.";
      } else {
        // Generic responses
        const genericResponses = [
          "Try asking for task-specific help!",
          "Need help? Try 'slider help', 'count help', or 'type help'!",
          "I'm here to assist with your tasks.",
          "Focus on the current task - you've got this!",
        ];
        response =
          genericResponses[Math.floor(Math.random() * genericResponses.length)];
      }

      setMessages((prev) => [...prev, { sender: "bot", text: response }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="chat-container-sidebar">
      <div className="chat-header">
        <h3>AI Teaching Assistant</h3>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
          Unlimited help available! (reliability may vary)
        </div>
      </div>

      <div className="messages-sidebar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="message-sender">
              {msg.sender === "user" ? "You" : "AI Assistant"}:
            </div>
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot">
            <div className="message-sender">AI Assistant:</div>
            <div className="message-text typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-sidebar">
        <input
          type="text"
          placeholder="Ask for help... (try 'slider help')"
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
