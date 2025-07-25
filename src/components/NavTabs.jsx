import React from 'react'

export default function NavTabs({ current, completed, onSwitch }) {
  const tabs = [
    ...[1,2,3].map(n=>({ id:`g1t${n}`, label:`Count ${n}` })),
    ...[1,2,3].map(n=>({ id:`g2t${n}`, label:`Slide ${n}` })),
    ...[1,2,3].map(n=>({ id:`g3t${n}`, label:`Type ${n}` }))
  ]

  return (
    <div className="nav-tabs">
      {tabs.map(tab => {
        const locked = !completed[tab.id] && tabs.findIndex(t=>t.id===tab.id) > 0 && !completed[ tabs[ tabs.findIndex(t=>t.id===tab.id)-1 ].id ]
        return (
          <button
            key={tab.id}
            disabled={locked}
            className={ current===tab.id ? 'active' : '' }
            onClick={()=>onSwitch(tab.id)}
          >
            {tab.label}{ completed[tab.id] && ' ✓' }
          </button>
        )
      })}
    </div>
  )
}