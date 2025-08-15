// src/components/StudentLogin.jsx - Updated with Oski Bear example
import React, { useState } from "react";
import { codeVerification } from "../utils/codeVerification";

export default function StudentLogin({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim()) {
      setError("Please enter your name, email, or student ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // For now, generate a code directly
      // Later you can implement the student registry check
      const result = await codeVerification.createCode({
        studentIdentifier: identifier,
        timestamp: new Date().toISOString(),
      });

      if (result.success) {
        // Redirect with the code
        window.location.href = `${window.location.origin}?code=${result.code}`;
      } else {
        setError("Failed to generate access code. Please try again.");
      }
    } catch (err) {
      setError("System error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "10px",
            color: "#333",
          }}
        >
          Can you beat Park?
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Enter your information to access the game
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#555",
                fontWeight: "500",
              }}
            >
              Name, Email, or Student ID:
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., Oski Bear or oskibear@berkeley.edu"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "2px solid #e0e0e0",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: "#ffebee",
                color: "#c62828",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "16px",
              fontWeight: "bold",
              background: loading ? "#ccc" : "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Processing..." : "Access Game"}
          </button>
        </form>

        <div
          style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop: "1px solid #e0e0e0",
            fontSize: "14px",
            color: "#888",
            textAlign: "center",
          }}
        >
          <p>Having trouble? Contact your instructor.</p>
        </div>
      </div>
    </div>
  );
}
