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

  // Calculate student learning score with new formula
  const calculateStudentLearning = (points = categoryPoints) => {
    // Base: Materials (direct contribution)
    const materialsPoints = points.materials || 0;

    // Research multiplier: 5% per point
    const researchMultiplier = 1 + (points.research || 0) * 0.05;

    // Engagement multiplier: 1% per point
    const engagementMultiplier = 1 + (points.engagement || 0) * 0.01;

    // Formula: Materials × Research Multiplier × Engagement Multiplier
    const studentLearning =
      materialsPoints * researchMultiplier * engagementMultiplier;

    return studentLearning;
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

  // Start timer with checkpoint logic
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

      // Check for 10-minute checkpoint (exam season)
      // Admin mode: checkpoint at 1 minute
      const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
      let checkpointTime = 600; // Default 10 minutes

      if (config.role === "admin") {
        if (config.semesterDuration === 120000) {
          checkpointTime = 60; // 1 minute checkpoint for 2-minute mode
        } else if (config.semesterDuration === 30000) {
          checkpointTime = 15; // 15 seconds for 30-second mode (if you ever use it)
        }
      }

      if (elapsed === checkpointTime && !checkpointReached) {
        handleCheckpoint();
      }

      if (remaining === 0) {
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

    // Checkpoint thresholds
    const threshold1 = 30; // First checkpoint threshold
    const threshold2 = 60; // Higher threshold

    let bonus = 0;
    if (studentLearning >= threshold2) {
      bonus = 200; // Higher bonus
    } else if (studentLearning >= threshold1) {
      bonus = 100; // Base bonus
    }

    return bonus;
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

  // Start main game
  const startMainGame = () => {
    taskDependencies.clearAllDependencies();

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
      // AUTO-ADVANCE TO NEXT LEVEL IN SAME CATEGORY
      const game = tabId.substring(0, 2);
      const currentLevel = parseInt(tabId.substring(3));
      const nextLevel = currentLevel + 1;

      // Check if next level exists (max 15 levels per game)
      if (nextLevel <= 15) {
        const nextTaskId = `${game}t${nextLevel}`;

        // Short delay before auto-advancing
        setTimeout(() => {
          showNotification(`Auto-advancing to ${category} Level ${nextLevel}!`);
          handleTabSwitch(nextTaskId, true);
        }, 2000);
      } else {
        // Completed all levels in this category!
        showNotification(
          `🎉 All ${category} levels complete! Choose another category.`
        );
      }
    }

    setMode("challenge");
    setCompleted({});
    setCompletedLevels(0);
    setSwitches(0);
    setBonusPrompts(0);
    setCurrentTab("g2t1"); // Start with materials
    setCheckpointReached(false);

    // Reset teaching points
    const config = JSON.parse(sessionStorage.getItem("gameConfig") || "{}");
    const duration = config.semesterDuration || 1200000;
    const durationInSeconds = Math.floor(duration / 1000);
    setTimeRemaining(durationInSeconds);
    setCategoryPoints({ materials: 0, research: 0, engagement: 0, bonus: 0 });
    setTaskAttempts({});
    setTaskPoints({});

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

  // Handle task completion
  const handleComplete = async (tabId, data) => {
    lastActivityRef.current = Date.now();

    const points = data.accuracy >= 95 ? 2 : data.accuracy >= 70 ? 1 : 0;

    // Map to teaching categories
    const category = tabId.startsWith("g1")
      ? "research"
      : tabId.startsWith("g2")
      ? "materials"
      : "engagement";

    // Store raw points for the category
    setCategoryPoints((prev) => ({
      ...prev,
      [category]: prev[category] + points,
    }));

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

    // Show learning score update
    showNotification(
      `Task Complete! +${points} ${category} points | Student Learning: ${Math.round(
        newStudentLearning
      )} pts`
    );

    setCompleted((prev) => ({ ...prev, [tabId]: true }));
    setCompletedLevels((prev) => prev + 1);
    setBonusPrompts((prev) => prev + 1);

    const activatedDeps = taskDependencies.checkDependencies(
      tabId,
      mode === "practice"
    );

    await eventTracker.trackTaskComplete(
      tabId,
      data.attempts,
      data.totalTime,
      data.accuracy
    );

    await eventTracker.logEvent("task_complete", {
      taskId: tabId,
      ...data,
      pointsEarned: points,
      categoryPoints: newCategoryPoints,
      studentLearningScore: newStudentLearning,
      activatedDependencies: activatedDeps,
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
        bonusPrompts: bonusPrompts + 1,
        lastActivity: serverTimestamp(),
      });
    }
  };

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
          gameAccuracyMode="lenient"
          currentTaskId={currentTab}
        />
      );
    }
    if (game === "2") {
      return (
        <SliderTask
          taskNum={taskNum}
          onComplete={handleComplete}
          gameAccuracyMode="lenient"
          currentTaskId={currentTab}
        />
      );
    }
    return (
      <TypingTask
        taskNum={taskNum}
        onComplete={handleComplete}
        gameAccuracyMode="lenient"
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
                <h3 style={{ color: "#4CAF50" }}>🎯 Material Creation</h3>
                <p>
                  Create teaching materials - the foundation of student
                  learning. Each point directly contributes!
                </p>

                <h3 style={{ color: "#9C27B0" }}>📚 Research Content</h3>
                <p>
                  Research amplifies your materials! Each point adds +5% to all
                  material points.
                </p>

                <h3 style={{ color: "#f44336" }}>✉️ Student Engagement</h3>
                <p>
                  Engagement compounds everything! Each point adds +1% to your
                  total score.
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
                  Materials × (1 + Research×0.05) × (1 + Engagement×0.01)
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
            taskDependencies.clearAllDependencies();
            startMainGame();
          }}
          gameAccuracyMode="lenient"
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
      taskDependencies.clearAllDependencies();

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
                = {categoryPoints.materials} (Materials) ×{" "}
                {(1 + categoryPoints.research * 0.05).toFixed(2)} (Research) ×{" "}
                {(1 + categoryPoints.engagement * 0.01).toFixed(2)} (Engagement)
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
                  🎯 Materials
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.materials}
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
                  📚 Research
                </div>
                <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {categoryPoints.research}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  +{categoryPoints.research * 5}% multiplier
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
                <>Need 30+ Student Learning for bonus!</>
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
