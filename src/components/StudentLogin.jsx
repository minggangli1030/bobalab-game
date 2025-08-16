// src/components/StudentLogin.jsx - Updated with better styling and 2-minute ADMIN-FAST
import React, { useState } from "react";
import { codeVerification } from "../utils/codeVerification";

export default function StudentLogin({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTestCodes, setShowTestCodes] = useState(false); // Keep hidden by default

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
      semesterDuration: 120000, // 2 minutes for accelerated testing
      name: "Admin Fast Mode",
    },
  };

  // Unique student IDs (from rosters)
  // Last update: Aug 16, 2025
  const VALID_STUDENT_IDS = [
    "15177695",
    "18565110",
    "21798975",
    "22900589",
    "22971551",
    "23420611",
    "24261697",
    "25958106",
    "26416809",
    "3031968434",
    "3031977170",
    "3032000089",
    "3032342054",
    "3032397447",
    "3032682772",
    "3034184066",
    "3034288430",
    "3035320237",
    "3036343361",
    "3038626424",
    "3039181346",
    "3039196678",
    "3039226296",
    "3039245851",
    "3039252561",
    "3039253994",
    "3039279366",
    "3039307062",
    "3039313126",
    "3039330491",
    "3039332796",
    "3039343785",
    "3039356905",
    "3039372653",
    "3039387750",
    "3039423113",
    "3039429600",
    "3039440462",
    "3039447821",
    "3039448942",
    "3039454402",
    "3039454743",
    "3039459912",
    "3039464285",
    "3039474962",
    "3039477500",
    "3039485435",
    "3039504127",
    "3039511148",
    "3039514274",
    "3039522295",
    "3039534730",
    "3039540427",
    "3039553990",
    "3039571350",
    "3039586743",
    "3039594081",
    "3039604285",
    "3039607426",
    "3039611945",
    "3039624813",
    "3039630162",
    "3039635730",
    "3039638610",
    "3039648042",
    "3039651737",
    "3039653712",
    "3039658764",
    "3039664812",
    "3039674172",
    "3039683621",
    "3039687343",
    "3039706821",
    "3039720661",
    "3039729401",
    "3039735177",
    "3039743112",
    "3039749461",
    "3039754031",
    "3039761821",
    "3039766830",
    "3039771602",
    "3039774455",
    "3039785131",
    "3039789460",
    "3039795320",
    "3039802286",
    "3039810624",
    "3039822461",
    "3039832611",
    "3039838870",
    "3039840209",
    "3039840222",
    "3039840443",
    "3039842887",
    "3039845630",
    "3039850570",
    "3039850622",
    "3039850713",
    "3039850830",
    "3040682661",
    "3040701758",
    "3040702343",
    "3040702603",
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
        background: "#f5f5f5", // Back to clean minimalist background
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "48px",
          borderRadius: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1a202c",
              marginBottom: "8px",
              lineHeight: "1.2",
            }}
          >
            Scedueling Challenge:
            <br />
            Can you beat Park?
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "#718096",
              marginTop: "12px",
            }}
          >
            Enter your Student ID to access the game
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#2d3748",
                fontWeight: "600",
                fontSize: "14px",
                textTransform: "uppercase",
                letterSpacing: "0.025em",
              }}
            >
              Berkeley Student ID:
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "16px",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontFamily: "'SF Mono', Monaco, 'Courier New', monospace",
                transition: "all 0.2s ease",
                background: "#f7fafc",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#2196F3"; // Blue instead of purple
                e.target.style.background = "white";
                e.target.style.boxShadow = "0 0 0 3px rgba(33, 150, 243, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.background = "#f7fafc";
                e.target.style.boxShadow = "none";
              }}
            />
            <div
              style={{
                marginTop: "8px",
                fontSize: "13px",
                color: "#a0aec0",
                lineHeight: "1.4",
              }}
            >
              Valid formats: 8 digits or 10 digits (303xxxxxxx)
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "#fed7d7",
                color: "#c53030",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "24px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                border: "1px solid #fc8181",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ marginRight: "8px", flexShrink: 0 }}
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 24px",
              fontSize: "16px",
              fontWeight: "600",
              background: loading ? "#cbd5e0" : "#2196F3", // Simple blue instead of gradient
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: loading
                ? "none"
                : "0 4px 6px rgba(33, 150, 243, 0.25)", // Match blue color
              transform: loading ? "none" : "translateY(0)",
            }}
            onMouseDown={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(2px)";
                e.target.style.boxShadow = "0 2px 4px rgba(33, 150, 243, 0.25)";
              }
            }}
            onMouseUp={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 6px rgba(33, 150, 243, 0.25)";
              }
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.background = "#1976D2";
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.background = "#2196F3";
              }
            }}
          >
            {loading ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  className="animate-spin"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    marginRight: "8px",
                    animation: "spin 1s linear infinite",
                  }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeOpacity="0.25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
                Verifying Student ID...
              </span>
            ) : (
              "Access Game"
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#718096",
              marginBottom: "12px",
            }}
          >
            Having trouble? Contact your instructor.
          </p>

          {showTestCodes && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "#f7fafc",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#4a5568",
                lineHeight: "1.6",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    padding: "6px 12px",
                    background: "white",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    fontFamily: "monospace",
                  }}
                >
                  <strong>ADMIN-REGULAR</strong>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#718096",
                      marginTop: "2px",
                    }}
                  >
                    20 minutes
                  </div>
                </div>
                <div
                  style={{
                    padding: "6px 12px",
                    background: "white",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    fontFamily: "monospace",
                  }}
                >
                  <strong>ADMIN-FAST</strong>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#718096",
                      marginTop: "2px",
                    }}
                  >
                    2 minutes
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add spinning animation keyframes */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
