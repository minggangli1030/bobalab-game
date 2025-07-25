import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const patterns = {
  easy: ['hello world','easy typing'],
  medium: ['HeLLo WoRLd','TeSt PaTTeRn'],
  hard: ['a@1 B#2 c$3','Qw3$ Er4# Ty5@']
}

export default function TypingTask({ taskNum, onComplete }) {
  const [pattern, setPattern] = useState('')
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const level = ['easy','medium','hard'][taskNum-1]
    const pset = patterns[level]
    setPattern(pset[Math.floor(Math.random()*pset.length)])
  }, [taskNum])

  const handleSubmit = async () => {
    const correct = input === pattern
    setFeedback(correct ? '✓ Perfect match!' : '✗ Try again')
    await addDoc(collection(db,'events'),{
      taskId:`g3t${taskNum}`,
      type:'answer',
      value:input,
      correct,
      ts:serverTimestamp()
    })
    if (correct) onComplete(`g3t${taskNum}`)
  }

  return (
    <div className="task typing">
      <h3>Typing Task {taskNum}</h3>
      <pre className="pattern">{pattern}</pre>
      <input
        type="text"
        value={input}
        onChange={e=>setInput(e.target.value)}
      />
      <button onClick={handleSubmit}>Submit</button>
      {feedback && <div className="feedback">{feedback}</div>}
    </div>
  )
}