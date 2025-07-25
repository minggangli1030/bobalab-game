// src/components/SliderTask.jsx - Updated with enhanced slider from p3.js
import React, { useEffect, useState, useRef } from 'react';
import { eventTracker } from '../utils/eventTracker';
import { taskDependencies } from '../utils/taskDependencies';
import './SliderTask.css';

export default function SliderTask({ taskNum, onComplete, isPractice = false }) {
  const [target, setTarget] = useState(5);
  const [input, setInput] = useState(5.0);
  const [feedback, setFeedback] = useState(null);
  const [startTime] = useState(Date.now());
  const attemptsRef = useRef(0);

  useEffect(() => {
    // Generate target based on difficulty
    let targetValue;
    if (taskNum === 1) {
      // Easy: integer from 0-10
      targetValue = Math.floor(Math.random() * 11);
    } else if (taskNum === 2) {
      // Medium: one decimal place
      targetValue = parseFloat((Math.random() * 10).toFixed(1));
    } else {
      // Hard: two decimal places
      targetValue = parseFloat((Math.random() * 10).toFixed(2));
    }
    
    setTarget(targetValue);
    setInput(5.0); // Start at middle
  }, [taskNum]);

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const userValue = parseFloat(input);
    const correct = userValue === target;
    
    attemptsRef.current += 1;
    
    await eventTracker.trackTaskAttempt(
      `g2t${taskNum}`,
      attemptsRef.current,
      correct,
      timeTaken,
      userValue,
      target
    );
    
    if (correct) {
      setFeedback('✓ Perfect match!');
      setTimeout(() => {
        onComplete(`g2t${taskNum}`, {
          attempts: attemptsRef.current,
          totalTime: timeTaken,
          accuracy: 100
        });
      }, 1500);
    } else {
      // Show target value only in practice mode
      if (isPractice) {
        setFeedback(`✗ You chose ${userValue}, target was ${target}`);
      } else {
        setFeedback(`✗ Not quite right. Try again!`);
      }
    }
  };

  const isEnhanced = taskDependencies.getActiveDependency(`g2t${taskNum}`);
  const step = taskNum === 1 ? 1 : (taskNum === 2 ? 0.1 : 0.01);
  const showValue = taskNum !== 3; // Hide value only on hard mode
  
  // Generate scale marks for enhanced slider
  const generateScaleMarks = () => {
    const marks = [];
    for (let i = 0; i <= 10; i++) {
      marks.push(
        <div 
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 10)}%`,
            transform: 'translateX(-50%)',
            textAlign: 'center'
          }}
        >
          <div style={{
            width: '2px',
            height: '12px',
            background: '#666',
            margin: '0 auto'
          }} />
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '2px'
          }}>
            {i}
          </div>
        </div>
      );
    }
    return marks;
  };
  
  return (
    <div className={`task slider ${isEnhanced ? 'enhanced-task' : ''}`}>
      <h3>Slider Task {taskNum}</h3>
      <div className={`difficulty-badge ${['easy', 'medium', 'hard'][taskNum - 1]}`}>
        {['Easy', 'Medium', 'Hard'][taskNum - 1]}
      </div>
      
      <p className="instruction">
        Move the slider to: <strong className="target-value">{target}</strong>
      </p>
      
      <div className="slider-container">
        {/* Range labels */}
        <div className="range-labels">
          <span>0</span>
          <span>10</span>
        </div>
        
        {/* Enhanced slider with comprehensive scale (when enhanced) */}
        {isEnhanced ? (
          <div style={{ position: 'relative', padding: '20px 0 30px 0' }}>
            {/* Scale marks */}
            <div style={{ 
              position: 'absolute', 
              width: '100%', 
              height: '20px', 
              top: '0' 
            }}>
              {generateScaleMarks()}
            </div>
            
            {/* Slider input */}
            <input
              type="range"
              min="0"
              max="10"
              step={step}
              value={input}
              onChange={e => setInput(parseFloat(e.target.value))}
              className="slider-input enhanced"
              style={{
                width: '100%',
                marginTop: '20px',
                position: 'relative',
                zIndex: 10
              }}
            />
          </div>
        ) : (
          // Standard slider
          <input
            type="range"
            min="0"
            max="10"
            step={step}
            value={input}
            onChange={e => setInput(parseFloat(e.target.value))}
            className="slider-input"
          />
        )}
        
        {/* Current value display */}
        <div className="current-value">
          {showValue ? (
            taskNum === 2 ? 
              // For task 2 (medium), only show integer part
              Math.floor(parseFloat(input)).toString() :
              // For other tasks, show full precision
              parseFloat(input).toFixed(taskNum === 1 ? 0 : (taskNum === 2 ? 1 : 2))
          ) : '??'}
        </div>
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