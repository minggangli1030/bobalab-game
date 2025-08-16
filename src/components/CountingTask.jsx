// src/components/CountingTask.jsx - COMPLETE FILE WITH AI INTEGRATION
import React, { useEffect, useState, useRef } from "react";
import { eventTracker } from "../utils/eventTracker";
import { taskDependencies } from "../utils/taskDependencies";
import { patternGenerator } from "../utils/patternGenerator";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./CountingTask.css";

export default function CountingTask({
  taskNum,
  onComplete,
  isPractice = false,
  gameAccuracyMode = "strict",
  currentTaskId,
}) {
  const [target, setTarget] = useState("");
  const [instruction, setInstruction] = useState("");
  const [answer, setAnswer] = useState(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [text, setText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [startTime] = useState(Date.now());
  const [textImageUrl, setTextImageUrl] = useState("");
  const [aiHighlightActive, setAiHighlightActive] = useState(false);
  const [highlightedIndices, setHighlightedIndices] = useState(new Set()); // ADD THIS
  const attemptsRef = useRef(0);
  const canvasRef = useRef(null);

  // Generate uncopyable text image with AI highlights
  const generateTextImage = (
    textContent,
    highlights = null,
    aiHighlights = null
  ) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 900;
    canvas.height = 350;

    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.font = "20px monospace";
    ctx.fillStyle = "#333";

    const lineHeight = 30;
    const padding = 20;
    const maxWidth = canvas.width - padding * 2;

    const wrapText = (text, maxWidth) => {
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";

      for (let word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    const lines = wrapText(textContent, maxWidth);

    // Draw text with highlights
    lines.forEach((line, lineIndex) => {
      const y = padding + (lineIndex + 1) * lineHeight;
      let x = padding;

      if (taskNum <= 5) {
        const words = line.split(" ");
        let wordIndex = 0;

        words.forEach((word) => {
          // Check if AI highlighted this word
          const shouldHighlight = aiHighlights && aiHighlights.has(wordIndex);

          if (shouldHighlight) {
            const wordWidth = ctx.measureText(word).width;
            ctx.fillStyle = "yellow";
            ctx.fillRect(x - 2, y - 18, wordWidth + 4, 24);
          } else if (
            highlights &&
            highlights.some((h) => word.toLowerCase() === h.toLowerCase())
          ) {
            const wordWidth = ctx.measureText(word).width;
            ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
            ctx.fillRect(x - 2, y - 18, wordWidth + 4, 24);
          }

          ctx.fillStyle = "#333";
          ctx.fillText(word, x, y);
          x += ctx.measureText(word + " ").width;
          wordIndex++;
        });
      } else {
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const charWidth = ctx.measureText(char).width;

          const shouldHighlightLetter =
            highlights &&
            highlights.some(
              (highlight) => char.toLowerCase() === highlight.toLowerCase()
            );

          if (shouldHighlightLetter) {
            ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
            ctx.fillRect(x - 1, y - 18, charWidth + 2, 24);
          }

          ctx.fillStyle = "#333";
          ctx.fillText(char, x, y);
          x += charWidth;
        }
      }
    });

    return canvas.toDataURL();
  };

  // ADD THIS: Listen for AI help
  useEffect(() => {
    const handleAIHelp = (event) => {
      const { action, highlightIndices, suggestedCount } = event.detail;

      if (action === "highlightAndCount") {
        // Highlight the words
        setHighlightedIndices(new Set(highlightIndices));

        // Update the image with AI highlights
        const pattern = patternGenerator.generateCountingPattern(taskNum);
        const dependency = taskDependencies.getActiveDependency(
          `g1t${taskNum}`
        );
        let highlights = null;

        if (dependency && dependency.type === "highlight") {
          highlights =
            pattern.type === "word"
              ? [pattern.target]
              : pattern.type === "letter"
              ? [pattern.target]
              : pattern.targets;
        }

        const imageUrl = generateTextImage(
          text,
          highlights,
          new Set(highlightIndices)
        );
        setTextImageUrl(imageUrl);

        // Set the count after a small delay
        setTimeout(() => {
          setInput(suggestedCount.toString());
        }, 500);

        // Remove highlights after 3 seconds
        setTimeout(() => {
          setHighlightedIndices(new Set());
          // Regenerate image without AI highlights
          const imageUrl = generateTextImage(text, highlights, null);
          setTextImageUrl(imageUrl);
        }, 3000);
      }
    };

    window.addEventListener("aiCountingHelp", handleAIHelp);
    return () => window.removeEventListener("aiCountingHelp", handleAIHelp);
  }, [text, taskNum]);

  useEffect(() => {
    const pattern = patternGenerator.generateCountingPattern(taskNum);
    const selectedText = patternGenerator.getTextPassage(taskNum);

    setText(selectedText);
    setInstruction(pattern.instruction);

    let correctAnswer;
    if (pattern.type === "word") {
      correctAnswer = (
        selectedText.match(new RegExp(`\\b${pattern.target}\\b`, "gi")) || []
      ).length;
    } else if (pattern.type === "letter") {
      correctAnswer = (
        selectedText.match(new RegExp(pattern.target, "gi")) || []
      ).length;
    } else {
      correctAnswer =
        (selectedText.match(new RegExp(pattern.targets[0], "gi")) || [])
          .length +
        (selectedText.match(new RegExp(pattern.targets[1], "gi")) || []).length;
    }

    setAnswer(correctAnswer);
    setTarget(pattern.target || pattern.targets);

    const dependency = taskDependencies.getActiveDependency(`g1t${taskNum}`);
    const hasHighlight = dependency && dependency.type === "highlight";

    let highlights = null;
    if (hasHighlight) {
      if (pattern.type === "word") {
        highlights = [pattern.target];
      } else if (pattern.type === "letter") {
        highlights = [pattern.target];
      } else {
        highlights = pattern.targets;
      }
    }

    const imageUrl = generateTextImage(selectedText, highlights);
    setTextImageUrl(imageUrl);

    if (hasHighlight) {
      let highlighted = selectedText;
      if (pattern.type === "word") {
        const regex = new RegExp(`\\b${pattern.target}\\b`, "gi");
        highlighted = selectedText.replace(
          regex,
          (match) => `<span class="highlighted-word">${match}</span>`
        );
      } else if (pattern.type === "letter") {
        const regex = new RegExp(pattern.target, "gi");
        highlighted = selectedText.replace(
          regex,
          (match) => `<span class="highlighted-letter">${match}</span>`
        );
      } else {
        pattern.targets.forEach((letter) => {
          highlighted = highlighted
            .split("")
            .map((char) => {
              if (char.toLowerCase() === letter.toLowerCase()) {
                return `<span class="highlighted-letter">${char}</span>`;
              }
              return char;
            })
            .join("");
        });
      }
      setDisplayText(highlighted);
    } else {
      setDisplayText(selectedText);
    }
  }, [taskNum]);

  const calculateAccuracy = (userAnswer, correctAnswer) => {
    if (userAnswer === correctAnswer) return 100;
    const maxPossible = Math.max(userAnswer, correctAnswer, 1);
    const difference = Math.abs(userAnswer - correctAnswer);
    const accuracy = Math.max(0, 100 - (difference / maxPossible) * 100);
    return Math.round(accuracy);
  };

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const userAnswer = parseInt(input, 10) || 0;
    const accuracy = calculateAccuracy(userAnswer, answer);

    const passThreshold = gameAccuracyMode === "strict" ? 100 : 0;
    const passed =
      gameAccuracyMode === "lenient" ? true : accuracy >= passThreshold;

    attemptsRef.current += 1;

    await eventTracker.trackTaskAttempt(
      `g1t${taskNum}`,
      attemptsRef.current,
      passed,
      timeTaken,
      userAnswer,
      answer
    );

    const sessionId = localStorage.getItem("sessionId");
    if (sessionId && !sessionId.startsWith("offline-")) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          [`taskAccuracies.g1t${taskNum}`]: accuracy,
          [`taskTimes.g1t${taskNum}`]: timeTaken,
          [`gameMode`]: gameAccuracyMode,
          lastActivity: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error storing accuracy:", error);
      }
    }

    if (passed) {
      if (accuracy === 100) {
        setFeedback("✓ Flawless!");
      } else if (gameAccuracyMode === "lenient") {
        setFeedback(`✓ Passed! (${accuracy}% accuracy)`);
      } else {
        setFeedback("✓ Good job!");
      }

      setTimeout(() => {
        onComplete(`g1t${taskNum}`, {
          attempts: attemptsRef.current,
          totalTime: timeTaken,
          accuracy: accuracy,
        });
      }, 1500);
    } else {
      if (isPractice) {
        setFeedback(`✗ Incorrect. The correct answer is ${answer}. Try again!`);
      } else {
        setFeedback(`✗ Try again! (${accuracy}% accuracy - need 100%)`);
      }
    }
  };

  const isEnhanced = taskDependencies.getActiveDependency(`g1t${taskNum}`);
  const pattern = patternGenerator.generateCountingPattern(taskNum);
  const difficultyLabel = pattern.difficultyLabel;
  const difficultyColor =
    taskNum <= 5 ? "easy" : taskNum <= 10 ? "medium" : "hard";

  return (
    <div className={`task counting ${isEnhanced ? "enhanced-task" : ""}`}>
      <h3>Research Content - Level {taskNum}</h3>
      <div className={`difficulty-badge ${difficultyColor}`}>
        {difficultyLabel}
      </div>

      <p className="instruction">
        <strong>{instruction}</strong>
        <br />
        <span className="hint">(Case-insensitive)</span>
      </p>

      <div className="text-display text-to-count" data-counting-text={text}>
        <div
          className="count-target"
          data-pattern={target}
          style={{ display: "none" }}
        >
          {target}
        </div>
        {textImageUrl ? (
          <img
            src={textImageUrl}
            alt="Text passage for counting"
            style={{
              width: "100%",
              maxWidth: "900px",
              height: "auto",
              maxHeight: "350px",
              objectFit: "contain",
              border: "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: displayText }} />
        )}
      </div>

      <div className="input-section">
        <label>Your answer:</label>
        <input
          type="number"
          min="0"
          max="999"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter count"
        />
      </div>

      <button onClick={handleSubmit} className="submit-btn">
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
