// src/components/TypingTask.jsx - Updated with 90% accuracy threshold
import React, { useEffect, useState, useRef } from 'react';
import { eventTracker } from '../utils/eventTracker';
import { taskDependencies } from '../utils/taskDependencies';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './TypingTask.css';

const patterns = {
  easy: ['hello world', 'easy typing', 'test input', 'simple text'],
  medium: ['HeLLo WoRLd', 'TeSt PaTTeRn', 'MiXeD cAsE', 'CaPiTaL lEtTeRs'],
  hard: ['a@1 B#2 c$3', 'Qw3$ Er4# Ty5@', 'X9% Y8& Z7*', 'P6! Q5? R4+']
};

export default function TypingTask({ taskNum, onComplete, isPractice = false }) {
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
    const level = ['easy', 'medium', 'hard'][taskNum - 1];
    let pset = patterns[level];
    
    // Check for dependency that simplifies patterns
    const dependency = taskDependencies.getActiveDependency(`g3t${taskNum}`);
    if (dependency && dependency.type === 'simple_pattern') {
      // Use easy patterns regardless of task number
      pset = patterns.easy;
    }
    
    const selectedPattern = pset[Math.floor(Math.random() * pset.length)];
    setPattern(selectedPattern);
    
    // Generate pattern image
    const imageUrl = generatePatternImage(selectedPattern);
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
    const passThreshold = 90;
    const passed = accuracy >= passThreshold;
    
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
          lastActivity: serverTimestamp()
        });
      } catch (error) {
        console.error('Error storing accuracy:', error);
      }
    }
    
    if (passed) {
      if (input === pattern) {
        setFeedback('✓ Flawless!');
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
      // Show feedback but allow retry - don't show accuracy percentage
      if (isPractice) {
        setFeedback(`✗ Correct pattern: "${pattern}". Try again!`);
      } else {
        setFeedback('✗ Try again!');
      }
    }
  };

  const isEnhanced = taskDependencies.getActiveDependency(`g3t${taskNum}`);

  return (
    <div className={`task typing ${isEnhanced ? 'enhanced-task' : ''}`}>
      <h3>Typing Task {taskNum}</h3>
      <div className={`difficulty-badge ${['easy', 'medium', 'hard'][taskNum - 1]}`}>
        {['Easy', 'Medium', 'Hard'][taskNum - 1]}
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
          placeholder="Type the pattern here..."
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