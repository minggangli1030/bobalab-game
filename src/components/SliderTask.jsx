import React, { useEffect, useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function SliderTask({ taskNum, onComplete }) {
  const [target, setTarget] = useState(5)
  const [input, setInput] = useState(5.0)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    // easy=0→10 int, med=0.1 steps, hard hide value
    const t = parseFloat((Math.random()*10).toFixed( taskNum===2?1:0 ))
    setTarget(t)
    setInput( t ) // start at target or midpoint
  }, [taskNum])

  const handleSubmit = async () => {
    const correct = parseFloat(input) === target
    setFeedback(correct ? '✓ Spot on!' : `✗ You chose ${input}, target was ${target}`)
    await addDoc(collection(db,'events'),{
      taskId:`g2t${taskNum}`,
      type:'answer',
      value:input,
      correct,
      ts:serverTimestamp()
    })
    if (correct) onComplete(`g2t${taskNum}`)
  }

  return (
    <div className="task slider">
      <h3>Slider Task {taskNum}</h3>
      <input
        type="range"
        min="0"
        max="10"
        step={ taskNum===2 ? 0.1 : 1}
        value={input}
        onChange={e=>setInput(e.target.value)}
      />
      <div>Value: { taskNum===3 ? '??' : input }</div>
      <button onClick={handleSubmit}>Submit</button>
      {feedback && <div className="feedback">{feedback}</div>}
    </div>
  )
}