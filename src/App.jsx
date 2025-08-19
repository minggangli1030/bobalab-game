// src/App.jsx - Complete Teaching Simulation Version
import React, { useState, useEffect, useRef } from "react";
import CountingTask from "./components/CountingTask";
import SliderTask from "./components/SliderTask";
import TypingTask from "./components/TypingTask";
import NavTabsEnhanced from "./components/NavTabsEnhanced";
import PracticeMode from "./components/PracticeMode";
import ChatContainer from "./components/ChatContainer";
import StudentLogin from "./components/StudentLogin";
import { sessionManager } from "./utils/sessionManager";
import { eventTracker } from "./utils/eventTracker";
import { patternGenerator } from "./utils/patternGenerator";
import { db } from "./firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./App.css";
import AdminPage from "./AdminPage";
import GameModeSelector from "./components/GameModeSelector";
import CompletionCodeDisplay from "./components/CompletionCodeDisplay";

// Helper function to calculate Levenshtein distance
function calculateLevenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

function App() {
  // Admin page (hidden route)
  if (window.location.search.includes("admin=true")) {
    return <AdminPage />;
  }

  // Admin mode check
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminMode = urlParams.get("admin") === "berkeley2024";

  // State management
  const [mode, setMode] = useState("landing");
  const [gameMode, setGameMode] = useState(null);
  const [practiceChoice, setPracticeChoice] = useState(null);
  const [currentTab, setCurrentTab] = useState("g2t1"); // Start with materials (slider)
  const [completed, setCompleted] = useState({});
  const [completedLevels, setCompletedLevels] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [globalTimer, setGlobalTimer] = useState(0);
  const [taskStartTimes, setTaskStartTimes] = useState({});
  const [switches, setSwitches] = useState(0);
  const [bonusPrompts, setBonusPrompts] = useState(0);
  const [isInBreak, setIsInBreak] = useState(false);
  const [breakDestination, setBreakDestination] = useState(null);
  const [isOutOfFocus, setIsOutOfFocus] = useState(false);
  const [outOfFocusCountdown, setOutOfFocusCountdown] = useState(30);
  const [isIdle, setIsIdle] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(5);
  const [gameBlocked, setGameBlocked] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [currentSemester, setCurrentSemester] = useState(1);
  const [totalSemesters] = useState(2);
  const [semesterHistory, setSemesterHistory] = useState([]);
  const [randomSeed, setRandomSeed] = useState(null);
  const [checkpointReached, setCheckpointReached] = useState(false);
  const [checkpointBonus, setCheckpointBonus] = useState(0);

  // NEW: Teaching simulation states
  const [timeLimit, setTimeLimit] = useState(1200); // Default 20 min
  const [timeRemaining, setTimeRemaining] = useState(1200);
  const [studentLearningScore, setStudentLearningScore] = useState(0);
  const [categoryPoints, setCategoryPoints] = useState({
    materials: 0, // Slider (was counting)
    research: 0, // Counting (was slider)
    engagement: 0, // Typing
    bonus: 0, // Checkpoint bonuses
  });
  const [taskAttempts, setTaskAttempts] = useState({});
  const [taskPoints, setTaskPoints] = useState({});

  // Refs
  const startTimeRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);
  const pauseStartRef = useRef(null);
  const outOfFocusTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const timeRemainingRef = useRef(1200);
  const timeLimitRef = useRef(1200);

  // Initialize session on mount
  // Initialize session on mount
  useEffect(() => {
    checkAndInitSession();

    // Add focus/blur detection
    const handleFocus = () => {
      if (isOutOfFocus) {
        setIsOutOfFocus(false);
        setOutOfFocusCountdown(30);
        if (outOfFocusTimerRef.current) {
          clearInterval(outOfFocusTimerRef.current);
          outOfFocusTimerRef.current = null;
        }
      }
    };

    const handleBlur = () => {
      // Only trigger in challenge mode, not for admin
      const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
      if (mode === "challenge" && config.role !== "admin") {
        setIsOutOfFocus(true);
        let countdown = 30;

        outOfFocusTimerRef.current = setInterval(() => {
          countdown--;
          setOutOfFocusCountdown(countdown);

          if (countdown <= 0) {
            // Block the game
            setGameBlocked(true);
            clearInterval(outOfFocusTimerRef.current);
            eventTracker.logEvent("game_blocked", {
              reason: "out_of_focus",
              timestamp: Date.now(),
            });
          }
        }, 1000);
      }
    };

    // Add idle detection
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (isIdle) {
        setIsIdle(false);
        setIdleCountdown(5);
        if (idleTimerRef.current) {
          clearInterval(idleTimerRef.current);
          idleTimerRef.current = null;
        }
      }
    };

    // Check for idle every 30 seconds
    const idleCheckInterval = setInterval(() => {
      const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
      if (mode === "challenge" && config.role !== "admin") {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        if (timeSinceActivity > 60000 && !isIdle) {
          // 60 seconds of inactivity
          setIsIdle(true);
          let countdown = 5;

          idleTimerRef.current = setInterval(() => {
            countdown--;
            setIdleCountdown(countdown);

            if (countdown <= 0) {
              setGameBlocked(true);
              clearInterval(idleTimerRef.current);
              eventTracker.logEvent("game_blocked", {
                reason: "idle",
                timestamp: Date.now(),
              });
            }
          }, 1000);
        }
      }
    }, 30000);

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keypress", handleActivity);
    window.addEventListener("click", handleActivity);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("click", handleActivity);
      clearInterval(idleCheckInterval);
      if (outOfFocusTimerRef.current) {
        clearInterval(outOfFocusTimerRef.current);
      }
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [mode, isOutOfFocus, isIdle]); // ← Note the dependencies added here

  useEffect(() => {
    // Read config from sessionStorage (set by StudentLogin)
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const duration = config.semesterDuration || 1200000; // milliseconds
    const durationInSeconds = Math.floor(duration / 1000);

    setTimeLimit(durationInSeconds);
    setTimeRemaining(durationInSeconds);

    // Debug logging
    console.log("=== Game Configuration Loaded ===");
    console.log("Role:", config.role || "student");
    console.log("Duration:", durationInSeconds + " seconds");
    console.log("Display Name:", config.displayName || "Student");
    console.log("Is Admin:", config.role === "admin");
    console.log("================================");
  }, []);

  const calculateStudentLearning = (points = categoryPoints) => {
    // FIXED: Using correct category names (not 'materials', 'research', 'engagement')
    const sliderPoints = points.slider || 0;
    const countingPoints = points.counting || 0;
    const typingPoints = points.typing || 0;

    // Counting multiplier: each point adds 0.15 to multiplier
    const countingMultiplier = 1 + countingPoints * 0.15;

    // Base score: Slider × Counting multiplier
    const baseScore = sliderPoints * countingMultiplier;

    // Calculate typing interest rate (0.15% per typing point)
    const typingInterestRate = typingPoints * 0.0015;

    // Get accumulated interest from localStorage
    const accumulatedInterest =
      parseFloat(localStorage.getItem("typingInterest") || "0") || 0;

    const total = baseScore + accumulatedInterest;

    return isNaN(total) ? 0 : total;
  };

  // Session management
  const checkAndInitSession = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hasCode = urlParams.has("code") || urlParams.has("c");

      if (!hasCode) {
        setMode("studentLogin");
        setIsLoading(false);
        return;
      }

      const { allowed, reason, resumeSession, newSession, code, codeData } =
        await sessionManager.checkAccess();

      if (!allowed) {
        setAccessDenied(true);
        setAccessDeniedReason(reason);
        setIsLoading(false);
        return;
      }

      if (resumeSession) {
        setSessionId(resumeSession);
        localStorage.setItem("sessionId", resumeSession);
      } else if (newSession) {
        const id = await sessionManager.createSession(code, codeData);
        setSessionId(id);
      }

      await eventTracker.syncOfflineEvents();
      setIsLoading(false);
    } catch (error) {
      console.error("Session init error:", error);
      setIsLoading(false);
    }
  };

  const startTimer = () => {
    // Get config and calculate limit FIRST
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const duration = config.semesterDuration || 1200000;
    const limitInSeconds = Math.floor(duration / 1000);

    console.log("Starting timer with limit:", limitInSeconds, "seconds");

    // Set the time limit in state
    setTimeLimit(limitInSeconds);
    setTimeRemaining(limitInSeconds);

    // Use refs to avoid closure issues
    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      setGlobalTimer(elapsedSeconds);

      // Calculate remaining based on the limit we calculated above
      const remaining = Math.max(0, limitInSeconds - elapsedSeconds);
      setTimeRemaining(remaining);

      // Check for checkpoint
      const checkpointTime =
        config.role === "admin" && config.semesterDuration === 120000
          ? 60
          : 600;

      if (elapsedSeconds === checkpointTime && !checkpointReached) {
        handleCheckpoint();
      }

      // Check for completion
      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        handleGameComplete("semester_complete");
      }
    }, 1000);
  };

  // Handle checkpoint (exam season)
  const handleCheckpoint = () => {
    setCheckpointReached(true);

    // Calculate checkpoint bonus
    const bonus = calculateCheckpointBonus();
    setCheckpointBonus(bonus);

    // Show checkpoint modal
    setIsInBreak(true);
    setBreakDestination("checkpoint");

    // Log checkpoint event
    eventTracker.logEvent("checkpoint_reached", {
      semester: currentSemester,
      time: isAdminMode ? 60 : 600,
      completedTasks: Object.keys(completed).length,
      completedLevels: completedLevels,
      categoryPoints,
      bonusEarned: bonus,
      studentLearningScore: calculateStudentLearning(),
    });

    // Add bonus to score
    setCategoryPoints((prev) => ({
      ...prev,
      bonus: (prev.bonus || 0) + bonus,
    }));

    // Continue after showing checkpoint
    setTimeout(() => {
      setIsInBreak(false);
      setBreakDestination(null);
    }, 5000);
  };

  const calculateCheckpointBonus = () => {
    // Calculate current student learning score
    const studentLearning = calculateStudentLearning();

    // New threshold: 50 points = 300 bonus
    if (studentLearning >= 50) {
      return 300;
    }

    return 0;
  };

  // Handle practice choice
  const handlePracticeChoice = (choice) => {
    setPracticeChoice(choice);
    eventTracker.trackUserAction("practice_choice", {
      choice: choice,
      timestamp: Date.now(),
    });

    if (choice === "no") {
      startMainGame();
    } else {
      setMode("practice");
    }
  };

  const startMainGame = () => {
    if (!randomSeed) {
      const seed = Math.floor(Math.random() * 1000000);
      setRandomSeed(seed);
      patternGenerator.initializeSeed(seed);

      if (sessionId && !sessionId.startsWith("offline-")) {
        updateDoc(doc(db, "sessions", sessionId), {
          randomSeed: seed,
          [`semesterSeeds.semester${currentSemester}`]: seed,
        });
      }
    }

    localStorage.setItem("typingInterest", "0");
    setCategoryPoints({
      slider: 0, // Changed from materials
      counting: 0, // Changed from research
      typing: 0, // Changed from engagement
      bonus: 0,
    });

    setMode("challenge");
    setCompleted({});
    setCompletedLevels(0);
    setSwitches(0);
    setBonusPrompts(0);
    setCurrentTab("g2t1");
    setCheckpointReached(false);

    // Reset teaching points
    setCategoryPoints({ materials: 0, research: 0, engagement: 0, bonus: 0 });
    setTaskAttempts({});
    setTaskPoints({});

    // Start timer (it will handle time limit setting)
    startTimer();

    setTaskStartTimes({ g2t1: Date.now() });
    eventTracker.setPageStartTime("g2t1");
    eventTracker.logEvent("game_start", {
      practiceCompleted: practiceChoice === "yes",
      timestamp: Date.now(),
      gameMode: gameMode,
      currentSemester: currentSemester,
      totalSemesters: totalSemesters,
      isAdminMode: isAdminMode,
    });
  };

  // Helper function to calculate Levenshtein distance
  function calculateLevenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  // Handle task completion
  const handleComplete = async (tabId, data) => {
    lastActivityRef.current = Date.now();

    // New point system based on task type and accuracy
    let points = 0;
    // Map to teaching categories with NEW names
    const category = tabId.startsWith("g1")
      ? "counting" // Changed from "research"
      : tabId.startsWith("g2")
      ? "slider" // Changed from "materials"
      : "typing"; // Changed from "engagement"

    if (category === "slider") {
      // Slider: exact = 2 points, within 1 = 1 point
      const userValue = parseFloat(data.userValue || 0);
      const targetValue = parseFloat(data.targetValue || 0);
      const diff = Math.abs(userValue - targetValue);

      if (diff === 0) points = 2;
      else if (diff <= 1) points = 1;
      else points = 0;
    } else if (category === "counting") {
      // Counting: exact = 2 points, within 1 = 1 point
      const userCount = parseInt(data.userAnswer || 0);
      const correctCount = parseInt(data.correctAnswer || 0);
      const diff = Math.abs(userCount - correctCount);

      if (diff === 0) points = 2;
      else if (diff <= 1) points = 1;
      else points = 0;
    } else if (category === "typing") {
      // Typing: exact = 2 points, one typo = 1 point
      const userText = data.userAnswer || "";
      const correctText = data.correctAnswer || "";

      if (userText === correctText) {
        points = 2;
      } else {
        // Check if only one character difference (Levenshtein distance = 1)
        const distance = calculateLevenshteinDistance(userText, correctText);
        if (distance === 1) points = 1;
        else points = 0;
      }
    }

    // Store raw points for the category
    setCategoryPoints((prev) => ({
      ...prev,
      [category]: prev[category] + points,
    }));

    // Calculate and apply typing interest after EVERY task completion
    const currentTypingPoints =
      category === "typing"
        ? categoryPoints.typing + points
        : categoryPoints.typing;
    const typingInterestRate = 0.0015 * currentTypingPoints;

    // Get current goal points (slider × counting multiplier)
    const currentSliderPoints =
      category === "slider"
        ? categoryPoints.slider + points
        : categoryPoints.slider;
    const currentCountingMultiplier =
      1 +
      (category === "counting"
        ? categoryPoints.counting + points
        : categoryPoints.counting) *
        0.15;
    const goalPoints = currentSliderPoints * currentCountingMultiplier;

    // Add typing interest to accumulated interest
    const previousInterest = parseFloat(
      localStorage.getItem("typingInterest") || "0"
    );
    const newInterest = previousInterest + typingInterestRate * goalPoints;
    localStorage.setItem("typingInterest", newInterest.toString());

    setTaskPoints((prev) => ({
      ...prev,
      [tabId]: points,
    }));

    setTaskAttempts((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] || 0) + 1,
    }));

    // Calculate the new student learning score
    const newCategoryPoints = {
      ...categoryPoints,
      [category]: categoryPoints[category] + points,
    };

    const newStudentLearning = calculateStudentLearning(newCategoryPoints);
    setStudentLearningScore(newStudentLearning);

    // Show detailed feedback with task-specific information
    let feedbackMsg = "";
    if (category === "slider") {
      const diff = Math.abs((data.userValue || 0) - (data.targetValue || 0));
      if (diff === 0) {
        feedbackMsg = "Perfect slider!";
      } else if (diff <= 1) {
        feedbackMsg = `Off by ${diff.toFixed(2)}`;
      } else {
        feedbackMsg = `Off by ${diff.toFixed(2)}`;
      }
    } else if (category === "counting") {
      const diff = Math.abs((data.userAnswer || 0) - (data.correctAnswer || 0));
      if (diff === 0) {
        feedbackMsg = "Perfect count!";
      } else if (diff <= 1) {
        feedbackMsg = `Off by ${diff}`;
      } else {
        feedbackMsg = `Off by ${diff}`;
      }
    } else if (category === "typing") {
      if (points === 2) {
        feedbackMsg = "Perfect typing!";
      } else if (points === 1) {
        feedbackMsg = "One typo";
      } else {
        feedbackMsg = "Multiple errors";
      }
    }

    showNotification(
      `${feedbackMsg} | +${points} ${category} pts | Goal: ${Math.round(
        newStudentLearning
      )} pts`
    );

    setCompleted((prev) => ({ ...prev, [tabId]: true }));
    setCompletedLevels((prev) => prev + 1);
    setBonusPrompts((prev) => prev + 1);

    await eventTracker.trackTaskComplete(
      tabId,
      data.attempts,
      data.totalTime,
      data.accuracy || data.difference || 0
    );

    await eventTracker.logEvent("task_complete", {
      taskId: tabId,
      ...data,
      pointsEarned: points,
      categoryPoints: newCategoryPoints,
      studentLearningScore: newStudentLearning,
      typingInterest: newInterest,
      completionContext: {
        totalTasksCompleted: Object.keys(completed).length + 1,
        currentGameTime: globalTimer,
        switchesBeforeCompletion: switches,
        bonusPromptsEarned: bonusPrompts + 1,
        timeRemaining: timeRemaining,
      },
    });

    if (sessionId && !sessionId.startsWith("offline-")) {
      await updateDoc(doc(db, "sessions", sessionId), {
        [`completedTasks.${tabId}`]: true,
        [`taskPoints.${tabId}`]: points,
        [`categoryPoints`]: newCategoryPoints,
        studentLearningScore: newStudentLearning,
        typingInterest: newInterest,
        bonusPrompts: bonusPrompts + 1,
        lastActivity: serverTimestamp(),
      });
    }

    // Auto-advance to next task after 1.5 seconds (more stable)
    setTimeout(() => {
      // Prevent advance if user already switched
      if (currentTab !== tabId) return;

      const currentGame = tabId[1];
      const currentTaskNum = parseInt(tabId.substring(3)); // Fix parsing for 2-digit numbers

      // Try next task in same game
      if (currentTaskNum < 50) {
        // Updated to 50 tasks
        const nextTask = `g${currentGame}t${currentTaskNum + 1}`;
        if (!completed[nextTask]) {
          handleTabSwitch(nextTask, true);
        }
      }
    }, 1500);
  }; // Increased delay to prevent conflicts

  // Handle tab switching
  const handleTabSwitch = async (newTab, isAutoAdvance = false) => {
    if (isInBreak) return;

    // Prevent switching to completed tasks
    if (completed[newTab] && !isAutoAdvance) {
      showNotification("Task already completed! Choose a different task.");
      return;
    }

    if (!isAutoAdvance) {
      await eventTracker.trackUserAction("manual_tab_switch", {
        from: currentTab,
        to: newTab,
        reason: "user_clicked",
      });
    }

    lastActivityRef.current = Date.now();
    if (isIdle) {
      setIsIdle(false);
      setIdleCountdown(5);
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    }

    if (currentTab !== newTab && !isAutoAdvance) {
      setSwitches((prev) => prev + 1);
    }

    await eventTracker.trackPageSwitch(currentTab, newTab, isAutoAdvance);

    if (taskStartTimes[currentTab]) {
      const timeSpent = Date.now() - taskStartTimes[currentTab];
      await eventTracker.logEvent("task_time", {
        taskId: currentTab,
        timeSpent,
        completed: completed[currentTab] || false,
        leftForTask: newTab,
      });
    }

    setCurrentTab(newTab);
    setTaskStartTimes((prev) => ({ ...prev, [newTab]: Date.now() }));
    eventTracker.setPageStartTime(newTab);
  };

  // Show notification
  const showNotification = (message) => {
    const notification = document.createElement("div");
    notification.className = "notification-enter";
    notification.style.cssText =
      "position: fixed; bottom: 20px; left: 20px; background: #2196F3; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; max-width: 400px;";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.className = "notification-exit";
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 3000);
  };

  // Handle game completion
  const handleGameComplete = async (reason = "semester_complete") => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const finalTime = Math.floor(
      (Date.now() - startTimeRef.current - pausedTime) / 1000
    );

    const finalStudentLearning = calculateStudentLearning();
    const totalBonus = categoryPoints.bonus || 0;
    const finalScore = Math.round(finalStudentLearning) + totalBonus;

    await eventTracker.logEvent("game_complete", {
      totalTime: finalTime,
      totalSwitches: switches,
      completedTasks: Object.keys(completed).length,
      completedLevels: completedLevels,
      completionReason: reason,
      gameMode: gameMode,
      currentSemester: currentSemester,
      categoryPoints,
      studentLearningScore: finalStudentLearning,
      totalBonus,
      finalScore,
      finalContext: {
        practiceCompleted: practiceChoice === "yes",
        totalPrompts: 3 + bonusPrompts,
        isAdminMode: isAdminMode,
      },
    });

    if (sessionId && !sessionId.startsWith("offline-")) {
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "completed",
        completedAt: serverTimestamp(),
        finalTime,
        totalSwitches: switches,
        completionReason: reason,
        currentSemester: currentSemester,
        finalScore,
        studentLearningScore: finalStudentLearning,
      });
    }

    setMode("complete");
  };

  // Render current task
  const renderTask = () => {
    const game = currentTab[1];
    const taskNum = parseInt(currentTab.substring(3));

    if (game === "1") {
      return (
        <CountingTask
          taskNum={taskNum}
          onComplete={handleComplete}
          currentTaskId={currentTab}
        />
      );
    }
    if (game === "2") {
      return (
        <SliderTask
          taskNum={taskNum}
          onComplete={handleComplete}
          currentTaskId={currentTab}
        />
      );
    }
    return (
      <TypingTask
        taskNum={taskNum}
        onComplete={handleComplete}
        currentTaskId={currentTab}
      />
    );
  };

  // Loading screen
  if (isLoading) {
    return (
      <div
        className="app"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h2>Loading...</h2>
      </div>
    );
  }

  // Student login screen
  if (mode === "studentLogin") {
    return (
      <StudentLogin
        onLoginSuccess={(code) => {
          window.location.href = `${window.location.origin}?code=${code}`;
        }}
      />
    );
  }

  // Access denied screen
  if (accessDenied) {
    return (
      <div
        className="app"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            maxWidth: "500px",
          }}
        >
          <h2 style={{ color: "#f44336", marginBottom: "20px" }}>
            Access Denied
          </h2>
          <p style={{ color: "#666", marginBottom: "30px", fontSize: "18px" }}>
            {accessDeniedReason ||
              "You need a valid access code to play this game."}
          </p>
          <p style={{ color: "#888", fontSize: "16px" }}>
            Please access this game through your student login or survey link.
          </p>
        </div>
      </div>
    );
  }

  // Landing page
  if (mode === "landing") {
    if (!gameMode) {
      setGameMode({ accuracy: "lenient", limit: "time" });
    }

    return (
      <div className="app">
        <div className="landing-container">
          <div className="landing-card">
            <h1
              style={{ color: "#333", marginBottom: "20px", fontSize: "28px" }}
            >
              Can you beat Park? - Semester {currentSemester}/{totalSemesters}
            </h1>

            <div className="game-info">
              <h2
                style={{
                  color: "#555",
                  fontSize: "20px",
                  marginBottom: "15px",
                }}
              >
                Maximize student learning through strategic teaching!
              </h2>

              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ color: "#4CAF50" }}>🎯 Slider Tasks</h3>
                <p>
                  Create teaching materials - each point directly contributes to
                  your goal points!
                </p>

                <h3 style={{ color: "#9C27B0" }}>📚 Counting Tasks</h3>
                <p>
                  Research amplifies your materials! Each point adds +15%
                  multiplier to all slider points.
                </p>

                <h3 style={{ color: "#f44336" }}>✉️ Typing Tasks</h3>
                <p>
                  Build interest that compounds! Each point adds 0.15% interest
                  after every task completion.
                </p>
              </div>

              <div
                style={{
                  background: "#f0f8ff",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "20px",
                  border: "2px solid #2196F3",
                }}
              >
                <h3
                  style={{
                    color: "#2196F3",
                    fontSize: "18px",
                    marginBottom: "15px",
                  }}
                >
                  📊 Student Learning Formula
                </h3>
                <div
                  style={{
                    background: "white",
                    padding: "15px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    fontSize: "16px",
                    textAlign: "center",
                    marginBottom: "15px",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  Goal = Slider × (1 + 0.15×Counting) + Typing Interest
                </div>
                <ul
                  style={{
                    color: "#333",
                    lineHeight: "1.8",
                    margin: "0",
                    paddingLeft: "20px",
                    fontSize: "14px",
                    textAlign: "left",
                  }}
                >
                  <li>
                    Complete tasks with 70%+ accuracy for 1 point, 95%+ for 2
                    points
                  </li>
                  <li>
                    Strategic timing matters - early multipliers compound!
                  </li>
                  <li>
                    At minute {isAdminMode ? "1" : "10"}: Exam checkpoint with
                    bonus opportunities
                  </li>
                  <li>30+ Student Learning = 100 bonus, 60+ = 200 bonus</li>
                </ul>
              </div>

              <div
                style={{
                  background: "#fff3cd",
                  borderRadius: "6px",
                  padding: "15px",
                  marginBottom: "20px",
                  border: "1px solid #ffc107",
                }}
              >
                <h3
                  style={{
                    color: "#856404",
                    fontSize: "16px",
                    marginBottom: "10px",
                  }}
                >
                  AI Assistant Available:
                </h3>
                <ul
                  style={{
                    color: "#856404",
                    lineHeight: "1.6",
                    margin: "0",
                    paddingLeft: "20px",
                    fontSize: "14px",
                  }}
                >
                  <li>
                    Ask for help with "slider help", "count help", or "type
                    help"
                  </li>
                  <li>Unlimited use but reliability varies</li>
                  <li>Strategic advice available - ask about task ordering!</li>
                </ul>
              </div>
            </div>

            <button
              className="start-button"
              onClick={() => setMode("practiceChoice")}
            >
              Start Semester {currentSemester}
            </button>

            {isAdminMode && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "10px",
                  background: "#ffcccb",
                  borderRadius: "6px",
                  border: "2px solid #ff0000",
                  fontWeight: "bold",
                  color: "#d00",
                }}
              >
                ADMIN MODE: {timeLimit / 60} minute timer, checkpoint at 1
                minute
              </div>
            )}

            {semesterHistory.length > 0 && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#e3f2fd",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <strong>Previous Semesters:</strong>
                {semesterHistory.map((sem, idx) => (
                  <div key={idx} style={{ marginTop: "5px" }}>
                    Semester {idx + 1}: {sem.finalScore} points
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Practice choice
  if (mode === "practiceChoice") {
    return (
      <div className="app">
        <div className="landing-container">
          <div className="landing-card">
            <h2 style={{ color: "#333", marginBottom: "20px" }}>
              Would you like to practice first?
            </h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              Practice mode lets you try each teaching task without time
              pressure.
            </p>
            <p
              style={{
                color: "#888",
                fontSize: "14px",
                marginBottom: "30px",
                fontStyle: "italic",
              }}
            >
              Tip: Try different task difficulties to plan your teaching
              strategy!
            </p>

            <div
              style={{ display: "flex", gap: "20px", justifyContent: "center" }}
            >
              <button
                onClick={() => handlePracticeChoice("yes")}
                style={{
                  padding: "15px 30px",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                Yes, Practice First
              </button>
              <button
                onClick={() => handlePracticeChoice("no")}
                style={{
                  padding: "15px 30px",
                  background: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                No, Start Semester
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Practice mode
  if (mode === "practice") {
    return (
      <div className="app">
        <h1>Teaching Simulation - Practice Mode</h1>
        <PracticeMode
          onStartMainGame={() => {
            startMainGame();
          }}
        />
      </div>
    );
  }

  // Completion screen
  if (mode === "complete") {
    const minutes = Math.floor(globalTimer / 60);
    const seconds = globalTimer % 60;
    const finalStudentLearning = Math.round(calculateStudentLearning());
    const totalBonus = categoryPoints.bonus || 0;
    const finalScore = finalStudentLearning + totalBonus;

    const semesterData = {
      semester: currentSemester,
      totalTime: globalTimer,
      completedLevels: completedLevels,
      categoryPoints,
      switches,
      gameMode,
      randomSeed,
      studentLearningScore: finalStudentLearning,
      finalScore,
    };

    const handleNextSemester = async () => {
      const newHistory = [...semesterHistory, semesterData];
      setSemesterHistory(newHistory);

      if (sessionId && !sessionId.startsWith("offline-")) {
        await updateDoc(doc(db, "sessions", sessionId), {
          [`semesterHistory.semester${currentSemester}`]: semesterData,
          currentSemester: currentSemester + 1,
          lastActivity: serverTimestamp(),
        });
      }

      setCurrentSemester(currentSemester + 1);
      setCompleted({});
      setCompletedLevels(0);
      setSwitches(0);
      setBonusPrompts(0);
      setGlobalTimer(0);
      setPausedTime(0);
      setCurrentTab("g2t1");
      setMode("challenge");

      const newSeed = Math.floor(Math.random() * 1000000);
      setRandomSeed(newSeed);
      patternGenerator.initializeSeed(newSeed);

      startTimer();
      setTaskStartTimes({ g2t1: Date.now() });
      eventTracker.setPageStartTime("g2t1");
    };

    const isLastSemester = currentSemester >= totalSemesters;

    return (
      <div className="app">
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
          {/* Semester indicator */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "20px",
              padding: "15px",
              background: "#e3f2fd",
              borderRadius: "8px",
              border: "2px solid #2196F3",
            }}
          >
            <h2 style={{ color: "#2196F3", margin: 0 }}>
              Semester {currentSemester} of {totalSemesters} Complete!
            </h2>
          </div>

          {/* Show completion code only on last semester */}
          {isLastSemester && (
            <CompletionCodeDisplay
              sessionId={sessionId}
              completedLevels={completedLevels}
              totalTime={globalTimer}
              gameMode={gameMode}
            />
          )}

          {/* Performance Summary */}
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              marginTop: "20px",
            }}
          >
            <h2 style={{ color: "#333", marginBottom: "20px" }}>
              📊 Semester {currentSemester} Performance
            </h2>

            {/* Final Score */}
            <div
              style={{
                fontSize: "36px",
                fontWeight: "bold",
                color: "#2196F3",
                marginBottom: "30px",
              }}
            >
              Final Score: {finalScore} points
            </div>

            {/* Student Learning Breakdown */}
            <div
              style={{
                background: "#e3f2fd",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "30px",
                border: "2px solid #2196F3",
              }}
            >
              <h3 style={{ margin: "0 0 15px 0", color: "#1976d2" }}>
                Student Learning Score: {finalStudentLearning}
              </h3>
              <div style={{ fontSize: "16px", color: "#666" }}>
                = {categoryPoints.slider || 0} (Slider) ×{" "}
                {(1 + (categoryPoints.counting || 0) * 0.15).toFixed(2)}{" "}
                (Counting)
                {parseFloat(localStorage.getItem("typingInterest") || "0") >
                  0 &&
                  ` + ${parseFloat(
                    localStorage.getItem("typingInterest") || "0"
                  ).toFixed(2)} (Interest)`}
              </div>
              {totalBonus > 0 && (
                <div
                  style={{
                    marginTop: "10px",
                    fontSize: "16px",
                    color: "#1976d2",
                  }}
                >
                  + {totalBonus} Checkpoint Bonus
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "15px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "2px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Total Time
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {minutes}m {seconds}s
                </div>
              </div>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "2px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Student Learning
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {finalStudentLearning}
                </div>
              </div>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "2px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Checkpoint Bonus
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  +{totalBonus}
                </div>
              </div>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "2px solid #e0e0e0",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    marginBottom: "5px",
                  }}
                >
                  Tasks Completed
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {completedLevels}
                </div>
              </div>
            </div>

            {/* Teaching Performance Breakdown */}
            <h3 style={{ color: "#666", marginBottom: "15px" }}>
              Teaching Performance by Category
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "15px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  background: "#f0f8f0",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "2px solid #4CAF5020",
                }}
              >
                <div
                  style={{
                    color: "#4CAF50",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  🎯 Slider
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.slider || 0}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Base points
                </div>
              </div>

              <div
                style={{
                  background: "#f8f0ff",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "2px solid #9C27B020",
                }}
              >
                <div
                  style={{
                    color: "#9C27B0",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  📚 Counting
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.counting || 0}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  +{(categoryPoints.counting || 0) * 15}% multiplier
                </div>
              </div>

              <div
                style={{
                  background: "#fff0f0",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "2px solid #f4433620",
                }}
              >
                <div
                  style={{
                    color: "#f44336",
                    fontWeight: "bold",
                    marginBottom: "5px",
                  }}
                >
                  ✉️ Typing
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.typing || 0}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  +{((categoryPoints.typing || 0) * 0.15).toFixed(1)}%
                  interest/task
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#fff0f0",
                padding: "15px",
                borderRadius: "6px",
                border: "2px solid #f4433620",
              }}
            >
              <div
                style={{
                  color: "#f44336",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                ✉️ Engagement
              </div>
              <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                {categoryPoints.engagement}
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                +{categoryPoints.engagement * 1}% multiplier
              </div>
            </div>
          </div>

          {/* Checkpoint Bonus Display */}
          {categoryPoints.bonus > 0 && (
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                background: "#fff3cd",
                borderRadius: "6px",
                border: "1px solid #ffc107",
              }}
            >
              <strong style={{ color: "#856404" }}>
                📚 Exam Season Bonus:{" "}
              </strong>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#856404",
                }}
              >
                +{categoryPoints.bonus} points
              </span>
            </div>
          )}

          {/* Semester history */}
          {semesterHistory.length > 0 && (
            <div
              style={{
                marginTop: "30px",
                padding: "20px",
                background: "#f8f9fa",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ color: "#666", marginBottom: "15px" }}>
                Progress Over Semesters
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                  gap: "10px",
                }}
              >
                {[...semesterHistory, semesterData].map((sem, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px",
                      background:
                        idx === semesterHistory.length ? "#e3f2fd" : "white",
                      borderRadius: "6px",
                      border: "1px solid #e0e0e0",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Semester {idx + 1}
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#333",
                      }}
                    >
                      {sem.finalScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next semester or finish button */}
        <div style={{ marginTop: "30px", textAlign: "center" }}>
          {!isLastSemester ? (
            <button
              onClick={handleNextSemester}
              style={{
                padding: "15px 40px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            >
              Start Semester {currentSemester + 1} →
            </button>
          ) : (
            <div
              style={{
                padding: "20px",
                background: "#fff3cd",
                border: "2px solid #ffc107",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#856404", marginBottom: "10px" }}>
                ⚠️ All semesters complete!
              </h3>
              <p style={{ color: "#856404", marginBottom: "0" }}>
                Return to the Qualtrics survey and enter your completion code to
                finish the study.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main challenge mode
  return (
    <div className="app">
      {/* Checkpoint Modal */}
      {isInBreak && breakDestination === "checkpoint" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.8)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "12px",
              textAlign: "center",
              maxWidth: "600px",
            }}
          >
            <h2 style={{ color: "#4CAF50", marginBottom: "20px" }}>
              📚 Exam Season Checkpoint!
            </h2>
            <p style={{ fontSize: "18px", marginBottom: "20px" }}>
              The midterm is here! Let's see how your students are doing...
            </p>
            <div style={{ marginBottom: "20px" }}>
              <h3>Teaching Performance:</h3>
              <div>Materials Created: {categoryPoints.materials} pts</div>
              <div>
                Research: {categoryPoints.research} pts (×
                {(1 + categoryPoints.research * 0.05).toFixed(2)})
              </div>
              <div>
                Engagement: {categoryPoints.engagement} pts (×
                {(1 + categoryPoints.engagement * 0.01).toFixed(2)})
              </div>
            </div>
            <div
              style={{
                background: "#e3f2fd",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1976d2",
                }}
              >
                Student Learning Score: {Math.round(calculateStudentLearning())}{" "}
                pts
              </div>
              <div
                style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}
              >
                = {categoryPoints.materials} ×{" "}
                {(1 + categoryPoints.research * 0.05).toFixed(2)} ×{" "}
                {(1 + categoryPoints.engagement * 0.01).toFixed(2)}
              </div>
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: checkpointBonus > 0 ? "#4CAF50" : "#ff9800",
              }}
            >
              {checkpointBonus > 0 ? (
                <>Midterm Bonus: +{checkpointBonus} points!</>
              ) : (
                <>Need 50+ Goal Points for 300 bonus!</>
              )}
            </div>
            <p style={{ marginTop: "20px", color: "#666" }}>
              Continuing in 5 seconds...
            </p>
          </div>
        </div>
      )}

      {/* Game blocked overlay */}
      {gameBlocked && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.9)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "10px",
              textAlign: "center",
              maxWidth: "500px",
            }}
          >
            <h2 style={{ color: "#f44336", marginBottom: "20px" }}>
              Session Ended
            </h2>
            <p style={{ marginBottom: "30px" }}>
              Your session has been terminated due to inactivity or switching
              away from the game.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 30px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Restart Game
            </button>
          </div>
        </div>
      )}

      {/* Out of focus warning */}
      {isOutOfFocus && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#ff9800",
            color: "white",
            padding: "15px 20px",
            borderRadius: "8px",
            zIndex: 10000,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <strong>⚠️ Focus Warning</strong>
          <br />
          Game will be blocked in {outOfFocusCountdown} seconds
        </div>
      )}

      {/* Idle warning */}
      {isIdle && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <h3 style={{ color: "#ff9800", marginBottom: "15px" }}>
              Are you still there?
            </h3>
            <p style={{ marginBottom: "20px" }}>
              Auto-closing in {idleCountdown} seconds due to inactivity
            </p>
            <button
              onClick={() => {
                setIsIdle(false);
                setIdleCountdown(5);
                lastActivityRef.current = Date.now();
              }}
              style={{
                padding: "10px 20px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Continue Playing
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "30px", textAlign: "center" }}>
          Can you beat Park? - Semester {currentSemester}/{totalSemesters}
        </h1>

        {/* ADD THIS DEBUG LINE HERE */}
        {console.log(
          "Current timeRemaining:",
          timeRemaining,
          "timeLimit:",
          timeLimit,
          "globalTimer:",
          globalTimer
        )}

        {/* Use NavTabsEnhanced with star progress */}
        <NavTabsEnhanced
          current={currentTab}
          completed={completed}
          onSwitch={handleTabSwitch}
          limitMode="time"
          taskPoints={taskPoints}
          categoryMultipliers={{}}
          starGoals={{}}
          categoryPoints={categoryPoints}
          timeRemaining={timeRemaining}
        />

        {/* Side-by-side layout: Game + Chat */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "stretch",
            marginTop: "20px",
            minHeight: "650px",
            width: "100%",
          }}
        >
          {/* Game area - 2/3 width */}
          <div
            style={{
              flex: "0 0 66.666%",
              minHeight: "650px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              overflow: "visible",
            }}
          >
            <div
              className="task-container"
              style={{
                width: "100%",
                minHeight: "650px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
              }}
            >
              {renderTask()}
            </div>
          </div>

          {/* Chat area - 1/3 width */}
          <div
            style={{
              flex: "0 0 33.333%",
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              overflow: "hidden",
              height: "650px",
            }}
          >
            <ChatContainer
              bonusPrompts={bonusPrompts}
              currentTask={currentTab}
              categoryPoints={categoryPoints}
              categoryMultipliers={{}}
              starGoals={{}}
              timeRemaining={timeRemaining}
              calculateStudentLearning={calculateStudentLearning}
              onAIHelp={(helpData) => {
                // Pass AI help to the current task
                window.dispatchEvent(
                  new CustomEvent("aiHelp", { detail: helpData })
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
