// src/utils/codeVerification.js - Code Verification System
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export const codeVerification = {
  // Generate a unique code for Qualtrics
  generateCode() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`.toUpperCase();
  },

  // In createCode function, make it simpler for student IDs
  async createCode(qualtricsData = {}) {
    const code = this.generateCode();

    // For student logins, we don't need to store in Firebase immediately
    // The session manager will handle it
    if (qualtricsData.studentIdentifier) {
      console.log("Student code generated:", code);
      return { success: true, code };
    }

    // For other codes, store in Firebase
    const codeData = {
      code,
      createdAt: serverTimestamp(),
      status: "unused",
      qualtricsResponseId: qualtricsData.responseId || null,
      qualtricsUserId: qualtricsData.userId || null,
      metadata: qualtricsData,
      usedAt: null,
      sessionId: null,
    };

    try {
      await setDoc(doc(db, "accessCodes", code), codeData);
      return { success: true, code };
    } catch (error) {
      console.error("Error creating code:", error);
      // Even on Firebase error, return the code for student use
      return { success: true, code };
    }
  },

  async verifyCode(code) {
    if (!code) {
      return { valid: false, reason: "No code provided" };
    }

    try {
      // CHECK FOR ADMIN CODES FIRST - bypass Firebase completely
      if (code === "ADMIN-FAST" || code === "ADMIN-REGULAR") {
        return {
          valid: true,
          codeData: {
            code,
            status: "admin",
            isAdminCode: true,
            createdAt: { toDate: () => new Date() },
            metadata: {
              isMasterCode: true,
              role: "admin",
              semesterDuration: code === "ADMIN-FAST" ? 120000 : 1200000,
            },
          },
        };
      }

      // Regular code verification for students
      const codeDoc = await getDoc(doc(db, "accessCodes", code));

      if (!codeDoc.exists()) {
        return { valid: false, reason: "Invalid code" };
      }

      const codeData = codeDoc.data();

      // Check if code has been used (only for non-admin codes)
      if (codeData.status === "used") {
        return {
          valid: false,
          reason: "Code already used",
          usedAt: codeData.usedAt,
        };
      }

      // Check if code is expired (24 hours)
      const createdAt = codeData.createdAt?.toDate();
      const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
      if (createdAt && Date.now() - createdAt.getTime() > expiryTime) {
        return { valid: false, reason: "Code expired" };
      }

      return { valid: true, codeData };
    } catch (error) {
      console.error("Error verifying code:", error);
      return {
        valid: false,
        reason: "Verification error",
        error: error.message,
      };
    }
  },

  // Mark code as used
  async markCodeAsUsed(code, sessionId) {
    try {
      await updateDoc(doc(db, "accessCodes", code), {
        status: "used",
        usedAt: serverTimestamp(),
        sessionId,
      });
      return { success: true };
    } catch (error) {
      console.error("Error marking code as used:", error);
      return { success: false, error: error.message };
    }
  },

  // Get code from URL parameters
  getCodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("code") || params.get("c") || null;
  },
};
