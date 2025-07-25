import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function CountingTask({ taskNum, textSections, onComplete }) {
  const [target, setTarget] = useState('')
  const [instruction, setInstruction] = useState('')
  const [answer, setAnswer] = useState(null)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    // pick random text + configure question
    const text = textSections[Math.floor(Math.random() * textSections.length)]
    if (taskNum === 1) {
      const words = ['the','of','and','in']
      const w = words[Math.floor(Math.random()*words.length)]
      setTarget(w)
      setInstruction(`Count how many times "${w}" appears (case-insensitive):`)
      setAnswer((text.match(new RegExp(`\\b${w}\\b`,'gi'))||[]).length)
    }
    // handle taskNum 2 & 3 similarly...
  }, [taskNum, textSections])

  const handleSubmit = async () => {
    const correct = parseInt(input,10) === answer
    setFeedback(correct ? '✓ Correct!' : `✗ Nope, it’s ${answer}`)
    // log event
    await addDoc(collection(db,'events'),{
      taskId:`g1t${taskNum}`,
      type:'answer',
      value:input,
      correct,
      ts:serverTimestamp()
    })
    if (correct) onComplete(`g1t${taskNum}`)
  }

  return (
    <div className="task counting">
      <h3>Counting Task {taskNum}</h3>
      <p><strong>{instruction}</strong></p>
      <input
        type="number"
        value={input}
        onChange={e=>setInput(e.target.value)}
      />
      <button onClick={handleSubmit}>Submit</button>
      {feedback && <div className="feedback">{feedback}</div>}
    </div>
  )
}