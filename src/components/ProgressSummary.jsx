import React from 'react'
import './ProgressSummary.css'

export default function ProgressSummary({ completed }) {
  const total = 9
  const done = Object.keys(completed).length

  return (
    <div className="progress-summary">
      <p>Completed {done} of {total} tasks</p>
      <ul>
        {Object.keys(completed).map(id => (
          <li key={id}>{id} ✓</li>
        ))}
      </ul>
    </div>
  )
}