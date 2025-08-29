// src/components/StudentLogin.jsx - Updated with experimental conditions
import React, { useState } from "react";
import { codeVerification } from "../utils/codeVerification";

export default function StudentLogin({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTestCodes, setShowTestCodes] = useState(false);

  // Student ID regex patterns
  const idPatterns = {
    legacy8: /^\d{8}$/,
    legacy10: /^\d{10}$/,
    standard: /^30\d{8}$/,
  };

  // Master codes for testing - with new experimental conditions
  const MASTER_CODES = {
    // Able to refresh student access
    "ADMIN-MASTER": {
      role: "master_admin",
      name: "Master Administrator",
      hasAI: false,
      isMasterInterface: true,
    },

    // Internal testing codes - like student mode but with infinite attempts
    ...Array.from({ length: 10 }, (_, i) => ({
      [`ADMIN-TEST${i + 1}`]: {
        role: "test",
        semesterDuration: 720000, // 12 min like students
        name: `Test User ${i + 1}`,
        hasAI: true,
        checkpointSemester2: true,
        isTestCode: true,
      },
    })).reduce((acc, obj) => ({ ...acc, ...obj }), {}),

    // Original admin codes (kept the same)
    "ADMIN-REGULAR": {
      role: "admin",
      semesterDuration: 720000, // 12 min
      name: "Admin Regular Mode",
      hasAI: true,
      checkpointSemester2: true,
    },
    "ADMIN-FAST": {
      role: "admin",
      semesterDuration: 120000, // 2 minutes
      name: "Admin Fast Mode",
      hasAI: true,
      checkpointSemester2: true,
    },

    // New experimental admin codes
    "ADMIN-1-CP": {
      role: "admin",
      semesterDuration: 120000, // 2 minutes for testing
      name: "Admin Section 1 WITH Checkpoint",
      hasAI: false, // Section 01A - no AI
      checkpointSemester2: true,
    },
    "ADMIN-1-NCP": {
      role: "admin",
      semesterDuration: 120000, // 2 minutes for testing
      name: "Admin Section 1 NO Checkpoint",
      hasAI: false, // Section 01A - no AI
      checkpointSemester2: false,
    },
    "ADMIN-2-CP": {
      role: "admin",
      semesterDuration: 120000, // 2 minutes for testing
      name: "Admin Section 2 WITH Checkpoint",
      hasAI: true, // Section 02A - AI available
      checkpointSemester2: true,
    },
    "ADMIN-2-NCP": {
      role: "admin",
      semesterDuration: 120000, // 2 minutes for testing
      name: "Admin Section 2 NO Checkpoint",
      hasAI: true, // Section 02A - AI available
      checkpointSemester2: false,
    },
  };

  // Student IDs from actual rosters - evenly distributed
  const CLASS_1A_ID_CHECKPOINT = [
    "3040748714",
    "3040729812",
    "3040859968",
    "3040852909",
    "3040869211",
    "3040849958",
    "3039838870",
    "15177695",
    "3040849997",
    "3039845630",
    "3040682661",
    "26416809",
    "3039850622",
    "3040869510",
    "3031977170",
    "3040806629",
    "3040848528",
    "3039840443",
    "3040848749",
    "3040849893",
    "3039850830",
    "3039850713",
  ];

  const CLASS_1A_ID_NOCHECKPOINT = [
    "3040850023",
    "22900589",
    "3039850570",
    "3040882302",
    "3040815651",
    "3040701758",
    "3040852077",
    "3036343361",
    "3040869458",
    "3040705047",
    "3040702343",
    "3039842887",
    "3040848593",
    "3040702603",
    "3039840222",
    "3039840209",
    "3040861190",
    "18565110",
    "3040869302",
    "3040814338",
    "3039754031",
  ];

  const CLASS_2A_ID_CHECKPOINT = [
    "3040705476",
    "3040697715",
    "3039753992",
    "3040729513",
    "3040681595",
    "3040850010",
    "3032682772",
    "3039842484",
    "3040869445",
    "3040814455",
    "3039840781",
    "3040696831",
    "3040705125",
    "3034184066",
    "3039843004",
    "3039842835",
    "3040860072",
    "3040871018",
    "3039839026",
    "3040814429",
    "3040869094",
    "3040748064",
    "3040875945",
    "3040701589",
    "3040682193",
    "3040729422",
    "3040836165",
    "21798975",
    "3038626424",
    "3039753017",
    "3039840287",
    "3040806382",
  ];

  const CLASS_2A_ID_NOCHECKPOINT = [
    "25958106",
    "3040814351",
    "3040848697",
    "3040684039",
    "3040869289",
    "22971551",
    "3040837218",
    "3040864570",
    "3040705099",
    "3034288430",
    "3040848541",
    "3040864531",
    "3040869237",
    "3032342054",
    "3040682479",
    "3039840170",
    "3032397447",
    "3039850856",
    "3039840118",
    "3040729552",
    "3040683181",
    "3040861073",
    "3031968434",
    "3040882575",
    "3035320237",
    "3040823815",
    "3039842575",
    "24261697",
    "23420611",
    "3032000089",
    "3040882341",
  ];

  // Combine all valid student IDs
  const VALID_STUDENT_IDS = [
    ...CLASS_1A_ID_CHECKPOINT,
    ...CLASS_1A_ID_NOCHECKPOINT,
    ...CLASS_2A_ID_CHECKPOINT,
    ...CLASS_2A_ID_NOCHECKPOINT,
  ];

  // Determine experimental condition for a student
  const getStudentCondition = (studentId) => {
    const isSection1 =
      CLASS_1A_ID_CHECKPOINT.includes(studentId) ||
      CLASS_1A_ID_NOCHECKPOINT.includes(studentId);
    const isSection2 =
      CLASS_2A_ID_CHECKPOINT.includes(studentId) ||
      CLASS_2A_ID_NOCHECKPOINT.includes(studentId);

    const hasCheckpoint =
      CLASS_1A_ID_CHECKPOINT.includes(studentId) ||
      CLASS_2A_ID_CHECKPOINT.includes(studentId);

    return {
      section: isSection1 ? "01A" : isSection2 ? "02A" : "unknown",
      hasAI: isSection2, // Section 02A gets AI
      checkpointSemester2: hasCheckpoint,
      displayName: `Student ${studentId} (${isSection1 ? "01A" : "02A"}-${
        hasCheckpoint ? "CP" : "NCP"
      })`,
    };
  };

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
          const condition = getStudentCondition(id);
          return {
            valid: true,
            type: "student",
            format: type,
            condition,
          };
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
      setError("Please enter your Student ID");
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
          section: validation.data.isTestCode ? "ADMIN-TEST" : "ADMIN", // Add section field
          hasAI: validation.data.hasAI,
          checkpointSemester2: validation.data.checkpointSemester2,
          isMasterCode: true,
          isTestCode: validation.data.isTestCode || false,
          isMasterInterface: validation.data.isMasterInterface || false,
        };

        // Special redirect for master admin
        if (validation.data.isMasterInterface) {
          sessionStorage.setItem(
            "gameConfig",
            JSON.stringify({
              role: "master_admin",
              displayName: validation.data.name,
              section: "master_admin",
              hasAI: true,
              checkpointSemester2: true,
            })
          );

          window.location.href = `${window.location.origin}?master=true`;
          return;
        }
      } else {
        // Regular student - apply experimental condition
        const condition = validation.condition;
        codeData = {
          ...codeData,
          studentIdentifier: identifier,
          role: "student",
          semesterDuration: 720000, // Normal 12 min
          displayName: condition.displayName,
          section: condition.section,
          hasAI: condition.hasAI,
          checkpointSemester2: condition.checkpointSemester2,
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
            section: codeData.section,
            hasAI: codeData.hasAI,
            checkpointSemester2: codeData.checkpointSemester2,
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
            Scheduling Challenge:
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
                e.target.style.borderColor = "#2196F3";
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
              background: loading ? "#cbd5e0" : "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: loading
                ? "none"
                : "0 4px 6px rgba(33, 150, 243, 0.25)",
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
            Having trouble? Contact your instructor:
          </p>

          <p
            style={{
              fontSize: "16px",
              color: "#2196F3",
              fontWeight: "500",
            }}
          >
            Park Sinchaisri
            <br />
            <a
              href="mailto:parksinchaisri@haas.berkeley.edu"
              style={{
                color: "#2196F3",
                textDecoration: "none",
                borderBottom: "1px solid #2196F3",
                fontSize: "15px",
              }}
            >
              parksinchaisri@haas.berkeley.edu
            </a>
          </p>

          {/* Admin codes display for testing - you can toggle this */}
          {showTestCodes && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                background: "#f7fafc",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#4a5568",
                lineHeight: "1.8",
              }}
            >
              <strong>Test Codes:</strong>
              <div style={{ marginTop: "8px", fontFamily: "monospace" }}>
                <div>ADMIN-TEST1 to ADMIN-TEST10 (Test users)</div>
                <div>ADMIN-1-CP (No AI, With Checkpoint)</div>
                <div>ADMIN-1-NCP (No AI, No Checkpoint)</div>
                <div>ADMIN-2-CP (AI, With Checkpoint)</div>
                <div>ADMIN-2-NCP (AI, No Checkpoint)</div>
                <div>ADMIN-REGULAR (Original)</div>
                <div>ADMIN-FAST (2 min test)</div>
                <div>ADMIN-MASTER (Master interface)</div>
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
