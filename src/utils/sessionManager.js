// src/utils/sessionManager.js - With Code Verification
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { codeVerification } from './codeVerification';

export const sessionManager = {
  async checkAccess() {
    try {
      // First check if there's a code in the URL
      const urlCode = codeVerification.getCodeFromURL();
      
      if (urlCode) {
        // Verify the code
        const { valid, reason, codeData } = await codeVerification.verifyCode(urlCode);
        
        if (!valid) {
          return { 
            allowed: false, 
            reason: `Access denied: ${reason}`,
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
      }
      
      // No code provided - check IP-based access (original logic)
      const ip = await this.getUserIP();
      const sessionId = localStorage.getItem('sessionId');
      
      // Check for existing sessions from this IP
      const q = query(
        collection(db, 'sessions'),
        where('ip', '==', ip),
        where('status', 'in', ['incomplete', 'abandoned', 'active'])
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Check if any session was abandoned
        const abandonedSession = snapshot.docs.find(doc => 
          doc.data().status === 'abandoned'
        );
        
        if (abandonedSession) {
          return { 
            allowed: false, 
            reason: 'You have already attempted this game. Access denied.',
            sessionData: abandonedSession.data()
          };
        }
        
        // Check for incomplete session
        const incompleteSession = snapshot.docs.find(doc => 
          doc.data().status === 'incomplete'
        );
        
        if (incompleteSession) {
          return {
            allowed: true,
            resumeSession: incompleteSession.id,
            sessionData: incompleteSession.data()
          };
        }
      }
      
      // Allow access without code for development
      return { allowed: true, newSession: true };
      
    } catch (error) {
      console.error('Error checking access:', error);
      // If Firebase fails, check if we have a code
      const urlCode = codeVerification.getCodeFromURL();
      if (urlCode) {
        // Allow access with code even if Firebase is down
        return { allowed: true, newSession: true, code: urlCode, offlineMode: true };
      }
      return { allowed: true }; // Allow access on error for development
    }
  },
  
  async createSession(accessCode = null, codeData = null) {
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
    
    try {
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
      localStorage.setItem('offlineSession', JSON.stringify(sessionData));
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