// src/components/CountingTask.jsx - Updated with 90% accuracy threshold
import React, { useEffect, useState, useRef } from 'react';
import { eventTracker } from '../utils/eventTracker';
import { taskDependencies } from '../utils/taskDependencies';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './CountingTask.css';

export default function CountingTask({ taskNum, textSections, onComplete, isPractice = false, gameAccuracyMode = 'strict' }) {
  const [target, setTarget] = useState('');
  const [instruction, setInstruction] = useState('');
  const [answer, setAnswer] = useState(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [text, setText] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [startTime] = useState(Date.now());
  const [textImageUrl, setTextImageUrl] = useState('');
  const attemptsRef = useRef(0);
  const canvasRef = useRef(null);
  
  // Generate uncopyable text image
  const generateTextImage = (textContent, highlights = null) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size - wider for better fit
    canvas.width = 900;
    canvas.height = 350;
    
    // Set background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Set text properties - larger font for better readability
    ctx.font = '20px monospace';
    ctx.fillStyle = '#333';
    
    const lineHeight = 30;
    const padding = 20;
    const maxWidth = canvas.width - (padding * 2);
    
    // Word wrap function
    const wrapText = (text, maxWidth) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };
    
    const lines = wrapText(textContent, maxWidth);
    
    // Draw text with highlights
    lines.forEach((line, lineIndex) => {
      const y = padding + (lineIndex + 1) * lineHeight;
      
      if (highlights && highlights.length > 0) {
        // Draw with highlights
        let x = padding;
        
        if (taskNum === 1) {
          // Task 1: Highlight whole words
          const words = line.split(' ');
          
          words.forEach((word, wordIndex) => {
            const shouldHighlight = highlights.some(highlight => 
              word.toLowerCase() === highlight.toLowerCase()
            );
            
            if (shouldHighlight) {
              // Draw highlight background for whole word
              const wordWidth = ctx.measureText(word).width;
              ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
              ctx.fillRect(x - 2, y - 18, wordWidth + 4, 24);
            }
            
            // Draw word
            ctx.fillStyle = '#333';
            ctx.fillText(word, x, y);
            x += ctx.measureText(word + ' ').width;
          });
        } else {
          // Tasks 2 & 3: Highlight individual letters only
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const charWidth = ctx.measureText(char).width;
            
            const shouldHighlightLetter = highlights.some(highlight => 
              char.toLowerCase() === highlight.toLowerCase()
            );
            
            if (shouldHighlightLetter) {
              // Draw highlight background for single letter
              ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
              ctx.fillRect(x - 1, y - 18, charWidth + 2, 24);
            }
            
            // Draw character
            ctx.fillStyle = '#333';
            ctx.fillText(char, x, y);
            x += charWidth;
          }
        }
      } else {
        // Draw without highlights
        ctx.fillText(line, padding, y);
      }
    });
    
    return canvas.toDataURL();
  };
  
  useEffect(() => {
    // Always randomly select text from available sections
    const randomIndex = Math.floor(Math.random() * textSections.length);
    const selectedText = textSections[randomIndex];
    setText(selectedText);
    
    // Check for dependency enhancement
    const dependency = taskDependencies.getActiveDependency(`g1t${taskNum}`);
    const hasHighlight = dependency && dependency.type === 'highlight';
    
    let targetWord, instructionText, correctAnswer, highlights = null;
    
    if (taskNum === 1) {
      // Find words that appear at least 3 times in the text
      const wordFrequency = {};
      const textWords = selectedText.toLowerCase().match(/\b\w+\b/g) || [];
      
      // Count frequency of each word
      textWords.forEach(word => {
        if (word.length >= 2) { // Skip single letters
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
      
      // Filter for common words that appear >= 3 times
      const commonWords = Object.keys(wordFrequency).filter(word => 
        wordFrequency[word] >= 3 && ['the', 'of', 'and', 'in', 'to', 'a', 'is', 'was', 'were', 'are'].includes(word)
      );
      
      // If no common words found, fall back to default list
      const candidateWords = commonWords.length > 0 ? commonWords : ['the', 'of', 'and', 'in'];
      targetWord = candidateWords[Math.floor(Math.random() * candidateWords.length)];
      
      instructionText = `Count how many times the word "${targetWord}" appears:`;
      correctAnswer = (selectedText.match(new RegExp(`\\b${targetWord}\\b`, 'gi')) || []).length;
      
      if (hasHighlight) {
        highlights = [targetWord];
      }
    } else if (taskNum === 2) {
      const letters = ['e', 'a', 'i', 'o'];
      targetWord = letters[Math.floor(Math.random() * letters.length)];
      instructionText = `Count how many times the letter "${targetWord}" appears (case-insensitive):`;
      correctAnswer = (selectedText.match(new RegExp(targetWord, 'gi')) || []).length;
      
      if (hasHighlight) {
        highlights = [targetWord];
      }
    } else {
      const letter1 = ['a', 'e', 'i'][Math.floor(Math.random() * 3)];
      const letter2 = ['n', 't', 's'][Math.floor(Math.random() * 3)];
      targetWord = `${letter1}" and "${letter2}`;
      instructionText = `Count how many times the letters "${letter1}" and "${letter2}" appear in total:`;
      correctAnswer = (selectedText.match(new RegExp(letter1, 'gi')) || []).length + 
                     (selectedText.match(new RegExp(letter2, 'gi')) || []).length;
      
      if (hasHighlight) {
        highlights = [letter1, letter2];
      }
    }
    
    setTarget(targetWord);
    setInstruction(instructionText);
    setAnswer(correctAnswer);
    
    // Generate text image
    const imageUrl = generateTextImage(selectedText, highlights);
    setTextImageUrl(imageUrl);
    
    // For copyable display (only used if image fails to load)
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
        // Only highlight individual letters, not within words
        highlighted = selectedText.split('').map(char => {
          if (char.toLowerCase() === letter1.toLowerCase() || 
              char.toLowerCase() === letter2.toLowerCase()) {
            return `<span class="highlighted-letter">${char}</span>`;
          }
          return char;
        }).join('');
      }
      setDisplayText(highlighted);
    } else {
      setDisplayText(selectedText);
    }
  }, [taskNum, textSections]);
  
  const calculateAccuracy = (userAnswer, correctAnswer) => {
    if (userAnswer === correctAnswer) return 100;
    
    // Calculate accuracy based on how close the answer is
    const maxPossible = Math.max(userAnswer, correctAnswer, 1); // Avoid division by zero
    const difference = Math.abs(userAnswer - correctAnswer);
    const accuracy = Math.max(0, 100 - (difference / maxPossible * 100));
    
    return Math.round(accuracy);
  };
  
  const handleSubmit = async () => {
  const timeTaken = Date.now() - startTime;
  const userAnswer = parseInt(input, 10) || 0;
  const accuracy = calculateAccuracy(userAnswer, answer);
  
  // Different pass thresholds based on game mode
  const passThreshold = gameAccuracyMode === 'strict' ? 100 : 0;
  const passed = gameAccuracyMode === 'lenient' ? true : accuracy >= passThreshold;
  
  attemptsRef.current += 1;
  
  await eventTracker.trackTaskAttempt(
    `g1t${taskNum}`,
    attemptsRef.current,
    passed,
    timeTaken,
    userAnswer,
    answer
  );
  
  // Store accuracy to database
  const sessionId = localStorage.getItem('sessionId');
  if (sessionId && !sessionId.startsWith('offline-')) {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        [`taskAccuracies.g1t${taskNum}`]: accuracy,
        [`taskTimes.g1t${taskNum}`]: timeTaken,
        [`gameMode`]: gameAccuracyMode,
        lastActivity: serverTimestamp()
      });
    } catch (error) {
      console.error('Error storing accuracy:', error);
    }
  }
  
  if (passed) {
    if (accuracy === 100) {
      setFeedback('✓ Flawless!');
    } else if (gameAccuracyMode === 'lenient') {
      setFeedback(`✓ Passed! (${accuracy}% accuracy)`);
    } else {
      setFeedback('✓ Good job!');
    }
    
    setTimeout(() => {
      onComplete(`g1t${taskNum}`, {
        attempts: attemptsRef.current,
        totalTime: timeTaken,
        accuracy: accuracy
      });
    }, 1500);
  } else {
    if (isPractice) {
      setFeedback(`✗ Incorrect. The correct answer is ${answer}. Try again!`);
    } else {
      setFeedback(`✗ Try again! (${accuracy}% accuracy - need 100%)`);
    }
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
      
      {/* Use uncopyable image */}
      <div className="text-display">
        {textImageUrl ? (
          <img 
            src={textImageUrl} 
            alt="Text passage for counting"
            style={{ 
              width: '100%', 
              maxWidth: '900px',
              height: 'auto',
              maxHeight: '350px',
              objectFit: 'contain',
              border: 'none',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        ) : (
          // Fallback to HTML if image generation fails
          <div dangerouslySetInnerHTML={{ __html: displayText }} />
        )}
      </div>
      
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