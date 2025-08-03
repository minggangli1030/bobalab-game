// src/components/PracticeMode.jsx - Updated to pass isPractice flag
import React, { useState, useEffect } from 'react';
import { taskDependencies } from '../utils/taskDependencies';
import CountingTask from './CountingTask';
import SliderTask from './SliderTask';
import TypingTask from './TypingTask';
import './PracticeMode.css';

export default function PracticeMode({ rulesData, onStartMainGame, gameAccuracyMode = 'strict' }) {
  const [currentPractice, setCurrentPractice] = useState(null);
  const [completedPractice, setCompletedPractice] = useState({});
  
  useEffect(() => {
    // Clear all dependencies when entering practice mode
    taskDependencies.clearAllDependencies();
    
    // Update visual indicators when tasks are completed
    Object.keys(completedPractice).forEach(taskId => {
      if (taskId.startsWith('g2')) {
        // Slider completed - highlight counting cards
        const countingCards = document.querySelectorAll('.practice-card.counting');
        countingCards.forEach(card => card.classList.add('enhanced-task'));
      } else if (taskId.startsWith('g3')) {
        // Typing completed - enhance slider cards
        const sliderCards = document.querySelectorAll('.practice-card.slider');
        sliderCards.forEach(card => card.classList.add('enhanced-task'));
      } else if (taskId.startsWith('g1')) {
        // Counting completed - simplify typing cards
        const typingCards = document.querySelectorAll('.practice-card.typing');
        typingCards.forEach(card => card.classList.add('enhanced-task'));
      }
    });
  }, [completedPractice]);
  
  const handlePracticeComplete = (taskId) => {
    setCompletedPractice(prev => ({ ...prev, [taskId]: true }));
    // Activate dependencies with 100% probability in practice mode
    taskDependencies.checkDependencies(taskId, true);
    setCurrentPractice(null);
  };
  
  const startMainGame = () => {
    // Clear all dependencies before starting main game
    taskDependencies.clearAllDependencies();
    onStartMainGame();
  };
  
  const renderPracticeMenu = () => (
    <div className="practice-menu">
      <h2>Practice Mode</h2>
      <p className="practice-hint">
        Try one task from each game type to see how they affect each other!
      </p>
      
      <div className="practice-cards">
        <div className="practice-card counting">
          <h3>🔢 Counting Game</h3>
          <p>Count words or letters in text passages</p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice('g1t1')}
              className={completedPractice['g1t1'] ? 'completed' : ''}
            >
              Try Counting {completedPractice['g1t1'] && '✓'}
            </button>
          </div>
        </div>
        
        <div className="practice-card slider">
          <h3>🎯 Slider Game</h3>
          <p>Match target values with precision</p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice('g2t1')}
              className={completedPractice['g2t1'] ? 'completed' : ''}
            >
              Try Slider {completedPractice['g2t1'] && '✓'}
            </button>
          </div>
        </div>
        
        <div className="practice-card typing">
          <h3>⌨️ Typing Game</h3>
          <p>Type patterns exactly as shown</p>
          <div className="practice-buttons">
            <button
              onClick={() => setCurrentPractice('g3t1')}
              className={completedPractice['g3t1'] ? 'completed' : ''}
            >
              Try Typing {completedPractice['g3t1'] && '✓'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Single button to start main game */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button 
          className="start-main-game-btn" 
          onClick={startMainGame}
        >
          Done Practicing - Start Main Game
        </button>
      </div>
    </div>
  );
  
  if (!currentPractice) {
    return renderPracticeMenu();
  }
  
  const game = currentPractice[1];
  const taskNum = Number(currentPractice[3]);
  
  return (
  <div className="practice-container">
    <button 
      className="back-to-menu"
      onClick={() => setCurrentPractice(null)}
    >
      ← Back to Practice Menu
    </button>
    
    <div className="practice-task-wrapper">
      {game === '1' && (
        <CountingTask
          taskNum={taskNum}
          textSections={rulesData.textSections || ['Practice text for counting...']}
          onComplete={handlePracticeComplete}
          isPractice={true}
          gameAccuracyMode={gameAccuracyMode}
        />
      )}
      
      {game === '2' && (
        <SliderTask
          taskNum={taskNum}
          onComplete={handlePracticeComplete}
          isPractice={true}
          gameAccuracyMode={gameAccuracyMode}
        />
      )}
      
      {game === '3' && (
        <TypingTask
          taskNum={taskNum}
          onComplete={handlePracticeComplete}
          isPractice={true}
          gameAccuracyMode={gameAccuracyMode}
        />
      )}
    </div>
  </div>
)};