// src/App.jsx - Complete version with Star Goals
import React, { useState, useEffect, useRef } from "react";
import CountingTask from "./components/CountingTask";
import SliderTask from "./components/SliderTask";
import TypingTask from "./components/TypingTask";
import NavTabsEnhanced from "./components/NavTabsEnhanced";
import PracticeMode from "./components/PracticeMode";
import ChatContainer from "./components/ChatContainer";
import StudentLogin from "./components/StudentLogin";
import StarProgress from "./components/StarProgress";
import { sessionManager } from "./utils/sessionManager";
import { eventTracker } from "./utils/eventTracker";
import { taskDependencies } from "./utils/taskDependencies";
import { patternGenerator } from "./utils/patternGenerator";
import { db } from "./firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import "./App.css";
import AdminPage from "./AdminPage";
import GameModeSelector from "./components/GameModeSelector";
import CompletionCodeDisplay from "./components/CompletionCodeDisplay";

function App() {
  // Admin page (hidden route)
  if (window.location.search.includes("admin=true")) {
    return <AdminPage />;
  }

  // State management
  const [mode, setMode] = useState("landing");
  const [gameMode, setGameMode] = useState(null);
  const [practiceChoice, setPracticeChoice] = useState(null);
  const [currentTab, setCurrentTab] = useState("g1t1");
  const [completed, setCompleted] = useState({});
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
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds] = useState(4);
  const [roundHistory, setRoundHistory] = useState([]);
  const [randomSeed, setRandomSeed] = useState(null);

  // NEW: Star goal states
  const [timeLimit] = useState(720); // 12 minutes in seconds
  const [timeRemaining, setTimeRemaining] = useState(720);
  const [starGoals, setStarGoals] = useState({
    star1: { achieved: false, points: 0, bonusEarned: 0 },
    star2: { achieved: false, focusCategory: null, points: 0, bonusEarned: 0 },
    star3: {
      achieved: false,
      perfectCount: 0,
      totalAttempts: 0,
      bonusEarned: 0,
    },
  });
  const [categoryPoints, setCategoryPoints] = useState({
    counting: 0,
    slider: 0,
    typing: 0,
  });
  const [categoryMultipliers, setCategoryMultipliers] = useState({
    counting: 0,
    slider: 0,
    typing: 0,
  });
  const [taskAttempts, setTaskAttempts] = useState({}); // Track attempts per task

  // Refs
  const startTimeRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);
  const pauseStartRef = useRef(null);
  const outOfFocusTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Initialize session on mount
  useEffect(() => {
    checkAndInitSession();

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (outOfFocusTimerRef.current) {
        clearInterval(outOfFocusTimerRef.current);
      }
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, []);

  // Set up focus and idle detection when mode changes
  useEffect(() => {
    if (mode === "challenge") {
      console.log("Setting up idle detection for challenge mode");
      setupFocusAndIdleDetection();
    }

    return () => {
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [mode, gameBlocked, isInBreak, isIdle]);

  // Focus and idle detection setup
  const setupFocusAndIdleDetection = () => {
    // Track user activity
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      console.log("Activity detected, resetting timer");
      if (isIdle) {
        setIsIdle(false);
        setIdleCountdown(5);
        if (idleTimerRef.current) {
          clearInterval(idleTimerRef.current);
          idleTimerRef.current = null;
        }
      }
    };

    // Add activity listeners
    const eventListeners = [
      "mousedown",
      "mousemove",
      "keypress",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "input",
      "change",
    ];

    eventListeners.forEach((event) => {
      document.addEventListener(event, updateActivity);
    });

    // Focus detection
    const handleFocus = () => {
      setIsOutOfFocus(false);
      setOutOfFocusCountdown(30);
      if (outOfFocusTimerRef.current) {
        clearInterval(outOfFocusTimerRef.current);
        outOfFocusTimerRef.current = null;
      }

      // Track focus return
      eventTracker.trackUserAction("focus_returned", {
        currentTask: currentTab,
        gameTime: globalTimer,
      });
    };

    const handleBlur = () => {
      if (mode === "challenge" && !gameBlocked && !isInBreak) {
        setIsOutOfFocus(true);
        startOutOfFocusCountdown();

        // Track focus lost
        eventTracker.trackUserAction("focus_lost", {
          currentTask: currentTab,
          gameTime: globalTimer,
        });
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Start idle detection timer
    const idleCheckInterval = setInterval(() => {
      console.log(
        "Idle check - mode:",
        mode,
        "blocked:",
        gameBlocked,
        "break:",
        isInBreak,
        "idle:",
        isIdle
      );

      if (mode === "challenge" && !gameBlocked && !isInBreak && !isIdle) {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        console.log(
          "Time since last activity:",
          Math.floor(timeSinceActivity / 1000),
          "seconds"
        );

        if (timeSinceActivity > 120000) {
          // 120 seconds (2 minutes)
          console.log("Starting idle countdown!");
          setIsIdle(true);
          startIdleCountdown();
        }
      }
    }, 1000);

    idleTimerRef.current = idleCheckInterval;

    return () => {
      if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
      }
    };
  };

  // Out of focus countdown
  const startOutOfFocusCountdown = () => {
    outOfFocusTimerRef.current = setInterval(() => {
      setOutOfFocusCountdown((prev) => {
        if (prev <= 1) {
          setGameBlocked(true);
          setIsOutOfFocus(false);
          clearInterval(outOfFocusTimerRef.current);

          // Track game blocked due to focus
          eventTracker.trackUserAction("game_blocked_focus", {
            currentTask: currentTab,
            gameTime: globalTimer,
          });

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Idle countdown
  const startIdleCountdown = () => {
    let countdown = 5;
    setIdleCountdown(countdown);

    const idleCountdownInterval = setInterval(() => {
      countdown -= 1;
      setIdleCountdown(countdown);

      if (countdown <= 0) {
        setGameBlocked(true);
        setIsIdle(false);
        clearInterval(idleCountdownInterval);

        // Track game blocked due to idle
        eventTracker.trackUserAction("game_blocked_idle", {
          currentTask: currentTab,
          gameTime: globalTimer,
          timeSinceLastActivity: Date.now() - lastActivityRef.current,
        });
      }
    }, 1000);

    // Store the interval ID so we can clear it if user becomes active
    idleTimerRef.current = idleCountdownInterval;
  };

  // Handle user response to idle warning
  const handleIdleResponse = () => {
    setIsIdle(false);
    setIdleCountdown(5);
    lastActivityRef.current = Date.now();

    // Clear the countdown interval
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    // Track idle response
    eventTracker.trackUserAction("idle_warning_dismissed", {
      currentTask: currentTab,
      gameTime: globalTimer,
    });
  };

  // Session management
  const checkAndInitSession = async () => {
    try {
      // Check if there's a code in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const hasCode = urlParams.has("code") || urlParams.has("c");

      // If no code, show student login
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

  // UPDATED: Start timer with time limit
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startTimeRef.current - pausedTime) / 1000
      );
      setGlobalTimer(elapsed);

      // Time limit countdown
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleGameComplete("time_up");
      }
    }, 1000);
  };

  // Handle practice choice
  const handlePracticeChoice = (choice) => {
    setPracticeChoice(choice);

    // Track practice choice
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

  // Start main game
  const startMainGame = () => {
    // Clear all dependencies before starting main game
    taskDependencies.clearAllDependencies();

    // Generate random seed if not set
    if (!randomSeed) {
      const seed = Math.floor(Math.random() * 1000000);
      setRandomSeed(seed);
      patternGenerator.initializeSeed(seed);

      // Store seed to Firebase (hidden from player)
      if (sessionId && !sessionId.startsWith("offline-")) {
        updateDoc(doc(db, "sessions", sessionId), {
          randomSeed: seed,
          [`roundSeeds.round${currentRound}`]: seed,
        });
      }
    }

    // Clear any practice-related state
    setMode("challenge");
    setCompleted({});
    setSwitches(0);
    setBonusPrompts(0);
    setCurrentTab("g1t1");

    // Reset star goal states
    setTimeRemaining(timeLimit);
    setCategoryPoints({ counting: 0, slider: 0, typing: 0 });
    setCategoryMultipliers({ counting: 0, slider: 0, typing: 0 });
    setStarGoals({
      star1: { achieved: false, points: 0, bonusEarned: 0 },
      star2: {
        achieved: false,
        focusCategory: null,
        points: 0,
        bonusEarned: 0,
      },
      star3: {
        achieved: false,
        perfectCount: 0,
        totalAttempts: 0,
        bonusEarned: 0,
      },
    });
    setTaskAttempts({});

    startTimer();
    setTaskStartTimes({ g1t1: Date.now() });
    eventTracker.setPageStartTime("g1t1");
    eventTracker.logEvent("game_start", {
      practiceCompleted: practiceChoice === "yes",
      timestamp: Date.now(),
      gameMode: gameMode,
      currentRound: currentRound,
      totalRounds: totalRounds,
    });
  };

  // UPDATED: Handle task completion with star goals
  const handleComplete = async (tabId, data) => {
    // Reset idle timer on task completion
    lastActivityRef.current = Date.now();

    // Calculate points based on accuracy
    const points = data.accuracy >= 95 ? 2 : data.accuracy >= 70 ? 1 : 0;

    // Determine category
    const category = tabId.startsWith("g1")
      ? "counting"
      : tabId.startsWith("g2")
      ? "slider"
      : "typing";

    // Update category points
    setCategoryPoints((prev) => ({
      ...prev,
      [category]: prev[category] + points,
    }));

    // Track attempts for this task
    setTaskAttempts((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] || 0) + 1,
    }));

    // Track for star 3 (perfection tracking)
    setStarGoals((prev) => ({
      ...prev,
      star3: {
        ...prev.star3,
        totalAttempts: prev.star3.totalAttempts + 1,
        perfectCount: prev.star3.perfectCount + (points === 2 ? 1 : 0),
      },
    }));

    // Update multipliers for star 2
    updateMultipliers(category, points);

    // Mark task as completed
    setCompleted((prev) => ({ ...prev, [tabId]: true }));
    setBonusPrompts((prev) => prev + 1);

    // Check and activate dependencies
    const activatedDeps = taskDependencies.checkDependencies(
      tabId,
      mode === "practice"
    );

    // Enhanced tracking for task completion
    await eventTracker.trackTaskComplete(
      tabId,
      data.attempts,
      data.totalTime,
      data.accuracy
    );

    // Log completion event with full context
    await eventTracker.logEvent("task_complete", {
      taskId: tabId,
      ...data,
      pointsEarned: points,
      categoryPoints: categoryPoints[category] + points,
      activatedDependencies: activatedDeps,
      completionContext: {
        totalTasksCompleted: Object.keys(completed).length + 1,
        currentGameTime: globalTimer,
        switchesBeforeCompletion: switches,
        bonusPromptsEarned: bonusPrompts + 1,
        timeRemaining: timeRemaining,
      },
    });

    // Update session
    if (sessionId && !sessionId.startsWith("offline-")) {
      await updateDoc(doc(db, "sessions", sessionId), {
        [`completedTasks.${tabId}`]: true,
        [`taskPoints.${tabId}`]: points,
        [`categoryPoints`]: {
          ...categoryPoints,
          [category]: categoryPoints[category] + points,
        },
        bonusPrompts: bonusPrompts + 1,
        lastActivity: serverTimestamp(),
      });
    }

    // Show completion notification
    showNotification(`Task Complete! +${points} points earned!`);

    // Check star achievements after updating points
    checkStarGoals();
  };

  // NEW: Update multipliers function
  const updateMultipliers = (category, points) => {
    setCategoryMultipliers((prev) => {
      const newMultipliers = { ...prev };
      const currentPoints = categoryPoints[category] + points;

      // Update multipliers based on category and points
      if (category === "counting") {
        newMultipliers.counting = Math.floor(currentPoints / 2) * 0.2;
      } else if (category === "slider") {
        newMultipliers.slider = Math.floor(currentPoints / 3) * 0.3;
      } else if (category === "typing") {
        newMultipliers.typing = Math.floor(currentPoints / 2) * 0.2;
      }

      return newMultipliers;
    });
  };

  // NEW: Check star goals
  const checkStarGoals = () => {
    const total =
      categoryPoints.counting + categoryPoints.slider + categoryPoints.typing;

    // Star 1: 25 points with diversity bonus
    if (!starGoals.star1.achieved && total >= 25) {
      const bonus = calculateStar1Bonus();
      setStarGoals((prev) => ({
        ...prev,
        star1: { achieved: true, points: total, bonusEarned: bonus },
      }));
      showStarAchievement(1, bonus);
    }

    // Star 2: 20 points in focus category (determine focus by highest category)
    if (!starGoals.star2.achieved && starGoals.star1.achieved) {
      const focusCategory = determineFocusCategory();
      const focusPoints = categoryPoints[focusCategory];

      if (focusPoints >= 20) {
        const bonus = calculateStar2Bonus(focusCategory);
        setStarGoals((prev) => ({
          ...prev,
          star2: {
            achieved: true,
            focusCategory,
            points: focusPoints,
            bonusEarned: bonus,
          },
        }));
        showStarAchievement(2, bonus);
      }
    }

    // Star 3: 50 total points
    if (!starGoals.star3.achieved && total >= 50) {
      const bonus = calculateStar3Bonus();
      setStarGoals((prev) => ({
        ...prev,
        star3: { ...prev.star3, achieved: true, bonusEarned: bonus },
      }));
      showStarAchievement(3, bonus);
    }
  };

  // NEW: Calculate bonuses
  const calculateStar1Bonus = () => {
    // C × S × T bonus
    return (
      categoryPoints.counting * categoryPoints.slider * categoryPoints.typing
    );
  };

  const calculateStar2Bonus = (focusCategory) => {
    // Focus category points × sum of other multipliers
    const otherMultipliers = Object.entries(categoryMultipliers)
      .filter(([cat]) => cat !== focusCategory)
      .reduce((sum, [_, mult]) => sum + mult, 0);

    return Math.round(categoryPoints[focusCategory] * (1 + otherMultipliers));
  };

  const calculateStar3Bonus = () => {
    // Perfection percentage bonus (c2 × %²)
    const perfectionRate =
      starGoals.star3.totalAttempts > 0
        ? starGoals.star3.perfectCount / starGoals.star3.totalAttempts
        : 0;
    return Math.round(perfectionRate * perfectionRate * 1000);
  };

  // NEW: Helper functions for star goals
  const determineFocusCategory = () => {
    // Focus category is the one with most points
    const categories = Object.entries(categoryPoints);
    return categories.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  };

  const showStarAchievement = (starNum, bonus) => {
    const starSymbols = ["⭐", "⭐⭐", "⭐⭐⭐"][starNum - 1];
    showNotification(
      `${starSymbols} Star ${starNum} Achieved! +${bonus} bonus points!`
    );
  };

  // Handle tab switching
  const handleTabSwitch = async (newTab, isAutoAdvance = false) => {
    if (isInBreak) return;

    // Track user action
    if (!isAutoAdvance) {
      await eventTracker.trackUserAction("manual_tab_switch", {
        from: currentTab,
        to: newTab,
        reason: "user_clicked",
      });
    }

    // Reset idle timer on tab switch
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

    // Enhanced page switch tracking
    await eventTracker.trackPageSwitch(currentTab, newTab, isAutoAdvance);

    // Track time on previous task
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
      "position: fixed; bottom: 20px; left: 20px; background: #2196F3; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;";
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

  // UPDATED: Handle game completion
  const handleGameComplete = async (reason = "all_levels_complete") => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const finalTime = Math.floor(
      (Date.now() - startTimeRef.current - pausedTime) / 1000
    );

    // Calculate final scores
    const totalPoints =
      categoryPoints.counting + categoryPoints.slider + categoryPoints.typing;
    const totalBonus = Object.values(starGoals).reduce(
      (sum, star) => sum + star.bonusEarned,
      0
    );
    const finalScore = totalPoints + totalBonus;

    await eventTracker.logEvent("game_complete", {
      totalTime: finalTime,
      totalSwitches: switches,
      completedTasks: Object.keys(completed).length,
      completionReason: reason,
      gameMode: gameMode,
      currentRound: currentRound,

      // Point breakdown
      categoryPoints,
      starGoals,
      totalPoints,
      totalBonus,
      finalScore,

      // Performance metrics
      perfectionRate:
        starGoals.star3.totalAttempts > 0
          ? starGoals.star3.perfectCount / starGoals.star3.totalAttempts
          : 0,

      finalContext: {
        practiceCompleted: practiceChoice === "yes",
        totalPrompts: 3 + bonusPrompts,
      },
    });

    if (sessionId && !sessionId.startsWith("offline-")) {
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "completed",
        completedAt: serverTimestamp(),
        finalTime,
        totalSwitches: switches,
        completionReason: reason,
        currentRound: currentRound,
        finalScore,
        starGoals,
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
          gameAccuracyMode="lenient"
        />
      );
    }
    if (game === "2") {
      return (
        <SliderTask
          taskNum={taskNum}
          onComplete={handleComplete}
          gameAccuracyMode="lenient"
        />
      );
    }
    return (
      <TypingTask
        taskNum={taskNum}
        onComplete={handleComplete}
        gameAccuracyMode="lenient"
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

  // UPDATED: Landing page with star goals
  if (mode === "landing") {
    // Auto-set game mode
    if (!gameMode) {
      setGameMode({
        accuracy: "lenient",
        limit: "time",
      });
    }

    return (
      <div className="app">
        <div className="landing-container">
          <div className="landing-card">
            <h1
              style={{ color: "#333", marginBottom: "20px", fontSize: "28px" }}
            >
              Multi-Task Star Challenge - Round {currentRound}/{totalRounds}
            </h1>

            <div className="game-info">
              <h2
                style={{
                  color: "#555",
                  fontSize: "20px",
                  marginBottom: "15px",
                }}
              >
                Complete tasks to earn points and achieve star goals!
              </h2>

              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ color: "#9C27B0" }}>🔢 Counting Game</h3>
                <p>
                  Count words or letters in text passages. Earn 1-2 points per
                  task!
                </p>

                <h3 style={{ color: "#4CAF50" }}>🎯 Slider Game</h3>
                <p>
                  Match target values with precision. Perfect accuracy = 2
                  points!
                </p>

                <h3 style={{ color: "#f44336" }}>⌨️ Typing Game</h3>
                <p>Type patterns exactly as shown. High accuracy pays off!</p>
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
                  ⭐ Star Goals - Earn Bonus Points!
                </h3>
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
                    <strong>⭐ Star 1 (25 pts):</strong> Balance all three games
                    <br />
                    <span style={{ marginLeft: "20px", color: "#666" }}>
                      Bonus = Counting × Slider × Typing points
                    </span>
                  </li>
                  <li>
                    <strong>⭐⭐ Star 2 (20 pts in one category):</strong>{" "}
                    Specialize wisely
                    <br />
                    <span style={{ marginLeft: "20px", color: "#666" }}>
                      Build multipliers from other games first!
                    </span>
                  </li>
                  <li>
                    <strong>⭐⭐⭐ Star 3 (50 pts):</strong> Master the
                    challenge
                    <br />
                    <span style={{ marginLeft: "20px", color: "#666" }}>
                      Bonus based on your perfection rate²
                    </span>
                  </li>
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
                  How It Works:
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
                  <li>You have 12 minutes per round - use them wisely!</li>
                  <li>Score 70%+ accuracy = 1 point, 95%+ = 2 points</li>
                  <li>All games available from the start</li>
                  <li>Complete tasks to earn bonus chat prompts</li>
                  <li>Tasks get harder as you progress through levels</li>
                </ul>
              </div>
            </div>

            <button
              className="start-button"
              onClick={() => setMode("practiceChoice")}
            >
              Start Round {currentRound}
            </button>

            {/* Show round history */}
            {roundHistory.length > 0 && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "#e3f2fd",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              >
                <strong>Previous Rounds:</strong>
                {roundHistory.map((round, idx) => (
                  <div key={idx} style={{ marginTop: "5px" }}>
                    Round {idx + 1}: {round.finalScore} points (
                    {round.starsEarned} stars earned)
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
              Practice mode lets you try each game type without time pressure.
            </p>
            <p
              style={{
                color: "#888",
                fontSize: "14px",
                marginBottom: "30px",
                fontStyle: "italic",
              }}
            >
              Tip: Try different task difficulties to plan your strategy!
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
                No, Start Main Game
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
        <h1>Multi-Task Challenge - Practice Mode</h1>
        <PracticeMode
          onStartMainGame={() => {
            taskDependencies.clearAllDependencies();
            startMainGame();
          }}
          gameAccuracyMode="lenient"
        />
      </div>
    );
  }

  // UPDATED: Completion screen with star achievements
  if (mode === "complete") {
    const minutes = Math.floor(globalTimer / 60);
    const seconds = globalTimer % 60;
    const totalPoints =
      categoryPoints.counting + categoryPoints.slider + categoryPoints.typing;
    const totalBonus = Object.values(starGoals).reduce(
      (sum, star) => sum + star.bonusEarned,
      0
    );
    const finalScore = totalPoints + totalBonus;
    const starsEarned = [
      starGoals.star1.achieved,
      starGoals.star2.achieved,
      starGoals.star3.achieved,
    ].filter(Boolean).length;

    // Store round data
    const roundData = {
      round: currentRound,
      totalTime: globalTimer,
      completedLevels: Object.keys(completed).length,
      categoryPoints,
      switches,
      gameMode,
      randomSeed,
      starGoals,
      finalScore,
      starsEarned,
    };

    const handleNextRound = async () => {
      // Save current round data
      const newHistory = [...roundHistory, roundData];
      setRoundHistory(newHistory);

      // Store to Firebase
      if (sessionId && !sessionId.startsWith("offline-")) {
        await updateDoc(doc(db, "sessions", sessionId), {
          [`roundHistory.round${currentRound}`]: roundData,
          currentRound: currentRound + 1,
          lastActivity: serverTimestamp(),
        });
      }

      // Reset for next round
      setCurrentRound(currentRound + 1);
      setCompleted({});
      setSwitches(0);
      setBonusPrompts(0);
      setGlobalTimer(0);
      setPausedTime(0);
      setCurrentTab("g1t1");
      setMode("challenge");
      taskDependencies.clearAllDependencies();

      // Generate new seed for next round
      const newSeed = Math.floor(Math.random() * 1000000);
      setRandomSeed(newSeed);
      patternGenerator.initializeSeed(newSeed);

      // Restart timer
      startTimer();
      setTaskStartTimes({ g1t1: Date.now() });
      eventTracker.setPageStartTime("g1t1");
    };

    const isLastRound = currentRound >= totalRounds;

    return (
      <div className="app">
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "20px",
          }}
        >
          {/* Round indicator */}
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
              Round {currentRound} of {totalRounds} Complete!
            </h2>
          </div>

          {/* Show completion code only on last round */}
          {isLastRound && (
            <CompletionCodeDisplay
              sessionId={sessionId}
              completedLevels={Object.keys(completed).length}
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
              📊 Round {currentRound} Performance
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

            {/* Point Breakdown */}
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
                  Base Points
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {totalPoints}
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
                  Star Bonuses
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
            </div>

            {/* Category breakdown */}
            <h3 style={{ color: "#666", marginBottom: "15px" }}>
              Points by Category
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
                  🔢 Counting
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.counting}
                </div>
              </div>

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
                  {categoryPoints.slider}
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
                  ⌨️ Typing
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.typing}
                </div>
              </div>
            </div>

            {/* Star Achievements */}
            <div
              style={{
                marginTop: "30px",
                padding: "25px",
                background: "#fff3cd",
                borderRadius: "8px",
                border: "2px solid #ffc107",
              }}
            >
              <h3 style={{ color: "#856404", marginBottom: "20px" }}>
                ⭐ Star Achievements
              </h3>
              <div style={{ textAlign: "left", color: "#856404" }}>
                <div style={{ marginBottom: "10px" }}>
                  {starGoals.star1.achieved ? (
                    <span style={{ color: "#4CAF50" }}>
                      ✓ ⭐ Star 1 Achieved! Bonus: {starGoals.star1.bonusEarned}{" "}
                      points
                    </span>
                  ) : (
                    <span style={{ color: "#999" }}>
                      ✗ ⭐ Star 1: Need 25 total points (had {totalPoints})
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  {starGoals.star2.achieved ? (
                    <span style={{ color: "#4CAF50" }}>
                      ✓ ⭐⭐ Star 2 Achieved! Focus:{" "}
                      {starGoals.star2.focusCategory}, Bonus:{" "}
                      {starGoals.star2.bonusEarned} points
                    </span>
                  ) : (
                    <span style={{ color: "#999" }}>
                      ✗ ⭐⭐ Star 2: Need 20 points in one category
                    </span>
                  )}
                </div>
                <div>
                  {starGoals.star3.achieved ? (
                    <span style={{ color: "#4CAF50" }}>
                      ✓ ⭐⭐⭐ Star 3 Achieved! Perfection:{" "}
                      {(
                        (starGoals.star3.perfectCount /
                          starGoals.star3.totalAttempts) *
                        100
                      ).toFixed(1)}
                      %, Bonus: {starGoals.star3.bonusEarned} points
                    </span>
                  ) : (
                    <span style={{ color: "#999" }}>
                      ✗ ⭐⭐⭐ Star 3: Need 50 total points (had {totalPoints})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Round history if not first round */}
            {roundHistory.length > 0 && (
              <div
                style={{
                  marginTop: "30px",
                  padding: "20px",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                }}
              >
                <h4 style={{ color: "#666", marginBottom: "15px" }}>
                  Progress Over Rounds
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {[...roundHistory, roundData].map((round, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px",
                        background:
                          idx === roundHistory.length ? "#e3f2fd" : "white",
                        borderRadius: "6px",
                        border: "1px solid #e0e0e0",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        Round {idx + 1}
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "bold",
                          color: "#333",
                        }}
                      >
                        {round.finalScore}
                      </div>
                      <div style={{ fontSize: "10px", color: "#999" }}>
                        {round.starsEarned} stars
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Next round or finish button */}
          <div
            style={{
              marginTop: "30px",
              textAlign: "center",
            }}
          >
            {!isLastRound ? (
              <button
                onClick={handleNextRound}
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
                Start Round {currentRound + 1} →
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
                  ⚠️ All rounds complete!
                </h3>
                <p style={{ color: "#856404", marginBottom: "0" }}>
                  Return to the Qualtrics survey and enter your completion code
                  to finish the study.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main challenge mode
  return (
    <div className="app">
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
              Game Session Ended
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
              onClick={handleIdleResponse}
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

      <h1>
        Multi-Task Star Challenge - Round {currentRound}/{totalRounds}
      </h1>

      {/* Star Progress Display */}
      <StarProgress
        starGoals={starGoals}
        categoryPoints={categoryPoints}
        categoryMultipliers={categoryMultipliers}
        timeRemaining={timeRemaining}
      />

      {/* Mode switch - removed chat button */}
      <div className="mode-switch">
        <button disabled={true}>Challenge</button>
      </div>

      {/* Use NavTabsEnhanced */}
      <NavTabsEnhanced
        current={currentTab}
        completed={completed}
        onSwitch={handleTabSwitch}
        limitMode="time"
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
            categoryMultipliers={categoryMultipliers}
            starGoals={starGoals}
            timeRemaining={timeRemaining}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
