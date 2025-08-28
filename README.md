# Can you beat Park? - Educational Teaching Simulation Game

An interactive React-based educational game where players act as instructors trying to maximize student learning through strategic teaching task management. Players complete three types of tasks across multiple semesters with time pressure and AI assistance.

## 🎯 Game Overview

**Objective**: Maximize student learning points by strategically completing teaching tasks across multiple semesters.

**Core Mechanics**:
- **Materials Tasks** (Slider precision) → Direct base points
- **Research Tasks** (Pattern counting) → 15% multiplier per point to all materials
- **Engagement Tasks** (Text replication) → 0.15% compound interest per point after each task

**Scoring Formula**: `Student Learning = Materials × (1 + 0.15×Research) + Engagement Interest`

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## 🏗️ Architecture

### Core Game Flow
1. **Student Login** → Access code validation
2. **Practice Mode** → Mandatory practice requiring 100% accuracy
3. **Main Game** → Timed teaching simulation (20min students, 2min admin)
4. **Completion** → Unique completion code generation

### Key Components
- **App.jsx** (2835+ lines) - Main game orchestrator
- **Task Components**: SliderTask, CountingTask, TypingTask
- **AI Assistant** (ChatContainer.jsx) - Deterministic help with 75% accuracy
- **Session Management** - Firebase integration with offline fallback

### AI Help System
**Deterministic Pattern (First 5 uses)**:
1. Correct (2 pts)
2. Correct (2 pts) 
3. Off by 1 (1 pt)
4. Correct (2 pts)
5. Correct (2 pts)
6+ 75% correct, 25% mistakes (over-highlighting for visibility)

## 📊 Data Collection

**Comprehensive Analytics**:
- Readable timestamps (MM:SS after semester start)
- Complete task attempt history with accuracy progression
- AI interaction tracking (help requests, player responses, time between help and submission)
- Click tracking with element details and coordinates
- Chat interaction analysis with query categorization
- Learning curve analysis and performance metrics

**Firebase Collections**:
- **Events**: All user interactions with detailed context
- **Sessions**: Persistent session data with real-time updates

## 🎮 Game Features

### Student Experience
- **Semester System**: Multiple timed semesters with checkpoints
- **Checkpoint Rewards**: 300 bonus points if ≥50 learning points at midterm
- **AI Teaching Assistant**: Context-aware help with educational mistake patterns
- **Anti-Cheating**: Session blocking, refresh prevention, tab-switch detection

### Admin Features
- **Admin Mode**: `?admin=berkeley2024` URL parameter
- **Shortened Timer**: 2 minutes vs 20 minutes for testing
- **Practice Skip**: Bypass mandatory practice mode
- **Debug Access**: Enhanced logging and session management

## 🛠️ Configuration

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Game Configuration Options
- **Semester Duration**: Default 20 minutes (1200000ms)
- **Checkpoint System**: Configurable midterm timing
- **AI Availability**: Per-session AI enable/disable
- **Access Codes**: One-time use validation system

## 📈 Recent Improvements

### Data Collection Enhancement
- Added comprehensive event tracking with readable timestamps
- Implemented AI interaction correlation (help → response → outcome)
- Enhanced click tracking with element details and coordinates
- Added Levenshtein distance for text comparison analysis

### AI System Improvements
- Fixed letter/character counting for medium/hard difficulty levels
- Implemented over-highlighting for mistake visibility
- Added character-level highlighting with animated feedback
- Enhanced accuracy patterns for educational value

### UI/UX Enhancements
- Fixed student learning goal display (was showing 0)
- Added line breaks in chatbox messages for better readability
- Streamlined console output to show only learning point updates
- Improved field name consistency across components

### System Reliability
- Disabled daily refresh access feature for simplified access control
- Enhanced error handling and offline fallback systems
- Improved session management with anti-refresh protection
- Optimized Firebase integration with batch operations

## 📚 Development Notes

- **React 18** with Vite build system
- **Firebase** for real-time data and authentication
- **ESLint** configuration for code quality
- **Modular Architecture** with separated concerns
- **Comprehensive Testing** capabilities with admin mode

## 🔍 Debugging

**Console Output**: Clean logging focused on student learning updates
```
📊 STUDENT LEARNING: 15.1 pts | Formula: 8 × 1.60 + 2.3 = 15.1
```

**Testing Access**: Use `?admin=berkeley2024` for development and testing

**Firebase Testing**: Run `node src/testFirebase.js` to verify connection