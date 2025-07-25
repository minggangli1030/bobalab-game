import React, { useState } from 'react'
import CountingTask from './CountingTask'
import SliderTask from './SliderTask'
import TypingTask from './TypingTask'

const allTabs = [
  ...[1,2,3].map(n=>({ id:`g1t${n}`, label:`Count ${n}` })),
  ...[1,2,3].map(n=>({ id:`g2t${n}`, label:`Slide ${n}` })),
  ...[1,2,3].map(n=>({ id:`g3t${n}`, label:`Type ${n}` }))
]

export default function PracticeMode({ rulesData }) {
  const [practiceTab, setPracticeTab] = useState(allTabs[0].id)

  const renderTask = () => {
    const game = practiceTab[1]
    const taskNum = Number(practiceTab[3])
    if (game === '1') return (
      <CountingTask
        taskNum={taskNum}
        textSections={rulesData.textSections}
        onComplete={()=>{}}
      />
    )
    if (game === '2') return (
      <SliderTask
        taskNum={taskNum}
        onComplete={()=>{}}
      />
    )
    return (
      <TypingTask
        taskNum={taskNum}
        onComplete={()=>{}}
      />
    )
  }

  return (
    <div className="practice-mode">
      <h2>Practice Mode</h2>
      <div className="practice-tabs">
        {allTabs.map(tab => (
          <button
            key={tab.id}
            className={practiceTab === tab.id ? 'active' : ''}
            onClick={()=>setPracticeTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="task-container">
        {renderTask()}
      </div>
    </div>
  )
}