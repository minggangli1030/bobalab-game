// src/utils/sessionManager.js - Fixed Version
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { codeVerification } from "./codeVerification";

export const sessionManager = {
  async checkAccess() {
    try {
      // First check if there's a code in the URL
      const urlCode = codeVerification.getCodeFromURL();

      // If no code, redirect to login
      if (!urlCode) {
        return {
          allowed: false,
          reason:
            "Access code required. Please access this game through your student login.",
          requiresCode: true,
        };
      }

      // CHECK FOR ADMIN CODES FIRST - bypass Firebase
      if (urlCode === "ADMIN-FAST" || urlCode === "ADMIN-REGULAR") {
        console.log("Admin code detected - bypassing all restrictions");
        return {
          allowed: true,
          newSession: true,
          code: urlCode,
          codeData: {
            isAdminCode: true,
            status: "admin",
            metadata: {
              isMasterCode: true,
              role: "admin",
              semesterDuration: urlCode === "ADMIN-FAST" ? 120000 : 1200000,
            },
          },
        };
      }

      // For regular codes, verify in Firebase
      const { valid, reason, codeData } = await codeVerification.verifyCode(
        urlCode
      );

      console.log("Code verification result:", { valid, reason, codeData });

      if (!valid) {
        // If code doesn't exist in Firebase, it might be a newly generated one
        // Check if we just came from StudentLogin (config exists in sessionStorage)
        const gameConfig = JSON.parse(
          sessionStorage.getItem("gameConfig") || "{}"
        );
        if (gameConfig.studentId) {
          console.log("New student session detected, allowing access");
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

        return {
          allowed: false,
          reason: reason || "Invalid access code",
          code: urlCode,
        };
      }

      // Code exists and is valid
      if (codeData.status === "used" && codeData.sessionId) {
        // Check if same browser session
        const existingSessionId = localStorage.getItem("sessionId");
        if (existingSessionId === codeData.sessionId) {
          // Same browser/session, allow continuation
          return {
            allowed: true,
            resumeSession: codeData.sessionId,
            code: urlCode,
            codeData,
          };
        }

        // For student codes that have been used, check if it's the same student
        const gameConfig = JSON.parse(
          sessionStorage.getItem("gameConfig") || "{}"
        );
        if (
          gameConfig.studentId &&
          codeData.metadata?.studentIdentifier === gameConfig.studentId
        ) {
          // Same student, allow new session
          console.log("Same student accessing again, allowing new session");
          return {
            allowed: true,
            newSession: true,
            code: urlCode,
            codeData,
          };
        }

        // Different browser/session and different student
        return {
          allowed: false,
          reason: "This code has already been used.",
          code: urlCode,
        };
      }

      // Code is unused, allow access
      return {
        allowed: true,
        newSession: true,
        code: urlCode,
        codeData,
      };
    } catch (error) {
      console.error("Error checking access:", error);

      // On error, check if we have a valid session config
      const gameConfig = JSON.parse(
        sessionStorage.getItem("gameConfig") || "{}"
      );
      if (gameConfig.studentId) {
        console.log("Error but valid config found, allowing access");
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
        reason: "System error. Please try again or contact support.",
        requiresCode: true,
      };
    }
  },

  async createSession(accessCode = null, codeData = null, isPractice = false) {
    try {
      const ip = await this.getUserIP();
      const sessionData = {
        id: crypto.randomUUID(),
        ip,
        accessCode,
        qualtricsData: codeData?.metadata || null,
        startTime: serverTimestamp(),
        status: "active",
        completedTasks: {},
        events: [],
        chatHistory: [],
        numPrompts: 0,
        bonusPrompts: 0,
        practiceCompleted: false,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        source: accessCode ? "qualtrics" : "direct",
        isPractice: isPractice,
        isAdminSession: codeData?.isAdminCode || false,
      };

      const docRef = await addDoc(collection(db, "sessions"), sessionData);
      localStorage.setItem("sessionId", docRef.id);

      // Only mark code as used for real student sessions
      if (
        accessCode &&
        !isPractice &&
        !codeData?.isAdminCode &&
        codeData?.status !== "error_bypass"
      ) {
        // Only try to mark as used if the code exists in Firebase
        if (codeData?.status !== "new") {
          await codeVerification.markCodeAsUsed(accessCode, docRef.id);
        }
      }

      // Set up beforeunload handler
      window.addEventListener("beforeunload", async (e) => {
        await this.handleSessionAbandonment();
      });

      return docRef.id;
    } catch (error) {
      console.error("Error creating session:", error);
      // Fallback for offline mode
      const offlineId = "offline-" + Date.now();
      localStorage.setItem("sessionId", offlineId);
      const sessionData = {
        id: offlineId,
        accessCode,
        startTime: Date.now(),
        status: "active",
        isOffline: true,
      };
      localStorage.setItem("offlineSession", JSON.stringify(sessionData));
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
