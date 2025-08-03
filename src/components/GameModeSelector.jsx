import React, { useState } from 'react';

export default function GameModeSelector({ onModeSelected }) {
  const [accuracyMode, setAccuracyMode] = useState(null);
  const [limitMode, setLimitMode] = useState(null);
  const [showLimitSelection, setShowLimitSelection] = useState(false);

  const handleAccuracySelection = (mode) => {
    setAccuracyMode(mode);
    setShowLimitSelection(true);
  };

  const handleLimitSelection = (mode) => {
    setLimitMode(mode);
    onModeSelected({
      accuracy: accuracyMode,
      limit: mode
    });
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      {!showLimitSelection ? (
        // Step 1: Accuracy Mode
        <>
          <h3 style={{ color: '#666', marginBottom: '15px' }}>Step 1: Select Accuracy Mode</h3>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '20px' }}>
            <button
              onClick={() => handleAccuracySelection('strict')}
              style={{
                padding: '15px 25px',
                border: '2px solid #f44336',
                borderRadius: '8px',
                background: accuracyMode === 'strict' ? '#f44336' : 'white',
                color: accuracyMode === 'strict' ? 'white' : '#f44336',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontWeight: 'bold'
              }}
            >
              🎯 Strict Mode (100%)
            </button>
            
            <button
              onClick={() => handleAccuracySelection('lenient')}
              style={{
                padding: '15px 25px',
                border: '2px solid #4CAF50',
                borderRadius: '8px',
                background: accuracyMode === 'lenient' ? '#4CAF50' : 'white',
                color: accuracyMode === 'lenient' ? 'white' : '#4CAF50',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontWeight: 'bold'
              }}
            >
              ✅ Lenient Mode (Pass All)
            </button>
          </div>
          
          <p style={{ 
            fontSize: '14px', 
            color: '#888', 
            fontStyle: 'italic'
          }}>
            Strict: Must get 100% accuracy | Lenient: Always pass but accuracy is recorded
          </p>
        </>
      ) : (
        // Step 2: Limit Mode
        <>
          <h3 style={{ color: '#666', marginBottom: '15px' }}>Step 2: Select Challenge Type</h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px', 
            maxWidth: '600px',
            margin: '0 auto 20px'
          }}>
            {/* Time Limit Option */}
            <div 
              onClick={() => handleLimitSelection('time')}
              style={{
                padding: '25px',
                border: '3px solid #2196F3',
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'white',
                transition: 'all 0.3s',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e3f2fd';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(33,150,243,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏱️</div>
              <h4 style={{ color: '#2196F3', marginBottom: '10px' }}>Time Challenge</h4>
              <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px' }}>
                15 minute countdown
              </p>
              <p style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
                Complete as many tasks as you can before time runs out!
              </p>
            </div>

            {/* Task Limit Option */}
            <div 
              onClick={() => handleLimitSelection('tasks')}
              style={{
                padding: '25px',
                border: '3px solid #9C27B0',
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'white',
                transition: 'all 0.3s',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3e5f5';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(156,39,176,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📊</div>
              <h4 style={{ color: '#9C27B0', marginBottom: '10px' }}>Task Challenge</h4>
              <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px' }}>
                12 total task attempts
              </p>
              <p style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
                Strategic mode - choose which tasks to attempt!
              </p>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button 
              onClick={() => setShowLimitSelection(false)}
              style={{
                padding: '8px 16px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Back to Step 1
            </button>
          </div>
          
          {/* Info box */}
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '20px',
            fontSize: '14px',
            color: '#666'
          }}>
            <strong>🎮 Strategy Tip:</strong> With 15 levels per game type, you'll need to balance 
            between perfecting tasks and exploring different games. Task dependencies still apply!
          </div>
        </>
      )}
    </div>
  );
}