import React from "react";

export default function NavTabsEnhanced({
  current,
  completed,
  onSwitch,
  remainingTasks,
  limitMode,
}) {
  // Generate all 45 tabs (15 per game) but don't show total
  const tabs = [];
  for (let game = 1; game <= 3; game++) {
    for (let level = 1; level <= 15; level++) {
      const gameLabel = ["Count", "Slide", "Type"][game - 1];
      tabs.push({
        id: `g${game}t${level}`,
        label: `${gameLabel} ${level}`,
        game: game,
      });
    }
  }

  // Task availability logic remains the same
  const isTaskAvailable = (tab) => {
    const game = tab.id[1];
    const taskNum = parseInt(tab.id.substring(3));

    // First task of each game is always available
    if (taskNum === 1) {
      return true;
    }

    // For other tasks, check if previous task in same game is completed
    const previousTask = `g${game}t${taskNum - 1}`;
    return completed[previousTask] === true;
  };

  // Group tabs by game for better visualization
  const gameGroups = {
    1: tabs.filter((t) => t.game === 1),
    2: tabs.filter((t) => t.game === 2),
    3: tabs.filter((t) => t.game === 3),
  };

  const gameColors = {
    1: "#9C27B0", // Purple for counting
    2: "#4CAF50", // Green for slider
    3: "#f44336", // Red for typing
  };

  const gameIcons = {
    1: "🔢",
    2: "🎯",
    3: "⌨️",
  };

  const gameNames = {
    1: "Counting",
    2: "Slider",
    3: "Typing",
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  // Calculate color intensity based on completion count for each game
  const getButtonColorIntensity = (gameNum) => {
    const gameTabs = gameGroups[gameNum];
    const completedCount = gameTabs.filter((t) => completed[t.id]).length;
    // Scale from 0.2 (pale) to 1.0 (full color) based on completion
    const intensity = Math.min(0.2 + (completedCount / 15) * 0.8, 1.0);
    return intensity;
  };

  const getButtonStyles = (
    tab,
    isAvailable,
    isCompleted,
    isCurrent,
    gameNum,
    isBlocked
  ) => {
    const baseColor = gameColors[gameNum];
    const intensity = getButtonColorIntensity(gameNum);

    // Convert hex to RGB for manipulation
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    };

    const rgb = hexToRgb(baseColor);

    // Fade the color based on intensity
    const fadedColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`;
    const fadedBorderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${
      intensity * 0.8
    })`;
    const fadedBgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${
      intensity * 0.15
    })`;

    return {
      position: "relative",
      padding: "10px 4px",
      fontSize: "14px",
      fontWeight: isCurrent ? "bold" : "500",
      border: `2px solid ${
        isCurrent ? baseColor : isCompleted ? fadedBorderColor : "#e0e0e0"
      }`,
      borderRadius: "8px",
      background: isCurrent
        ? baseColor
        : isCompleted
        ? fadedBgColor
        : isAvailable && !isBlocked
        ? "white"
        : "#f5f5f5",
      color: isCurrent
        ? "white"
        : isCompleted
        ? baseColor
        : isAvailable && !isBlocked
        ? "#333"
        : "#999",
      cursor: isAvailable && !isBlocked ? "pointer" : "not-allowed",
      transition: "all 0.2s",
      overflow: "hidden",
      boxShadow: isCurrent ? `0 2px 8px ${fadedColor}` : "none",
    };
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        marginBottom: "20px",
      }}
    >
      {/* Task/Time limit indicator */}
      {limitMode && (
        <div
          style={{
            textAlign: "center",
            marginBottom: "20px",
            padding: "12px",
            background: limitMode === "tasks" ? "#f3e5f5" : "#e3f2fd",
            borderRadius: "8px",
            border: `2px solid ${
              limitMode === "tasks" ? "#9C27B0" : "#2196F3"
            }`,
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: limitMode === "tasks" ? "#9C27B0" : "#2196F3",
              marginBottom: "4px",
            }}
          >
            {limitMode === "tasks"
              ? `Tasks Remaining: ${remainingTasks}`
              : "⏱️ Time Challenge Mode"}
          </div>
          {limitMode === "tasks" && (
            <div
              style={{
                fontSize: "12px",
                color: "#666",
              }}
            >
              Choose your tasks strategically!
            </div>
          )}
        </div>
      )}

      {/* Navigation tabs - compact single line layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        {Object.entries(gameGroups).map(([gameNum, gameTabs]) => {
          const completedInGame = gameTabs.filter(
            (t) => completed[t.id]
          ).length;
          const intensity = getButtonColorIntensity(gameNum);

          return (
            <div
              key={gameNum}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px",
                background: `rgba(${hexToRgb(gameColors[gameNum]).r}, ${
                  hexToRgb(gameColors[gameNum]).g
                }, ${hexToRgb(gameColors[gameNum]).b}, 0.05)`,
                borderRadius: "8px",
                border: `1px solid ${gameColors[gameNum]}20`,
              }}
            >
              {/* Game icon */}
              <span style={{ fontSize: "20px" }}>{gameIcons[gameNum]}</span>

              {/* Game name */}
              <h4
                style={{
                  color: gameColors[gameNum],
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {gameNames[gameNum]}
              </h4>

              {/* Level indicator */}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "12px",
                  color: "#666",
                  background: `rgba(${intensity * 255}, ${intensity * 255}, ${
                    intensity * 255
                  }, 0.1)`,
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontWeight: "500",
                }}
              >
                Level {completedInGame + 1}
              </span>

              {/* Level buttons - horizontal */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  maxWidth: "200px",
                  overflowX: "auto",
                  overflowY: "hidden",
                  scrollbarWidth: "thin",
                }}
              >
                {gameTabs.map((tab) => {
                  const isAvailable = isTaskAvailable(tab);
                  const isCompleted = completed[tab.id];
                  const isCurrent = current === tab.id;
                  const taskNum = parseInt(tab.id.substring(3));
                  const isBlocked =
                    limitMode === "tasks" && remainingTasks <= 0 && !isCurrent;

                  // Only show completed tasks and the next available one
                  if (!isCompleted && !isAvailable) return null;
                  if (!isCompleted && taskNum > completedInGame + 1)
                    return null;

                  return (
                    <button
                      key={tab.id}
                      disabled={!isAvailable || isBlocked}
                      onClick={() =>
                        isAvailable && !isBlocked && onSwitch(tab.id)
                      }
                      style={{
                        ...getButtonStyles(
                          tab,
                          isAvailable,
                          isCompleted,
                          isCurrent,
                          gameNum,
                          isBlocked
                        ),
                        minWidth: "32px",
                        height: "32px",
                        padding: "4px",
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (isAvailable && !isBlocked && !isCurrent) {
                          e.currentTarget.style.transform = "scale(1.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isAvailable && !isBlocked && !isCurrent) {
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                    >
                      {taskNum}
                      {isCompleted && (
                        <span
                          style={{
                            position: "absolute",
                            top: "1px",
                            right: "1px",
                            fontSize: "8px",
                            color: gameColors[gameNum],
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress summary - only show completed count */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#f8f9fa",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ fontSize: "14px", color: "#666" }}>
          <strong>Tasks Completed:</strong>{" "}
          <span style={{ color: "#333", fontSize: "16px", fontWeight: "bold" }}>
            {Object.keys(completed).length}
          </span>
        </div>

        {current && (
          <div
            style={{
              fontSize: "14px",
              color: "#666",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <strong>Current:</strong>
            <span
              style={{
                background: current.startsWith("g1")
                  ? "#9C27B0"
                  : current.startsWith("g2")
                  ? "#4CAF50"
                  : "#f44336",
                color: "white",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {current
                .replace("g1t", "Count ")
                .replace("g2t", "Slide ")
                .replace("g3t", "Type ")}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
