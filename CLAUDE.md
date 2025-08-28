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
3. Off by 1 (1 pt)
4. Correct (2 pts)
5. Correct (2 pts)
6+ Random 75% correct

## Testing Considerations

- Admin mode available with `?admin=berkeley2024` URL parameter
- Admin gets 2-minute timer vs 20-minute for students
- Firebase config can be tested with `testFirebase.js`
- Practice mode can be skipped in admin mode
- Checkpoint timing adjusts based on admin/student mode