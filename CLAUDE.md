# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based educational game application called "Can you beat Park?" - a teaching simulation where players act as instructors trying to maximize student learning through three categories of tasks:
- **Materials** (Slider tasks) - Direct points for teaching materials
- **Research** (Counting tasks) - Adds 15% multiplier per point to all materials
- **Engagement** (Typing tasks) - Adds 0.15% compound interest per point after each task

The app uses Firebase for data persistence and includes an AI teaching assistant that provides task help with varying reliability.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Core Game Flow
1. **Student Login** (`StudentLogin.jsx`) → validates access codes
2. **Practice Mode** (`PracticeMode.jsx`) → mandatory practice tasks requiring 100% accuracy
3. **Main Game** (`App.jsx`) → timed challenge with teaching tasks across multiple semesters
4. **Completion** (`CompletionCodeDisplay.jsx`) → generates unique completion code for study

### Key Components
- **App.jsx** (2835 lines) - Main game orchestrator handling:
  - Session management and Firebase sync
  - Game state (semesters, checkpoints, scoring)
  - Timer management and pause/resume logic
  - Task switching and completion tracking
  - Student learning score calculation

- **Task Components**:
  - `SliderTask.jsx` - Materials tasks (slider precision)
  - `CountingTask.jsx` - Research tasks (pattern counting)
  - `TypingTask.jsx` - Engagement tasks (text replication)

- **AI Assistant** (`ChatContainer.jsx`):
  - Implements deterministic AI help patterns
  - First 5 attempts follow fixed accuracy pattern
  - 75% accuracy for attempts 6+
  - Tracks usage across all tasks

### State Management
- Session data persisted to Firebase Firestore
- Local storage for temporary data and offline fallback
- Event tracking system (`eventTracker.js`) for analytics
- Pattern generator (`patternGenerator.js`) for consistent task generation

### Firebase Integration
- Environment variables required (VITE_FIREBASE_*)
- Firestore for session data
- Offline event queue with sync capability
- Real-time session status updates

## Important Implementation Details

### Scoring System
```javascript
Student Learning = Materials × (1 + 0.15×Research) + Engagement Interest
```
- Exact answer = 2 points
- Within 1 = 1 point  
- Otherwise = 0 points
- Engagement interest compounds after every task completion

### Checkpoint System
- Semester 2 includes midterm at 6-minute mark (1 minute for admin mode)
- 50+ student learning points = 300 bonus points
- Checkpoint pauses game for user acknowledgment

### Session Security
- One-time access codes prevent multiple attempts
- Session blocking on idle (60s) or tab switch (30s warning)
- No refresh/restart allowed for students
- Admin mode bypasses restrictions

### AI Help Pattern
The AI assistant follows a deterministic pattern for the first 5 uses:
1. Correct (2 pts)
2. Correct (2 pts)
3. Off by 1 (1 pt) - **Always over-highlights for visibility**
4. Correct (2 pts)
5. Correct (2 pts)
6+ 75% correct, 25% mistakes:
   - **50% of mistakes**: Off by 1 (1 pt) - **Over-highlights**
   - **50% of mistakes**: Way off (0 pts) - **Significantly over-highlights**

**Mistake Behavior (Enhanced)**:
- **Letter Counting**: Always adds 1-2 extra wrong letters to highlight
- **Word Counting**: Always highlights extra wrong words beyond target count
- **Visual Feedback**: Over-highlighting makes AI errors obvious for educational value

## Recent Major Improvements

### Data Collection System (Enhanced)
- **Comprehensive Event Tracking**: All interactions with readable timestamps (MM:SS after semester start)
- **AI Interaction Correlation**: Tracks help request → player response → outcome
- **Click Tracking**: Element details, coordinates, context for all user clicks
- **Performance Analytics**: Learning curves, improvement trends, struggle identification
- **Firebase Collections**: 
  - `Events`: All user interactions with detailed context
  - `Sessions`: Persistent session data with real-time updates

### AI System Improvements
- **Fixed Letter/Character Counting**: Medium/hard difficulty levels now properly highlight individual letters
- **Character-Level Highlighting**: Animated character highlighting with proper canvas rendering  
- **Educational Mistake Patterns**: AI mistakes now over-highlight for better visibility
- **Multi-Letter Support**: Handles patterns like "a and e", "a, e" correctly

### UI/UX Enhancements  
- **Fixed Student Learning Display**: Resolved issue where score always showed 0
- **Field Name Consistency**: Unified data structure across all components
- **Improved Chatbox Formatting**: Added line breaks for better readability
- **Clean Console Output**: Streamlined to show only essential learning point updates

### System Reliability
- **Disabled Daily Refresh**: Simplified access control by removing admin refresh feature
- **Enhanced Session Management**: Improved anti-refresh protection and offline handling
- **Optimized Firebase Integration**: Better error handling and batch operations
- **Code Cleanup**: Removed debugging logs, kept only student learning formula breakdown

## Data Structure Notes

### CategoryPoints Structure
```javascript
categoryPoints = {
  materials: number,   // Base points (g2 tasks)
  research: number,    // Multiplier source (g1 tasks)
  engagement: number,  // Interest source (g3 tasks)
  bonus: number        // Checkpoint bonuses
}
```

### Event Tracking Format
```javascript
event = {
  sessionId: string,
  type: "user_click" | "task_attempt" | "ai_task_help" | "ai_help_response" | "chat_interaction",
  timestamp: serverTimestamp(),
  readableTime: "12:34", // MM:SS after semester start
  timeElapsed: 754000,    // milliseconds
  semesterTime: { elapsed: 754000, readable: "12:34", minutes: 12, seconds: 34 },
  // Event-specific data...
}
```

## Console Output

**Student Learning Updates** (only console output remaining):
```
📊 STUDENT LEARNING: 15.1 pts | Formula: 8 × 1.60 + 2.3 = 15.1
```

## Testing Considerations

- **Admin Mode**: `?admin=berkeley2024` URL parameter
- **Timer Adjustment**: 2-minute timer for admin vs 20-minute for students
- **Practice Skip**: Admin can bypass mandatory practice mode
- **Firebase Testing**: Use `node src/testFirebase.js` to verify connection
- **Checkpoint Timing**: Adjusts based on admin/student mode (1min vs 6min)
- **AI Testing**: All difficulty levels now work correctly for counting tasks
- **Data Verification**: Comprehensive event tracking for analysis

## Important Notes for Development

- **Field Names**: Use `materials`, `research`, `engagement` (not `slider`, `counting`, `typing`)
- **AI Highlighting**: Always over-highlight when making mistakes for educational clarity
- **Event Tracking**: All significant user actions are automatically tracked
- **Student Learning Formula**: Must use exact calculation with engagement interest from localStorage
- **Session Security**: Students cannot refresh or restart - one-time access only