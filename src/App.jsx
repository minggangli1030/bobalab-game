// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import CountingTask from './components/CountingTask';
import SliderTask from './components/SliderTask';
import TypingTask from './components/TypingTask';
import NavTabs from './components/NavTabs';
import PracticeMode from './components/PracticeMode';
import ChatContainer from './components/ChatContainer';
import ProgressSummary from './components/ProgressSummary';
import { sessionManager } from './utils/sessionManager';
import { eventTracker } from './utils/eventTracker';
import { taskDependencies } from './utils/taskDependencies';
import { db } from './firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './App.css';
import AdminPage from './AdminPage';



function App() {
  // Test Firebase connection
  useEffect(() => {
  import('./testFirebase').then(({ testFirebaseConnection }) => {
    testFirebaseConnection();
  });
  }, []);

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
  const [isLoading, setIsLoading] = useState(true);
  const [globalTimer, setGlobalTimer] = useState(0);
  const [taskStartTimes, setTaskStartTimes] = useState({});
  const [switches, setSwitches] = useState(0);
  const [bonusPrompts, setBonusPrompts] = useState(0);
  const [isInBreak, setIsInBreak] = useState(false);
  const [breakDestination, setBreakDestination] = useState(null);
  
  // Refs
  const startTimeRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);
  const rulesDataRef = useRef({
    textSections: [
      'The University of California, Berkeley (UC Berkeley, Berkeley, Cal, or California) is a public land-grant research university in Berkeley, California, United States. Founded in 1868 and named after the Anglo-Irish philosopher George Berkeley, it is the state\'s first land-grant university and is the founding campus of the University of California system.',
      'Ten faculty members and forty male students made up the fledgling university when it opened in Oakland in 1869. Frederick Billings, a trustee of the College of California, suggested that a new campus site north of Oakland be named in honor of Anglo-Irish philosopher George Berkeley.',
      'Berkeley has an enrollment of more than 45,000 students. The university is organized around fifteen schools of study on the same campus, including the College of Chemistry, the College of Engineering, College of Letters and Science, and the Haas School of Business.'
    ]
  });
  
  // Initialize session on mount
  useEffect(() => {
    checkAndInitSession();
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);
  
  // Session management
  const checkAndInitSession = async () => {
    try {
      const { allowed, reason, resumeSession, newSession } = await sessionManager.checkAccess();
      
      if (!allowed) {
        setAccessDenied(true);
        alert(reason);
        setTimeout(() => {
          window.location.href = 'about:blank';
        }, 1000);
        return;
      }
      
      if (resumeSession) {
        setSessionId(resumeSession);
        localStorage.setItem('sessionId', resumeSession);
        // Could load previous state here
      } else if (newSession) {
        const id = await sessionManager.createSession();
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
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setGlobalTimer(elapsed);
    }, 1000);
  };
  
  // Handle practice choice
  const handlePracticeChoice = (choice) => {
    setPracticeChoice(choice);
    if (choice === 'no') {
      startMainGame();
    } else {
      setMode('practice');
    }
  };
  
  // Start main game
  const startMainGame = () => {
    setMode('challenge');
    startTimer();
    setTaskStartTimes({ g1t1: Date.now() });
    eventTracker.logEvent('game_start', { 
      practiceCompleted: practiceChoice === 'yes' 
    });
  };
  
  // Handle task completion
  const handleComplete = async (tabId, data) => {
    setCompleted(prev => ({ ...prev, [tabId]: true }));
    setBonusPrompts(prev => prev + 1);
    
    // Check and activate dependencies
    const activatedDeps = taskDependencies.checkDependencies(tabId, mode === 'practice');
    
    // Log completion
    await eventTracker.logEvent('task_complete', {
      taskId: tabId,
      ...data,
      activatedDependencies: activatedDeps
    });
    
    // Update session
    if (sessionId) {
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
    
    if (currentTab !== newTab && !isAutoAdvance) {
      setSwitches(prev => prev + 1);
      await eventTracker.trackPageSwitch(currentTab, newTab, isAutoAdvance);
    }
    
    // Track time on previous task
    if (taskStartTimes[currentTab]) {
      const timeSpent = Date.now() - taskStartTimes[currentTab];
      await eventTracker.logEvent('task_time', {
        taskId: currentTab,
        timeSpent
      });
    }
    
    setCurrentTab(newTab);
    setTaskStartTimes(prev => ({ ...prev, [newTab]: Date.now() }));
  };
  
  // Mandatory break between tasks
  const startMandatoryBreak = (completedTabId) => {
    setIsInBreak(true);
    
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
    
    // Auto-advance after 3 seconds
    setTimeout(() => {
      setIsInBreak(false);
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
      completedTasks: Object.keys(completed).length
    });
    
    if (sessionId) {
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
    
    return (
      <div className="break-overlay">
        <div className="break-content">
          <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>
            Task Complete! +1 Prompt Earned
          </h2>
          
          <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', margin: '30px 0' }}>
            <div style={{ background: '#f0f0f0', padding: '10px 20px', borderRadius: '6px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>Tasks Remaining: </span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{tasksRemaining}/9</span>
            </div>
            <div style={{ background: '#f0f0f0', padding: '10px 20px', borderRadius: '6px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>Prompts Available: </span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{promptsAvailable}</span>
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
  
  // Access denied screen
  if (accessDenied) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Access Denied</h2>
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
                
                <h3 style={{ color: '#FFC107' }}>⌨️ Typing Game</h3>
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
        <PracticeMode rulesData={rulesDataRef.current} />
        <button 
          onClick={startMainGame}
          style={{ marginTop: '20px', padding: '12px 30px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer' }}
        >
          Done Practicing - Start Main Game
        </button>
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
          <button onClick={() => setMode('practice')}>Practice</button>
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
          
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '30px', padding: '15px 40px', background: 'linear-gradient(135deg, #2196F3, #1976D2)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }
  
  // Main challenge mode
  return (
    <div className="app">
      <h1>Multi-Task Challenge</h1>
      
      {/* Timer display */}
      <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
        Time: {Math.floor(globalTimer / 60)}:{(globalTimer % 60).toString().padStart(2, '0')}
      </div>
      
      <div className="mode-switch">
        <button disabled={true}>Challenge</button>
        <button onClick={() => setMode('practice')}>Practice</button>
        <button onClick={() => setMode('chat')}>Chat</button>
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
      
      <div className="task-container">
        {renderTask()}
      </div>
      
      <ProgressSummary completed={completed} />
      
      {/* Break overlay */}
      {renderBreakOverlay()}
    </div>
  );
}

export default App;