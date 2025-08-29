// Core fixes for the main tracking issues
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export const eventTracker = {
  // Initialize session properly when module loads
  init() {
    if (!localStorage.getItem("sessionId")) {
      localStorage.setItem("sessionId", this.generateSessionId());
      localStorage.setItem("sessionStartTime", Date.now().toString());
    }
    // Initialize semester time if not set
    if (!localStorage.getItem("semesterStartTime")) {
      localStorage.setItem("semesterStartTime", Date.now().toString());
    }
  },

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Core event logging function - FIXED
  async logEvent(eventType, eventData) {
    const sessionId =
      localStorage.getItem("sessionId") || this.generateSessionId();
    const sessionStartTime = parseInt(
      localStorage.getItem("sessionStartTime") || Date.now()
    );
    const currentTime = Date.now();
    const timeElapsed = currentTime - sessionStartTime;

    // Format time in seconds with 1 decimal
    const timeElapsedSeconds = (timeElapsed / 1000).toFixed(1);

    // Format readable timestamp (mm:ss)
    const minutes = Math.floor(timeElapsed / 60000);
    const seconds = Math.floor((timeElapsed % 60000) / 1000);
    const readableTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    const event = {
      sessionId,
      type: eventType,
      timestamp: new Date().toISOString(), // Always ISO format
      clientTimestamp: currentTime, // Keep as milliseconds for consistency
      timeElapsedSeconds: parseFloat(timeElapsedSeconds), // Time since session start in seconds
      readableTime,
      semesterTime: this.getSemesterTime(),
      ...this.convertTimesToSeconds(eventData), // Convert all time fields to seconds
      // REMOVED: userAgent and screenResolution
    };

    try {
      await addDoc(collection(db, "events"), event);
    } catch (error) {
      console.error("Failed to log event:", error);
      this.storeOfflineEvent(event);
    }
  },

  // Convert all time fields to seconds with 1 decimal
  convertTimesToSeconds(data) {
    const converted = { ...data };
    const timeFields = [
      "timeTaken",
      "timeSpent",
      "totalTime",
      "timeOnPreviousPage",
      "averageTime",
      "timeBetweenHelpAndSubmit",
    ];

    for (const field of timeFields) {
      if (converted[field] !== undefined && converted[field] !== null) {
        // Assume input is in milliseconds, convert to seconds
        converted[`${field}Seconds`] = (converted[field] / 1000).toFixed(1);
        delete converted[field]; // Remove the millisecond version
      }
    }

    // Handle arrays of times
    if (converted.timeProgression) {
      converted.timeProgressionSeconds = converted.timeProgression.map((t) =>
        (t / 1000).toFixed(1)
      );
      delete converted.timeProgression;
    }

    if (converted.timePerAttempt) {
      converted.timePerAttemptSeconds = converted.timePerAttempt.map((t) =>
        (t / 1000).toFixed(1)
      );
      delete converted.timePerAttempt;
    }

    return converted;
  },

  // Fixed semester time calculation
  getSemesterTime() {
    const semesterStartTime = parseInt(
      localStorage.getItem("semesterStartTime") || Date.now()
    );
    const elapsed = Date.now() - semesterStartTime;
    const elapsedSeconds = (elapsed / 1000).toFixed(1);
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    return {
      elapsedSeconds: parseFloat(elapsedSeconds),
      readable: `${minutes}:${seconds.toString().padStart(2, "0")}`,
      minutes,
      seconds,
    };
  },

  // Fixed context tracking with proper session duration
  getCurrentContext() {
    const sessionStartTime = parseInt(
      localStorage.getItem("sessionStartTime") || Date.now()
    );
    const sessionDurationSeconds = (
      (Date.now() - sessionStartTime) /
      1000
    ).toFixed(1);

    return {
      currentTask: localStorage.getItem("currentTask"),
      gameMode: localStorage.getItem("gameMode"),
      totalCompleted: this.getCompletedTaskCount(),
      currentStreak: this.getCurrentStreak(),
      sessionDurationSeconds: parseFloat(sessionDurationSeconds),
    };
  },

  // Fixed improvement trend calculation - needs at least 3 data points
  calculateImprovementTrend(history) {
    if (!history || history.length < 3) {
      return "needs_more_data"; // Changed from "insufficient_data" for clarity
    }

    const recentHistory = history.slice(-5); // Last 5 attempts
    const accuracies = recentHistory.map((h) => h.accuracy);
    const trend = this.calculateTrend(accuracies);

    if (trend > 5) return "rapid_improvement";
    if (trend > 2) return "steady_improvement";
    if (trend > 0) return "slight_improvement";
    if (trend > -2) return "stable";
    if (trend > -5) return "slight_decline";
    return "rapid_decline";
  },

  // Fixed improvement rate to handle small datasets
  calculateImprovementRate(history) {
    if (!history || history.length < 2) {
      return {
        overall: 0,
        trend: 0,
        isImproving: false,
        dataPoints: history ? history.length : 0,
      };
    }

    const firstAccuracy = history[0].accuracy;
    const lastAccuracy = history[history.length - 1].accuracy;
    const improvement = lastAccuracy - firstAccuracy;

    // Only calculate trend if we have enough data
    if (history.length < 3) {
      return {
        overall: improvement,
        trend: improvement, // Simple difference for 2 points
        isImproving: improvement > 0,
        dataPoints: history.length,
      };
    }

    // For 3+ points, calculate proper trend
    const midPoint = Math.floor(history.length / 2);
    const firstHalfAvg =
      history.slice(0, midPoint).reduce((sum, h) => sum + h.accuracy, 0) /
      midPoint;
    const secondHalfAvg =
      history.slice(midPoint).reduce((sum, h) => sum + h.accuracy, 0) /
      (history.length - midPoint);
    const trend = secondHalfAvg - firstHalfAvg;

    return {
      overall: improvement,
      trend: trend,
      isImproving: trend > 0,
      dataPoints: history.length,
    };
  },

  // Ensure time tracking is properly initialized
  setPageStartTime(pageId) {
    if (!pageId) return;
    localStorage.setItem(`pageStartTime_${pageId}`, Date.now().toString());
  },

  getTimeOnCurrentPage(pageId) {
    if (!pageId) return 0;
    const startTime = localStorage.getItem(`pageStartTime_${pageId}`);
    return startTime ? Date.now() - parseInt(startTime) : 0;
  },

  // Helper to ensure session is always initialized
  ensureSession() {
    if (!localStorage.getItem("sessionId")) {
      this.init();
    }
  },

  // Missing methods that are being called
  async trackAIHelpResponse(taskId, data) {
    return this.logEvent("ai_help_response", {
      taskId,
      ...data,
    });
  },

  async trackTaskAttempt(taskId, data) {
    return this.logEvent("task_attempt", {
      taskId,
      ...data,
    });
  },

  async trackUserAction(action, data) {
    return this.logEvent("user_action", {
      action,
      ...data,
    });
  },

  async syncOfflineEvents() {
    // Placeholder for offline sync functionality
    console.log("Syncing offline events...");
    return Promise.resolve();
  },

  async trackTaskComplete(taskId, data) {
    return this.logEvent("task_complete", {
      taskId,
      ...data,
    });
  },

  async trackPageSwitch(from, to, isAutoAdvance) {
    return this.logEvent("page_switch", {
      from,
      to,
      isAutoAdvance,
    });
  },

  trackAITaskHelp(taskType, data) {
    return this.logEvent("ai_task_help", {
      taskType,
      ...data,
    });
  },
};

// Auto-initialize when module loads
eventTracker.init();
