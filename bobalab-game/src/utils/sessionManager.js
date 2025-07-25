// src/utils/sessionManager.js
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export const sessionManager = {
  async checkAccess() {
    try {
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
        // Check if any session was abandoned (quit/refresh)
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
        
        // Check for incomplete but not abandoned
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
    } catch (error) {
      console.error('Error checking access:', error);
      return { allowed: true }; // Allow access on error
    }
  },
  
  async createSession() {
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
    
    // Set up beforeunload handler
    window.addEventListener('beforeunload', async (e) => {
      await this.handleSessionAbandonment();
    });
    
    return docRef.id;
  },
  
  async handleSessionAbandonment() {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
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
      // Fallback to a unique identifier if IP service fails
      return 'unknown-' + Date.now();
    }
  }
};