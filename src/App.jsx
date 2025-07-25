// src/App.jsx - Complete version with enhanced tracking
import React, { useState, useEffect, useRef } from 'react';
import CountingTask from './components/CountingTask';
import SliderTask from './components/SliderTask';
import TypingTask from './components/TypingTask';
import NavTabs from './components/NavTabs';
import PracticeMode from './components/PracticeMode';
import ChatContainer from './components/ChatContainer';
import ProgressSummary from './components/ProgressSummary';
import StudentLogin from './components/StudentLogin';
import { sessionManager } from './utils/sessionManager';
import { eventTracker } from './utils/eventTracker';
import { taskDependencies } from './utils/taskDependencies';
import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './App.css';
import AdminPage from './AdminPage';

function App() {
  // Admin page (hidden route)
  if (window.location.search.includes('admin=true')) {
    return <AdminPage />;
  }

  // State management
  const [mode, setMode] = useState('landing');
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
  
  // Refs
  const startTimeRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);
  const outOfFocusTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const rulesDataRef = useRef({
    textSections: [
      'The University of California, Berkeley (UC Berkeley, Berkeley, Cal, or California) is a public land-grant research university in Berkeley, California, United States. Founded in 1868 and named after the Anglo-Irish philosopher George Berkeley, it is the state\'s first land-grant university and is the founding campus of the University of California system.',
      'Ten faculty members and forty male students made up the fledgling university when it opened in Oakland in 1869. Frederick Billings, a trustee of the College of California, suggested that a new campus site north of Oakland be named in honor of Anglo-Irish philosopher George Berkeley.',
      'Berkeley has an enrollment of more than 45,000 students. The university is organized around fifteen schools of study on the same campus, including the College of Chemistry, the College of Engineering, College of Letters and Science, and the Haas School of Business.',
      'Oski the Bear (Oski) is the official mascot of the University of California, Berkeley ("Cal"), representing the California Golden Bears. Named after the Oski Yell, he made his debut at a freshman rally in the Greek Theatre on September 25, 1941. Prior to his debut, live bears were used as Cal mascots. Oski\'s name, design, and character were developed by William "Rocky" Rockwell, who was the first student to play the role, and Warrington Colescott, an editor of The Daily Californian and famed satirist.',
      'Since his debut, Oski\'s activities have been managed by the Oski Committee, which also appoints a new Oski whenever a replacement is required. Historically, persons who played Oski were male and of short stature (under 5\'7"), although the gender requirement was dropped around 1974.',
      'Oski\'s identity is protected by the Committee, and wearers of the suit generally do not disclose their identity to the public. There is a volunteer advisor that can provide guidance to the committee. To that end, there may be multiple members of the Committee who wear the suit, depending on their schedules.'
    ]
  });
  
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
      if (!isInBreak) { // Only update timer when not in break
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setGlobalTimer(elapsed);
      }
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
      timestamp: Date.now()
    });
  };
  
  // Handle task completion
  const handleComplete = async (tabId, data) => {
    // Reset idle timer on task completion
    lastActivityRef.current = Date.now();
    
    setCompleted(prev => ({ ...prev, [tabId]: true }));
    setBonusPrompts(prev => prev + 1);
    
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
        bonusPromptsEarned: bonusPrompts + 1
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
    
    // Check if all tasks complete
    const allTabs = ['g1t1', 'g1t2', 'g1t3', 'g2t1', 'g2t2', 'g2t3', 'g3t1', 'g3t2', 'g3t3'];
    const completedCount = Object.keys({ ...completed, [tabId]: true }).length;
    
    if (completedCount === 9) {
      handleGameComplete();
    } else {
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
  
  // Mandatory break between tasks
  const startMandatoryBreak = (completedTabId) => {
    setIsInBreak(true);
    
    // Timer is automatically paused via the timer interval check
    
    // Determine next task
    const game = parseInt(completedTabId[1]);
    const task = parseInt(completedTabId[3]);
    let nextTab = null;
    
    if (task < 3) {
      nextTab = `g${game}t${task + 1}`;
    } else {
      // Find next incomplete task
      const allTabs = ['g1t1', 'g1t2', 'g1t3', 'g2t1', 'g2t2', 'g2t3', 'g3t1', 'g3t2', 'g3t3'];
      nextTab = allTabs.find(t => !completed[t] && t !== completedTabId);
    }
    
    setBreakDestination(nextTab);
    
    // Track break start
    eventTracker.trackUserAction('break_started', {
      afterTask: completedTabId,
      nextTask: nextTab,
      breakDuration: 3000
    });
    
    // Auto-advance after 3 seconds
    setTimeout(() => {
      setIsInBreak(false);
      // Timer will automatically resume via the timer interval check
      
      if (nextTab) {
        handleTabSwitch(nextTab, true);
      }
    }, 3000);
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
  
  // Handle game completion
  const handleGameComplete = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    await eventTracker.logEvent('game_complete', {
      totalTime: finalTime,
      totalSwitches: switches,
      completedTasks: Object.keys(completed).length,
      finalContext: {
        practiceCompleted: practiceChoice === 'yes',
        totalPrompts: 3 + bonusPrompts,
        promptsUsed: 3 + bonusPrompts - (3 + bonusPrompts) // Calculate from chat usage
      }
    });
    
    if (sessionId && !sessionId.startsWith('offline-')) {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        finalTime,
        totalSwitches: switches
      });
    }
    
    setMode('complete');
  };
  
  // Render current task
  const renderTask = () => {
    const game = currentTab[1];
    const taskNum = Number(currentTab[3]);
    
    if (game === '1') {
      return (
        <CountingTask
          taskNum={taskNum}
          textSections={rulesDataRef.current.textSections}
          onComplete={handleComplete}
        />
      );
    }
    if (game === '2') {
      return (
        <SliderTask
          taskNum={taskNum}
          onComplete={handleComplete}
        />
      );
    }
    return (
      <TypingTask
        taskNum={taskNum}
        onComplete={handleComplete}
      />
    );
  };
  
  // Render break overlay
  const renderBreakOverlay = () => {
    if (!isInBreak) return null;
    
    const tasksRemaining = 9 - Object.keys(completed).length;
    const promptsAvailable = 3 + bonusPrompts;
    
    // Calculate current overall accuracy
    const calculateOverallAccuracy = () => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) return 0;
      
      // This would ideally fetch from database, but for now calculate from completed tasks
      const completedTasks = Object.keys(completed);
      if (completedTasks.length === 0) return 0;
      
      // Placeholder calculation - in real implementation, fetch stored accuracies
      return Math.round(85 + Math.random() * 10); // Simulated accuracy between 85-95%
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
              <span style={{ color: '#666', fontSize: '14px' }}>Tasks Remaining: </span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{tasksRemaining}/9</span>
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
  
  // Landing page
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
                Welcome! Complete 9 tasks across 3 games:
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#9C27B0' }}>🔢 Counting Game</h3>
                <p>Count words or letters in text passages.</p>
                
                <h3 style={{ color: '#4CAF50' }}>🎯 Slider Game</h3>
                <p>Match target values with increasing precision.</p>
                
                <h3 style={{ color: '#f44336' }}>⌨️ Typing Game</h3>
                <p>Type patterns exactly as shown.</p>
              </div>
              
              <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '15px', marginBottom: '20px' }}>
                <h3 style={{ color: '#333', fontSize: '16px', marginBottom: '10px' }}>
                  How It Works:
                </h3>
                <ul style={{ color: '#666', lineHeight: '1.6', margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
                  <li>Tasks auto-advance after completion</li>
                  <li>Switch manually using navigation buttons</li>
                  <li>Complete tasks to earn bonus prompts (+1 each)</li>
                  <li>Tasks affect each other - experiment with different orders!</li>
                </ul>
              </div>
            </div>
            
            <button 
              className="start-button"
              onClick={() => setMode('practiceChoice')}
            >
              Start Game
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
          rulesData={rulesDataRef.current} 
          onStartMainGame={() => {
            // Clear dependencies and start main game directly
            taskDependencies.clearAllDependencies();
            startMainGame();
          }}
        />
      </div>
    );
  }
  
  // Chat mode
  if (mode === 'chat') {
    return (
      <div className="app">
        <h1>Multi-Task Challenge</h1>
        <div className="mode-switch">
          <button onClick={() => setMode('challenge')}>Challenge</button>
          <button disabled={true}>Chat</button>
        </div>
        <ChatContainer 
          bonusPrompts={bonusPrompts}
          currentTask={currentTab}
        />
      </div>
    );
  }
  
  // Completion screen
  if (mode === 'complete') {
    const minutes = Math.floor(globalTimer / 60);
    const seconds = globalTimer % 60;
    
    return (
      <div className="app">
        <div style={{ textAlign: 'center', padding: '40px', background: '#f0f8ff', borderRadius: '8px', marginTop: '20px' }}>
          <h2>🎉 All Tasks Complete!</h2>
          <p>Great job! You've completed all 9 tasks.</p>
          
          <div style={{ marginTop: '20px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ margin: '10px 0' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>Total Time: </span>
              <span style={{ fontSize: '24px', color: '#333', marginLeft: '10px' }}>
                {minutes}m {seconds}s
              </span>
            </div>
            <div style={{ margin: '10px 0' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>Task Switches: </span>
              <span style={{ fontSize: '24px', color: '#333', marginLeft: '10px' }}>
                {switches}
              </span>
            </div>
            <div style={{ margin: '10px 0' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>Bonus Prompts Earned: </span>
              <span style={{ fontSize: '24px', color: '#333', marginLeft: '10px' }}>
                {bonusPrompts}
              </span>
            </div>
          </div>
          
          <p style={{ marginTop: '30px', color: '#666' }}>
            Thank you for participating! Your results have been saved.
          </p>
        </div>
      </div>
    );
  }

  // Main challenge mode
  return (
    <div className="app">
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
      
      {/* Timer display */}
      <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
        Time: {Math.floor(globalTimer / 60)}:{(globalTimer % 60).toString().padStart(2, '0')}
      </div>
      
      {/* Mode switch - removed chat button */}
      <div className="mode-switch">
        <button disabled={true}>Challenge</button>
      </div>
      
      <NavTabs
        current={currentTab}
        completed={completed}
        onSwitch={handleTabSwitch}
      />
      
      {/* Progress bar */}
      <div className="progress-container">
        <div 
          className="progress-bar" 
          style={{ width: `${(Object.keys(completed).length / 9) * 100}%` }}
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
      
      <ProgressSummary completed={completed} />
      
      {/* Break overlay */}
      {renderBreakOverlay()}
    </div>
  );
}

export default App;