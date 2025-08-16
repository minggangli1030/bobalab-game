// src/utils/sessionManager.js - Simplified for Student-First Access
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { codeVerification } from "./codeVerification";

export const sessionManager = {
  async checkAccess() {
    try {
      // Get the code from URL
      const urlCode = codeVerification.getCodeFromURL();

      // No code = need to login
      if (!urlCode) {
        return {
          allowed: false,
          reason: "Please login with your student ID",
          requiresCode: true,
        };
      }

      // Check if we have game config from StudentLogin
      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );

      // CASE 1: Fresh login with valid student ID or admin code
      if (gameConfig.studentId) {
        console.log(
          "✅ Valid student/admin login detected:",
          gameConfig.studentId
        );

        // Check if this code has been used before (in Firebase)
        try {
          const codeDoc = await getDoc(doc(db, "accessCodes", urlCode));

          if (codeDoc.exists()) {
            const codeData = codeDoc.data();

            // Code was used before - check if same session
            if (codeData.status === "used" && codeData.sessionId) {
              const existingSessionId = localStorage.getItem("sessionId");

              if (existingSessionId === codeData.sessionId) {
                // Same browser session - allow refresh
                console.log("✅ Same session refresh - allowing");
                return {
                  allowed: true,
                  resumeSession: codeData.sessionId,
                  code: urlCode,
                  codeData,
                };
              } else {
                // Different session - block replay
                console.log("❌ Code already used in different session");
                return {
                  allowed: false,
                  reason:
                    "This access code has already been used. Each code can only be used once.",
                  code: urlCode,
                };
              }
            }
          }

          // Code not in Firebase yet - first time use, allow!
          console.log("✅ First time using this code - allowing");
          return {
            allowed: true,
            newSession: true,
            code: urlCode,
            codeData: {
              status: "new",
              metadata: gameConfig,
            },
          };
        } catch (error) {
          // Firebase error - allow anyway for valid students
          console.log("⚠️ Firebase check failed, but valid student - allowing");
          return {
            allowed: true,
            newSession: true,
            code: urlCode,
            codeData: {
              status: "new",
              metadata: gameConfig,
            },
          };
        }
      }

      // CASE 2: No game config - might be a direct URL access or Qualtrics code
      // For now, block these since we're only doing student login
      console.log("❌ No valid student login found");
      return {
        allowed: false,
        reason: "Please login with your Berkeley student ID",
        requiresCode: true,
      };
    } catch (error) {
      console.error("Error in checkAccess:", error);

      // If we have a valid config, allow anyway
      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );
      if (gameConfig.studentId) {
        return {
          allowed: true,
          newSession: true,
          code: codeVerification.getCodeFromURL(),
          codeData: {
            status: "error_bypass",
            metadata: gameConfig,
          },
        };
      }

      return {
        allowed: false,
        reason: "System error. Please try again.",
        requiresCode: true,
      };
    }
  },

  async createSession(accessCode = null, codeData = null, isPractice = false) {
    try {
      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );

      // Create session in Firebase
      const sessionData = {
        id: crypto.randomUUID(),
        accessCode,
        studentId: gameConfig.studentId || null,
        role: gameConfig.role || "student",
        semesterDuration: gameConfig.semesterDuration || 1200000,
        displayName: gameConfig.displayName || "Student",
        startTime: serverTimestamp(),
        status: "active",
        completedTasks: {},
        isPractice: isPractice,
        isAdminSession: gameConfig.role === "admin",
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
      };

      const docRef = await addDoc(collection(db, "sessions"), sessionData);
      const sessionId = docRef.id;
      localStorage.setItem("sessionId", sessionId);

      // Now record this code as used (for blocking replays)
      if (accessCode && !isPractice) {
        try {
          // Store the code usage in Firebase
          await codeVerification.markCodeAsUsed(accessCode, sessionId);
        } catch (error) {
          console.log("Could not mark code as used, but continuing:", error);
        }
      }

      // Set up cleanup handler
      window.addEventListener("beforeunload", async () => {
        await this.handleSessionAbandonment();
      });

      console.log("✅ Session created:", sessionId);
      return sessionId;
    } catch (error) {
      console.error("Error creating session:", error);

      // Offline fallback
      const offlineId = "offline-" + Date.now();
      localStorage.setItem("sessionId", offlineId);

      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );
      const sessionData = {
        id: offlineId,
        accessCode,
        startTime: Date.now(),
        status: "active",
        isOffline: true,
        studentId: gameConfig.studentId || null,
        role: gameConfig.role || "student",
      };
      localStorage.setItem("offlineSession", JSON.stringify(sessionData));

      console.log("✅ Offline session created:", offlineId);
      return offlineId;
    }
  },

  async handleSessionAbandonment() {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId && !sessionId.startsWith("offline-")) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          status: "abandoned",
          abandonedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error marking session as abandoned:", error);
      }
    }
  },

  async getUserIP() {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return "unknown-" + Date.now();
    }
  },
};
