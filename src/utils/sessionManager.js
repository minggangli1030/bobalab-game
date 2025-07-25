// src/utils/sessionManager.js - Code Required Version
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { codeVerification } from './codeVerification';

export const sessionManager = {
  async checkAccess() {
    try {
      // First check if there's a code in the URL
      const urlCode = codeVerification.getCodeFromURL();
      
      // ENFORCE CODE REQUIREMENT
      if (!urlCode) {
        return { 
          allowed: false, 
          reason: 'Access code required. Please access this game through your Qualtrics survey.',
          requiresCode: true
        };
      }
      
      // Verify the code
      const { valid, reason, codeData } = await codeVerification.verifyCode(urlCode);
      
      if (!valid) {
        return { 
          allowed: false, 
          reason: `Invalid or expired access code: ${reason}`,
          code: urlCode
        };
      }
      
      // Code is valid, create a new session
      return { 
        allowed: true, 
        newSession: true, 
        code: urlCode,
        codeData 
      };
      
    } catch (error) {
      console.error('Error checking access:', error);
      // On error, still require code
      return { 
        allowed: false, 
        reason: 'System error. Please try again or contact support.',
        requiresCode: true
      };
    }
  },
  
  async createSession(accessCode = null, codeData = null) {
    try {
      const ip = await this.getUserIP();
      const sessionData = {
        id: crypto.randomUUID(),
        ip,
        accessCode,
        qualtricsData: codeData?.metadata || null,
        startTime: serverTimestamp(),
        status: 'active',
        completedTasks: {},
        events: [],
        chatHistory: [],
        numPrompts: 0,
        bonusPrompts: 0,
        practiceCompleted: false,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        source: accessCode ? 'qualtrics' : 'direct'
      };
      
      const docRef = await addDoc(collection(db, 'sessions'), sessionData);
      localStorage.setItem('sessionId', docRef.id);
      
      // Mark code as used if provided
      if (accessCode) {
        await codeVerification.markCodeAsUsed(accessCode, docRef.id);
      }
      
      // Set up beforeunload handler
      window.addEventListener('beforeunload', async (e) => {
        await this.handleSessionAbandonment();
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating session:', error);
      // Fallback for offline mode
      const offlineId = 'offline-' + Date.now();
      localStorage.setItem('sessionId', offlineId);
      localStorage.setItem('offlineSession', JSON.stringify({ ...sessionData, id: offlineId }));
      return offlineId;
    }
  },
  
  async handleSessionAbandonment() {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId && !sessionId.startsWith('offline-')) {
      try {
        await updateDoc(doc(db, 'sessions', sessionId), {
          status: 'abandoned',
          abandonedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error marking session as abandoned:', error);
      }
    }
  },
  
  async getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown-' + Date.now();
    }
  }
};