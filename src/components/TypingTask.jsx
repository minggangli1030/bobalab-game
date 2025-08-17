// src/components/TypingTask.jsx - COMPLETE FILE WITH AI INTEGRATION
import React, { useEffect, useState, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import { patternGenerator } from "../utils/patternGenerator";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./TypingTask.css";

export default function TypingTask({
  taskNum,
  onComplete,
  isPractice = false,
  gameAccuracyMode = "strict",
  currentTaskId,
}) {
  const [pattern, setPattern] = useState("");
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [startTime] = useState(Date.now());
  const [patternImageUrl, setPatternImageUrl] = useState("");
  const [isAITyping, setIsAITyping] = useState(false); // ADD THIS
  const attemptsRef = useRef(0);

  // Generate uncopyable pattern image
  const generatePatternImage = (patternText) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 600;
    canvas.height = 150;

    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(patternText, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL();
  };

  useEffect(() => {
    const generatedPattern = patternGenerator.generateTypingPattern(taskNum);

    // Store the actual pattern that will be used
    const actualPattern = generatedPattern.pattern;

    setPattern(actualPattern);

    // Generate image with the actual pattern
    const imageUrl = generatePatternImage(actualPattern);
    setPatternImageUrl(imageUrl);
  }, [taskNum]);

  // Clear input when task changes
  useEffect(() => {
    setInput("");
    setFeedback(null);
    attemptsRef.current = 0;
  }, [taskNum]);

  // ADD THIS: Listen for AI help
  useEffect(() => {
    const handleAIHelp = (event) => {
      const { action, text, typeSpeed } = event.detail;

      if (action === "autoType" && text) {
        setIsAITyping(true);
        setInput(""); // Clear input first

        // Type character by character
        let typedText = "";
        let index = 0;
        const typeInterval = setInterval(() => {
          if (index < text.length) {
            typedText += text[index];
            setInput(typedText);
            index++;
          } else {
            clearInterval(typeInterval);
            setIsAITyping(false);
          }
        }, typeSpeed || 50);

        // Store interval for cleanup
        return () => clearInterval(typeInterval);
      }
    };

    window.addEventListener("aiTypingHelp", handleAIHelp);
    return () => window.removeEventListener("aiTypingHelp", handleAIHelp);
  }, []);

  const calculateAccuracy = (userInput, expectedPattern) => {
    if (userInput === expectedPattern) return 100;

    const maxLength = Math.max(userInput.length, expectedPattern.length);
    if (maxLength === 0) return 0;

    let matches = 0;
    for (let i = 0; i < maxLength; i++) {
      if (userInput[i] === expectedPattern[i]) {
        matches++;
      }
    }

    const accuracy = (matches / maxLength) * 100;
    return Math.round(accuracy);
  };

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const accuracy = calculateAccuracy(input, pattern);

    const passThreshold = gameAccuracyMode === "strict" ? 100 : 0;
    const passed =
      gameAccuracyMode === "lenient" ? true : accuracy >= passThreshold;

    attemptsRef.current += 1;

    await eventTracker.trackTaskAttempt(
      `g3t${taskNum}`,
      attemptsRef.current,
      passed,
      timeTaken,
      input,
      pattern
    );

    const sessionId = localStorage.getItem("sessionId");
    if (sessionId && !sessionId.startsWith("offline-")) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          [`taskAccuracies.g3t${taskNum}`]: accuracy,
          [`taskTimes.g3t${taskNum}`]: timeTaken,
          [`gameMode`]: gameAccuracyMode,
          lastActivity: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error storing accuracy:", error);
      }
    }

    if (passed) {
      if (input === pattern) {
        setFeedback("✓ Flawless!");
      } else if (gameAccuracyMode === "lenient") {
        setFeedback(`✓ Passed! (${accuracy}% accuracy)`);
      } else {
        setFeedback("✓ Good job!");
      }

      setTimeout(() => {
        onComplete(`g3t${taskNum}`, {
          attempts: attemptsRef.current,
          totalTime: timeTaken,
          accuracy: accuracy,
          userAnswer: input, // Add this
          correctAnswer: pattern, // Add this
        });
      }, 1500);
    } else {
      if (isPractice) {
        setFeedback(`✗ Correct pattern: "${pattern}". Try again!`);
      } else {
        setFeedback(`✗ Try again! (${accuracy}% accuracy - need 100%)`);
      }
    }
  };

  const patternInfo = patternGenerator.generateTypingPattern(taskNum);
  const difficultyLabel = patternInfo.difficultyLabel;
  const difficultyColor = patternInfo.difficulty;

  return (
    <div className="task typing" style={{ maxWidth: "100%" }}>
      <h3>Student Engagement - Level {taskNum}</h3>
      <div className={`difficulty-badge ${difficultyColor}`}>
        {difficultyLabel}
      </div>

      <p className="instruction">Type this pattern exactly:</p>

      <div className="pattern-display">
        {/* Store pattern in hidden div for AI to find */}
        <div
          className="typing-pattern"
          data-typing-pattern={pattern}
          style={{ display: "none" }}
        >
          {pattern}
        </div>
        {patternImageUrl ? (
          <img
            src={patternImageUrl}
            alt="Pattern to type"
            style={{
              width: "100%",
              maxWidth: "600px",
              height: "auto",
              userSelect: "none",
              pointerEvents: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          <span className="pattern-text">{pattern}</span>
        )}
      </div>

      <div className="input-section">
        <input
          type="text"
          value={input}
          onChange={(e) => !isAITyping && setInput(e.target.value)}
          placeholder="Type here..."
          className="typing-input"
          disabled={isAITyping}
          style={{
            backgroundColor: isAITyping ? "#e3f2fd" : "white",
            transition: "background-color 0.3s",
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        className="submit-btn"
        disabled={isAITyping}
      >
        Submit
      </button>

      {feedback && (
        <div
          className={`feedback ${
            feedback.includes("✓") ? "correct" : "incorrect"
          }`}
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
