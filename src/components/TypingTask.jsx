// src/components/TypingTask.jsx - Updated for 15 levels
import React, { useEffect, useState, useRef } from 'react';
import { eventTracker } from '../utils/eventTracker';
import { taskDependencies } from '../utils/taskDependencies';
import { patternGenerator } from '../utils/patternGenerator'; // NEW IMPORT
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './TypingTask.css';

export default function TypingTask({ taskNum, onComplete, isPractice = false, gameAccuracyMode = 'strict' }) {
  const [pattern, setPattern] = useState('');
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [startTime] = useState(Date.now());
  const [patternImageUrl, setPatternImageUrl] = useState('');
  const attemptsRef = useRef(0);

  // Generate uncopyable pattern image
  const generatePatternImage = (patternText) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 600;
    canvas.height = 150;
    
    // Set background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set text properties
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw pattern text
    ctx.fillText(patternText, canvas.width / 2, canvas.height / 2);
    
    return canvas.toDataURL();
  };

  useEffect(() => {
    // CHANGED: Use pattern generator for 15 levels
    const generatedPattern = patternGenerator.generateTypingPattern(taskNum);
    
    // Check for dependency that simplifies patterns
    const dependency = taskDependencies.getActiveDependency(`g3t${taskNum}`);
    if (dependency && dependency.type === 'simple_pattern') {
      // Use easy pattern regardless of level
      const easyPattern = patternGenerator.generateTypingPattern(Math.min(taskNum, 5));
      setPattern(easyPattern.pattern);
    } else {
      setPattern(generatedPattern.pattern);
    }
    
    // Generate pattern image
    const imageUrl = generatePatternImage(generatedPattern.pattern);
    setPatternImageUrl(imageUrl);
  }, [taskNum]);

  const calculateAccuracy = (userInput, expectedPattern) => {
    if (userInput === expectedPattern) return 100;
    
    // Calculate character-by-character accuracy
    const maxLength = Math.max(userInput.length, expectedPattern.length);
    if (maxLength === 0) return 0;
    
    let matches = 0;
    for (let i = 0; i < maxLength; i++) {
      if (userInput[i] === expectedPattern[i]) {
        matches++;
      }
    }
    
    const accuracy = (matches / maxLength) * 100;
    return Math.round(accuracy);
  };

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const accuracy = calculateAccuracy(input, pattern);
    
    // Different pass thresholds based on game mode
    const passThreshold = gameAccuracyMode === 'strict' ? 100 : 0;
    const passed = gameAccuracyMode === 'lenient' ? true : accuracy >= passThreshold;
    
    attemptsRef.current += 1;
    
    await eventTracker.trackTaskAttempt(
      `g3t${taskNum}`,
      attemptsRef.current,
      passed,
      timeTaken,
      input,
      pattern
    );
    
    // Store accuracy to database
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId && !sessionId.startsWith('offline-')) {
      try {
        await updateDoc(doc(db, 'sessions', sessionId), {
          [`taskAccuracies.g3t${taskNum}`]: accuracy,
          [`taskTimes.g3t${taskNum}`]: timeTaken,
          [`gameMode`]: gameAccuracyMode,
          lastActivity: serverTimestamp()
        });
      } catch (error) {
        console.error('Error storing accuracy:', error);
      }
    }
    
    if (passed) {
      if (input === pattern) {
        setFeedback('✓ Flawless!');
      } else if (gameAccuracyMode === 'lenient') {
        setFeedback(`✓ Passed! (${accuracy}% accuracy)`);
      } else {
        setFeedback('✓ Good job!');
      }
      
      setTimeout(() => {
        onComplete(`g3t${taskNum}`, {
          attempts: attemptsRef.current,
          totalTime: timeTaken,
          accuracy: accuracy
        });
      }, 1500);
    } else {
      if (isPractice) {
        setFeedback(`✗ Correct pattern: "${pattern}". Try again!`);
      } else {
        setFeedback(`✗ Try again! (${accuracy}% accuracy - need 100%)`);
      }
    }
  };

  const isEnhanced = taskDependencies.getActiveDependency(`g3t${taskNum}`);
  
  // CHANGED: Get difficulty info from pattern generator
  const patternInfo = patternGenerator.generateTypingPattern(taskNum);
  const difficultyLabel = patternInfo.difficultyLabel;
  const difficultyColor = patternInfo.difficulty;

  return (
    <div className={`task typing ${isEnhanced ? 'enhanced-task' : ''}`}>
      <h3>Typing Task - Level {taskNum}</h3>
      <div className={`difficulty-badge ${difficultyColor}`}>
        {difficultyLabel}
      </div>
      
      <p className="instruction">
        Type this pattern exactly:
      </p>
      
      <div className="pattern-display">
        {patternImageUrl ? (
          <img 
            src={patternImageUrl} 
            alt="Pattern to type"
            style={{ 
              width: '100%', 
              maxWidth: '600px',
              height: 'auto',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          // Fallback display
          <span className="pattern-text">{pattern}</span>
        )}
      </div>
      
      <div className="input-section">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type here..."
          className="typing-input"
        />
      </div>
      
      <button onClick={handleSubmit} className="submit-btn">
        Submit
      </button>
      
      {feedback && (
        <div className={`feedback ${feedback.includes('✓') ? 'correct' : 'incorrect'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
}