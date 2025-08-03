// src/components/GameModeSelector.jsx
import React from 'react';

export default function GameModeSelector({ onModeSelected }) {
  return (
    <div style={{ marginBottom: '30px' }}>
      <h3 style={{ color: '#666', marginBottom: '15px' }}>Select Game Mode:</h3>
      
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button
          onClick={() => onModeSelected('strict')}
          style={{
            padding: '15px 25px',
            border: '2px solid #f44336',
            borderRadius: '8px',
            background: 'white',
            color: '#f44336',
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#f44336';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#f44336';
          }}
        >
          🎯 Strict Mode (100%)
        </button>
        
        <button
          onClick={() => onModeSelected('lenient')}
          style={{
            padding: '15px 25px',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            background: 'white',
            color: '#4CAF50',
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#4CAF50';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#4CAF50';
          }}
        >
          ✅ Lenient Mode (Pass All)
        </button>
      </div>
      
      <p style={{ 
        fontSize: '14px', 
        color: '#888', 
        marginTop: '10px',
        fontStyle: 'italic'
      }}>
        Strict: Must get 100% accuracy | Lenient: Always pass but accuracy is recorded
      </p>
    </div>
  );
}