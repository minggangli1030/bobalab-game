// src/App.jsx - Complete version with 15 levels and time/task limits
import React, { useState, useEffect, useRef } from 'react';
import CountingTask from './components/CountingTask';
import SliderTask from './components/SliderTask';
import TypingTask from './components/TypingTask';
import NavTabsEnhanced from './components/NavTabsEnhanced'; // CHANGED: Using enhanced version
import PracticeMode from './components/PracticeMode';
import ChatContainer from './components/ChatContainer';
import ProgressSummary from './components/ProgressSummary';
import StudentLogin from './components/StudentLogin';
import GameTimer from './components/GameTimer'; // NEW: Timer component
import { sessionManager } from './utils/sessionManager';
import { eventTracker } from './utils/eventTracker';
import { taskDependencies } from './utils/taskDependencies';
import { patternGenerator } from './utils/patternGenerator'; // NEW: Pattern generator
import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './App.css';
import AdminPage from './AdminPage';
import GameModeSelector from './components/GameModeSelector';
import CompletionCodeDisplay from './components/CompletionCodeDisplay'; 

function App() {
  // Admin page (hidden route)
  if (window.location.search.includes('admin=true')) {
    return <AdminPage />;
  }

  // State management
  const [mode, setMode] = useState('landing');
  const [gameMode, setGameMode] = useState(null); // CHANGED: Now stores {accuracy: 'strict'|'lenient', limit: 'time'|'tasks'}
  const [practiceChoice, setPracticeChoice] = useState(null);
  const [currentTab, setCurrentTab] = useState('g1t1');
  const [completed, setCompleted] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState('');
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
  
  // NEW: States for 15-level mode
  const [remainingTasks, setRemainingTasks] = useState(12);
  const [timeUp, setTimeUp] = useState(false);
  
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
    if (mode === 'challenge') {
      console.log('Setting up idle detection for challenge mode');
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
      console.log('Activity detected, resetting timer');
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
      'mousedown', 'mousemove', 'keypress', 'keydown', 
      'scroll', 'touchstart', 'click', 'input', 'change'
    ];
    
    eventListeners.forEach(event => {
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
      eventTracker.trackUserAction('focus_returned', {
        currentTask: currentTab,
        gameTime: globalTimer
      });
    };
    
    const handleBlur = () => {
      if (mode === 'challenge' && !gameBlocked && !isInBreak) {
        setIsOutOfFocus(true);
        startOutOfFocusCountdown();
        
        // Track focus lost
        eventTracker.trackUserAction('focus_lost', {
          currentTask: currentTab,
          gameTime: globalTimer
        });
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Start idle detection timer
    const idleCheckInterval = setInterval(() => {
      console.log('Idle check - mode:', mode, 'blocked:', gameBlocked, 'break:', isInBreak, 'idle:', isIdle);
      
      if (mode === 'challenge' && !gameBlocked && !isInBreak && !isIdle) {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        console.log('Time since last activity:', Math.floor(timeSinceActivity / 1000), 'seconds');
        
        if (timeSinceActivity > 120000) { // 120 seconds (2 minutes)
          console.log('Starting idle countdown!');
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
      setOutOfFocusCountdown(prev => {
        if (prev <= 1) {
          setGameBlocked(true);
          setIsOutOfFocus(false);
          clearInterval(outOfFocusTimerRef.current);
          
          // Track game blocked due to focus
          eventTracker.trackUserAction('game_blocked_focus', {
            currentTask: currentTab,
            gameTime: globalTimer
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
        eventTracker.trackUserAction('game_blocked_idle', {
          currentTask: currentTab,
          gameTime: globalTimer,
          timeSinceLastActivity: Date.now() - lastActivityRef.current
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
    eventTracker.trackUserAction('idle_warning_dismissed', {
      currentTask: currentTab,
      gameTime: globalTimer
    });
  };
  
  // Session management
  const checkAndInitSession = async () => {
    try {
      // Check if there's a code in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const hasCode = urlParams.has('code') || urlParams.has('c');
      
      // If no code, show student login
      if (!hasCode) {
        setMode('studentLogin');
        setIsLoading(false);
        return;
      }
      
      const { allowed, reason, resumeSession, newSession, code, codeData } = await sessionManager.checkAccess();
      
      if (!allowed) {
        setAccessDenied(true);
        setAccessDeniedReason(reason);
        setIsLoading(false);
        return;
      }
      
      if (resumeSession) {
        setSessionId(resumeSession);
        localStorage.setItem('sessionId', resumeSession);
      } else if (newSession) {
        const id = await sessionManager.createSession(code, codeData);
        setSessionId(id);
      }
      
      await eventTracker.syncOfflineEvents();
      setIsLoading(false);
    } catch (error) {
      console.error('Session init error:', error);
      setIsLoading(false);
    }
  };
  
  // Start timer
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      // Calculate elapsed time minus any paused time
      const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTime) / 1000);
      setGlobalTimer(elapsed);
    }, 1000);
  };
  
  // Handle practice choice
  const handlePracticeChoice = (choice) => {
    setPracticeChoice(choice);
    
    // Track practice choice
    eventTracker.trackUserAction('practice_choice', {
      choice: choice,
      timestamp: Date.now()
    });
    
    if (choice === 'no') {
      startMainGame();
    } else {
      setMode('practice');
    }
  };
  
  // Start main game
  const startMainGame = () => {
    // Clear all dependencies before starting main game
    taskDependencies.clearAllDependencies();
    
    // Clear any practice-related state
    setMode('challenge');
    setCompleted({});
    setSwitches(0);
    setBonusPrompts(0);
    setCurrentTab('g1t1');
    
    startTimer();
    setTaskStartTimes({ g1t1: Date.now() });
    eventTracker.setPageStartTime('g1t1');
    eventTracker.logEvent('game_start', { 
      practiceCompleted: practiceChoice === 'yes',
      timestamp: Date.now(),
      gameMode: gameMode // NEW: Track game mode
    });
  };
  
  // NEW: Handle time up
  const handleTimeUp = () => {
    setTimeUp(true);
    handleGameComplete('time_limit_reached');
  };
  
  // Handle task completion - UPDATED for 15 levels
  const handleComplete = async (tabId, data) => {
    // Reset idle timer on task completion
    lastActivityRef.current = Date.now();
    
    setCompleted(prev => ({ ...prev, [tabId]: true }));
    setBonusPrompts(prev => prev + 1);
    
    // NEW: Decrement remaining tasks if in task limit mode
    if (gameMode?.limit === 'tasks') {
      setRemainingTasks(prev => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          setTimeout(() => handleGameComplete('task_limit_reached'), 1500);
        }
        return newCount;
      });
    }
    
    // Check and activate dependencies
    const activatedDeps = taskDependencies.checkDependencies(tabId, mode === 'practice');
    
    // Enhanced tracking for task completion
    await eventTracker.trackTaskComplete(tabId, data.attempts, data.totalTime, data.accuracy);
    
    // Log completion event with full context
    await eventTracker.logEvent('task_complete', {
      taskId: tabId,
      ...data,
      activatedDependencies: activatedDeps,
      completionContext: {
        totalTasksCompleted: Object.keys(completed).length + 1,
        currentGameTime: globalTimer,
        switchesBeforeCompletion: switches,
        bonusPromptsEarned: bonusPrompts + 1,
        remainingTasks: gameMode?.limit === 'tasks' ? remainingTasks - 1 : 'unlimited' // NEW
      }
    });
    
    // Update session
    if (sessionId && !sessionId.startsWith('offline-')) {
      await updateDoc(doc(db, 'sessions', sessionId), {
        [`completedTasks.${tabId}`]: true,
        bonusPrompts: bonusPrompts + 1,
        lastActivity: serverTimestamp()
      });
    }
    
    // Show completion notification
    showNotification(`Task Complete! +1 Chat Prompt Earned!`);
    
    // CHANGED: Check for 45 levels instead of 9
    const allLevels = [];
    for (let g = 1; g <= 3; g++) {
      for (let t = 1; t <= 15; t++) {
        allLevels.push(`g${g}t${t}`);
      }
    }
    const completedCount = Object.keys({ ...completed, [tabId]: true }).length;
    
    if (completedCount === 45) { // CHANGED: 45 instead of 9
      handleGameComplete('all_levels_complete');
    } else if (gameMode?.limit !== 'tasks' || remainingTasks > 1) {
      // Start break and auto-advance
      startMandatoryBreak(tabId);
    }
  };
  
  // Handle tab switching
  const handleTabSwitch = async (newTab, isAutoAdvance = false) => {
    if (isInBreak) return;
    
    // Track user action
    if (!isAutoAdvance) {
      await eventTracker.trackUserAction('manual_tab_switch', {
        from: currentTab,
        to: newTab,
        reason: 'user_clicked'
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
      setSwitches(prev => prev + 1);
    }
    
    // Enhanced page switch tracking
    await eventTracker.trackPageSwitch(currentTab, newTab, isAutoAdvance);
    
    // Track time on previous task
    if (taskStartTimes[currentTab]) {
      const timeSpent = Date.now() - taskStartTimes[currentTab];
      await eventTracker.logEvent('task_time', {
        taskId: currentTab,
        timeSpent,
        completed: completed[currentTab] || false,
        leftForTask: newTab
      });
    }
    
    setCurrentTab(newTab);
    setTaskStartTimes(prev => ({ ...prev, [newTab]: Date.now() }));
    eventTracker.setPageStartTime(newTab);
  };
  
  // Mandatory break between tasks - UPDATED for 15 levels
  const startMandatoryBreak = (completedTabId) => {
    setIsInBreak(true);
    
    // Pause the timer by recording when break started
    pauseStartRef.current = Date.now();
    
    // Determine next task - UPDATED logic for 15 levels
    const game = parseInt(completedTabId[1]);
    const task = parseInt(completedTabId.substring(3)); // Handle 2-digit task numbers
    let nextTab = null;
    
    if (task < 15) { // CHANGED: 15 instead of 3
      nextTab = `g${game}t${task + 1}`;
    } else {
      // Find next incomplete task across all 45 levels
      const allTabs = [];
      for (let g = 1; g <= 3; g++) {
        for (let t = 1; t <= 15; t++) {
          allTabs.push(`g${g}t${t}`);
        }
      }
      nextTab = allTabs.find(t => !completed[t] && t !== completedTabId);
    }
    
    setBreakDestination(nextTab);
    
    // Track break start
    eventTracker.trackUserAction('break_started', {
      afterTask: completedTabId,
      nextTask: nextTab,
      breakDuration: 2000
    });
    
    // Auto-advance after 2 seconds (changed from 3)
    setTimeout(() => {
      // Calculate how long the break was and add to paused time
      const breakDuration = Date.now() - pauseStartRef.current;
      setPausedTime(prev => prev + breakDuration);
      
      setIsInBreak(false);
      
      if (nextTab) {
        handleTabSwitch(nextTab, true);
      }
    }, 2000);
  };
  
  // Show notification
  const showNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'notification-enter';
    notification.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: #2196F3; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.className = 'notification-exit';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 2000);
  };
  
  // Handle game completion - UPDATED with new completion reasons
  const handleGameComplete = async (reason = 'all_levels_complete') => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    const finalTime = Math.floor((Date.now() - startTimeRef.current - pausedTime) / 1000);
    
    // NEW: Calculate strategy metrics
    const countingLevels = Object.keys(completed).filter(id => id.startsWith('g1')).length;
    const sliderLevels = Object.keys(completed).filter(id => id.startsWith('g2')).length;
    const typingLevels = Object.keys(completed).filter(id => id.startsWith('g3')).length;
    
    await eventTracker.logEvent('game_complete', {
      totalTime: finalTime,
      totalSwitches: switches,
      completedTasks: Object.keys(completed).length,
      completionReason: reason, // NEW: Track why game ended
      gameMode: gameMode, // NEW: Track game mode
      
      // NEW: Strategy analysis
      taskDistribution: {
        countingLevels,
        sliderLevels,
        typingLevels,
        maxLevelReached: {
          counting: Math.max(...Object.keys(completed).filter(id => id.startsWith('g1')).map(id => parseInt(id.substring(3))), 0),
          slider: Math.max(...Object.keys(completed).filter(id => id.startsWith('g2')).map(id => parseInt(id.substring(3))), 0),
          typing: Math.max(...Object.keys(completed).filter(id => id.startsWith('g3')).map(id => parseInt(id.substring(3))), 0)
        }
      },
      
      finalContext: {
        practiceCompleted: practiceChoice === 'yes',
        totalPrompts: 3 + bonusPrompts,
        promptsUsed: 3 + bonusPrompts // Calculate from chat usage
      }
    });
    
    if (sessionId && !sessionId.startsWith('offline-')) {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        finalTime,
        totalSwitches: switches,
        completionReason: reason // NEW
      });
    }
    
    setMode('complete');
  };
  
  // Render current task - UPDATED to use pattern generator
  const renderTask = () => {
    const game = currentTab[1];
    const taskNum = parseInt(currentTab.substring(3)); // Handle 2-digit task numbers
    
    if (game === '1') {
      return (
        <CountingTask
          taskNum={taskNum}
          onComplete={handleComplete}
          gameAccuracyMode={gameMode?.accuracy} // CHANGED: Use gameMode.accuracy
        />
      );
    }
    if (game === '2') {
      return (
        <SliderTask
          taskNum={taskNum}
          onComplete={handleComplete}
          gameAccuracyMode={gameMode?.accuracy} // CHANGED: Use gameMode.accuracy
        />
      );
    }
    return (
      <TypingTask
        taskNum={taskNum}
        onComplete={handleComplete}
        gameAccuracyMode={gameMode?.accuracy} // CHANGED: Use gameMode.accuracy
      />
    );
  };
  
  // Render break overlay
  const renderBreakOverlay = () => {
    if (!isInBreak) return null;
    
    const tasksRemaining = gameMode?.limit === 'tasks' 
      ? remainingTasks 
      : `${Object.keys(completed).length}/45 levels`; // CHANGED: Show level count
    const promptsAvailable = 3 + bonusPrompts;
    
    // Calculate current overall accuracy
    const calculateOverallAccuracy = () => {
      const completedTaskIds = Object.keys(completed);
      if (completedTaskIds.length === 0) return 0;
      
      let totalAccuracy = 0;
      let validTasks = 0;
      
      // Get accuracy for each completed task from localStorage
      completedTaskIds.forEach(taskId => {
        // Get the attempt history for this task
        const historyStr = localStorage.getItem(`attemptHistory_${taskId}`);
        if (historyStr) {
          const history = JSON.parse(historyStr);
          if (history.length > 0) {
            // Get the best accuracy achieved for this task
            const bestAccuracy = Math.max(...history.map(h => h.accuracy));
            totalAccuracy += bestAccuracy;
            validTasks++;
          }
        }
      });
      
      // Calculate average accuracy across all completed tasks
      if (validTasks === 0) return 0;
      
      const averageAccuracy = totalAccuracy / validTasks;
      return Math.round(averageAccuracy);
    };
    
    const currentAccuracy = calculateOverallAccuracy();
    
    return (
      <div className="break-overlay">
        <div className="break-content">
          <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>
            Task Complete! +1 Prompt Earned
          </h2>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '30px 0', flexWrap: 'wrap' }}>
            <div style={{ background: '#f0f0f0', padding: '10px 20px', borderRadius: '6px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>Progress: </span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{tasksRemaining}</span>
            </div>
            <div style={{ background: '#f0f0f0', padding: '10px 20px', borderRadius: '6px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>Prompts Available: </span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{promptsAvailable}</span>
            </div>
            <div style={{ background: '#e8f5e9', padding: '10px 20px', borderRadius: '6px', border: '1px solid #4CAF50' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>Current Accuracy: </span>
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#4CAF50' }}>{currentAccuracy}%</span>
            </div>
          </div>
          
          <p style={{ color: '#666', fontSize: '16px' }}>
            Auto-advancing to next task...
          </p>
        </div>
      </div>
    );
  };
  
  // Loading screen
  if (isLoading) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Loading...</h2>
      </div>
    );
  }
  
  // Student login screen
  if (mode === 'studentLogin') {
    return <StudentLogin onLoginSuccess={(code) => {
      window.location.href = `${window.location.origin}?code=${code}`;
    }} />;
  }
  
  // Access denied screen
  if (accessDenied) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <h2 style={{ color: '#f44336', marginBottom: '20px' }}>Access Denied</h2>
          <p style={{ color: '#666', marginBottom: '30px', fontSize: '18px' }}>
            {accessDeniedReason || 'You need a valid access code to play this game.'}
          </p>
          <p style={{ color: '#888', fontSize: '16px' }}>
            Please access this game through your student login or survey link.
          </p>
        </div>
      </div>
    );
  }
  
  // Landing page - UPDATED with new GameModeSelector
  if (mode === 'landing') {
    return (
      <div className="app">
        <div className="landing-container">
          <div className="landing-card">
            <h1 style={{ color: '#333', marginBottom: '20px', fontSize: '28px' }}>
              Multi-Task Challenge
            </h1>
            
            <div className="game-info">
              <h2 style={{ color: '#555', fontSize: '20px', marginBottom: '15px' }}>
                Welcome! Complete tasks across 3 games:
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#9C27B0' }}>🔢 Counting Game</h3>
                <p>Count words or letters in text passages. 15 levels of increasing difficulty!</p>
                
                <h3 style={{ color: '#4CAF50' }}>🎯 Slider Game</h3>
                <p>Match target values with increasing precision. Progress through 15 levels!</p>
                
                <h3 style={{ color: '#f44336' }}>⌨️ Typing Game</h3>
                <p>Type patterns exactly as shown. Master 15 different patterns!</p>
              </div>
              
              <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '15px', marginBottom: '20px' }}>
                <h3 style={{ color: '#333', fontSize: '16px', marginBottom: '10px' }}>
                  How It Works:
                </h3>
                <ul style={{ color: '#666', lineHeight: '1.6', margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                  <li>Choose between time limit (15 min) or task limit (12 attempts)</li>
                  <li>Each game has 15 levels - complete as many as you can!</li>
                  <li>Complete tasks to earn bonus prompts (+1 each)</li>
                  <li>Tasks affect each other - discover the best strategy!</li>
                </ul>
              </div>
            </div>
            
            {/* Game Mode Selector - UPDATED */}
            {!gameMode ? (
              <GameModeSelector onModeSelected={setGameMode} />
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#666', marginBottom: '10px' }}>
                  Selected Mode: <strong style={{ 
                    color: gameMode.accuracy === 'strict' ? '#f44336' : '#4CAF50' 
                  }}>
                    {gameMode.accuracy === 'strict' ? 'Strict (100% Required)' : 'Lenient (Pass All)'}
                  </strong>
                  {' | '}
                  <strong style={{ 
                    color: gameMode.limit === 'time' ? '#2196F3' : '#9C27B0' 
                  }}>
                    {gameMode.limit === 'time' ? '15 Minute Timer' : '12 Task Attempts'}
                  </strong>
                </p>
              </div>
            )}
            
            <button 
              className="start-button"
              onClick={() => setMode('practiceChoice')}
              disabled={!gameMode}
              style={{
                opacity: gameMode ? 1 : 0.5,
                cursor: gameMode ? 'pointer' : 'not-allowed'
              }}
            >
              {gameMode ? 'Start Game' : 'Select Mode First'}
            </button>
            
            <p style={{ color: '#999', fontSize: '13px', marginTop: '15px' }}>
              Timer starts when you begin the main game
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Practice choice
  if (mode === 'practiceChoice') {
    return (
      <div className="app">
        <div className="landing-container">
          <div className="landing-card">
            <h2 style={{ color: '#333', marginBottom: '20px' }}>
              Would you like to practice first?
            </h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Practice mode lets you try each game type without time pressure.
            </p>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '30px', fontStyle: 'italic' }}>
              Tip: Try completing different tasks and revisiting them to see what changes!
            </p>
            
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button 
                onClick={() => handlePracticeChoice('yes')}
                style={{ padding: '15px 30px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}
              >
                Yes, Practice First
              </button>
              <button 
                onClick={() => handlePracticeChoice('no')}
                style={{ padding: '15px 30px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}
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
  if (mode === 'practice') {
    return (
      <div className="app">
        <h1>Multi-Task Challenge - Practice Mode</h1>
        <PracticeMode 
          onStartMainGame={() => {
            taskDependencies.clearAllDependencies();
            startMainGame();
          }}
          gameAccuracyMode={gameMode?.accuracy} // CHANGED: Use gameMode.accuracy
        />
      </div>
    );
  }
  
  // Completion screen - UPDATED with strategy analysis
if (mode === 'complete') {
  const minutes = Math.floor(globalTimer / 60);
  const seconds = globalTimer % 60;
  
  // Calculate strategy metrics
  const countingLevels = Object.keys(completed).filter(id => id.startsWith('g1')).length;
  const sliderLevels = Object.keys(completed).filter(id => id.startsWith('g2')).length;
  const typingLevels = Object.keys(completed).filter(id => id.startsWith('g3')).length;
  const totalCompleted = Object.keys(completed).length;
  
  return (
    <div className="app">
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Completion Code - MOST PROMINENT */}
        <CompletionCodeDisplay 
          sessionId={sessionId}
          completedLevels={totalCompleted}
          totalTime={globalTimer}
          gameMode={gameMode}
        />
        
        {/* Performance Summary */}
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          background: 'white', 
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginTop: '20px'
        }}>
          <h2 style={{ color: '#333', marginBottom: '20px' }}>
            📊 Performance Summary
          </h2>
          
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
            {gameMode?.limit === 'time' 
              ? "Time's up! Here's how you performed." 
              : gameMode?.limit === 'tasks'
              ? "All task attempts used! Here's your summary."
              : "Incredible! You completed all 45 levels!"}
          </p>
          
          {/* Key metrics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              background: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              border: '2px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Total Time
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                {minutes}m {seconds}s
              </div>
            </div>
            
            <div style={{ 
              background: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              border: '2px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Levels Complete
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                {totalCompleted}/45
              </div>
            </div>
            
            <div style={{ 
              background: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '8px',
              border: '2px solid #e0e0e0'
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Task Switches
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                {switches}
              </div>
            </div>
          </div>
          
          {/* Strategy breakdown */}
          <h3 style={{ color: '#666', marginBottom: '15px' }}>Strategy Analysis</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '15px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              background: '#f8f0ff', 
              padding: '15px', 
              borderRadius: '6px',
              border: '2px solid #9C27B020'
            }}>
              <div style={{ color: '#9C27B0', fontWeight: 'bold', marginBottom: '5px' }}>
                🔢 Counting
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{countingLevels}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Max Level: {Math.max(...Object.keys(completed).filter(id => id.startsWith('g1')).map(id => parseInt(id.substring(3))), 0)}
              </div>
            </div>
            
            <div style={{ 
              background: '#f0f8f0', 
              padding: '15px', 
              borderRadius: '6px',
              border: '2px solid #4CAF5020'
            }}>
              <div style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '5px' }}>
                🎯 Slider
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{sliderLevels}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Max Level: {Math.max(...Object.keys(completed).filter(id => id.startsWith('g2')).map(id => parseInt(id.substring(3))), 0)}
              </div>
            </div>
            
            <div style={{ 
              background: '#fff0f0', 
              padding: '15px', 
              borderRadius: '6px',
              border: '2px solid #f4433620'
            }}>
              <div style={{ color: '#f44336', fontWeight: 'bold', marginBottom: '5px' }}>
                ⌨️ Typing
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{typingLevels}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Max Level: {Math.max(...Object.keys(completed).filter(id => id.startsWith('g3')).map(id => parseInt(id.substring(3))), 0)}
              </div>
            </div>
          </div>
          
          {/* Strategy type badge */}
          <div style={{ 
            padding: '15px', 
            background: '#e3f2fd', 
            borderRadius: '6px',
            fontSize: '16px'
          }}>
            <strong>Strategy Type: </strong>
            {countingLevels > sliderLevels && countingLevels > typingLevels ? '📚 Counting Specialist' :
             sliderLevels > countingLevels && sliderLevels > typingLevels ? '🎯 Precision Master' :
             typingLevels > countingLevels && typingLevels > sliderLevels ? '⚡ Speed Typist' :
             '⚖️ Balanced Approach'}
          </div>
        </div>
        
        {/* Return to survey reminder */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#856404', marginBottom: '10px' }}>
            ⚠️ Don't forget!
          </h3>
          <p style={{ color: '#856404', marginBottom: '0' }}>
            Return to the Qualtrics survey and enter your completion code to finish the study.
          </p>
        </div>
      </div>
    </div>
  );
}

// Main challenge mode
return (
  <div className="app">
    {/* NEW: Timer for time limit mode */}
    {mode === 'challenge' && gameMode?.limit === 'time' && !timeUp && (
      <GameTimer 
        duration={900} // 15 minutes
        onTimeUp={handleTimeUp}
        isPaused={isInBreak || gameBlocked}
      />
    )}
    
    {/* Game blocked overlay */}
    {gameBlocked && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '10px',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h2 style={{ color: '#f44336', marginBottom: '20px' }}>Game Session Ended</h2>
          <p style={{ marginBottom: '30px' }}>
            Your session has been terminated due to inactivity or switching away from the game.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 30px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Restart Game
          </button>
        </div>
      </div>
    )}
    
    {/* Out of focus warning */}
    {isOutOfFocus && (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: '#ff9800',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        zIndex: 10000,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <strong>⚠️ Focus Warning</strong>
        <br />
        Game will be blocked in {outOfFocusCountdown} seconds
      </div>
    )}
    
    {/* Idle warning */}
    {isIdle && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '10px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h3 style={{ color: '#ff9800', marginBottom: '15px' }}>Are you still there?</h3>
          <p style={{ marginBottom: '20px' }}>
            Auto-closing in {idleCountdown} seconds due to inactivity
          </p>
          <button 
            onClick={handleIdleResponse}
            style={{
              padding: '10px 20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Continue Playing
          </button>
        </div>
      </div>
    )}

    <h1>Multi-Task Challenge</h1>

    {/* Game mode indicator - UPDATED */}
    {gameMode && (
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: gameMode.accuracy === 'strict' ? '#f44336' : '#4CAF50',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {gameMode.accuracy === 'strict' ? '100% Mode' : 'Pass All Mode'}
      </div>
    )}
    
    {/* Timer display - only show if not in time mode (timer shown separately) */}
    {gameMode?.limit !== 'time' && (
      <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
        Time: {Math.floor(globalTimer / 60)}:{(globalTimer % 60).toString().padStart(2, '0')}
      </div>
    )}
    
    {/* Mode switch - removed chat button */}
    <div className="mode-switch">
      <button disabled={true}>Challenge</button>
    </div>
    
    {/* CHANGED: Use NavTabsEnhanced instead of NavTabs */}
    <NavTabsEnhanced
      current={currentTab}
      completed={completed}
      onSwitch={handleTabSwitch}
      remainingTasks={gameMode?.limit === 'tasks' ? remainingTasks : null}
      limitMode={gameMode?.limit}
    />
    
    {/* Progress bar - UPDATED for 45 levels */}
    <div className="progress-container">
      <div 
        className="progress-bar" 
        style={{ width: `${(Object.keys(completed).length / 45) * 100}%` }}
      />
    </div>
    
    {/* Side-by-side layout: Game + Chat */}
    <div style={{ 
      display: 'flex', 
      gap: '20px', 
      alignItems: 'stretch',
      marginTop: '20px',
      minHeight: '650px',
      width: '100%'
    }}>
      {/* Game area - 2/3 width */}
      <div style={{ 
        flex: '0 0 66.666%', 
        minHeight: '650px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        overflow: 'visible'
      }}>
        <div className="task-container" style={{ 
          width: '100%',
          minHeight: '650px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible'
        }}>
          {renderTask()}
        </div>
      </div>
      
      {/* Chat area - 1/3 width */}
      <div style={{ 
        flex: '0 0 33.333%', 
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
        height: '650px'
      }}>
        <ChatContainer 
          bonusPrompts={bonusPrompts}
          currentTask={currentTab}
        />
      </div>
    </div>
    
    {/* REMOVED: ProgressSummary - not needed with 45 levels */}
    
    {/* Break overlay */}
    {renderBreakOverlay()}
  </div>
);
}

export default App;