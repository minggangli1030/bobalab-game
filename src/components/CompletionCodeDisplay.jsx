import React, { useState, useEffect } from 'react';

export default function CompletionCodeDisplay({ 
  sessionId, 
  completedLevels, 
  totalTime, 
  gameMode 
}) {
  const [completionCode, setCompletionCode] = useState('');
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    // Generate a unique completion code based on session data
    generateCompletionCode();
  }, []);
  
  const generateCompletionCode = () => {
    // Create a verifiable completion code
    // Format: GAME-[CHECKSUM]-[LEVELS]-[MODE]-[TIME]
    const timestamp = Date.now().toString(36).toUpperCase();
    const levelsCompleted = completedLevels.toString().padStart(2, '0');
    const modeCode = gameMode.limit === 'time' ? 'T' : 'A'; // Time or Attempts
    const accuracyCode = gameMode.accuracy === 'strict' ? 'S' : 'L'; // Strict or Lenient
    const timeMinutes = Math.floor(totalTime / 60).toString().padStart(2, '0');
    
    // Create a simple checksum for verification
    const dataString = `${sessionId}-${levelsCompleted}-${totalTime}`;
    const checksum = dataString.split('').reduce((acc, char) => 
      acc + char.charCodeAt(0), 0).toString(36).toUpperCase().slice(-3);
    
    const code = `GAME-${checksum}-${levelsCompleted}-${modeCode}${accuracyCode}-${timestamp}`;
    setCompletionCode(code);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(completionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '30px',
      marginTop: '30px',
      color: 'white',
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
        🎊 Your Completion Code
      </h2>
      
      <p style={{ marginBottom: '20px', opacity: 0.9, fontSize: '16px' }}>
        Copy this code and paste it into the Qualtrics survey to verify your completion:
      </p>
      
      <div style={{
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '28px',
          fontWeight: 'bold',
          letterSpacing: '2px',
          marginBottom: '15px',
          wordBreak: 'break-all',
          textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
        }}>
          {completionCode}
        </div>
        
        <button
          onClick={copyToClipboard}
          style={{
            padding: '12px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: copied ? '#4CAF50' : 'white',
            color: copied ? 'white' : '#764ba2',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          {copied ? '✓ Copied!' : '📋 Copy Code'}
        </button>
      </div>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '6px',
        padding: '15px',
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        <strong>⚠️ Important:</strong> This code is your proof of completion. 
        Make sure to copy it before closing this window!
      </div>
      
      {/* Code breakdown for transparency */}
      <details style={{ marginTop: '20px', textAlign: 'left' }}>
        <summary style={{ 
          cursor: 'pointer', 
          opacity: 0.8, 
          fontSize: '12px',
          marginBottom: '10px'
        }}>
          Code Details ▼
        </summary>
        <div style={{
          fontSize: '12px',
          opacity: 0.7,
          background: 'rgba(0,0,0,0.2)',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <div>Levels Completed: {completedLevels}/45</div>
          <div>Game Mode: {gameMode.limit === 'time' ? 'Time Challenge' : 'Task Attempts'}</div>
          <div>Accuracy Mode: {gameMode.accuracy === 'strict' ? 'Strict (100%)' : 'Lenient'}</div>
          <div>Total Time: {Math.floor(totalTime / 60)}m {totalTime % 60}s</div>
          <div>Generated: {new Date().toLocaleString()}</div>
        </div>
      </details>
    </div>
  );
}