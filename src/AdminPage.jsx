// src/AdminPage.jsx - Simple Admin Page for Code Generation
import React, { useState } from 'react';
import { codeVerification } from './utils/codeVerification';

export default function AdminPage() {
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const generateNewCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await codeVerification.createCode({
        createdBy: 'admin',
        timestamp: new Date().toISOString()
      });
      
      if (result.success) {
        setGeneratedCode(result.code);
        // Generate the full URL
        const baseUrl = window.location.origin;
        const fullUrl = `${baseUrl}?code=${result.code}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(fullUrl);
      } else {
        setError('Failed to generate code: ' + result.error);
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Only show admin page if URL has admin parameter
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === 'true';
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Admin - Code Generation</h2>
      
      <button 
        onClick={generateNewCode}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Generating...' : 'Generate New Code'}
      </button>
      
      {generatedCode && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '4px' }}>
          <p><strong>Generated Code:</strong> {generatedCode}</p>
          <p><strong>Full URL:</strong></p>
          <input 
            type="text" 
            value={`${window.location.origin}?code=${generatedCode}`}
            readOnly
            style={{ width: '100%', padding: '5px' }}
          />
          <p style={{ color: '#666', fontSize: '14px' }}>URL copied to clipboard!</p>
        </div>
      )}
      
      {error && (
        <div style={{ marginTop: '20px', color: 'red' }}>
          {error}
        </div>
      )}
    </div>
  );
}