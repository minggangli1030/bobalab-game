// src/utils/sessionManager.js - Code Required Version
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

      // ENFORCE CODE REQUIREMENT
      if (!urlCode) {
        return {
          allowed: false,
          reason:
            "Access code required. Please access this game through your Qualtrics survey.",
          requiresCode: true,
        };
      }

      // Verify the code
      const { valid, reason, codeData } = await codeVerification.verifyCode(
        urlCode
      );

      if (!valid) {
        return {
          allowed: false,
          reason: `Invalid or expired access code: ${reason}`,
          code: urlCode,
        };
      }

      // Code is valid, check if it's already been used for a real session
      if (codeData.status === "used" && codeData.sessionId) {
        // Check if this is the same browser/session
        const existingSessionId = localStorage.getItem("sessionId");

        // For admin codes, always allow reuse
        if (codeData.metadata?.isMasterCode) {
          return {
            allowed: true,
            resumeSession: existingSessionId || codeData.sessionId,
            code: urlCode,
            codeData,
          };
        }

        // For regular codes, check if same session
        if (existingSessionId === codeData.sessionId) {
          // Same browser/session, allow continuation
          return {
            allowed: true,
            resumeSession: codeData.sessionId,
            code: urlCode,
            codeData,
          };
        } else {
          // Different browser/session - still allow for testing
          console.warn("Code already used, but allowing for testing");
          return {
            allowed: true,
            newSession: true,
            code: urlCode,
            codeData,
          };
        }
      }

      return {
        allowed: true,
        newSession: true,
        code: urlCode,
        codeData,
      };
    } catch (error) {
      console.error("Error checking access:", error);
      // On error, still require code
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
      };

      const docRef = await addDoc(collection(db, "sessions"), sessionData);
      localStorage.setItem("sessionId", docRef.id);

      // Only mark code as used if this is NOT practice mode
      if (accessCode && !isPractice) {
        await codeVerification.markCodeAsUsed(accessCode, docRef.id);
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
      localStorage.setItem(
        "offlineSession",
        JSON.stringify({ ...sessionData, id: offlineId })
      );
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
