// Utility for communicating with Qualtrics parent window
export const qualtricsMessenger = {
  // Notify Qualtrics when all semesters are completed
  notifyGameComplete(data = {}) {
    try {
      // Send completion message to parent window (Qualtrics)
      window.parent.postMessage({
        type: 'gameComplete',
        status: 'finished',
        timestamp: new Date().toISOString(),
        ...data
      }, '*');
      
      console.log('✅ Game completion notification sent to Qualtrics');
    } catch (error) {
      console.error('Failed to notify Qualtrics:', error);
    }
  },

  // Notify Qualtrics of semester progress (optional)
  notifySemesterComplete(semesterNumber, totalSemesters, data = {}) {
    try {
      window.parent.postMessage({
        type: 'semesterComplete',
        semester: semesterNumber,
        totalSemesters: totalSemesters,
        timestamp: new Date().toISOString(),
        ...data
      }, '*');
      
      console.log(`📚 Semester ${semesterNumber} completion notification sent`);
    } catch (error) {
      console.error('Failed to notify Qualtrics of semester completion:', error);
    }
  }
};