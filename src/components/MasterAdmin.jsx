// src/components/MasterAdmin.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function MasterAdmin() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      // Get all sessions
      const sessionsSnapshot = await getDocs(collection(db, "sessions"));

      // Group by student ID
      const studentMap = {};

      sessionsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.studentId && data.role !== "admin") {
          if (!studentMap[data.studentId]) {
            studentMap[data.studentId] = {
              studentId: data.studentId,
              sessions: [],
              latestAccess: null,
              totalAccesses: 0,
              displayName: data.displayName || data.studentId,
              section: data.section || "Unknown",
            };
          }

          studentMap[data.studentId].sessions.push({
            id: doc.id,
            timestamp: data.startTime?.toDate
              ? data.startTime.toDate()
              : new Date(data.clientStartTime),
            status: data.status,
            completedTasks: Object.keys(data.completedTasks || {}).length,
            finalScore: data.finalScore || 0,
          });
        }
      });

      // Process student data
      const studentList = Object.values(studentMap).map((student) => {
        // Sort sessions by timestamp
        student.sessions.sort((a, b) => b.timestamp - a.timestamp);

        // Set latest access and total count
        student.latestAccess = student.sessions[0]?.timestamp || null;
        student.totalAccesses = student.sessions.length;

        return student;
      });

      // Sort by latest access
      studentList.sort((a, b) => {
        if (!a.latestAccess) return 1;
        if (!b.latestAccess) return -1;
        return b.latestAccess - a.latestAccess;
      });

      setStudents(studentList);
    } catch (error) {
      console.error("Error loading student data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStudentAccess = async (studentId) => {
    setRefreshing(true);
    try {
      // Clear the daily limit from localStorage
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const localKey = `played_${studentId}_${todayStr}`;
      localStorage.removeItem(localKey);

      // Add a refresh record
      await addDoc(collection(db, "accessRefreshes"), {
        studentId: studentId,
        refreshedBy: "MASTER_ADMIN",
        refreshedAt: serverTimestamp(),
        reason: "Manual refresh by admin",
      });

      alert(
        `Access refreshed for student ${studentId}. They can now play again today.`
      );

      // Reload data
      await loadStudentData();
    } catch (error) {
      console.error("Error refreshing access:", error);
      alert(`Failed to refresh access: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date) => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const getTodayCount = (student) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return student.sessions.filter((session) => {
      const sessionDate = new Date(session.timestamp);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    }).length;
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "30px",
          borderRadius: "12px",
          marginBottom: "30px",
          color: "white",
        }}
      >
        <h1 style={{ margin: "0 0 10px 0" }}>🔐 Master Admin Dashboard</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Manage student access and view activity logs
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by Student ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 15px",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />
          <button
            onClick={loadStudentData}
            disabled={loading}
            style={{
              padding: "10px 20px",
              background: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Summary Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "15px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              padding: "15px",
              background: "#e3f2fd",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#2196F3" }}
            >
              {students.length}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              Total Students
            </div>
          </div>

          <div
            style={{
              padding: "15px",
              background: "#e8f5e9",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#4CAF50" }}
            >
              {students.filter((s) => getTodayCount(s) > 0).length}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Played Today</div>
          </div>

          <div
            style={{
              padding: "15px",
              background: "#fff3e0",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#ff9800" }}
            >
              {students.reduce((sum, s) => sum + s.totalAccesses, 0)}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              Total Sessions
            </div>
          </div>

          <div
            style={{
              padding: "15px",
              background: "#fce4ec",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#e91e63" }}
            >
              {students.filter((s) => getTodayCount(s) >= 1).length}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Needs Refresh</div>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th
                style={{
                  padding: "15px",
                  textAlign: "left",
                  fontWeight: "600",
                }}
              >
                Student ID
              </th>
              <th
                style={{
                  padding: "15px",
                  textAlign: "left",
                  fontWeight: "600",
                }}
              >
                Name
              </th>
              <th
                style={{
                  padding: "15px",
                  textAlign: "left",
                  fontWeight: "600",
                }}
              >
                Section
              </th>
              <th
                style={{
                  padding: "15px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Latest Access
              </th>
              <th
                style={{
                  padding: "15px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Today
              </th>
              <th
                style={{
                  padding: "15px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Total
              </th>
              <th
                style={{
                  padding: "15px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ padding: "40px", textAlign: "center" }}
                >
                  Loading student data...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ padding: "40px", textAlign: "center" }}
                >
                  No students found
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const todayCount = getTodayCount(student);
                const needsRefresh = todayCount >= 1;

                return (
                  <tr
                    key={student.studentId}
                    style={{
                      borderBottom: "1px solid #e0e0e0",
                      background:
                        selectedStudent === student.studentId
                          ? "#f0f8ff"
                          : "white",
                    }}
                  >
                    <td style={{ padding: "15px", fontFamily: "monospace" }}>
                      {student.studentId}
                    </td>
                    <td style={{ padding: "15px" }}>{student.displayName}</td>
                    <td style={{ padding: "15px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          background:
                            student.section === "01A" ? "#e3f2fd" : "#f3e5f5",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {student.section}
                      </span>
                    </td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      {formatDate(student.latestAccess)}
                    </td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          background: needsRefresh ? "#ffebee" : "#e8f5e9",
                          color: needsRefresh ? "#c62828" : "#2e7d32",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {todayCount}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "15px",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {student.totalAccesses}
                    </td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      <button
                        onClick={() => {
                          setSelectedStudent(student.studentId);
                          if (
                            confirm(
                              `Reset access for ${student.displayName} (${student.studentId})?\n\nThis will allow them to play again today.`
                            )
                          ) {
                            refreshStudentAccess(student.studentId);
                          }
                        }}
                        disabled={refreshing}
                        style={{
                          padding: "6px 12px",
                          background: needsRefresh ? "#ff9800" : "#4CAF50",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {needsRefresh ? "🔄 Refresh" : "✓ OK"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#f5f5f5",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#666",
          textAlign: "center",
        }}
      >
        Access automatically resets at midnight PST. Use refresh button to
        manually grant access.
      </div>
    </div>
  );
}
