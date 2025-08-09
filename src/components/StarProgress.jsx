import React from "react";

export default function StarProgress({
  starGoals,
  categoryPoints,
  categoryMultipliers,
  timeRemaining,
}) {
  const totalPoints =
    categoryPoints.counting + categoryPoints.slider + categoryPoints.typing;
  const perfectionRate =
    starGoals.star3.totalAttempts > 0
      ? (
          (starGoals.star3.perfectCount / starGoals.star3.totalAttempts) *
          100
        ).toFixed(1)
      : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        minWidth: "300px",
        zIndex: 1000,
      }}
    >
      {/* Timer */}
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: timeRemaining < 60 ? "#f44336" : "#333",
          textAlign: "center",
          marginBottom: "15px",
        }}
      >
        {Math.floor(timeRemaining / 60)}:
        {(timeRemaining % 60).toString().padStart(2, "0")}
      </div>

      {/* Points by category */}
      <div style={{ marginBottom: "15px" }}>
        <div>🔢 Counting: {categoryPoints.counting} pts</div>
        <div>🎯 Slider: {categoryPoints.slider} pts</div>
        <div>⌨️ Typing: {categoryPoints.typing} pts</div>
        <div style={{ fontWeight: "bold", marginTop: "5px" }}>
          Total: {totalPoints} points
        </div>
      </div>

      {/* Star Goals */}
      <div>
        <h4 style={{ margin: "10px 0 5px 0" }}>Star Goals</h4>

        {/* Star 1 */}
        <div style={{ marginBottom: "8px" }}>
          <div>⭐ Star 1: {totalPoints}/25 pts</div>
          {starGoals.star1.achieved && (
            <div style={{ fontSize: "12px", color: "#4CAF50" }}>
              ✓ Bonus: {starGoals.star1.bonusEarned} (C×S×T)
            </div>
          )}
        </div>

        {/* Star 2 - shown after Star 1 */}
        {starGoals.star1.achieved && (
          <div style={{ marginBottom: "8px" }}>
            <div>⭐⭐ Star 2: Focus Category</div>
            <div style={{ fontSize: "12px" }}>
              Multipliers: C:{categoryMultipliers.counting.toFixed(1)}x S:
              {categoryMultipliers.slider.toFixed(1)}x T:
              {categoryMultipliers.typing.toFixed(1)}x
            </div>
          </div>
        )}

        {/* Star 3 */}
        <div>
          <div>⭐⭐⭐ Star 3: {totalPoints}/50 pts</div>
          <div style={{ fontSize: "12px" }}>
            Perfection: {perfectionRate}% ({starGoals.star3.perfectCount}/
            {starGoals.star3.totalAttempts})
          </div>
        </div>
      </div>
    </div>
  );
}
