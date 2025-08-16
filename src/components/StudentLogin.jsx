// src/components/StudentLogin.jsx - Updated with Student ID validation
import React, { useState } from "react";
import { codeVerification } from "../utils/codeVerification";

export default function StudentLogin({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Student ID regex patterns
  const idPatterns = {
    legacy8: /^\d{8}$/, // 15177695
    legacy10: /^\d{10}$/, // 3031977170
    standard: /^30\d{8}$/, // 30xxxxxxxx format
  };

  // Master codes for testing - NO URL params needed!
  const MASTER_CODES = {
    "ADMIN-REGULAR": {
      role: "admin",
      semesterDuration: 1200000, // 20 min (same as normal gameplay)
      name: "Admin Regular Mode",
    },
    "ADMIN-FAST": {
      role: "admin",
      semesterDuration: 30000, // 30 sec for accelerated testing
      name: "Admin Fast Mode",
    },
  };

  // Sample valid student IDs (you'll replace with Google Sheets API call)
  const VALID_STUDENT_IDS = [
    "15177695",
    "18565110",
    "22900589",
    "26416809",
    "3031977170",
    "3036343361",
    "3039754031",
    "3039838870",
    "3039840443",
    "3039840222",
    "3039840209",
    "3039842887",
    "3039845630",
    "3039850713",
    "3039850622",
    "3039850570",
    "3039850830",
    "3040682661",
    "3040702603",
    "3040701758",
    "3040702343",
    "3040705047",
    "3040729812",
  ];

  const validateStudentId = (id) => {
    // Check master codes first
    if (MASTER_CODES[id]) {
      return { valid: true, type: "master", data: MASTER_CODES[id] };
    }

    // Check student ID formats
    for (const [type, pattern] of Object.entries(idPatterns)) {
      if (pattern.test(id)) {
        // Check if ID exists in database
        if (VALID_STUDENT_IDS.includes(id)) {
          return { valid: true, type: "student", format: type };
        }
        return { valid: false, error: "Student ID not found in registry" };
      }
    }

    return {
      valid: false,
      error: "Invalid ID format. Must be 8-10 digit Student ID",
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim()) {
      setError("Please enter your Student ID or access code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const validation = validateStudentId(identifier.trim());

      if (!validation.valid) {
        setError(validation.error || "Invalid Student ID");
        setLoading(false);
        return;
      }

      let codeData = {
        timestamp: new Date().toISOString(),
      };

      if (validation.type === "master") {
        // Handle master code
        codeData = {
          ...codeData,
          studentIdentifier: identifier,
          role: validation.data.role,
          semesterDuration: validation.data.semesterDuration,
          displayName: validation.data.name,
          isMasterCode: true,
        };
      } else {
        // Regular student
        codeData = {
          ...codeData,
          studentIdentifier: identifier,
          role: "student",
          semesterDuration: 1200000, // Normal 20 min
          displayName: `Student ${identifier}`,
          isMasterCode: false,
        };
      }

      const result = await codeVerification.createCode(codeData);

      if (result.success) {
        // Store the config in sessionStorage for the game to read
        sessionStorage.setItem(
          "gameConfig",
          JSON.stringify({
            semesterDuration: codeData.semesterDuration,
            role: codeData.role,
            studentId: identifier,
            displayName: codeData.displayName,
          })
        );

        // Redirect with the code
        window.location.href = `${window.location.origin}?code=${result.code}`;
      } else {
        setError("Failed to generate access code. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
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
          Teaching Challenge: Can you beat Park?
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "30px",
          }}
        >
          Enter your Student ID to access the game
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
              Berkeley Student ID:
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., 3040729812"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "2px solid #e0e0e0",
                borderRadius: "6px",
                boxSizing: "border-box",
                fontFamily: "monospace", // Makes IDs easier to read
              }}
            />
            <small
              style={{
                color: "#888",
                fontSize: "12px",
                marginTop: "4px",
                display: "block",
              }}
            >
              Valid formats: 8 digits (15177695) or 10 digits (30xxxxxxxx)
            </small>
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
              transition: "background 0.3s ease",
            }}
            onMouseOver={(e) =>
              !loading && (e.target.style.background = "#1976D2")
            }
            onMouseOut={(e) =>
              !loading && (e.target.style.background = "#2196F3")
            }
          >
            {loading ? "Verifying Student ID..." : "Access Game"}
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
          {/* Remove this in production - just for testing */}
          <details style={{ marginTop: "10px", fontSize: "12px" }}>
            <summary style={{ cursor: "pointer", color: "#aaa" }}>
              Test Codes
            </summary>
            <div style={{ marginTop: "8px", lineHeight: "1.6" }}>
              <div>ADMIN-REGULAR (20min)</div>
              <div>ADMIN-FAST (30s)</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
