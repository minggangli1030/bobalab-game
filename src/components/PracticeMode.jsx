// src/components/PracticeMode.jsx - Updated without dependencies
import React, { useState } from "react";
import CountingTask from "./CountingTask";
import SliderTask from "./SliderTask";
import TypingTask from "./TypingTask";
import "./PracticeMode.css";

export default function PracticeMode({
  rulesData,
  onStartMainGame,
  gameAccuracyMode = "strict",
}) {
  const [currentPractice, setCurrentPractice] = useState(null);
  const [completedPractice, setCompletedPractice] = useState({});

  const handlePracticeComplete = (taskId) => {
    setCompletedPractice((prev) => ({ ...prev, [taskId]: true }));
    // Auto-return to menu after completion
    setTimeout(() => {
      setCurrentPractice(null);
    }, 1500);
  };

  const startMainGame = () => {
    onStartMainGame();
  };

  const renderPracticeMenu = () => (
    <div className="practice-menu">
      <h2>Practice Mode</h2>
      <p className="practice-hint">
        Try each task type before starting the main challenge. No time pressure!
      </p>

      <div className="practice-cards">
        <div className="practice-card research">
          <h3>📚 Research (Counting)</h3>
          <p>Count words or letters in text passages</p>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            Worth 5% multiplier per point in main game
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice("g1t1")}
              className={completedPractice["g1t1"] ? "completed" : ""}
            >
              {completedPractice["g1t1"] ? "✓ Completed" : "Try Research"}
            </button>
          </div>
        </div>

        <div className="practice-card materials">
          <h3>🎯 Materials (Slider)</h3>
          <p>Hold and drag slider to match target values</p>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            Base points - directly added to score
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice("g2t1")}
              className={completedPractice["g2t1"] ? "completed" : ""}
            >
              {completedPractice["g2t1"] ? "✓ Completed" : "Try Materials"}
            </button>
          </div>
        </div>

        <div className="practice-card engagement">
          <h3>✉️ Engagement (Typing)</h3>
          <p>Type patterns exactly as shown</p>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
            Worth 1% multiplier per point in main game
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice("g3t1")}
              className={completedPractice["g3t1"] ? "completed" : ""}
            >
              {completedPractice["g3t1"] ? "✓ Completed" : "Try Engagement"}
            </button>
          </div>
        </div>
      </div>

      {/* Tips section */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          background: "#f0f8ff",
          borderRadius: "8px",
          border: "1px solid #2196F3",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#2196F3" }}>
          💡 Practice Tips:
        </h4>
        <ul
          style={{
            margin: "0",
            paddingLeft: "20px",
            fontSize: "14px",
            lineHeight: "1.6",
            textAlign: "left",
          }}
        >
          <li>AI help is available - click the help buttons in the chat!</li>
          <li>AI is most reliable early on, less reliable as you progress</li>
          <li>Tasks auto-advance after completion (1.5s delay)</li>
          <li>Accuracy matters: 95%+ = 2 pts, 70%+ = 1 pt, below = 0 pts</li>
        </ul>
      </div>

      {/* Start button */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <button
          className="start-main-game-btn"
          onClick={startMainGame}
          style={{
            opacity: Object.keys(completedPractice).length === 0 ? 0.8 : 1,
          }}
        >
          {Object.keys(completedPractice).length === 0
            ? "Start Main Game (or practice first!)"
            : "Start Main Game - You're Ready! 🚀"}
        </button>
      </div>
    </div>
  );

  if (!currentPractice) {
    return renderPracticeMenu();
  }

  const game = currentPractice[1];
  const taskNum = Number(currentPractice[3]);

  return (
    <div className="practice-container">
      <button className="back-to-menu" onClick={() => setCurrentPractice(null)}>
        ← Back to Practice Menu
      </button>

      <div
        style={{
          textAlign: "center",
          padding: "10px",
          background: "#fff3cd",
          borderRadius: "6px",
          margin: "10px 0",
          fontSize: "14px",
          color: "#856404",
        }}
      >
        <strong>Practice Mode:</strong> No time limit, unlimited attempts. Will
        auto-return after completion.
      </div>

      <div className="practice-task-wrapper">
        {game === "1" && (
          <CountingTask
            taskNum={taskNum}
            onComplete={handlePracticeComplete}
            isPractice={true}
            gameAccuracyMode={gameAccuracyMode}
          />
        )}

        {game === "2" && (
          <SliderTask
            taskNum={taskNum}
            onComplete={handlePracticeComplete}
            isPractice={true}
            gameAccuracyMode={gameAccuracyMode}
          />
        )}

        {game === "3" && (
          <TypingTask
            taskNum={taskNum}
            onComplete={handlePracticeComplete}
            isPractice={true}
            gameAccuracyMode={gameAccuracyMode}
          />
        )}
      </div>
    </div>
  );
}
