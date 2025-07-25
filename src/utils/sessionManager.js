// src/utils/sessionManager.js - Temporarily bypass Firestore
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export const sessionManager = {
  async checkAccess() {
    try {
      // TEMPORARY: Skip Firestore check
      console.log('Bypassing Firestore for testing...');
      return { allowed: true, newSession: true };
      
      /* Original code - commented out for now
      const ip = await this.getUserIP();
      const sessionId = localStorage.getItem('sessionId');
      
      const q = query(
        collection(db, 'sessions'),
        where('ip', '==', ip),
        where('status', 'in', ['incomplete', 'abandoned', 'active'])
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
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
      
      return { allowed: true, newSession: true };
      */
    } catch (error) {
      console.error('Error checking access:', error);
      return { allowed: true };
    }
  },
  
  async createSession() {
    try {
      // TEMPORARY: Create local session only
      const sessionId = 'local-session-' + Date.now();
      localStorage.setItem('sessionId', sessionId);
      console.log('Created local session:', sessionId);
      return sessionId;
      
      /* Original code - commented out
      const ip = await this.getUserIP();
      const sessionData = {
        id: crypto.randomUUID(),
        ip,
        startTime: serverTimestamp(),
        status: 'active',
        completedTasks: {},
        events: [],
        chatHistory: [],
        numPrompts: 0,
        bonusPrompts: 0,
        practiceCompleted: false,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`
      };
      
      const docRef = await addDoc(collection(db, 'sessions'), sessionData);
      localStorage.setItem('sessionId', docRef.id);
      
      window.addEventListener('beforeunload', async (e) => {
        await this.handleSessionAbandonment();
      });
      
      return docRef.id;
      */
    } catch (error) {
      console.error('Error creating session:', error);
      return 'fallback-session-' + Date.now();
    }
  },
  
  async handleSessionAbandonment() {
    console.log('Session abandonment - skipped for local testing');
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