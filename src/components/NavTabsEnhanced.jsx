import React from "react";

export default function NavTabsEnhanced({
  current,
  completed,
  onSwitch,
  limitMode,
  taskPoints = {},
  categoryMultipliers = {},
  starGoals = {},
  categoryPoints = {},
  timeRemaining = null,
}) {
  // Generate all 45 tabs (15 per game)
  const tabs = [];
  for (let game = 1; game <= 3; game++) {
    for (let level = 1; level <= 15; level++) {
      const gameLabel = ["Research", "Materials", "Engage"][game - 1];
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
    1: "📚",
    2: "🎯",
    3: "✉️",
  };

  const gameNames = {
    1: "Research",
    2: "Materials",
    3: "Engagement",
  };

  const gameCategoryMap = {
    1: "research",
    2: "materials",
    3: "engagement",
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
    gameNum
  ) => {
    const baseColor = gameColors[gameNum];
    const intensity = getButtonColorIntensity(gameNum);
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
        : isAvailable
        ? "white"
        : "#f5f5f5",
      color: isCurrent
        ? "white"
        : isCompleted
        ? baseColor
        : isAvailable
        ? "#333"
        : "#999",
      cursor: isAvailable ? "pointer" : "not-allowed",
      transition: "all 0.2s",
      overflow: "hidden",
      boxShadow: isCurrent ? `0 2px 8px ${fadedColor}` : "none",
    };
  };

  // Calculate total points earned per game
  const getGamePoints = (gameNum) => {
    const gameTabs = gameGroups[gameNum];
    return gameTabs.reduce((sum, tab) => sum + (taskPoints[tab.id] || 0), 0);
  };

  // Calculate actual category points from categoryPoints prop
  const getTotalPoints = () => {
    if (categoryPoints) {
      return (
        (categoryPoints.materials || 0) +
        (categoryPoints.research || 0) +
        (categoryPoints.engagement || 0)
      );
    }
    return Object.values(taskPoints).reduce((sum, points) => sum + points, 0);
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
          const gamePoints = getGamePoints(gameNum);
          const categoryName = gameCategoryMap[gameNum];
          const hasMultiplier = categoryMultipliers[categoryName] > 0;

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
                boxShadow: hasMultiplier
                  ? `0 0 12px ${gameColors[gameNum]}30`
                  : "none",
                transition: "all 0.3s",
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

              {/* Points earned - use categoryPoints if available */}
              {categoryPoints && categoryPoints[categoryName] > 0 && (
                <span
                  style={{
                    fontSize: "12px",
                    color: gameColors[gameNum],
                    background: `${gameColors[gameNum]}20`,
                    padding: "2px 6px",
                    borderRadius: "10px",
                    fontWeight: "bold",
                  }}
                >
                  {categoryPoints[categoryName]} pts
                </span>
              )}

              {/* Multiplier indicator */}
              {hasMultiplier && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#ff9800",
                    background: "#fff3cd",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    fontWeight: "bold",
                    border: "1px solid #ffc107",
                  }}
                >
                  ×{categoryMultipliers[categoryName].toFixed(1)}
                </span>
              )}

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
                  const points = taskPoints[tab.id] || 0;

                  // Only show completed tasks and the next available one
                  if (!isCompleted && !isAvailable) return null;
                  if (!isCompleted && taskNum > completedInGame + 1)
                    return null;

                  return (
                    <button
                      key={tab.id}
                      disabled={!isAvailable}
                      onClick={() => isAvailable && onSwitch(tab.id)}
                      style={{
                        ...getButtonStyles(
                          tab,
                          isAvailable,
                          isCompleted,
                          isCurrent,
                          gameNum
                        ),
                        minWidth: "32px",
                        height: "32px",
                        padding: "4px",
                        fontSize: "12px",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (isAvailable && !isCurrent) {
                          e.currentTarget.style.transform = "scale(1.1)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isAvailable && !isCurrent) {
                          e.currentTarget.style.transform = "scale(1)";
                        }
                      }}
                    >
                      {taskNum}
                      {isCompleted && (
                        <>
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
                          {/* Points indicator */}
                          {points > 0 && (
                            <span
                              style={{
                                position: "absolute",
                                bottom: "2px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                fontSize: "6px",
                                color: gameColors[gameNum],
                                fontWeight: "bold",
                              }}
                            >
                              {"•".repeat(points)}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress summary with integrated star goals */}
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
        {/* Timer */}
        {timeRemaining !== null && (
          <div
            style={{
              fontSize: "16px",
              color: timeRemaining < 60 ? "#f44336" : "#333",
              fontWeight: "bold",
            }}
          >
            ⏱️ {Math.floor(timeRemaining / 60)}:
            {(timeRemaining % 60).toString().padStart(2, "0")}
          </div>
        )}

        <div style={{ fontSize: "14px", color: "#666" }}>
          <strong>Tasks Completed:</strong>{" "}
          <span style={{ color: "#333", fontSize: "16px", fontWeight: "bold" }}>
            {Object.keys(completed).length}
          </span>
        </div>

        <div style={{ fontSize: "14px", color: "#666" }}>
          <strong>Total Points:</strong>{" "}
          <span
            style={{ color: "#2196F3", fontSize: "16px", fontWeight: "bold" }}
          >
            {getTotalPoints()}
          </span>
        </div>

        {/* Compact Star Goals Display */}
        {starGoals && (
          <div style={{ display: "flex", gap: "15px", fontSize: "14px" }}>
            <span
              style={{ color: starGoals.star1?.achieved ? "#4CAF50" : "#999" }}
            >
              ⭐ {starGoals.star1?.achieved ? "✓" : "25pts"}
            </span>
            <span
              style={{ color: starGoals.star2?.achieved ? "#4CAF50" : "#999" }}
            >
              ⭐⭐ {starGoals.star2?.achieved ? "✓" : "20pts"}
            </span>
            <span
              style={{ color: starGoals.star3?.achieved ? "#4CAF50" : "#999" }}
            >
              ⭐⭐⭐ {starGoals.star3?.achieved ? "✓" : "50pts"}
            </span>
          </div>
        )}

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
                .replace("g1t", "Research ")
                .replace("g2t", "Materials ")
                .replace("g3t", "Engage ")}
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
