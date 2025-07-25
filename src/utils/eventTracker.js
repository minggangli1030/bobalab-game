// src/utils/eventTracker.js - Updated with enhanced chat tracking
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const eventTracker = {
  async logEvent(eventType, eventData) {
    const sessionId = localStorage.getItem('sessionId');
    
    const event = {
      sessionId,
      type: eventType,
      timestamp: serverTimestamp(),
      clientTimestamp: Date.now(),
      ...eventData,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };
    
    try {
      await addDoc(collection(db, 'events'), event);
    } catch (error) {
      console.error('Failed to log event:', error);
      this.storeOfflineEvent(event);
    }
  },
  
  storeOfflineEvent(event) {
    const offlineEvents = JSON.parse(localStorage.getItem('offlineEvents') || '[]');
    offlineEvents.push(event);
    localStorage.setItem('offlineEvents', JSON.stringify(offlineEvents));
  },
  
  async syncOfflineEvents() {
    const offlineEvents = JSON.parse(localStorage.getItem('offlineEvents') || '[]');
    if (offlineEvents.length > 0) {
      for (const event of offlineEvents) {
        try {
          await addDoc(collection(db, 'events'), event);
        } catch (error) {
          console.error('Failed to sync offline event:', error);
        }
      }
      localStorage.removeItem('offlineEvents');
    }
  },
  
  // Specific tracking methods
  trackPageSwitch(from, to, isAutoAdvance = false) {
    return this.logEvent('page_switch', { 
      from, 
      to, 
      isAutoAdvance,
      switchType: isAutoAdvance ? 'auto' : 'manual'
    });
  },
  
  trackTaskAttempt(taskId, attempt, isCorrect, timeTaken, answer, expected) {
    return this.logEvent('task_attempt', {
      taskId,
      attempt,
      isCorrect,
      timeTaken,
      answer,
      expected,
      accuracy: this.calculateAccuracy(taskId, answer, expected)
    });
  },
  
  trackChatInteraction(query, response, promptNumber, currentTask) {
    return this.logEvent('chat_interaction', {
      query,
      response: response.text,
      responseId: response.id,
      responseLevel: response.level,
      responseType: response.type,
      matchedTriggers: response.triggers,
      responseScore: response.score,
      promptNumber,
      currentTask,
      queryLength: query.length,
      responseLength: response.text.length
    });
  },
  
  calculateAccuracy(taskId, answer, expected) {
    if (taskId.startsWith('g1')) {
      // Counting game - exact match
      return answer === expected ? 100 : 0;
    } else if (taskId.startsWith('g2')) {
      // Slider game - distance-based
      return Math.max(0, 100 - (Math.abs(answer - expected) / 10 * 100));
    } else if (taskId.startsWith('g3')) {
      // Typing game - character match
      if (answer === expected) return 100;
      let matches = 0;
      for (let i = 0; i < Math.min(answer.length, expected.length); i++) {
        if (answer[i] === expected[i]) matches++;
      }
      return Math.round((matches / Math.max(answer.length, expected.length)) * 100);
    }
    return 0;
  }
};