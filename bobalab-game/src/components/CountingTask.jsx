// src/components/CountingTask.jsx
import React, { useEffect, useState, useRef } from 'react';
import { eventTracker } from '../utils/eventTracker';
import { taskDependencies } from '../utils/taskDependencies';
import './CountingTask.css';

export default function CountingTask({ taskNum, textSections, onComplete }) {
  const [target, setTarget] = useState('');
  const [instruction, setInstruction] = useState('');
  const [answer, setAnswer] = useState(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [text, setText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [startTime] = useState(Date.now());
  const attemptsRef = useRef(0);
  
  useEffect(() => {
    const selectedText = textSections[Math.floor(Math.random() * textSections.length)];
    setText(selectedText);
    
    // Check for dependency enhancement
    const dependency = taskDependencies.getActiveDependency(`g1t${taskNum}`);
    const hasHighlight = dependency && dependency.type === 'highlight';
    
    let targetWord, instructionText, correctAnswer;
    
    if (taskNum === 1) {
      const words = ['the', 'of', 'and', 'in'];
      targetWord = words[Math.floor(Math.random() * words.length)];
      instructionText = `Count how many times the word "${targetWord}" appears:`;
      correctAnswer = (selectedText.match(new RegExp(`\\b${targetWord}\\b`, 'gi')) || []).length;
    } else if (taskNum === 2) {
      const letters = ['e', 'a', 'i', 'o'];
      targetWord = letters[Math.floor(Math.random() * letters.length)];
      instructionText = `Count how many times the letter "${targetWord}" appears (case-insensitive):`;
      correctAnswer = (selectedText.match(new RegExp(targetWord, 'gi')) || []).length;
    } else {
      const letter1 = ['a', 'e', 'i'][Math.floor(Math.random() * 3)];
      const letter2 = ['n', 't', 's'][Math.floor(Math.random() * 3)];
      targetWord = `${letter1}" and "${letter2}`;
      instructionText = `Count how many times the letters "${letter1}" and "${letter2}" appear in total:`;
      correctAnswer = (selectedText.match(new RegExp(letter1, 'gi')) || []).length + 
                     (selectedText.match(new RegExp(letter2, 'gi')) || []).length;
    }
    
    setTarget(targetWord);
    setInstruction(instructionText);
    setAnswer(correctAnswer);
    
    // Apply highlighting if dependency is active
    if (hasHighlight) {
      let highlighted = selectedText;
      if (taskNum === 1) {
        const regex = new RegExp(`\\b${targetWord}\\b`, 'gi');
        highlighted = selectedText.replace(regex, match => 
          `<span class="highlighted-word">${match}</span>`
        );
      } else if (taskNum === 2) {
        const regex = new RegExp(targetWord, 'gi');
        highlighted = selectedText.replace(regex, match => 
          `<span class="highlighted-letter">${match}</span>`
        );
      } else {
        const [letter1, letter2] = targetWord.split('" and "');
        highlighted = selectedText
          .replace(new RegExp(letter1, 'gi'), match => 
            `<span class="highlighted-letter">${match}</span>`)
          .replace(new RegExp(letter2, 'gi'), match => 
            `<span class="highlighted-letter">${match}</span>`);
      }
      setDisplayText(highlighted);
    } else {
      setDisplayText(selectedText);
    }
  }, [taskNum, textSections]);
  
  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    const userAnswer = parseInt(input, 10) || 0;
    const correct = userAnswer === answer;
    
    attemptsRef.current += 1;
    
    await eventTracker.trackTaskAttempt(
      `g1t${taskNum}`,
      attemptsRef.current,
      correct,
      timeTaken,
      userAnswer,
      answer
    );
    
    setFeedback(correct ? '✓ Correct!' : `✗ Incorrect. The answer was ${answer}.`);
    
    if (correct) {
      setTimeout(() => {
        onComplete(`g1t${taskNum}`, {
          attempts: attemptsRef.current,
          totalTime: timeTaken,
          accuracy: 100
        });
      }, 1500);
    }
  };
  
  const isEnhanced = taskDependencies.getActiveDependency(`g1t${taskNum}`);
  
  return (
    <div className={`task counting ${isEnhanced ? 'enhanced-task' : ''}`}>
      <h3>Counting Task {taskNum}</h3>
      <div className={`difficulty-badge ${['easy', 'medium', 'hard'][taskNum - 1]}`}>
        {['Easy', 'Medium', 'Hard'][taskNum - 1]}
      </div>
      
      <p className="instruction">
        <strong>{instruction}</strong>
        <br />
        <span className="hint">(Case-insensitive)</span>
      </p>
      
      <div 
        className="text-display"
        dangerouslySetInnerHTML={{ __html: displayText }}
      />
      
      <div className="input-section">
        <label>Your answer:</label>
        <input
          type="number"
          min="0"
          max="999"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter count"
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