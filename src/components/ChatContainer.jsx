// src/components/ChatContainer.jsx - FIXED WITH CORRECT TERMINOLOGY
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

    // Split text into words properly
    const words = text.split(/\s+/);
    const highlightWords = [];
    let aiCount = 0;

    // Find which words to highlight
    words.forEach((word) => {
      const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
      const shouldBeHighlighted = cleanWord === targetPattern.toLowerCase();

      if (shouldBeHighlighted) {
        // AI might miss this correct word
        if (Math.random() < accuracy) {
          highlightWords.push(word);
          aiCount++;
        }
      } else {
        // AI might wrongly highlight this word
        if (Math.random() < (1 - accuracy) * 0.2) {
          highlightWords.push(word);
          aiCount++;
        }
      }
    });

    // Add some counting error
    if (Math.random() < 0.3) {
      aiCount += Math.random() < 0.5 ? 1 : -1;
      aiCount = Math.max(0, aiCount);
    }

    return {
      action: "highlightAndCount",
      highlightWords: highlightWords, // Send actual words to highlight
      suggestedCount: aiCount,
      message: this.getVagueResponse(),
    };
  }

  helpWithTyping(pattern) {
    this.usageCount.typing++;

    // ALWAYS return the exact pattern for typing (perfect every time)
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
      text: "Hello! I'm your AI teaching assistant. I can help with materials, research, and engagement tasks. Try asking 'materials help', 'research help', or 'engagement help'!",
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

  // Handler for slider help (Materials)
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

  // Handler for counting help (Research)
  const handleCountingHelp = () => {
    // Get the actual text content
    const textElement =
      document.querySelector(".text-to-count") ||
      document.querySelector("[data-counting-text]");

    // Get the target pattern
    const patternElement =
      document.querySelector(".count-target") ||
      document.querySelector("[data-pattern]");

    if (textElement && patternElement) {
      // Get text - try data attribute first, then textContent
      const text =
        textElement.getAttribute("data-counting-text") ||
        textElement.textContent;

      // Get pattern and clean it
      const pattern = (
        patternElement.getAttribute("data-pattern") ||
        patternElement.textContent
      )
        .replace(/['"]/g, "")
        .trim();

      console.log("Counting help - Text:", text);
      console.log("Counting help - Pattern:", pattern);

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
          text: "Make sure you're on the research tab to use research help!",
        },
      ]);
    }
  };

  // Handler for typing help (Engagement)
  const handleTypingHelp = () => {
    let pattern = null;

    // Look for the pattern in the hidden div
    const patternElement = document.querySelector("[data-typing-pattern]");
    if (patternElement) {
      pattern = patternElement.getAttribute("data-typing-pattern");
    }

    if (!pattern) {
      const hiddenPattern = document.querySelector(".typing-pattern");
      if (hiddenPattern) {
        pattern = hiddenPattern.textContent;
      }
    }

    if (pattern) {
      pattern = pattern.replace(/['"]/g, "").trim();
      console.log("Typing help - Pattern:", pattern);

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
          text: "Make sure you're on the engagement tab to use engagement help!",
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

      // Check for specific help commands - with both old and new terminology
      if (
        (userMessage.includes("slider") || userMessage.includes("material")) &&
        userMessage.includes("help")
      ) {
        handleSliderHelp();
        setIsTyping(false);
        return;
      } else if (
        (userMessage.includes("count") || userMessage.includes("research")) &&
        userMessage.includes("help")
      ) {
        handleCountingHelp();
        setIsTyping(false);
        return;
      } else if (
        (userMessage.includes("typ") || userMessage.includes("engagement")) &&
        userMessage.includes("help")
      ) {
        handleTypingHelp();
        setIsTyping(false);
        return;
      } else if (userMessage.includes("help")) {
        response =
          "I can help with specific tasks! Try 'materials help' for slider tasks, 'research help' for counting tasks, or 'engagement help' for typing tasks.";
      } else {
        // Generic responses with correct terminology
        const genericResponses = [
          "Try asking for task-specific help!",
          "Need help? Try 'materials help', 'research help', or 'engagement help'!",
          "I'm here to assist with your teaching tasks.",
          "Focus on maximizing student learning - you've got this!",
          "Remember: Materials × Research × Engagement = Student Learning!",
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
          placeholder="Ask for help... (try 'materials help')"
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
