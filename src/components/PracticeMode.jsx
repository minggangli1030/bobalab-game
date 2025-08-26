// src/components/PracticeMode.jsx - Updated with enforced practice and new order
import React, { useState } from "react";
import CountingTask from "./CountingTask";
import SliderTask from "./SliderTask";
import TypingTask from "./TypingTask";
import "./PracticeMode.css";

export default function PracticeMode({
  practiceCompleted = {},
  onPracticeComplete,
  onStartMainGame,
  isAdmin = false,
}) {
  const [currentPractice, setCurrentPractice] = useState(null);

  const handlePracticeTaskComplete = (taskId) => {
    onPracticeComplete(taskId);
    // Auto-return to menu after completion
    setTimeout(() => {
      setCurrentPractice(null);
    }, 1500);
  };

  const allComplete =
    practiceCompleted.g2t1 && practiceCompleted.g1t1 && practiceCompleted.g3t1;

  const renderPracticeMenu = () => (
    <div className="practice-menu">
      <h2>Practice Mode {!isAdmin && "(Required)"}</h2>
      {!isAdmin && (
        <div
          style={{
            background: "#ffebee",
            borderRadius: "6px",
            padding: "15px",
            marginBottom: "20px",
            border: "1px solid #f44336",
          }}
        >
          <strong style={{ color: "#c62828" }}>⚠️ Important:</strong>
          <p style={{ color: "#d32f2f", margin: "10px 0 0 0" }}>
            You must complete all three practice tasks before starting the main
            game. This ensures you understand each task type.
          </p>
        </div>
      )}

      <p className="practice-hint">
        Try each task type before starting the main challenge. No time pressure!
      </p>

      <div className="practice-cards">
        {/* Materials first (was Slider) */}
        <div className="practice-card materials">
          <h3>🎯 Materials</h3>
          <p>Hold and drag slider to match target values</p>
          <p style={{ fontSize: "13px", color: "#666", marginTop: "10px" }}>
            Base points - directly added to score
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice("g2t1")}
              className={practiceCompleted.g2t1 ? "completed" : ""}
            >
              {practiceCompleted.g2t1 ? "✓ Completed" : "Try Materials"}
            </button>
          </div>
        </div>

        {/* Research second (was Counting) */}
        <div className="practice-card research">
          <h3>📚 Research</h3>
          <p>Count words or letters in text passages</p>
          <p style={{ fontSize: "13px", color: "#666", marginTop: "10px" }}>
            Worth 15% multiplier per point in main game
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice("g1t1")}
              className={practiceCompleted.g1t1 ? "completed" : ""}
            >
              {practiceCompleted.g1t1 ? "✓ Completed" : "Try Research"}
            </button>
          </div>
        </div>

        {/* Engagement third (was Typing) */}
        <div className="practice-card engagement">
          <h3>✉️ Engagement</h3>
          <p>Type patterns exactly as shown</p>
          <p style={{ fontSize: "13px", color: "#666", marginTop: "10px" }}>
            Worth 0.15% compound interest per point
          </p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice("g3t1")}
              className={practiceCompleted.g3t1 ? "completed" : ""}
            >
              {practiceCompleted.g3t1 ? "✓ Completed" : "Try Engagement"}
            </button>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#f5f5f5",
          borderRadius: "8px",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
          Practice Progress:
        </h4>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <div
            style={{
              padding: "8px 15px",
              background: practiceCompleted.g2t1 ? "#4CAF50" : "#e0e0e0",
              color: practiceCompleted.g2t1 ? "white" : "#666",
              borderRadius: "20px",
              fontSize: "14px",
            }}
          >
            Materials {practiceCompleted.g2t1 && "✓"}
          </div>
          <div
            style={{
              padding: "8px 15px",
              background: practiceCompleted.g1t1 ? "#9C27B0" : "#e0e0e0",
              color: practiceCompleted.g1t1 ? "white" : "#666",
              borderRadius: "20px",
              fontSize: "14px",
            }}
          >
            Research {practiceCompleted.g1t1 && "✓"}
          </div>
          <div
            style={{
              padding: "8px 15px",
              background: practiceCompleted.g3t1 ? "#f44336" : "#e0e0e0",
              color: practiceCompleted.g3t1 ? "white" : "#666",
              borderRadius: "20px",
              fontSize: "14px",
            }}
          >
            Engagement {practiceCompleted.g3t1 && "✓"}
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
          <li>
            AI is most reliable early on, might be less reliable as you progress
          </li>
          <li>Tasks auto-advance after completion (0.8s delay)</li>
          <li>Scoring: Exact = 2 pts, Within 1 = 1 pt, Otherwise = 0 pts</li>
        </ul>
      </div>

      {/* Start button */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
        {!isAdmin && !allComplete ? (
          <div
            style={{
              padding: "15px",
              background: "#fff3cd",
              borderRadius: "6px",
              border: "1px solid #ffc107",
              marginBottom: "15px",
            }}
          >
            <strong style={{ color: "#856404" }}>
              Complete all three practice tasks to unlock the main game
            </strong>
            <div
              style={{ marginTop: "10px", fontSize: "14px", color: "#856404" }}
            >
              {!practiceCompleted.g2t1 && "• Materials practice required"}
              {!practiceCompleted.g2t1 && <br />}
              {!practiceCompleted.g1t1 && "• Research practice required"}
              {!practiceCompleted.g1t1 && <br />}
              {!practiceCompleted.g3t1 && "• Engagement practice required"}
            </div>
          </div>
        ) : null}

        <button
          className="start-main-game-btn"
          onClick={onStartMainGame}
          style={{
            opacity: !isAdmin && !allComplete ? 0.5 : 1,
            cursor: !isAdmin && !allComplete ? "not-allowed" : "pointer",
          }}
          disabled={!isAdmin && !allComplete}
        >
          {isAdmin
            ? "Start Main Game (Admin)"
            : allComplete
            ? "Start Main Game - You're Ready! 🚀"
            : "Complete Practice First"}
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
            onComplete={handlePracticeTaskComplete}
            isPractice={true}
            currentTaskId={currentPractice}
          />
        )}

        {game === "2" && (
          <SliderTask
            taskNum={taskNum}
            onComplete={handlePracticeTaskComplete}
            isPractice={true}
            currentTaskId={currentPractice}
          />
        )}

        {game === "3" && (
          <TypingTask
            taskNum={taskNum}
            onComplete={handlePracticeTaskComplete}
            isPractice={true}
            currentTaskId={currentPractice}
          />
        )}
      </div>
    </div>
  );
}
