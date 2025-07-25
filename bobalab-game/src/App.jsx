import React, { useState, useEffect } from 'react'
import CountingTask    from './components/CountingTask'
import SliderTask      from './components/SliderTask'
import TypingTask      from './components/TypingTask'
import NavTabs         from './components/NavTabs'
import PracticeMode    from './components/PracticeMode'
import ChatContainer   from './components/ChatContainer'
import ProgressSummary from './components/ProgressSummary'
import './App.css'
import rulesData       from '../public/rules.json' // or fetch dynamically

function App() {
  const [mode, setMode] = useState('challenge') // 'challenge' | 'practice' | 'chat'
  const [currentTab, setCurrentTab] = useState('g1t1')
  const [completed, setCompleted] = useState({})

  // mark task complete and auto-advance
  const handleComplete = tabId => {
    setCompleted(c => ({ ...c, [tabId]: true }))
    const tabs = [
      ...[1,2,3].map(n=>`g1t${n}`),
      ...[1,2,3].map(n=>`g2t${n}`),
      ...[1,2,3].map(n=>`g3t${n}`)
    ]
    const next = tabs.find(t => ![...Object.keys({ ...completed, [tabId]: true })].includes(t))
    if (next) setCurrentTab(next)
  }

  // render the active challenge task
  const renderTask = () => {
    const game = currentTab[1]
    const taskNum = Number(currentTab[3])
    if (game === '1') return (
      <CountingTask
        taskNum={taskNum}
        textSections={rulesData.textSections}
        onComplete={handleComplete}
      />
    )
    if (game === '2') return (
      <SliderTask
        taskNum={taskNum}
        onComplete={handleComplete}
      />
    )
    return (
      <TypingTask
        taskNum={taskNum}
        onComplete={handleComplete}
      />
    )
  }

  // optional: dynamic fetch of rules
  useEffect(() => {
    // fetch('/rules.json').then(r=>r.json()).then(/*...*/)
  }, [])

  return (
    <div className="app">
      <h1>Multi-Task Challenge</h1>

      <div className="mode-switch">
        <button disabled={mode==='challenge'} onClick={()=>setMode('challenge')}>
          Challenge
        </button>
        <button disabled={mode==='practice'} onClick={()=>setMode('practice')}>
          Practice
        </button>
        <button disabled={mode==='chat'} onClick={()=>setMode('chat')}>
          Chat
        </button>
      </div>

      {mode === 'chat' && <ChatContainer />}

      {mode === 'practice' && <PracticeMode rulesData={rulesData} />}

      {mode === 'challenge' && (
        <>
          <NavTabs
            current={currentTab}
            completed={completed}
            onSwitch={setCurrentTab}
          />
          <div className="task-container">
            {renderTask()}
          </div>
          <ProgressSummary completed={completed} />
        </>
      )}
    </div>
  )
}

export default App