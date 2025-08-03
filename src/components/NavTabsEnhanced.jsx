import React from 'react';

export default function NavTabsEnhanced({ 
  current, 
  completed, 
  onSwitch, 
  remainingTasks, 
  limitMode 
}) {
  // Generate all 45 tabs (15 per game)
  const tabs = [];
  for (let game = 1; game <= 3; game++) {
    for (let level = 1; level <= 15; level++) {
      const gameLabel = ['Count', 'Slide', 'Type'][game - 1];
      tabs.push({
        id: `g${game}t${level}`,
        label: `${gameLabel} ${level}`,
        game: game
      });
    }
  }

  // Task availability logic remains the same but extends to 15 levels
  const isTaskAvailable = (tab) => {
    const game = tab.id[1];
    const taskNum = parseInt(tab.id.substring(3));
    
    // First task of each game is always available
    if (taskNum === 1) {
      return true;
    }
    
    // For other tasks, check if previous task in same game is completed
    const previousTask = `g${game}t${taskNum - 1}`;
    return completed[previousTask] === true;
  };

  // Group tabs by game for better visualization
  const gameGroups = {
    1: tabs.filter(t => t.game === 1),
    2: tabs.filter(t => t.game === 2),
    3: tabs.filter(t => t.game === 3)
  };

  const gameColors = {
    1: '#9C27B0', // Purple for counting
    2: '#4CAF50', // Green for slider
    3: '#f44336'  // Red for typing
  };

  return (
    <div>
      {/* Task/Time limit indicator */}
      {limitMode && (
        <div style={{
          textAlign: 'center',
          marginBottom: '15px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: limitMode === 'tasks' ? '#9C27B0' : '#2196F3'
        }}>
          {limitMode === 'tasks' 
            ? `Tasks Remaining: ${remainingTasks}/12`
            : 'Time mode - Complete as many as possible!'
          }
        </div>
      )}

      {/* Navigation tabs grouped by game */}
      <div style={{ marginBottom: '20px' }}>
        {Object.entries(gameGroups).map(([gameNum, gameTabs]) => (
          <div key={gameNum} style={{ marginBottom: '15px' }}>
            <h4 style={{ 
              color: gameColors[gameNum], 
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {['🔢 Counting', '🎯 Slider', '⌨️ Typing'][gameNum - 1]}
            </h4>
            
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              flexWrap: 'wrap',
              marginBottom: '5px'
            }}>
              {gameTabs.map(tab => {
                const isAvailable = isTaskAvailable(tab);
                const isCompleted = completed[tab.id];
                const isCurrent = current === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    disabled={!isAvailable || (limitMode === 'tasks' && remainingTasks <= 0 && !isCurrent)}
                    onClick={() => isAvailable && onSwitch(tab.id)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      border: `2px solid ${gameColors[gameNum]}`,
                      borderRadius: '4px',
                      background: isCurrent 
                        ? gameColors[gameNum] 
                        : isCompleted 
                          ? `${gameColors[gameNum]}20` 
                          : 'white',
                      color: isCurrent 
                        ? 'white' 
                        : isCompleted 
                          ? gameColors[gameNum] 
                          : '#666',
                      cursor: isAvailable && !(limitMode === 'tasks' && remainingTasks <= 0 && !isCurrent) 
                        ? 'pointer' 
                        : 'not-allowed',
                      opacity: isAvailable ? 1 : 0.4,
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      transition: 'all 0.2s'
                    }}
                  >
                    {parseInt(tab.id.substring(3))}{isCompleted && ' ✓'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Progress summary */}
      <div style={{
        background: '#f8f9fa',
        padding: '10px',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Completed: {Object.keys(completed).length} levels | 
        Current: {current ? current.replace('g', 'Game ').replace('t', ' Level ') : 'None'}
      </div>
    </div>
  );
}