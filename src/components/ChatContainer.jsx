// src/components/ChatContainer.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import "./ChatContainer.css";

class AITaskHelper {
  constructor() {
    this.usageCount = {
      materials: 0,
      research: 0,
      engagement: 0,
    };
    this.taskUsageCount = {}; // Track usage per specific task
  }

  getTaskUsageCount(taskId) {
    if (!this.taskUsageCount[taskId]) {
      this.taskUsageCount[taskId] = 0;
    }
    return this.taskUsageCount[taskId];
  }

  incrementTaskUsage(taskId, category) {
    this.usageCount[category]++;
    if (!this.taskUsageCount[taskId]) {
      this.taskUsageCount[taskId] = 0;
    }
    this.taskUsageCount[taskId]++;
  }

  helpWithSlider(targetValue, currentTaskId) {
    this.incrementTaskUsage(currentTaskId, "materials");
    const taskUsage = this.getTaskUsageCount(currentTaskId);

    let suggestedValue;

    if (taskUsage === 1) {
      // First attempt is always correct
      suggestedValue = targetValue;
    } else if (taskUsage <= 5) {
      // 2-5 uses: mistakes within 1 point range
      const error =
        Math.random() < 0.7
          ? 0
          : (Math.random() < 0.5 ? -1 : 1) * Math.min(1, Math.random());
      suggestedValue = Math.max(0, Math.min(10, targetValue + error));
    } else {
      // After 5th use: bad 75% of the time
      if (Math.random() < 0.75) {
        // Bad answer
        if (Math.random() < 0.5) {
          // Within 1 point (still gets some accuracy)
          const error = Math.random() < 0.5 ? -1 : 1;
          suggestedValue = Math.max(0, Math.min(10, targetValue + error));
        } else {
          // Way off (0 points)
          const error = Math.random() < 0.5 ? -3 : 3;
          suggestedValue = Math.max(0, Math.min(10, targetValue + error));
        }
      } else {
        // 25% chance still correct
        suggestedValue = targetValue;
      }
    }

    return {
      action: "moveSlider",
      value: suggestedValue,
      animate: true,
    };
  }

  helpWithCounting(text, targetPattern, currentTaskId) {
    this.incrementTaskUsage(currentTaskId, "research");
    const taskUsage = this.getTaskUsageCount(currentTaskId);

    const words = text.split(/\s+/);
    const highlightWords = [];
    let aiCount = 0;

    // Calculate correct count first
    let correctCount = 0;
    words.forEach((word) => {
      const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
      if (cleanWord === targetPattern.toLowerCase()) {
        correctCount++;
      }
    });

    if (taskUsage === 1) {
      // First attempt is always correct
      words.forEach((word) => {
        const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
        if (cleanWord === targetPattern.toLowerCase()) {
          highlightWords.push(word);
          aiCount++;
        }
      });
    } else if (taskUsage <= 5) {
      // 2-5 uses: small mistakes (within 1)
      aiCount =
        correctCount + (Math.random() < 0.7 ? 0 : Math.random() < 0.5 ? -1 : 1);
      aiCount = Math.max(0, aiCount);

      // Highlight approximately the right number
      words.forEach((word) => {
        const cleanWord = word.replace(/[.,;!?]/g, "").toLowerCase();
        if (
          cleanWord === targetPattern.toLowerCase() &&
          highlightWords.length < aiCount
        ) {
          highlightWords.push(word);
        }
      });
    } else {
      // After 5th use: correct 75% of the time
      if (Math.random() < 0.75) {
        if (Math.random() < 0.5) {
          // Within 1 point
          aiCount = correctCount + (Math.random() < 0.5 ? -1 : 1);
        } else {
          // Way off
          aiCount = Math.floor((Math.random() * words.length) / 2);
        }
      } else {
        aiCount = correctCount;
      }
      aiCount = Math.max(0, aiCount);
    }

    return {
      action: "highlightAndCount",
      highlightWords: highlightWords,
      suggestedCount: aiCount,
      animate: true,
    };
  }

  helpWithTyping(pattern, currentTaskId) {
    this.incrementTaskUsage(currentTaskId, "engagement");
    const taskUsage = this.getTaskUsageCount(currentTaskId);

    let resultText = pattern;

    // Common character substitutions that look similar
    const similarChars = {
      0: ["o", "O"], // zero looks like o
      o: ["0"], // o looks like zero
      O: ["0"], // O looks like zero
      1: ["l", "I", "i"], // one looks like l, I, i
      l: ["1", "I", "i"], // l looks like one, I, i
      I: ["1", "l", "i"], // I looks like one, l, i
      i: ["1", "l", "I"], // i looks like one, l, I
      e: ["3"], // e looks like 3
      3: ["e"], // 3 looks like e
      a: ["@"], // a looks like @
      "@": ["a"], // @ looks like a
      s: ["5", "$"], // s looks like 5, $
      S: ["5", "$"], // S looks like 5, $
      5: ["s", "S"], // 5 looks like s
      $: ["s", "S"], // $ looks like s
      g: ["9"], // g looks like 9
      9: ["g"], // 9 looks like g
      b: ["6"], // b looks like 6
      6: ["b"], // 6 looks like b
      z: ["2"], // z looks like 2
      2: ["z"], // 2 looks like z
      B: ["8"], // B looks like 8
      8: ["B"], // 8 looks like B
    };

    // Helper function to make a realistic typo
    const makeRealisticTypo = (text) => {
      const charArray = text.split("");
      const typableIndices = charArray
        .map((char, idx) => (similarChars[char] ? idx : -1))
        .filter((idx) => idx !== -1);

      if (typableIndices.length > 0) {
        // Pick a random position that has similar characters
        const indexToChange =
          typableIndices[Math.floor(Math.random() * typableIndices.length)];
        const originalChar = charArray[indexToChange];
        const similarOptions = similarChars[originalChar];

        if (similarOptions && similarOptions.length > 0) {
          // Replace with a similar-looking character
          charArray[indexToChange] =
            similarOptions[Math.floor(Math.random() * similarOptions.length)];
        }
      } else {
        // If no similar chars available, make a different kind of typo
        const errorTypes = ["transpose", "duplicate", "missing"];
        const errorType =
          errorTypes[Math.floor(Math.random() * errorTypes.length)];
        const index = Math.floor(Math.random() * charArray.length);

        switch (errorType) {
          case "transpose":
            // Swap adjacent characters
            if (index < charArray.length - 1) {
              [charArray[index], charArray[index + 1]] = [
                charArray[index + 1],
                charArray[index],
              ];
            }
            break;
          case "duplicate":
            // Duplicate a character
            charArray.splice(index, 0, charArray[index]);
            break;
          case "missing":
            // Remove a character
            charArray.splice(index, 1);
            break;
        }
      }

      return charArray.join("");
    };

    if (taskUsage === 1) {
      // First attempt is always correct
      resultText = pattern;
    } else if (taskUsage <= 5) {
      // 2-5 uses: 20% chance of exactly 1 typo (still gets 1 point)
      if (Math.random() < 0.2) {
        resultText = makeRealisticTypo(pattern);
      }
      // 80% chance still correct
    } else {
      // After 5th use: bad 60% of the time
      if (Math.random() < 0.6) {
        if (Math.random() < 0.5) {
          // 50% of bad attempts: exactly 1 typo (still gets 1 point)
          resultText = makeRealisticTypo(pattern);
        } else {
          // 50% of bad attempts: multiple errors (0 points)
          let modifiedText = pattern;

          // Make 2-4 typos
          const numErrors = Math.floor(Math.random() * 3) + 2;
          for (let i = 0; i < numErrors; i++) {
            modifiedText = makeRealisticTypo(modifiedText);
          }

          resultText = modifiedText;
        }
      }
      // 25% chance still correct
    }

    return {
      action: "autoType",
      text: resultText,
      typeSpeed: 50,
      perfect: taskUsage === 1,
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
  // Get the game config to check if AI is enabled
  const [hasAI, setHasAI] = useState(true);

  useEffect(() => {
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    setHasAI(config.hasAI !== false); // Default to true if not specified
    console.log("AI enabled for this session:", config.hasAI !== false);
  }, []);

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: hasAI
        ? "Hello! I'm your AI teaching assistant. Click the help buttons below for task assistance!"
        : "Hello! This is the chat interface. AI assistance is not available for this session.",
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

    const help = aiTaskHelper.helpWithSlider(
      parseFloat(sliderTarget),
      currentTask
    );

    window.dispatchEvent(
      new CustomEvent("aiSliderHelp", {
        detail: help,
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: `📊 Helping with materials...`,
      },
    ]);
  };

  const handleCountingHelp = () => {
    const textElement = document.querySelector(".text-to-count");
    const patternElement = document.querySelector(".count-target");

    if (textElement && patternElement) {
      const text = textElement.getAttribute("data-counting-text") || "";
      let pattern =
        patternElement
          .getAttribute("data-pattern")
          ?.replace(/['"]/g, "")
          .trim() || "";

      // Check if it's a multi-letter pattern (contains "and" or comma)
      if (pattern.includes(" and ") || pattern.includes(",")) {
        // Extract individual letters from pattern like "a and e" or "a, e"
        const letters = pattern.match(/[a-z]/gi) || [];

        // For multi-letter, highlight all occurrences
        const help = {
          action: "highlightAndCount",
          highlightWords: [], // Will handle differently for letters
          suggestedCount: 0,
          animate: true,
          isMultiLetter: true,
          targetLetters: letters,
        };

        // Count occurrences
        letters.forEach((letter) => {
          const regex = new RegExp(letter, "gi");
          const matches = text.match(regex);
          help.suggestedCount += matches ? matches.length : 0;
        });

        window.dispatchEvent(
          new CustomEvent("aiCountingHelp", { detail: help })
        );
      } else {
        // Single word/letter pattern - use existing logic
        const help = aiTaskHelper.helpWithCounting(text, pattern, currentTask);
        window.dispatchEvent(
          new CustomEvent("aiCountingHelp", { detail: help })
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `🔬 Helping with research...`,
        },
      ]);
    }
  };

  // Handler for planning/strategy help
  const handlePlanningHelp = () => {
    const planningResponses = [
      "📊 Strategic Order: Start with Research tasks for the 15% multiplier per point, then do Engagement for compound interest that builds over time, finally complete Materials for maximum base points!",
      "🎯 Pro Strategy: Research → Engagement → Materials. Build your multipliers first, then let interest compound, and maximize base points at the end!",
      "💡 Optimal Workflow: 1) Research multiplies everything (×1.15 per point), 2) Engagement adds 0.15% interest after EVERY task, 3) Materials are pure points - save them for last when multipliers are active!",
      "🚀 Best Practice: Complete Research early (multiplier effect), then Engagement (compounds over time), finally Materials. Each Research point makes ALL your Materials worth 15% more!",
      "📈 Planning Tip: Think of it as investing - Research is your growth multiplier, Engagement is compound interest, Materials are your principal. Build multipliers before collecting points!",
    ];

    const response =
      planningResponses[Math.floor(Math.random() * planningResponses.length)];

    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: response,
      },
    ]);

    // Log planning help request
    eventTracker.trackUserAction("planning_help_requested", {
      response: response,
      currentTask: currentTask,
      timestamp: Date.now(),
    });
  };

  // Handler for typing help (Engagement) - FIXED
  const handleTypingHelp = () => {
    const patternElement = document.querySelector("[data-typing-pattern]");

    if (patternElement) {
      const pattern = patternElement.getAttribute("data-typing-pattern");

      if (pattern) {
        const help = aiTaskHelper.helpWithTyping(pattern, currentTask);

        window.dispatchEvent(
          new CustomEvent("aiTypingHelp", {
            detail: help,
          })
        );

        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `✉️ Helping with engagement...`,
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
    if (!hasAI) {
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: input },
        {
          sender: "bot",
          text: "AI assistance is not available for this session.",
        },
      ]);
      setInput("");
      return;
    }

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
      } else if (
        userMessage.includes("strategy") ||
        userMessage.includes("plan") ||
        userMessage.includes("order")
      ) {
        const planningResponses = [
          "📊 Strategic Order: Start with Research tasks for the 15% multiplier per point, then do Engagement for compound interest that builds over time, finally complete Materials for maximum base points!",
          "🎯 Pro Strategy: Research → Engagement → Materials. Build your multipliers first, then let interest compound, and maximize base points at the end!",
          "💡 Optimal Workflow: 1) Research multiplies everything (×1.15 per point), 2) Engagement adds 0.15% interest after EVERY task, 3) Materials are pure points - save them for last when multipliers are active!",
          "🚀 Best Practice: Complete Research early (multiplier effect), then Engagement (compounds over time), finally Materials. Each Research point makes ALL your Materials worth 15% more!",
          "📈 Planning Tip: Think of it as investing - Research is your growth multiplier, Engagement is compound interest, Materials are your principal. Build multipliers before collecting points!",
        ];
        response =
          planningResponses[
            Math.floor(Math.random() * planningResponses.length)
          ];
      } else if (
        userMessage.includes("tip") ||
        userMessage.includes("advice")
      ) {
        response =
          "Strategic tip: Do Research tasks first for the multiplier effect, then Materials for base points, finally Engagement for compound interest!";
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
    <div
      className="chat-container-sidebar"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div className="chat-header">
        <h3>{hasAI ? "AI Teaching Assistant" : "Chat Interface"}</h3>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
          {hasAI
            ? "Unlimited help (reliability varies by task)"
            : "AI assistance disabled for this session"}
        </div>

        {/* Student Learning Score Display - always shown */}
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
            {categoryPoints.slider || 0} ×{" "}
            {(1 + (categoryPoints.counting || 0) * 0.15).toFixed(2)} + Interest
          </div>
        </div>
      </div>

      <div className="messages-sidebar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="message-sender">
              {msg.sender === "user" ? "You" : hasAI ? "AI" : "System"}:
            </div>
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
        {isTyping && hasAI && (
          <div className="message bot">
            <div className="message-sender">AI:</div>
            <div className="message-text typing">...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="chat-input-sidebar">
        <input
          type="text"
          placeholder={
            hasAI
              ? "Ask about strategy and tips here..."
              : "Chat disabled - no AI available"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          disabled={!hasAI}
        />
        <button onClick={handleSend} disabled={!input.trim() || !hasAI}>
          Send
        </button>
      </div>

      {/* SMART HELP BUTTONS - Only show if AI is enabled */}
      {hasAI && (
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
            {/* Help buttons side by side */}
            <div
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {/* Help Task Button */}
              <button
                onClick={() => handleSmartHelp()}
                disabled={!currentGameType}
                style={{
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
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "18px" }}>🤖</span>
                {currentGameType ? "Help Task" : "Start task first"}
              </button>

              {/* Help Plan Button */}
              <button
                onClick={handlePlanningHelp}
                style={{
                  padding: "12px",
                  background: "#FF9800",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "18px" }}>📊</span>
                Help Plan
              </button>
            </div>

            {/* Individual Task Buttons */}
            <button
              onClick={() => handleSmartHelp("research")}
              disabled={!currentTask.startsWith("g1")}
              style={{
                padding: "10px",
                background: currentTask.startsWith("g1")
                  ? "#9C27B0"
                  : "#e0e0e0",
                color: currentTask.startsWith("g1") ? "white" : "#999",
                border: "none",
                borderRadius: "6px",
                cursor: currentTask.startsWith("g1")
                  ? "pointer"
                  : "not-allowed",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              📚 Research
            </button>

            <button
              onClick={() => handleSmartHelp("materials")}
              disabled={!currentTask.startsWith("g2")}
              style={{
                padding: "10px",
                background: currentTask.startsWith("g2")
                  ? "#4CAF50"
                  : "#e0e0e0",
                color: currentTask.startsWith("g2") ? "white" : "#999",
                border: "none",
                borderRadius: "6px",
                cursor: currentTask.startsWith("g2")
                  ? "pointer"
                  : "not-allowed",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              🎯 Materials
            </button>

            <button
              onClick={() => handleSmartHelp("engagement")}
              disabled={!currentTask.startsWith("g3")}
              style={{
                padding: "10px",
                background: currentTask.startsWith("g3")
                  ? "#f44336"
                  : "#e0e0e0",
                color: currentTask.startsWith("g3") ? "white" : "#999",
                border: "none",
                borderRadius: "6px",
                cursor: currentTask.startsWith("g3")
                  ? "pointer"
                  : "not-allowed",
                fontWeight: "bold",
                fontSize: "12px",
              }}
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
              <span style={{ color: "#4CAF50" }}>✓ AI ready to help</span>
            ) : (
              <span style={{ color: "#999" }}>
                ⏸ Navigate to a task to enable AI help
              </span>
            )}
          </div>
        </div>
      )}

      {/* Show a message if AI is disabled */}
      {!hasAI && (
        <div
          style={{
            padding: "15px",
            borderTop: "1px solid #e0e0e0",
            background: "#f5f5f5",
            textAlign: "center",
            color: "#666",
            fontSize: "14px",
          }}
        >
          <div style={{ marginBottom: "5px" }}>📝 No AI Assistant</div>
          <div style={{ fontSize: "12px" }}>
            Complete tasks using your own judgment
          </div>
        </div>
      )}
    </div>
  );
}
