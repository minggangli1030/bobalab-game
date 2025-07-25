// src/components/TypingTask.jsx - Updated with proper interface and hidden answers
import React, { useEffect, useState, useRef } from 'react';
import { eventTracker } from '../utils/eventTracker';
import { taskDependencies } from '../utils/taskDependencies';
import './TypingTask.css';

const patterns = {
  easy: ['hello world', 'easy typing', 'test input', 'simple text'],
  medium: ['HeLLo WoRLd', 'TeSt PaTTeRn', 'MiXeD cAsE', 'CaPiTaL lEtTeRs'],
  hard: ['a@1 B#2 c$3', 'Qw3$ Er4# Ty5@', 'X9% Y8& Z7*', 'P6! Q5? R4+']
};

export default function TypingTask({ taskNum, onComplete }) {
  const [pattern, setPattern] = useState('');
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [startTime] = useState(Date.now());
  const attemptsRef = useRef(0);

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
  }, [taskNum]);

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const correct = input === pattern;
    
    attemptsRef.current += 1;
    
    await eventTracker.trackTaskAttempt(
      `g3t${taskNum}`,
      attemptsRef.current,
      correct,
      timeTaken,
      input,
      pattern
    );
    
    if (correct) {
      setFeedback('✓ Perfect match!');
      setTimeout(() => {
        onComplete(`g3t${taskNum}`, {
          attempts: attemptsRef.current,
          totalTime: timeTaken,
          accuracy: 100
        });
      }, 1500);
    } else {
      // Don't show the correct pattern - just indicate it's incorrect
      setFeedback('✗ Not quite right. Try again!');
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
        <span className="pattern-text">{pattern}</span>
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