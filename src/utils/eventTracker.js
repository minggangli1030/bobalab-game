// src/utils/eventTracker.js - Complete Enhanced Event Tracking System
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const eventTracker = {
  // Core event logging function
  async logEvent(eventType, eventData) {
    const sessionId = localStorage.getItem("sessionId");
    const sessionStartTime = parseInt(localStorage.getItem("sessionStartTime") || Date.now());
    const currentTime = Date.now();
    const timeElapsed = currentTime - sessionStartTime;
    
    // Format readable timestamp (minutes:seconds after start)
    const minutes = Math.floor(timeElapsed / 60000);
    const seconds = Math.floor((timeElapsed % 60000) / 1000);
    const readableTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const event = {
      sessionId,
      type: eventType,
      timestamp: serverTimestamp(),
      clientTimestamp: currentTime,
      timeElapsed,
      readableTime,
      semesterTime: this.getSemesterTime(),
      ...eventData,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };

    try {
      await addDoc(collection(db, "events"), event);
    } catch (error) {
      console.error("Failed to log event:", error);
      this.storeOfflineEvent(event);
    }
  },

  // Offline event storage
  storeOfflineEvent(event) {
    const offlineEvents = JSON.parse(
      localStorage.getItem("offlineEvents") || "[]"
    );
    offlineEvents.push(event);
    localStorage.setItem("offlineEvents", JSON.stringify(offlineEvents));
  },

  // Sync offline events when connection restored
  async syncOfflineEvents() {
    const offlineEvents = JSON.parse(
      localStorage.getItem("offlineEvents") || "[]"
    );
    if (offlineEvents.length > 0) {
      for (const event of offlineEvents) {
        try {
          await addDoc(collection(db, "events"), event);
        } catch (error) {
          console.error("Failed to sync offline event:", error);
        }
      }
      localStorage.removeItem("offlineEvents");
    }
  },

  // Track page/tab switches with full context
  async trackPageSwitch(from, to, isAutoAdvance = false) {
    const timeOnPreviousPage = this.getTimeOnCurrentPage(from);
    const switchContext = this.getSwitchContext(from, to);

    return this.logEvent("page_switch", {
      from,
      to,
      isAutoAdvance,
      switchType: isAutoAdvance ? "auto" : "manual",
      timeOnPreviousPage,
      gameFrom: from ? from.substring(0, 2) : null,
      gameTo: to ? to.substring(0, 2) : null,
      switchReason: isAutoAdvance ? "task_completed" : "user_initiated",
      ...switchContext,
    });
  },

  // Track each task attempt with full accuracy progression
  async trackTaskAttempt(
    taskId,
    attempt,
    isCorrect,
    timeTaken,
    answer,
    expected
  ) {
    const accuracy = this.calculateAccuracy(taskId, answer, expected);
    const game = taskId.substring(0, 2);
    const taskNum = taskId[3];

    // Get attempt history for this task
    const attemptHistory = this.getAttemptHistory(taskId);
    attemptHistory.push({
      attempt,
      accuracy,
      timeTaken,
      answer,
      expected,
      timestamp: Date.now(),
    });
    this.saveAttemptHistory(taskId, attemptHistory);

    // Track mistake types
    const mistakeType = this.categorizeError(taskId, answer, expected);
    this.updateMistakeTracking(taskId, mistakeType);

    return this.logEvent("task_attempt", {
      taskId,
      game,
      taskNum,
      attempt,
      isCorrect,
      timeTaken,
      answer,
      expected,
      accuracy,
      accuracyProgression: attemptHistory.map((a) => a.accuracy),
      mistakeType,
      timeProgression: attemptHistory.map((a) => a.timeTaken),
      averageTime:
        attemptHistory.reduce((sum, a) => sum + a.timeTaken, 0) /
        attemptHistory.length,
      bestAccuracy: Math.max(...attemptHistory.map((a) => a.accuracy)),
      worstAccuracy: Math.min(...attemptHistory.map((a) => a.accuracy)),
      improvementTrend: this.calculateImprovementTrend(attemptHistory),
    });
  },

  // Track AI help interactions for tasks
  async trackAITaskHelp(taskId, helpType, aiSuggestion, wasCorrect, attemptNumber) {
    const startTime = Date.now();
    const taskCategory = taskId.startsWith("g1") ? "research" : 
                        taskId.startsWith("g2") ? "materials" : "engagement";
    
    return this.logEvent("ai_task_help", {
      taskId,
      taskCategory,
      helpType,
      aiSuggestion,
      wasCorrect,
      attemptNumber,
      helpRequestTime: startTime,
      aiAccuracy: wasCorrect ? "correct" : "incorrect",
      context: this.getCurrentContext()
    });
  },

  // Track player's response to AI help
  async trackAIHelpResponse(taskId, helpType, aiSuggestion, playerAction, playerAnswer, timeBetweenHelpAndSubmit) {
    return this.logEvent("ai_help_response", {
      taskId,
      helpType,
      aiSuggestion,
      playerAction, // 'accepted', 'modified', 'rejected'
      playerAnswer,
      aiAnswerUsed: aiSuggestion === playerAnswer,
      timeBetweenHelpAndSubmit,
      playerModification: aiSuggestion !== playerAnswer ? {
        original: aiSuggestion,
        modified: playerAnswer,
        difference: this.calculateDifference(aiSuggestion, playerAnswer, helpType)
      } : null
    });
  },

  // Track chat interactions with full inquiry context
  async trackChatInteraction(query, response, promptNumber, currentTask) {
    const queryTime = Date.now();
    const gameContext = currentTask ? currentTask.substring(0, 2) : "none";
    const queryAnalysis = this.analyzeQuery(query);
    const taskProgress = this.getTaskProgress(currentTask);

    return this.logEvent("chat_interaction", {
      // Full inquiry tracking
      fullInquiry: {
        query,
        queryTime,
        queryLength: query.length,
        queryWords: query.split(/\s+/).length,
        queryType: this.categorizeQuery(query),
        ...queryAnalysis,
      },

      // Response details
      response: response.text,
      responseId: response.id,
      responseLevel: response.level,
      responseType: response.type,
      matchedTriggers: response.triggers,
      responseScore: response.score,
      responseLength: response.text.length,

      // Context
      promptNumber,
      currentTask,
      gameContext,
      taskPhase: this.getTaskPhase(currentTask),
      promptsRemaining: this.getPromptsRemaining(promptNumber),

      // Action tracking
      action: "chat_query",
      actionContext: {
        beforeTask: currentTask,
        taskAttempts: this.getAttemptHistory(currentTask).length,
        currentAccuracy: this.getCurrentAccuracy(currentTask),
        timeOnTask: this.getTimeOnCurrentPage(currentTask),
        ...taskProgress,
      },

      // Query effectiveness metrics
      queryEffectiveness: {
        relevanceToTask: this.assessQueryRelevance(query, currentTask),
        specificity: queryAnalysis.specificity,
        helpSeeking: queryAnalysis.isHelpSeeking,
      },
    });
  },

  // Track task completion with comprehensive stats
  async trackTaskComplete(taskId, attempts, totalTime, finalAccuracy) {
    const attemptHistory = this.getAttemptHistory(taskId);
    const mistakesByType = this.getMistakesByType(taskId);
    const performanceMetrics = this.calculatePerformanceMetrics(
      taskId,
      attemptHistory,
      totalTime
    );

    return this.logEvent("task_complete", {
      taskId,
      game: taskId.substring(0, 2),
      taskNum: taskId[3],
      attempts,
      totalTime,
      finalAccuracy,

      // Comprehensive stats
      accuracyProgression: attemptHistory.map((a) => a.accuracy),
      timePerAttempt: attemptHistory.map((a) => a.timeTaken),
      averageAccuracy:
        attemptHistory.reduce((sum, a) => sum + a.accuracy, 0) /
        attemptHistory.length,
      improvementRate: this.calculateImprovementRate(attemptHistory),
      mistakesByType,

      // Performance metrics
      performance: {
        speed: totalTime / attempts,
        consistency: this.calculateConsistency(attemptHistory),
        difficulty: this.assessDifficulty(taskId, attempts, totalTime),
        efficiency: performanceMetrics.efficiency,
        learningCurve: performanceMetrics.learningCurve,
      },

      // Additional insights
      insights: {
        struggledWith: this.identifyStrugglePoints(
          attemptHistory,
          mistakesByType
        ),
        timeDistribution: this.analyzeTimeDistribution(attemptHistory),
        accuracyTrend: performanceMetrics.accuracyTrend,
      },
    });
  },

  // Track user actions (clicks, focus, idle, etc.)
  async trackUserAction(action, details = {}) {
    return this.logEvent("user_action", {
      action,
      ...details,
      timestamp: Date.now(),
      context: this.getCurrentContext(),
    });
  },

  // Track game start with full context
  async trackGameStart(practiceCompleted) {
    const startContext = {
      practiceCompleted,
      browserInfo: this.getBrowserInfo(),
      deviceInfo: this.getDeviceInfo(),
      connectionQuality: await this.assessConnectionQuality(),
    };

    return this.logEvent("game_start", startContext);
  },

  // Track game completion with final stats
  async trackGameComplete(
    totalTime,
    totalSwitches,
    completedTasks,
    practiceChoice,
    totalPrompts,
    promptsUsed
  ) {
    const gameStats = this.calculateGameStats();

    return this.logEvent("game_complete", {
      totalTime,
      totalSwitches,
      completedTasks,

      // Game flow analysis
      gameFlow: {
        averageTimePerTask: totalTime / completedTasks,
        switchesPerTask: totalSwitches / completedTasks,
        taskCompletionOrder: this.getTaskCompletionOrder(),
        dependenciesActivated: this.getDependenciesActivated(),
      },

      // Performance summary
      performanceSummary: {
        overallAccuracy: gameStats.overallAccuracy,
        bestTask: gameStats.bestTask,
        worstTask: gameStats.worstTask,
        mostAttempts: gameStats.mostAttempts,
        leastAttempts: gameStats.leastAttempts,
      },

      // Chat usage
      chatUsage: {
        totalPrompts,
        promptsUsed,
        promptEfficiency: promptsUsed / totalPrompts,
        chatInteractions: this.getChatInteractionSummary(),
      },

      // Final context
      finalContext: {
        practiceCompleted: practiceChoice === "yes",
        totalFocusLosses: this.getFocusLossCount(),
        totalIdleWarnings: this.getIdleWarningCount(),
        sessionDuration: totalTime,
      },
    });
  },

  // Enhanced error categorization
  categorizeError(taskId, answer, expected) {
    if (taskId.startsWith("g1")) {
      // Counting errors
      const diff = Math.abs(answer - expected);
      const percentError = expected > 0 ? (diff / expected) * 100 : 100;

      if (diff === 0) return "none";
      if (diff === 1) return "off_by_one";
      if (diff <= 3) return "minor_miscount";
      if (percentError <= 10) return "close_miscount";
      if (percentError <= 25) return "moderate_miscount";
      return "major_miscount";
    } else if (taskId.startsWith("g2")) {
      // Slider errors
      const diff = Math.abs(answer - expected);
      const percentError = (diff / 10) * 100; // 10 is max range

      if (diff === 0) return "none";
      if (diff < 0.05) return "extremely_close";
      if (diff < 0.1) return "very_close";
      if (diff < 0.5) return "close";
      if (diff < 1.0) return "moderate";
      if (diff < 2.0) return "far";
      return "very_far";
    } else if (taskId.startsWith("g3")) {
      // Typing errors - detailed analysis
      if (answer === expected) return "none";

      const errors = [];

      // Case sensitivity check
      if (answer.toLowerCase() === expected.toLowerCase()) {
        errors.push("case_only");
      }

      // Length check
      if (answer.length !== expected.length) {
        if (answer.length < expected.length) {
          errors.push("missing_chars");
        } else {
          errors.push("extra_chars");
        }
      }

      // Character type analysis
      const answerChars = this.categorizeCharacters(answer);
      const expectedChars = this.categorizeCharacters(expected);

      if (answerChars.symbols !== expectedChars.symbols) {
        errors.push("symbol_error");
      }
      if (answerChars.numbers !== expectedChars.numbers) {
        errors.push("number_error");
      }
      if (answerChars.spaces !== expectedChars.spaces) {
        errors.push("space_error");
      }

      // Position-based errors
      const positionErrors = this.analyzePositionErrors(answer, expected);
      if (positionErrors.transposition) {
        errors.push("transposition");
      }

      return errors.length > 0 ? errors.join(",") : "general_mismatch";
    }
    return "unknown";
  },

  // Analyze query for insights
  analyzeQuery(query) {
    const words = query.toLowerCase().split(/\s+/);
    const questionWords = [
      "what",
      "how",
      "why",
      "when",
      "where",
      "which",
      "who",
    ];
    const helpWords = [
      "help",
      "stuck",
      "cant",
      "difficult",
      "hard",
      "struggling",
    ];

    return {
      hasQuestion: questionWords.some((qw) => words.includes(qw)),
      isHelpSeeking: helpWords.some((hw) => words.includes(hw)),
      specificity: this.calculateSpecificity(query),
      sentiment: this.analyzeSentiment(query),
      urgency: this.assessUrgency(query),
    };
  },

  // Categorize chat queries
  categorizeQuery(query) {
    const q = query.toLowerCase();

    // Priority categorization
    if (q.includes("help") || q.includes("stuck") || q.includes("cant"))
      return "help_request";
    if (q.includes("how") && (q.includes("do") || q.includes("work")))
      return "how_to";
    if (q.includes("what") || q.includes("explain")) return "explanation";
    if (q.includes("strategy") || q.includes("tip") || q.includes("trick"))
      return "strategy";
    if (q.includes("rule") || q.includes("requirement")) return "rules";
    if (q.includes("count") || q.includes("slider") || q.includes("typ"))
      return "task_specific";
    if (
      q.includes("order") ||
      q.includes("sequence") ||
      q.includes("which first")
    )
      return "task_order";
    if (q.includes("prompt") || q.includes("question")) return "prompt_related";
    if (q.includes("accuracy") || q.includes("score")) return "performance";

    return "general";
  },

  // Get current task phase
  getTaskPhase(taskId) {
    if (!taskId) return "none";

    const attempts = this.getAttemptHistory(taskId).length;
    const accuracy = this.getCurrentAccuracy(taskId);

    if (attempts === 0) return "not_started";
    if (attempts === 1) return "first_attempt";
    if (attempts <= 3 && accuracy >= 70) return "early_success";
    if (attempts <= 3) return "early_attempts";
    if (attempts <= 5 && accuracy >= 80) return "improving";
    if (attempts > 5 && accuracy < 50) return "struggling_badly";
    if (attempts > 5) return "struggling";

    return "in_progress";
  },

  // Calculate accuracy with enhanced logic
  calculateAccuracy(taskId, answer, expected) {
    if (taskId.startsWith("g1")) {
      // Counting - percentage based on distance from correct
      if (answer === expected) return 100;

      const error = Math.abs(answer - expected);
      const maxAcceptableError = Math.max(expected * 0.1, 1); // 10% or at least 1

      if (error <= maxAcceptableError) {
        // Linear decrease within acceptable range
        return Math.round(90 * (1 - error / maxAcceptableError) + 90);
      } else {
        // Steeper decrease outside acceptable range
        const remainingError = error - maxAcceptableError;
        const maxError = Math.max(expected, 20);
        const accuracyLeft = Math.max(0, 90 * (1 - remainingError / maxError));
        return Math.round(accuracyLeft);
      }
    } else if (taskId.startsWith("g2")) {
      // Slider - distance-based with precision consideration
      const error = Math.abs(answer - expected);
      const taskNum = parseInt(taskId[3]);

      // Different precision requirements per difficulty
      const precisionRequired = [0.5, 0.05, 0.005][taskNum - 1];

      if (error <= precisionRequired) {
        return 100;
      } else if (error <= precisionRequired * 2) {
        // Near miss - still high accuracy
        return Math.round(
          90 + 10 * (1 - (error - precisionRequired) / precisionRequired)
        );
      } else {
        // Linear decrease based on total range
        const maxError = 10; // slider range
        return Math.max(0, Math.round(90 * (1 - error / maxError)));
      }
    } else if (taskId.startsWith("g3")) {
      // Typing - character-by-character with position weighting
      if (answer === expected) return 100;

      const maxLen = Math.max(answer.length, expected.length);
      if (maxLen === 0) return 0;

      let score = 0;
      const minLen = Math.min(answer.length, expected.length);

      // Character matches with position weighting
      for (let i = 0; i < minLen; i++) {
        if (answer[i] === expected[i]) {
          // Correct character in correct position
          score += 1;
        } else if (expected.includes(answer[i])) {
          // Correct character in wrong position
          score += 0.5;
        }
      }

      // Penalty for length mismatch
      const lengthPenalty = Math.abs(answer.length - expected.length) * 0.5;
      score = Math.max(0, score - lengthPenalty);

      return Math.round((score / maxLen) * 100);
    }
    return 0;
  },

  // Helper functions for tracking history
  getAttemptHistory(taskId) {
    const history = localStorage.getItem(`attemptHistory_${taskId}`);
    return history ? JSON.parse(history) : [];
  },

  saveAttemptHistory(taskId, history) {
    localStorage.setItem(`attemptHistory_${taskId}`, JSON.stringify(history));
  },

  getCurrentAccuracy(taskId) {
    const history = this.getAttemptHistory(taskId);
    return history.length > 0 ? history[history.length - 1].accuracy : null;
  },

  getMistakesByType(taskId) {
    const mistakeTypes = localStorage.getItem(`mistakes_${taskId}`);
    return mistakeTypes ? JSON.parse(mistakeTypes) : {};
  },

  updateMistakeTracking(taskId, mistakeType) {
    const mistakes = this.getMistakesByType(taskId);
    mistakes[mistakeType] = (mistakes[mistakeType] || 0) + 1;
    localStorage.setItem(`mistakes_${taskId}`, JSON.stringify(mistakes));
  },

  calculateImprovementRate(history) {
    if (history.length < 2) return 0;

    const firstAccuracy = history[0].accuracy;
    const lastAccuracy = history[history.length - 1].accuracy;
    const improvement = lastAccuracy - firstAccuracy;

    // Also consider the trend
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
    };
  },

  calculateConsistency(history) {
    if (history.length < 2) return 100;

    const accuracies = history.map((h) => h.accuracy);
    const mean = accuracies.reduce((a, b) => a + b) / accuracies.length;
    const variance =
      accuracies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      accuracies.length;
    const stdDev = Math.sqrt(variance);

    // Return consistency score (100 = perfectly consistent, 0 = highly variable)
    return Math.max(0, Math.round(100 - stdDev));
  },

  assessDifficulty(taskId, attempts, totalTime) {
    const taskNum = parseInt(taskId[3]);
    const baseDifficulty = ["easy", "medium", "hard"][taskNum - 1];

    // Adjust based on performance
    if (attempts === 1 && totalTime < 10000)
      return baseDifficulty + "_mastered";
    if (attempts === 1 && totalTime < 20000) return baseDifficulty + "_quick";
    if (attempts <= 2 && totalTime < 30000) return baseDifficulty + "_smooth";
    if (attempts <= 3) return baseDifficulty + "_normal";
    if (attempts <= 5) return baseDifficulty + "_challenging";
    if (attempts > 5 && totalTime > 120000)
      return baseDifficulty + "_very_challenging";
    return baseDifficulty + "_struggled";
  },

  // Time tracking helpers
  getTimeOnCurrentPage(pageId) {
    const startTime = localStorage.getItem(`pageStartTime_${pageId}`);
    return startTime ? Date.now() - parseInt(startTime) : 0;
  },

  setPageStartTime(pageId) {
    localStorage.setItem(`pageStartTime_${pageId}`, Date.now().toString());
  },

  // Advanced analytics functions
  calculatePerformanceMetrics(taskId, history, totalTime) {
    const accuracies = history.map((h) => h.accuracy);
    const times = history.map((h) => h.timeTaken);

    return {
      efficiency: this.calculateEfficiency(accuracies, times),
      learningCurve: this.analyzeLearningCurve(history),
      accuracyTrend: this.calculateTrend(accuracies),
      speedTrend: this.calculateTrend(times),
      plateauPoint: this.findPlateauPoint(accuracies),
    };
  },

  calculateEfficiency(accuracies, times) {
    // Efficiency = accuracy per unit time
    const avgAccuracy =
      accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    return avgAccuracy / (avgTime / 1000); // accuracy per second
  },

  analyzeLearningCurve(history) {
    if (history.length < 3) return "insufficient_data";

    const accuracies = history.map((h) => h.accuracy);
    const improvements = [];

    for (let i = 1; i < accuracies.length; i++) {
      improvements.push(accuracies[i] - accuracies[i - 1]);
    }

    const avgImprovement =
      improvements.reduce((a, b) => a + b, 0) / improvements.length;
    const recentImprovement =
      improvements.slice(-3).reduce((a, b) => a + b, 0) / 3;

    if (avgImprovement > 10) return "steep_improvement";
    if (avgImprovement > 5) return "steady_improvement";
    if (avgImprovement > 0) return "gradual_improvement";
    if (recentImprovement < -5) return "declining";
    return "plateau";
  },

  calculateTrend(values) {
    if (values.length < 2) return 0;

    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  },

  findPlateauPoint(accuracies) {
    if (accuracies.length < 4) return null;

    // Look for where improvement stops
    for (let i = 3; i < accuracies.length; i++) {
      const recent = accuracies.slice(i - 3, i + 1);
      const variance = this.calculateVariance(recent);

      if (variance < 5 && recent[recent.length - 1] >= 85) {
        return i - 2; // Plateau started 2 attempts ago
      }
    }

    return null;
  },

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return (
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length
    );
  },

  // Character analysis for typing
  categorizeCharacters(str) {
    return {
      letters: (str.match(/[a-zA-Z]/g) || []).length,
      numbers: (str.match(/[0-9]/g) || []).length,
      symbols: (str.match(/[^a-zA-Z0-9\s]/g) || []).length,
      spaces: (str.match(/\s/g) || []).length,
      uppercase: (str.match(/[A-Z]/g) || []).length,
      lowercase: (str.match(/[a-z]/g) || []).length,
    };
  },

  analyzePositionErrors(answer, expected) {
    const errors = {
      transposition: false,
      insertion: false,
      deletion: false,
      substitution: false,
    };

    // Check for transposition (swapped adjacent characters)
    for (let i = 0; i < answer.length - 1; i++) {
      if (
        i < expected.length - 1 &&
        answer[i] === expected[i + 1] &&
        answer[i + 1] === expected[i]
      ) {
        errors.transposition = true;
      }
    }

    // Basic Levenshtein distance analysis
    if (answer.length > expected.length) errors.insertion = true;
    if (answer.length < expected.length) errors.deletion = true;
    if (answer.length === expected.length && answer !== expected)
      errors.substitution = true;

    return errors;
  },

  // Context and state tracking
  getCurrentContext() {
    return {
      currentTask: localStorage.getItem("currentTask"),
      gameMode: localStorage.getItem("gameMode"),
      totalCompleted: this.getCompletedTaskCount(),
      currentStreak: this.getCurrentStreak(),
      sessionDuration: this.getSessionDuration(),
    };
  },

  getCompletedTaskCount() {
    const tasks = [
      "g1t1",
      "g1t2",
      "g1t3",
      "g2t1",
      "g2t2",
      "g2t3",
      "g3t1",
      "g3t2",
      "g3t3",
    ];
    return tasks.filter((task) => {
      const history = this.getAttemptHistory(task);
      return history.some((h) => h.accuracy >= 90);
    }).length;
  },

  getCurrentStreak() {
    // Track consecutive successful attempts
    const streak = parseInt(localStorage.getItem("currentStreak") || "0");
    return streak;
  },

  updateStreak(success) {
    const currentStreak = this.getCurrentStreak();
    if (success) {
      localStorage.setItem("currentStreak", (currentStreak + 1).toString());
    } else {
      localStorage.setItem("currentStreak", "0");
    }
  },

  getSessionDuration() {
    const startTime = localStorage.getItem("sessionStartTime");
    return startTime ? Date.now() - parseInt(startTime) : 0;
  },

  // Task progress tracking
  getTaskProgress(taskId) {
    if (!taskId) return {};

    const history = this.getAttemptHistory(taskId);
    const currentAccuracy = this.getCurrentAccuracy(taskId);

    return {
      attempts: history.length,
      currentAccuracy,
      bestAccuracy:
        history.length > 0 ? Math.max(...history.map((h) => h.accuracy)) : 0,
      averageTime:
        history.length > 0
          ? history.reduce((sum, h) => sum + h.timeTaken, 0) / history.length
          : 0,
      isImproving:
        history.length >= 2
          ? history[history.length - 1].accuracy >
            history[history.length - 2].accuracy
          : false,
    };
  },

  // Query relevance assessment
  assessQueryRelevance(query, currentTask) {
    if (!currentTask) return "no_task";

    const q = query.toLowerCase();
    const game = currentTask.substring(0, 2);

    // Check if query mentions current game type
    if (
      game === "g1" &&
      (q.includes("count") || q.includes("word") || q.includes("letter"))
    ) {
      return "highly_relevant";
    }
    if (
      game === "g2" &&
      (q.includes("slider") || q.includes("slide") || q.includes("target"))
    ) {
      return "highly_relevant";
    }
    if (
      game === "g3" &&
      (q.includes("type") || q.includes("typing") || q.includes("pattern"))
    ) {
      return "highly_relevant";
    }

    // Check for general task-related terms
    if (q.includes("task") || q.includes("help") || q.includes("how")) {
      return "relevant";
    }

    // Check for strategy/order questions
    if (q.includes("order") || q.includes("strategy") || q.includes("which")) {
      return "somewhat_relevant";
    }

    return "not_relevant";
  },

  // Sentiment analysis
  analyzeSentiment(text) {
    const negative = [
      "cant",
      "wont",
      "stuck",
      "hard",
      "difficult",
      "impossible",
      "wrong",
      "bad",
    ];
    const positive = [
      "good",
      "great",
      "easy",
      "got",
      "understand",
      "thanks",
      "helpful",
    ];
    const frustrated = [
      "ugh",
      "argh",
      "damn",
      "frustrat",
      "annoying",
      "stupid",
    ];

    const lower = text.toLowerCase();
    const negCount = negative.filter((word) => lower.includes(word)).length;
    const posCount = positive.filter((word) => lower.includes(word)).length;
    const frustCount = frustrated.filter((word) => lower.includes(word)).length;

    if (frustCount > 0) return "frustrated";
    if (negCount > posCount) return "negative";
    if (posCount > negCount) return "positive";
    return "neutral";
  },

  // Urgency assessment
  assessUrgency(text) {
    const urgent = [
      "help",
      "please",
      "need",
      "stuck",
      "cant",
      "now",
      "!",
      "??",
    ];
    const lower = text.toLowerCase();
    const urgentCount = urgent.filter((word) => lower.includes(word)).length;

    if (urgentCount >= 3) return "high";
    if (urgentCount >= 1) return "medium";
    return "low";
  },

  // Specificity calculation
  calculateSpecificity(query) {
    const words = query.split(/\s+/);
    const specificTerms = [
      "count",
      "slider",
      "typing",
      "word",
      "letter",
      "target",
      "pattern",
      "accuracy",
      "decimal",
      "case",
      "symbol",
      "highlight",
      "enhanced",
    ];

    const specificCount = words.filter((word) =>
      specificTerms.includes(word.toLowerCase())
    ).length;

    return specificCount / words.length;
  },

  // Performance analytics
  identifyStrugglePoints(history, mistakes) {
    const struggles = [];

    // Consistent low accuracy
    const avgAccuracy =
      history.reduce((sum, h) => sum + h.accuracy, 0) / history.length;
    if (avgAccuracy < 50) struggles.push("low_overall_accuracy");

    // Not improving
    const improvement = this.calculateImprovementRate(history);
    if (improvement.overall < 0) struggles.push("declining_performance");
    if (!improvement.isImproving && history.length > 3)
      struggles.push("plateau");

    // Specific mistake patterns
    const topMistake = Object.entries(mistakes).sort(
      ([, a], [, b]) => b - a
    )[0];
    if (topMistake && topMistake[1] > history.length / 2) {
      struggles.push(`repeated_${topMistake[0]}`);
    }

    return struggles;
  },

  analyzeTimeDistribution(history) {
    const times = history.map((h) => h.timeTaken);

    return {
      min: Math.min(...times),
      max: Math.max(...times),
      average: times.reduce((a, b) => a + b, 0) / times.length,
      median: this.calculateMedian(times),
      trend: this.calculateTrend(times),
      consistency: this.calculateConsistency(times),
    };
  },

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  },

  // Game completion analytics
  calculateGameStats() {
    const tasks = [
      "g1t1",
      "g1t2",
      "g1t3",
      "g2t1",
      "g2t2",
      "g2t3",
      "g3t1",
      "g3t2",
      "g3t3",
    ];
    const taskStats = tasks.map((task) => {
      const history = this.getAttemptHistory(task);
      const accuracy =
        history.length > 0 ? Math.max(...history.map((h) => h.accuracy)) : 0;

      return {
        task,
        attempts: history.length,
        bestAccuracy: accuracy,
        avgTime:
          history.length > 0
            ? history.reduce((sum, h) => sum + h.timeTaken, 0) / history.length
            : 0,
      };
    });

    const completedStats = taskStats.filter((s) => s.attempts > 0);

    return {
      overallAccuracy:
        completedStats.length > 0
          ? completedStats.reduce((sum, s) => sum + s.bestAccuracy, 0) /
            completedStats.length
          : 0,
      bestTask: completedStats.sort(
        (a, b) => b.bestAccuracy - a.bestAccuracy
      )[0],
      worstTask: completedStats.sort(
        (a, b) => a.bestAccuracy - b.bestAccuracy
      )[0],
      mostAttempts: completedStats.sort((a, b) => b.attempts - a.attempts)[0],
      leastAttempts: completedStats.sort((a, b) => a.attempts - b.attempts)[0],
    };
  },

  getTaskCompletionOrder() {
    const order = JSON.parse(
      localStorage.getItem("taskCompletionOrder") || "[]"
    );
    return order;
  },

  updateTaskCompletionOrder(taskId) {
    const order = this.getTaskCompletionOrder();
    if (!order.includes(taskId)) {
      order.push(taskId);
      localStorage.setItem("taskCompletionOrder", JSON.stringify(order));
    }
  },

  getDependenciesActivated() {
    return JSON.parse(localStorage.getItem("dependenciesActivated") || "[]");
  },

  getChatInteractionSummary() {
    const interactions = JSON.parse(
      localStorage.getItem("chatInteractions") || "[]"
    );

    return {
      total: interactions.length,
      byType: this.groupBy(interactions, "queryType"),
      averageResponseTime:
        interactions.length > 0
          ? interactions.reduce((sum, i) => sum + (i.responseTime || 0), 0) /
            interactions.length
          : 0,
      helpRequests: interactions.filter((i) => i.queryType === "help_request")
        .length,
    };
  },

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) groups[group] = 0;
      groups[group]++;
      return groups;
    }, {});
  },

  getFocusLossCount() {
    return parseInt(localStorage.getItem("focusLossCount") || "0");
  },

  incrementFocusLoss() {
    const count = this.getFocusLossCount();
    localStorage.setItem("focusLossCount", (count + 1).toString());
  },

  getIdleWarningCount() {
    return parseInt(localStorage.getItem("idleWarningCount") || "0");
  },

  incrementIdleWarning() {
    const count = this.getIdleWarningCount();
    localStorage.setItem("idleWarningCount", (count + 1).toString());
  },

  // Switch context analysis
  getSwitchContext(from, to) {
    const fromHistory = from ? this.getAttemptHistory(from) : [];
    const toHistory = to ? this.getAttemptHistory(to) : [];

    return {
      fromTaskStatus: {
        completed: fromHistory.some((h) => h.accuracy >= 90),
        attempts: fromHistory.length,
        lastAccuracy:
          fromHistory.length > 0
            ? fromHistory[fromHistory.length - 1].accuracy
            : 0,
      },
      toTaskStatus: {
        previousAttempts: toHistory.length,
        bestAccuracy:
          toHistory.length > 0
            ? Math.max(...toHistory.map((h) => h.accuracy))
            : 0,
      },
      switchPattern: this.analyzeSwitchPattern(from, to),
    };
  },

  analyzeSwitchPattern(from, to) {
    if (!from || !to) return "initial";

    const fromGame = from.substring(0, 2);
    const toGame = to.substring(0, 2);
    const fromTask = parseInt(from[3]);
    const toTask = parseInt(to[3]);

    if (fromGame === toGame) {
      if (toTask === fromTask + 1) return "sequential_same_game";
      if (toTask < fromTask) return "backtrack_same_game";
      return "skip_same_game";
    } else {
      if (toTask === 1) return "new_game_start";
      return "cross_game_jump";
    }
  },

  // Browser and device info
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown";

    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    return {
      browser,
      userAgent: ua,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
    };
  },

  getDeviceInfo() {
    return {
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      touchSupport: "ontouchstart" in window,
      deviceMemory: navigator.deviceMemory || "unknown",
      hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
    };
  },

  // Connection quality assessment
  async assessConnectionQuality() {
    if (!navigator.connection) return "unknown";

    return {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData,
    };
  },

  // Prompts tracking
  getPromptsRemaining(promptsUsed) {
    const totalEarned = this.getCompletedTaskCount();
    const basePrompts = 3;
    return basePrompts + totalEarned - promptsUsed;
  },

  // Improvement trend calculation
  calculateImprovementTrend(history) {
    if (history.length < 3) return "insufficient_data";

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

  // Get current semester time for more granular tracking
  getSemesterTime() {
    const semesterStartTime = parseInt(localStorage.getItem("semesterStartTime") || Date.now());
    const elapsed = Date.now() - semesterStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return {
      elapsed,
      readable: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      minutes,
      seconds
    };
  },

  // Calculate difference between AI suggestion and player answer
  calculateDifference(aiSuggestion, playerAnswer, helpType) {
    if (helpType === "slider") {
      return {
        type: "numerical",
        difference: Math.abs(aiSuggestion - playerAnswer),
        percentDiff: Math.abs(aiSuggestion - playerAnswer) / 10 * 100
      };
    } else if (helpType === "counting") {
      return {
        type: "numerical",
        difference: Math.abs(aiSuggestion - playerAnswer),
        percentDiff: aiSuggestion > 0 ? Math.abs(aiSuggestion - playerAnswer) / aiSuggestion * 100 : 100
      };
    } else if (helpType === "typing") {
      const levenshtein = this.calculateLevenshteinDistance(aiSuggestion, playerAnswer);
      return {
        type: "textual",
        levenshteinDistance: levenshtein,
        charDifference: Math.abs(aiSuggestion.length - playerAnswer.length),
        exactMatch: aiSuggestion === playerAnswer
      };
    }
    return null;
  },

  // Calculate Levenshtein distance for text comparison
  calculateLevenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }
    return dp[m][n];
  },

  // Track all click events for comprehensive action tracking  
  trackClick(element, context) {
    const elementInfo = {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      text: element.textContent?.substring(0, 50),
      dataAttributes: this.extractDataAttributes(element)
    };
    
    return this.logEvent("user_click", {
      element: elementInfo,
      context,
      coordinates: {
        pageX: event.pageX,
        pageY: event.pageY,
        clientX: event.clientX,
        clientY: event.clientY
      }
    });
  },

  // Extract data attributes from elements
  extractDataAttributes(element) {
    const attrs = {};
    for (let attr of element.attributes) {
      if (attr.name.startsWith('data-')) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  },
};
