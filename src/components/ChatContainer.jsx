// src/components/ChatContainer.jsx - Merged version for both modes
import React, { useState, useEffect, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import "./ChatContainer.css";

export default function ChatContainer({
  bonusPrompts = 0,
  currentTask = "",
  // New props for star mode
  categoryPoints = null,
  categoryMultipliers = null,
  starGoals = null,
  timeRemaining = null,
  totalPoints = null,
}) {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I'm here to help with your tasks. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [gameMode, setGameMode] = useState("dependency"); // 'dependency' or 'star'
  const responseDataRef = useRef(null);
  const messagesEndRef = useRef(null);

  const totalPrompts = 3 + bonusPrompts;
  const remainingPrompts = totalPrompts - promptsUsed;

  // Load response data and detect game mode on mount
  useEffect(() => {
    loadResponseData();
    detectGameMode();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detectGameMode = () => {
    // Detect mode based on props or localStorage
    const storedMode = localStorage.getItem("gameMode");
    if (categoryPoints !== null || storedMode === "star") {
      setGameMode("star");
    } else {
      setGameMode("dependency");
    }
  };

  const loadResponseData = async () => {
    try {
      // Try local first
      const response = await fetch("/data/chat-responses-merged.json");

      if (!response.ok) {
        throw new Error("Failed to load response data");
      }

      const data = await response.json();
      responseDataRef.current = data;
      console.log("Loaded merged response data successfully");
    } catch (error) {
      console.error("Error loading response data:", error);
      // Use minimal fallback
      responseDataRef.current = {
        responses: {},
        general: {},
        fallback: [
          {
            id: "fallback-default",
            response:
              "Ask about counting, slider, or typing tasks. I'm here to help!",
            triggers: [],
            mode: "both",
          },
        ],
      };
    }
  };

  const replaceDynamicVariables = (response) => {
    let processedResponse = response;

    // Replace star mode variables
    if (gameMode === "star" && categoryPoints) {
      processedResponse = processedResponse
        .replace("{c}", categoryPoints.counting || 0)
        .replace("{s}", categoryPoints.slider || 0)
        .replace("{t}", categoryPoints.typing || 0)
        .replace("{points}", totalPoints || 0)
        .replace(
          "{time_remaining}",
          timeRemaining ? formatTime(timeRemaining) : "12:00"
        )
        .replace(
          "{time_elapsed}",
          timeRemaining ? formatTime(720 - timeRemaining) : "0:00"
        );

      // Star goals
      if (starGoals) {
        const perfectionRate =
          starGoals.star3.totalAttempts > 0
            ? (
                (starGoals.star3.perfectCount / starGoals.star3.totalAttempts) *
                100
              ).toFixed(1)
            : 0;

        processedResponse = processedResponse
          .replace("{perfect}", starGoals.star3.perfectCount)
          .replace("{total}", starGoals.star3.totalAttempts)
          .replace("{rate}", perfectionRate)
          .replace(
            "{bonus}",
            categoryPoints.counting *
              categoryPoints.slider *
              categoryPoints.typing
          );
      }

      // Multipliers
      if (categoryMultipliers) {
        processedResponse = processedResponse
          .replace("{multiplier}", getCurrentMultiplier())
          .replace("{category}", getBestCategory());
      }

      // Current task info
      const taskLevel = currentTask ? parseInt(currentTask.substring(3)) : 1;
      processedResponse = processedResponse.replace("{level}", taskLevel);
    }

    // Replace general variables
    processedResponse = processedResponse
      .replace("{current_task}", currentTask || "none")
      .replace("{attempts}", getTaskAttempts(currentTask));

    return processedResponse;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentMultiplier = () => {
    if (!categoryMultipliers) return "1.0";
    const total = Object.values(categoryMultipliers).reduce(
      (sum, mult) => sum + mult,
      0
    );
    return (1 + total).toFixed(1);
  };

  const getBestCategory = () => {
    if (!categoryPoints) return "none";
    const categories = Object.entries(categoryPoints);
    const best = categories.reduce((a, b) => (a[1] > b[1] ? a : b));
    return best[0];
  };

  const getTaskAttempts = (taskId) => {
    const history = localStorage.getItem(`attemptHistory_${taskId}`);
    return history ? JSON.parse(history).length : 0;
  };

  const findBestResponse = (userInput) => {
    if (!responseDataRef.current) {
      return {
        response: "Still loading... Please try again in a moment.",
        metadata: { id: "loading", level: "Task-level", type: "Find for me" },
      };
    }

    const input = userInput.toLowerCase().trim();
    const matches = [];

    // Determine current game type
    const gameType = currentTask
      ? currentTask.startsWith("g1")
        ? "counting"
        : currentTask.startsWith("g2")
        ? "slider"
        : currentTask.startsWith("g3")
        ? "typing"
        : null
      : null;

    console.log(
      "Finding response for:",
      input,
      "Game:",
      gameType,
      "Mode:",
      gameMode
    );

    // Search in current game responses first
    if (
      gameType &&
      responseDataRef.current.responses &&
      responseDataRef.current.responses[gameType]
    ) {
      searchResponses(
        responseDataRef.current.responses[gameType],
        input,
        matches,
        2.0
      );
    }

    // Search in general responses
    if (responseDataRef.current.general) {
      searchGeneralResponses(
        responseDataRef.current.general,
        input,
        matches,
        1.0
      );
    }

    // Search in other game responses (lower weight)
    if (responseDataRef.current.responses) {
      Object.keys(responseDataRef.current.responses).forEach((game) => {
        if (game !== gameType) {
          searchResponses(
            responseDataRef.current.responses[game],
            input,
            matches,
            0.5
          );
        }
      });
    }

    // Filter by game mode
    const modeFilteredMatches = matches.filter(
      (match) =>
        match.response.mode === "both" || match.response.mode === gameMode
    );

    console.log(
      `Found ${matches.length} matches, ${modeFilteredMatches.length} after mode filter`
    );

    // Sort by score (highest first)
    modeFilteredMatches.sort((a, b) => {
      // Prioritize mode-specific responses
      if (a.response.mode === gameMode && b.response.mode === "both") return -1;
      if (b.response.mode === gameMode && a.response.mode === "both") return 1;
      return b.score - a.score;
    });

    // If we have good matches, select based on score
    if (modeFilteredMatches.length > 0 && modeFilteredMatches[0].score > 0.1) {
      const topScore = modeFilteredMatches[0].score;
      const topMatches = modeFilteredMatches.filter(
        (m) => Math.abs(m.score - topScore) < 0.01
      );

      // Randomly select from top matches
      const selected =
        topMatches[Math.floor(Math.random() * topMatches.length)];

      return {
        response: replaceDynamicVariables(selected.response.response),
        metadata: {
          id: selected.response.id,
          level: selected.level || "Task-level",
          type: selected.type || "Find for me",
          triggers: selected.matchedTriggers,
          score: selected.score,
          mode: selected.response.mode,
        },
      };
    }

    // Return mode-appropriate fallback
    const fallbacks = responseDataRef.current.fallback || [];
    const modeFallbacks = fallbacks.filter(
      (f) => f.mode === "both" || f.mode === gameMode
    );
    const fallback =
      modeFallbacks.length > 0
        ? modeFallbacks[Math.floor(Math.random() * modeFallbacks.length)]
        : {
            response:
              "Ask about counting, slider, or typing tasks. I'm here to help!",
            id: "default-fallback",
            mode: "both",
          };

    return {
      response: replaceDynamicVariables(fallback.response),
      metadata: {
        id: fallback.id,
        level: "Task-level",
        type: "Iterate with me",
        context: fallback.context || "fallback",
        mode: fallback.mode,
      },
    };
  };

  const searchResponses = (gameResponses, input, matches, weight) => {
    // Search both workflow and task level
    ["workflow", "task"].forEach((level) => {
      if (!gameResponses[level]) return;

      // Search all 4 categories
      [
        "make_for_me",
        "find_for_me",
        "jumpstart_for_me",
        "iterate_with_me",
      ].forEach((type) => {
        if (!gameResponses[level][type]) return;

        gameResponses[level][type].forEach((response) => {
          const { score, matchedTriggers } = calculateTriggerScore(
            response.triggers || [],
            input
          );

          if (score > 0) {
            matches.push({
              response: response,
              score: score * weight * (response.priority || 1),
              level: level === "workflow" ? "Workflow-level" : "Task-level",
              type: type
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" "),
              matchedTriggers: matchedTriggers,
            });
          }
        });
      });
    });
  };

  const searchGeneralResponses = (generalResponses, input, matches, weight) => {
    Object.keys(generalResponses).forEach((category) => {
      if (Array.isArray(generalResponses[category])) {
        generalResponses[category].forEach((response) => {
          const { score, matchedTriggers } = calculateTriggerScore(
            response.triggers || [],
            input
          );

          if (score > 0) {
            matches.push({
              response: response,
              score: score * weight * (response.priority || 1),
              level: "Workflow-level",
              type: "Find for me",
              matchedTriggers: matchedTriggers,
            });
          }
        });
      }
    });
  };

  const calculateTriggerScore = (triggers, input) => {
    if (!triggers || triggers.length === 0)
      return { score: 0, matchedTriggers: [] };

    let totalScore = 0;
    const matchedTriggers = [];
    const inputWords = input.toLowerCase().split(/\s+/);

    triggers.forEach((trigger) => {
      const triggerLower = trigger.toLowerCase();

      // Check for exact word match
      let found = false;
      inputWords.forEach((word) => {
        if (
          word === triggerLower ||
          word.includes(triggerLower) ||
          triggerLower.includes(word)
        ) {
          found = true;
          matchedTriggers.push({ trigger, type: "word" });
        }
      });

      // Check for substring match
      if (!found && input.includes(triggerLower)) {
        found = true;
        matchedTriggers.push({ trigger, type: "substring" });
      }

      if (found) {
        // Give higher score for longer triggers and exact matches
        const baseScore = trigger.length / Math.max(input.length, 1);
        totalScore += baseScore;
      }
    });

    // Normalize score
    totalScore = totalScore / Math.max(triggers.length, 1);

    return { score: totalScore, matchedTriggers };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    if (remainingPrompts <= 0) {
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "system",
          text: "⚠️ No prompts remaining. Complete more tasks to earn additional prompts!",
        },
      ]);
      return;
    }

    // Add user message
    const userMsg = { sender: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    const userInput = input;
    setInput("");
    setPromptsUsed((prev) => prev + 1);
    setIsTyping(true);

    // Small delay to ensure response data is loaded
    setTimeout(async () => {
      // Find best response
      const { response, metadata } = findBestResponse(userInput);

      // Log the interaction with mode info
      await eventTracker.trackChatInteraction(
        userInput,
        {
          text: response,
          ...metadata,
          gameMode: gameMode,
        },
        promptsUsed + 1,
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
            metadata: metadata,
          },
        ]);
      }, 500 + Math.random() * 500);
    }, 100);
  };

  return (
    <div className="chat-container-sidebar">
      {/* Header */}
      <div className="chat-header">
        <h3>AI Assistant</h3>
        <div className="prompt-counter">{remainingPrompts} prompts left</div>
        {gameMode === "star" && (
          <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
            Mode: Star Goals
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="messages-sidebar">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.sender}`}>
            <div className="message-content">
              <strong>
                {m.sender === "user"
                  ? "You"
                  : m.sender === "bot"
                  ? "AI"
                  : "System"}
                :
              </strong>
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
          placeholder={
            remainingPrompts > 0 ? "Ask for help..." : "No prompts left"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
