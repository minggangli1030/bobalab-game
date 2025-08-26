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

  const handlePracticeTaskComplete = (taskId, data) => {
    // Only accept if perfect accuracy
    if (data.points === 2) {
      onPracticeComplete(taskId);
      // Auto-return to menu after completion
      setTimeout(() => {
        setCurrentPractice(null);
      }, 1500);
    } else {
      // Don't return to menu, let them retry
      setTimeout(() => {
        window.location.reload(); // Refresh the practice task
      }, 2000);
    }
  };

  const allComplete =
    practiceCompleted.g2t1 && practiceCompleted.g1t1 && practiceCompleted.g3t1;

  const renderPracticeMenu = () => (
    <div className="practice-menu">
      <h2>Practice Mode {!isAdmin && "(Required)"}</h2>

      {/* Combined warning box at the top */}
      {!isAdmin && (
        <div
          style={{
            background: "linear-gradient(135deg, #fff3cd 0%, #ffebee 100%)",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "25px",
            border: "2px solid #f57c00",
            boxShadow: "0 4px 6px rgba(245, 124, 0, 0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "24px" }}>⚠️</span>
            <h3
              style={{
                margin: 0,
                color: "#e65100",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              Required Practice - 100% Accuracy Needed
            </h3>
          </div>

          <p
            style={{
              color: "#bf360c",
              margin: "0 0 12px 0",
              fontWeight: "500",
            }}
          >
            You must complete all three practice tasks with perfect accuracy
            before starting the main game.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                padding: "8px",
                background: practiceCompleted.g2t1 ? "#e8f5e9" : "white",
                borderRadius: "6px",
                textAlign: "center",
                border: `1px solid ${
                  practiceCompleted.g2t1 ? "#4CAF50" : "#ffb74d"
                }`,
              }}
            >
              <div
                style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}
              >
                Materials
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  color: practiceCompleted.g2t1 ? "#4CAF50" : "#f57c00",
                }}
              >
                {practiceCompleted.g2t1 ? "✓ Complete" : "Required"}
              </div>
            </div>

            <div
              style={{
                padding: "8px",
                background: practiceCompleted.g1t1 ? "#e8f5e9" : "white",
                borderRadius: "6px",
                textAlign: "center",
                border: `1px solid ${
                  practiceCompleted.g1t1 ? "#4CAF50" : "#ffb74d"
                }`,
              }}
            >
              <div
                style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}
              >
                Research
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  color: practiceCompleted.g1t1 ? "#4CAF50" : "#f57c00",
                }}
              >
                {practiceCompleted.g1t1 ? "✓ Complete" : "Required"}
              </div>
            </div>

            <div
              style={{
                padding: "8px",
                background: practiceCompleted.g3t1 ? "#e8f5e9" : "white",
                borderRadius: "6px",
                textAlign: "center",
                border: `1px solid ${
                  practiceCompleted.g3t1 ? "#4CAF50" : "#ffb74d"
                }`,
              }}
            >
              <div
                style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}
              >
                Engagement
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  color: practiceCompleted.g3t1 ? "#4CAF50" : "#f57c00",
                }}
              >
                {practiceCompleted.g3t1 ? "✓ Complete" : "Required"}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "12px",
              padding: "8px",
              background: "rgba(255, 255, 255, 0.5)",
              borderRadius: "4px",
              fontSize: "13px",
              color: "#bf360c",
              textAlign: "center",
            }}
          >
            <strong>Remember:</strong> Exact = 2 pts (required) | Within 1 = 1
            pt (retry) | Otherwise = 0 pts (retry)
          </div>
        </div>
      )}

      <p
        className="practice-hint"
        style={{
          textAlign: "center",
          fontSize: "16px",
          color: "#666",
          marginBottom: "30px",
        }}
      >
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
          marginTop: "25px",
          padding: "15px",
          background: "#f5f5f5",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "16px" }}>
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

        <div style={{ marginTop: "12px", fontSize: "13px", color: "#666" }}>
          <strong>100% accuracy required</strong> to complete each practice task
        </div>
      </div>

      {/* Start button */}
      <div style={{ textAlign: "center", marginTop: "30px" }}>
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
