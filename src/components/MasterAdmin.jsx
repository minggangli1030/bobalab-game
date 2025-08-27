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

  // Complete student roster with sections
  const CLASS_1A_ID_CHECKPOINT = [
    "3040748714",
    "3040729812",
    "3040859968",
    "3040852909",
    "3040869211",
    "3040849958",
    "3039838870",
    "15177695",
    "3040849997",
    "3039845630",
    "3040682661",
    "26416809",
    "3039850622",
    "3040869510",
    "3031977170",
    "3040806629",
    "3040848528",
    "3039840443",
    "3040848749",
    "3040849893",
    "3039850830",
    "3039850713",
  ];

  const CLASS_1A_ID_NOCHECKPOINT = [
    "3040850023",
    "22900589",
    "3039850570",
    "3040882302",
    "3040815651",
    "3040701758",
    "3040852077",
    "3036343361",
    "3040869458",
    "3040705047",
    "3040702343",
    "3039842887",
    "3040848593",
    "3040702603",
    "3039840222",
    "3039840209",
    "3040861190",
    "18565110",
    "3040869302",
    "3040814338",
    "3039754031",
  ];

  const CLASS_2A_ID_CHECKPOINT = [
    "3040705476",
    "3040697715",
    "3039753992",
    "3040729513",
    "3040681595",
    "3040850010",
    "3032682772",
    "3039842484",
    "3040869445",
    "3040814455",
    "3039840781",
    "3040696831",
    "3040705125",
    "3034184066",
    "3039843004",
    "3039842835",
    "3040860072",
    "3040871018",
    "3039839026",
    "3040814429",
    "3040869094",
    "3040748064",
    "3040875945",
    "3040701589",
    "3040682193",
    "3040729422",
    "3040836165",
    "21798975",
    "3038626424",
    "3039753017",
    "3039840287",
    "3040806382",
  ];

  const CLASS_2A_ID_NOCHECKPOINT = [
    "25958106",
    "3040814351",
    "3040848697",
    "3040684039",
    "3040869289",
    "22971551",
    "3040837218",
    "3040864570",
    "3040705099",
    "3034288430",
    "3040848541",
    "3040864531",
    "3040869237",
    "3032342054",
    "3040682479",
    "3039840170",
    "3032397447",
    "3039850856",
    "3039840118",
    "3040729552",
    "3040683181",
    "3040861073",
    "3031968434",
    "3040882575",
    "3035320237",
    "3040823815",
    "3039842575",
    "24261697",
    "23420611",
    "3032000089",
    "3040882341",
  ];

  // Helper function to determine student section and checkpoint status
  const getStudentInfo = (studentId) => {
    if (CLASS_1A_ID_CHECKPOINT.includes(studentId)) {
      return { section: "01A-CP", hasCheckpoint: true };
    }
    if (CLASS_1A_ID_NOCHECKPOINT.includes(studentId)) {
      return { section: "01A-NCP", hasCheckpoint: false };
    }
    if (CLASS_2A_ID_CHECKPOINT.includes(studentId)) {
      return { section: "02A-CP", hasCheckpoint: true };
    }
    if (CLASS_2A_ID_NOCHECKPOINT.includes(studentId)) {
      return { section: "02A-NCP", hasCheckpoint: false };
    }
    // Admin codes or test accounts
    if (studentId.includes("ADMIN") || studentId.includes("admin")) {
      return { section: "ADMIN", hasCheckpoint: false };
    }
    return { section: "Unknown", hasCheckpoint: false };
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      // Get all sessions from Firebase
      const sessionsSnapshot = await getDocs(collection(db, "sessions"));

      // Create a map of students who have played
      const playedStudentsMap = {};

      sessionsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Skip actual admin sessions
        if (data.role === "admin" || data.role === "master_admin") {
          return; // Skip admin sessions
        }

        if (data.studentId) {
          const studentInfo = getStudentInfo(data.studentId);

          if (!playedStudentsMap[data.studentId]) {
            playedStudentsMap[data.studentId] = {
              studentId: data.studentId,
              sessions: [],
              latestAccess: null,
              totalAccesses: 0,
              displayName: `Student ${data.studentId}`,
              section: studentInfo.section,
              hasCheckpoint: studentInfo.hasCheckpoint,
              hasPlayed: true,
            };
          }

          playedStudentsMap[data.studentId].sessions.push({
            id: doc.id,
            timestamp: data.startTime?.toDate
              ? data.startTime.toDate()
              : new Date(data.clientStartTime),
            status: data.status,
            completedTasks: Object.keys(data.completedTasks || {}).length,
            finalScore: data.finalScore || 0,
            currentSemester: data.currentSemester || 1,
          });
        }
      });

      // Process played students
      Object.values(playedStudentsMap).forEach((student) => {
        student.sessions.sort((a, b) => b.timestamp - a.timestamp);
        student.latestAccess = student.sessions[0]?.timestamp || null;
        student.totalAccesses = student.sessions.length;
      });

      // Create complete roster including students who haven't played
      const completeRoster = [];

      // Add all students from rosters
      const allRosterIds = [
        ...CLASS_1A_ID_CHECKPOINT,
        ...CLASS_1A_ID_NOCHECKPOINT,
        ...CLASS_2A_ID_CHECKPOINT,
        ...CLASS_2A_ID_NOCHECKPOINT,
      ];

      allRosterIds.forEach((studentId) => {
        if (playedStudentsMap[studentId]) {
          // Student has played - use their data
          completeRoster.push(playedStudentsMap[studentId]);
        } else {
          // Student hasn't played - create entry
          const studentInfo = getStudentInfo(studentId);
          completeRoster.push({
            studentId: studentId,
            sessions: [],
            latestAccess: null,
            totalAccesses: 0,
            displayName: `Student ${studentId}`,
            section: studentInfo.section,
            hasCheckpoint: studentInfo.hasCheckpoint,
            hasPlayed: false,
          });
        }
      });

      // Sort by latest access (played students first, then by ID)
      completeRoster.sort((a, b) => {
        if (a.hasPlayed && !b.hasPlayed) return -1;
        if (!a.hasPlayed && b.hasPlayed) return 1;
        if (a.latestAccess && b.latestAccess) {
          return b.latestAccess - a.latestAccess;
        }
        return a.studentId.localeCompare(b.studentId);
      });

      setStudents(completeRoster);
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

  const filteredStudents = students.filter((student) =>
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Calculate summary stats
  const totalStudents = students.filter(
    (s) => !s.section.includes("ADMIN")
  ).length;
  const playedToday = students.filter(
    (s) => !s.section.includes("ADMIN") && getTodayCount(s) > 0
  ).length;
  const totalSessions = students
    .filter((s) => !s.section.includes("ADMIN"))
    .reduce((sum, s) => sum + s.totalAccesses, 0);
  const needsRefresh = students.filter(
    (s) => !s.section.includes("ADMIN") && getTodayCount(s) >= 1
  ).length;
  const neverPlayed = students.filter(
    (s) => !s.section.includes("ADMIN") && !s.hasPlayed
  ).length;

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
            placeholder="Search by Student ID..."
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
            gridTemplateColumns: "repeat(5, 1fr)",
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
              {totalStudents}
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
              {playedToday}
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
              {totalSessions}
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
              {needsRefresh}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Needs Refresh</div>
          </div>

          <div
            style={{
              padding: "15px",
              background: "#f3e5f5",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#9c27b0" }}
            >
              {neverPlayed}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Never Played</div>
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
                Section
              </th>
              <th
                style={{
                  padding: "15px",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Status
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
                const isAdmin = student.section === "ADMIN";

                return (
                  <tr
                    key={student.studentId}
                    style={{
                      borderBottom: "1px solid #e0e0e0",
                      background:
                        selectedStudent === student.studentId
                          ? "#f0f8ff"
                          : !student.hasPlayed
                          ? "#fafafa"
                          : isAdmin
                          ? "#fff9c4"
                          : "white",
                    }}
                  >
                    <td style={{ padding: "15px", fontFamily: "monospace" }}>
                      {student.studentId}
                    </td>
                    <td style={{ padding: "15px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          background: isAdmin
                            ? "#ffeb3b"
                            : student.section.includes("01A")
                            ? "#e3f2fd"
                            : student.section.includes("02A")
                            ? "#f3e5f5"
                            : "#f5f5f5",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: isAdmin ? "bold" : "normal",
                          color: isAdmin ? "#333" : "inherit",
                        }}
                      >
                        {student.section}
                      </span>
                    </td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      {!student.hasPlayed ? (
                        <span
                          style={{
                            padding: "4px 8px",
                            background: "#e0e0e0",
                            color: "#666",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        >
                          Never Played
                        </span>
                      ) : isAdmin ? (
                        <span
                          style={{
                            padding: "4px 8px",
                            background: "#ffeb3b",
                            color: "#333",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                          }}
                        >
                          Admin Test
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "4px 8px",
                            background: "#e8f5e9",
                            color: "#2e7d32",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      {formatDate(student.latestAccess)}
                    </td>
                    <td style={{ padding: "15px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          background: needsRefresh
                            ? "#ffebee"
                            : todayCount > 0
                            ? "#e8f5e9"
                            : "#f5f5f5",
                          color: needsRefresh
                            ? "#c62828"
                            : todayCount > 0
                            ? "#2e7d32"
                            : "#999",
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
                      {!isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedStudent(student.studentId);
                            if (
                              confirm(
                                `Reset access for Student ${student.studentId} (${student.section})?\n\nThis will allow them to play again today.`
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
                      )}
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
        <br />
        Total roster: {totalStudents} students across 4 conditions (01A-CP,
        01A-NCP, 02A-CP, 02A-NCP)
      </div>
    </div>
  );
}
