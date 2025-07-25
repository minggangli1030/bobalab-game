// src/components/SliderTask.jsx - Fixed to match original interface
import React, { useEffect, useState, useRef } from 'react';
import { eventTracker } from '../utils/eventTracker';
import { taskDependencies } from '../utils/taskDependencies';
import './SliderTask.css';

export default function SliderTask({ taskNum, onComplete }) {
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
      setFeedback(`✗ You chose ${userValue}, target was ${target}`);
    }
  };

  const isEnhanced = taskDependencies.getActiveDependency(`g2t${taskNum}`);
  const step = taskNum === 1 ? 1 : (taskNum === 2 ? 0.1 : 0.01);
  
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
        
        {/* Slider input */}
        <input
          type="range"
          min="0"
          max="10"
          step={step}
          value={input}
          onChange={e => setInput(parseFloat(e.target.value))}
          className="slider-input"
        />
        
        {/* Current value display */}
        <div className="current-value">
          {taskNum === 3 ? '??' : parseFloat(input).toFixed(taskNum === 1 ? 0 : (taskNum === 2 ? 1 : 2))}
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