// src/utils/studentRegistry.js - Student Management System
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { codeVerification } from './codeVerification';

export const studentRegistry = {
  // Add students to the approved list (admin function)
  async addStudent(studentData) {
    const studentId = studentData.id || studentData.email || studentData.name.toLowerCase().replace(/\s+/g, '_');
    
    try {
      await setDoc(doc(db, 'approvedStudents', studentId), {
        ...studentData,
        addedAt: serverTimestamp(),
        status: 'pending',
        accessCode: null,
        lastAccess: null,
        attempts: 0
      });
      return { success: true, studentId };
    } catch (error) {
      console.error('Error adding student:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Bulk add students (for CSV upload)
  async bulkAddStudents(studentList) {
    const results = [];
    for (const student of studentList) {
      const result = await this.addStudent(student);
      results.push({ ...student, ...result });
    }
    return results;
  },
  
  // Verify student and generate access code
  async verifyAndGenerateCode(studentIdentifier) {
    try {
      // Clean the identifier (lowercase, trim)
      const cleanId = studentIdentifier.trim().toLowerCase().replace(/\s+/g, '_');
      
      // Try to find student by ID, email, or name
      let studentDoc = await getDoc(doc(db, 'approvedStudents', cleanId));
      
      // If not found by ID, search by email or name
      if (!studentDoc.exists()) {
        const q1 = query(collection(db, 'approvedStudents'), where('email', '==', studentIdentifier.trim()));
        const q2 = query(collection(db, 'approvedStudents'), where('name', '==', studentIdentifier.trim()));
        
        const [emailResults, nameResults] = await Promise.all([
          getDocs(q1),
          getDocs(q2)
        ]);
        
        if (!emailResults.empty) {
          studentDoc = emailResults.docs[0];
        } else if (!nameResults.empty) {
          studentDoc = nameResults.docs[0];
        }
      }
      
      // Student not found
      if (!studentDoc || !studentDoc.exists()) {
        return { 
          success: false, 
          reason: 'Student not found in approved list' 
        };
      }
      
      const studentData = studentDoc.data();
      
      // Check if student already has a code and has accessed the game
      if (studentData.status === 'completed') {
        return { 
          success: false, 
          reason: 'You have already completed the game' 
        };
      }
      
      // Check if student has exceeded attempts
      if (studentData.attempts >= 3) {
        return { 
          success: false, 
          reason: 'Maximum login attempts exceeded. Please contact your instructor.' 
        };
      }
      
      // Generate new access code
      const { success, code } = await codeVerification.createCode({
        studentId: studentDoc.id,
        studentName: studentData.name,
        studentEmail: studentData.email,
        generatedFor: 'student_login',
        courseId: studentData.courseId || null
      });
      
      if (!success) {
        return { success: false, reason: 'Failed to generate access code' };
      }
      
      // Update student record
      await updateDoc(doc(db, 'approvedStudents', studentDoc.id), {
        accessCode: code,
        lastCodeGenerated: serverTimestamp(),
        attempts: (studentData.attempts || 0) + 1,
        status: 'code_generated'
      });
      
      return { 
        success: true, 
        code,
        studentName: studentData.name,
        message: `Welcome ${studentData.name}! Your access code has been generated.`
      };
      
    } catch (error) {
      console.error('Error verifying student:', error);
      return { 
        success: false, 
        reason: 'System error. Please try again.' 
      };
    }
  },
  
  // Mark student as completed (called when they finish the game)
  async markStudentCompleted(studentId, sessionId) {
    try {
      await updateDoc(doc(db, 'approvedStudents', studentId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        sessionId,
        lastAccess: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking student completed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get all students (for admin dashboard)
  async getAllStudents() {
    try {
      const snapshot = await getDocs(collection(db, 'approvedStudents'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting students:', error);
      return [];
    }
  }
};