// Global state
var gameState = {
    startTime: Date.now(),
    currentTab: null,
    completed: {},
    switches: 0,
    taskStartTimes: {},
    taskTotalTimes: {},
    chatHistory: [],
    numPrompts: 0,
    basePrompts: 3,
    bonusPrompts: 0,
    countdownInterval: null,
    nextDestination: null,
    pausedTime: 0,
    isPaused: false,
    isInBreak: false,
    isPractice: false,
    practiceCompleted: false
};

// Timer interval
var timerInterval;

// Pattern sets for Game 3 (Typing)
var patternSets = {
    easy: ['abc def ghi', 'xyz uvw rst', 'one two six', 'cat dog pig', 'red blue sky'],
    medium: ['AbC xYz 123', 'HeLLo WoRLd', 'TeSt PaTTeRn', 'Mix123 CaSe', 'UpDowN 456'],
    hard: ['a@1 B#2 c$3', 'X!y? Z&w% 9*8', 'Qw3$ Er4# Ty5@', 'Pa$$w0rd! Test', 'C0d3& $ymb0!s'],
    // Special easy patterns when counting game helps
    veryEasy: ['hello world', 'easy typing', 'simple text', 'no numbers', 'just words']
};

// Text sections for Game 1 (Counting - now first)
var textSections = [
    'The University of California, Berkeley (UC Berkeley, Berkeley, Cal, or California) is a public land-grant research university in Berkeley, California, United States. Founded in 1868 and named after the Anglo-Irish philosopher George Berkeley, it is the state\'s first land-grant university and is the founding campus of the University of California system.',
    'Ten faculty members and forty male students made up the fledgling university when it opened in Oakland in 1869. Frederick Billings, a trustee of the College of California, suggested that a new campus site north of Oakland be named in honor of Anglo-Irish philosopher George Berkeley.',
    'Berkeley has an enrollment of more than 45,000 students. The university is organized around fifteen schools of study on the same campus, including the College of Chemistry, the College of Engineering, College of Letters and Science, and the Haas School of Business.'
];

// Enhanced task dependency configuration with clearer hints
var taskDependencies = {
    dependencies: [
        // Slider helps Counting by highlighting target words/letters
        {
            from: 'g2t1', // Slider task 1
            to: 'g1t1',   // Counting task 1
            type: 'highlight_words',
            probability: 0.3, // 30% for task 1
            hint: 'The slider precision helps you spot words! Look for highlighted text.'
        },
        {
            from: 'g2t2', // Slider task 2
            to: 'g1t2',   // Counting task 2
            type: 'highlight_letters',
            probability: 0.6, // 60% for task 2
            hint: 'Your slider accuracy pays off! Target letters are now highlighted.'
        },
        {
            from: 'g2t3', // Slider task 3
            to: 'g1t3',   // Counting task 3
            type: 'highlight_both',
            probability: 0.9, // 90% for task 3
            hint: 'Master slider skills activated! Both target letters are highlighted.'
        },
        // Typing helps Slider by adding tick marks
        {
            from: 'g3t1', // Typing task 1
            to: 'g2t1',   // Slider task 1
            type: 'tick_marks',
            probability: 0.3,
            hint: 'Your typing precision adds helpful tick marks to the slider!'
        },
        {
            from: 'g3t2', // Typing task 2
            to: 'g2t2',   // Slider task 2
            type: 'tick_marks_detailed',
            probability: 0.6,
            hint: 'Great typing! Detailed tick marks now show on the slider.'
        },
        {
            from: 'g3t3', // Typing task 3
            to: 'g2t3',   // Slider task 3
            type: 'value_preview',
            probability: 0.9,
            hint: 'Perfect typing unlocked a value preview for the hard slider!'
        },
        // Counting helps Typing by making patterns easier
        {
            from: 'g1t1', // Counting task 1
            to: 'g3t1',   // Typing task 1
            type: 'easier_pattern',
            probability: 0.3,
            hint: 'Your counting focus earned you a simpler typing pattern!'
        },
        {
            from: 'g1t2', // Counting task 2
            to: 'g3t2',   // Typing task 2
            type: 'no_numbers',
            probability: 0.6,
            hint: 'Nice counting! Your typing pattern has no numbers now.'
        },
        {
            from: 'g1t3', // Counting task 3
            to: 'g3t3',   // Typing task 3
            type: 'no_symbols',
            probability: 0.9,
            hint: 'Expert counting! No special symbols in your typing pattern.'
        }
    ],
    
    activeDependencies: {},
    
    checkDependencies: function(completedTask) {
        var activated = [];
        
        this.dependencies.forEach(function(dep) {
            if (dep.from === completedTask) {
                // Use 100% probability in practice mode
                var probability = gameState.isPractice ? 1.0 : dep.probability;
                
                if (Math.random() < probability) {
                    taskDependencies.activeDependencies[dep.to] = {
                        type: dep.type,
                        hint: dep.hint,
                        fromTask: dep.from
                    };
                    activated.push(dep.to);
                    Qualtrics.SurveyEngine.setEmbeddedData('dependency_' + dep.from + '_to_' + dep.to, 'activated');
                }
            }
        });
        
        return activated;
    },
    
    getActiveDependency: function(taskId) {
        return this.activeDependencies[taskId] || null;
    },
    
    clearDependency: function(taskId) {
        delete this.activeDependencies[taskId];
    }
};

// Preset responses database (updated for new game order)
var presetResponses = {
    counting: { // Now first game
        general: [
            {
                id: 'count_how',
                triggers: ['count', 'how', 'counting', 'find'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Count the occurrences of the specified word or letter(s) in the text. Read carefully through the entire passage!'
            },
            {
                id: 'count_strategy',
                triggers: ['strategy', 'method', 'approach', 'tip'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Try reading through once to get familiar, then count systematically. Complete other games first - they might help highlight what you need to count!'
            },
            {
                id: 'count_case',
                triggers: ['case', 'capital', 'lowercase', 'sensitive'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Letter counting is case-insensitive - both "A" and "a" count as the same letter. Word counting looks for exact matches only.'
            }
        ],
        taskType: {
            word: [
                {
                    id: 'count_word',
                    triggers: ['word', 'the', 'of', 'and'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'When counting words, look for complete word matches only. "The" in "Therefore" doesn\'t count. Hint: Complete slider tasks first for possible highlighting!'
                }
            ],
            letter: [
                {
                    id: 'count_letter',
                    triggers: ['letter', 'single', 'character'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Count every occurrence of the letter, regardless of case. Don\'t forget letters at word boundaries! Slider games might help highlight them.'
                }
            ],
            twoLetters: [
                {
                    id: 'count_two',
                    triggers: ['two', 'both', 'total', 'add', 'sum'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Count both letters separately, then add them together. Complete harder tasks in other games for better highlighting chances!'
                }
            ]
        }
    },
    
    slider: { // Now second game
        general: [
            {
                id: 'slider_how',
                triggers: ['how', 'slider', 'move', 'control'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Click and drag the slider to match the target value. The value shows below (except hard mode). Typing games can add helpful tick marks!'
            },
            {
                id: 'slider_strategy',
                triggers: ['strategy', 'tip', 'advice', 'help', 'trick'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Make large movements first, then fine-tune. Complete typing tasks for tick marks that make precision easier!'
            },
            {
                id: 'slider_accuracy',
                triggers: ['accuracy', 'precise', 'exact', 'close'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Your accuracy is based on how close you get. You don\'t need 100% to complete the task. Completing this helps with counting games!'
            }
        ],
        difficulty: {
            easy: [
                {
                    id: 'slider_easy',
                    triggers: ['easy', 'whole', 'number', 'integer'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Easy mode uses whole numbers (0-10). If you\'ve done typing tasks, you might see helpful tick marks!'
                }
            ],
            medium: [
                {
                    id: 'slider_medium',
                    triggers: ['medium', 'decimal', 'point', 'tenth'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Medium uses one decimal place. Each small movement = 0.1. Typing task 2 might give you detailed tick marks!'
                }
            ],
            hard: [
                {
                    id: 'slider_hard',
                    triggers: ['hard', 'hidden', 'blind', 'no value', 'question mark'],
                    level: 'Workflow-level',
                    type: 'Iterate with me',
                    response: 'Hard mode hides the value. Complete typing task 3 for a chance at a value preview! Otherwise, count movements from 0.'
                }
            ]
        }
    },
    
    typing: { // Remains third
        general: [
            {
                id: 'type_how',
                triggers: ['type', 'typing', 'pattern', 'enter'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Type exactly as shown - every character, space, and symbol. Complete counting tasks first - they might give you easier patterns!'
            },
            {
                id: 'type_accuracy',
                triggers: ['accuracy', 'correct', 'exact', 'match'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'Must match exactly. Counting games can remove numbers or symbols from your pattern if you complete them first!'
            },
            {
                id: 'type_easier',
                triggers: ['easier', 'simple', 'help', 'hard'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Finding it tough? Complete counting tasks first! They can remove numbers and special characters from typing patterns.'
            }
        ],
        difficulty: {
            easy: [
                {
                    id: 'type_easy',
                    triggers: ['easy', 'simple', 'lowercase'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Easy patterns are simple words. If you did counting task 1, your pattern might be even simpler!'
                }
            ],
            medium: [
                {
                    id: 'type_medium',
                    triggers: ['medium', 'mixed', 'case', 'capital'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Medium mixes cases and numbers. Complete counting task 2 to potentially remove the numbers!'
                }
            ],
            hard: [
                {
                    id: 'type_hard',
                    triggers: ['hard', 'symbol', 'special', 'character'],
                    level: 'Task-level',
                    type: 'Find for me',
                    response: 'Hard includes symbols like @#$%. Complete counting task 3 for a 90% chance to remove them!'
                }
            ]
        }
    },
    
    general: {
        navigation: [
            {
                id: 'nav_switch',
                triggers: ['switch', 'change', 'different', 'task', 'move'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Switch between unlocked tasks anytime. Complete harder tasks (2 & 3) for better chances at helpful hints in other games!'
            },
            {
                id: 'nav_order',
                triggers: ['order', 'sequence', 'which', 'first', 'next'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Any order works! Pro tip: Completing task 3 in any game gives 90% chance of helping other games. Each task also gives +1 prompt!'
            }
        ],
        help: [
            {
                id: 'help_practice',
                triggers: ['practice', 'tutorial', 'learn', 'how'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'You can practice in the tutorial. In the real game, completing tasks earns bonus prompts and activates helpful hints between games!'
            },
            {
                id: 'help_prompts',
                triggers: ['prompt', 'limit', 'question', 'more'],
                level: 'Task-level',
                type: 'Find for me',
                response: 'You start with 3 prompts, but earn +1 for each task completed! Save prompts for when you really need help.'
            }
        ],
        strategy: [
            {
                id: 'strategy_general',
                triggers: ['strategy', 'overall', 'plan', 'approach'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Best strategy: Complete task 3s first (90% hint chance), then 2s (60%), then 1s (30%). Each completed task = +1 prompt!'
            },
            {
                id: 'strategy_dependency',
                triggers: ['connection', 'relate', 'help', 'other', 'hint'],
                level: 'Workflow-level',
                type: 'Iterate with me',
                response: 'Games help each other! Slider→highlights counting, Typing→adds slider ticks, Counting→simplifies typing. Higher tasks = better help!'
            }
        ]
    },
    
    fallback: [
        {
            id: 'fallback_unclear',
            response: 'I\'m not sure I understand. Ask about counting, slider, or typing tasks. Remember: each task gives +1 prompt!',
            level: 'Task-level',
            type: 'Iterate with me'
        },
        {
            id: 'fallback_offtopic',
            response: 'Let\'s focus on the games. Need help with counting, slider, or typing? Complete tasks to earn more prompts!',
            level: 'Task-level',
            type: 'Iterate with me'
        }
    ]
};

// Response selection system (unchanged)
var responseSelector = {
    findBestResponse: function(userInput, currentTask) {
        var input = userInput.toLowerCase();
        var matches = [];
        
        var currentGame = currentTask ? parseInt(currentTask[1]) : null;
        var gameType = currentGame === 1 ? 'counting' : currentGame === 2 ? 'slider' : currentGame === 3 ? 'typing' : null;
        
        if (gameType && presetResponses[gameType]) {
            this.searchResponses(presetResponses[gameType], input, matches, 2);
        }
        
        this.searchResponses(presetResponses.general, input, matches, 1);
        
        Object.keys(presetResponses).forEach(function(key) {
            if (key !== gameType && key !== 'general' && key !== 'fallback') {
                responseSelector.searchResponses(presetResponses[key], input, matches, 0.5);
            }
        });
        
        matches.sort(function(a, b) { return b.score - a.score; });
        
        if (matches.length > 0 && matches[0].score > 0.3) {
            return matches[0].response;
        } else {
            var fallbacks = presetResponses.fallback;
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
    },
    
    searchResponses: function(category, input, matches, weight) {
        var searchInArray = function(arr) {
            arr.forEach(function(resp) {
                var score = 0;
                resp.triggers.forEach(function(trigger) {
                    if (input.includes(trigger)) {
                        score += (trigger.length / input.length) * weight;
                    }
                });
                
                if (score > 0) {
                    matches.push({
                        response: resp,
                        score: score
                    });
                }
            });
        };
        
        Object.keys(category).forEach(function(key) {
            if (Array.isArray(category[key])) {
                searchInArray(category[key]);
            } else if (typeof category[key] === 'object') {
                Object.keys(category[key]).forEach(function(subkey) {
                    if (Array.isArray(category[key][subkey])) {
                        searchInArray(category[key][subkey]);
                    }
                });
            }
        });
    }
};

Qualtrics.SurveyEngine.addOnload(function() {
    console.log('Integrated game system loaded');
    
    // Add CSS animations
    var style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }
        
        @keyframes highlight {
            0% { background-color: rgba(255, 215, 0, 0.3); }
            50% { background-color: rgba(255, 215, 0, 0.6); }
            100% { background-color: rgba(255, 215, 0, 0.3); }
        }
        
        .highlighted-text {
            animation: highlight 1.5s ease-in-out infinite;
            padding: 2px 4px;
            border-radius: 3px;
        }
    `;
    document.head.appendChild(style);
});

Qualtrics.SurveyEngine.addOnReady(function() {
    var that = this;
    that.hideNextButton();
    
    window.qualtricsContext = that;
    
    document.getElementById('startGameBtn').addEventListener('click', function() {
        // Show practice mode choice
        showPracticeChoice();
    });
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    storeGameData();
});

// Show practice mode choice
function showPracticeChoice() {
    var landingPage = document.getElementById('landingPage');
    landingPage.innerHTML = `
        <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 30px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Would you like to practice first?</h2>
            <p style="color: #666; margin-bottom: 30px;">Practice mode lets you try each game type without time pressure or limits.</p>
            
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="practiceYesBtn" style="padding: 15px 30px; background: #4CAF50; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Yes, Practice First
                </button>
                <button id="practiceNoBtn" style="padding: 15px 30px; background: #2196F3; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    No, Start Main Game
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('practiceYesBtn').addEventListener('click', function() {
        startPracticeMode();
    });
    
    document.getElementById('practiceNoBtn').addEventListener('click', function() {
        startMainGame();
    });
}

// Start practice mode
function startPracticeMode() {
    gameState.isPractice = true;
    
    var landingPage = document.getElementById('landingPage');
    landingPage.innerHTML = `
        <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 30px;">
            <h2 style="text-align: center; color: #333; margin-bottom: 30px;">Practice Mode</h2>
            
            <div style="display: grid; gap: 20px; max-width: 600px; margin: 0 auto;">
                <div style="border: 2px solid #9C27B0; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #9C27B0; margin-bottom: 10px;">Counting Game</h3>
                    <p style="color: #666; margin-bottom: 15px;">Count words or letters in a text passage.</p>
                    <button class="practice-btn" data-game="counting" style="background: #9C27B0; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Try Counting
                    </button>
                </div>
                
                <div style="border: 2px solid #4CAF50; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #4CAF50; margin-bottom: 10px;">Slider Game</h3>
                    <p style="color: #666; margin-bottom: 15px;">Move a slider to match target values.</p>
                    <button class="practice-btn" data-game="slider" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Try Slider
                    </button>
                </div>
                
                <div style="border: 2px solid #FFC107; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #FF9800; margin-bottom: 10px;">Typing Game</h3>
                    <p style="color: #666; margin-bottom: 15px;">Type patterns exactly as shown.</p>
                    <button class="practice-btn" data-game="typing" style="background: #FFC107; color: #333; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Try Typing
                    </button>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <button id="endPracticeBtn" style="padding: 12px 30px; background: #2196F3; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Done Practicing - Start Main Game
                </button>
            </div>
        </div>
    `;
    
    // Add practice button listeners
    document.querySelectorAll('.practice-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            loadPracticeGame(this.getAttribute('data-game'));
        });
    });
    
    document.getElementById('endPracticeBtn').addEventListener('click', function() {
        gameState.practiceCompleted = true;
        startMainGame();
    });
}

// Load practice game
function loadPracticeGame(gameType) {
    var content = document.getElementById('landingPage');
    
    // Set practice mode state
    gameState.isPractice = true;
    gameState.currentTab = 'practice_' + gameType;
    
    if (gameType === 'counting') {
        // Practice counting with highlighting from slider
        var practiceText = 'The quick brown fox jumps over the lazy dog. The dog was sleeping under the tree. The fox was very clever and the tree provided shade.';
        var shouldHighlight = true; // Always highlight in practice
        
        content.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto;">
                <h3 style="text-align: center; color: #9C27B0;">Practice: Counting Game</h3>
                <div style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #333; padding: 10px 16px; margin: 15px 0; border-radius: 8px; text-align: center; font-size: 14px; font-weight: 600;">
                    💡 Bonus Active: Words are highlighted (from completing Slider)!
                </div>
                <p style="text-align: center; color: #666; margin: 20px 0; font-size: 16px;">Count how many times the word "the" appears:<br><span style="font-size: 13px; color: #888;">(Case-insensitive)</span></p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; line-height: 1.8;">`;
        
        // Highlight "the" words (case-insensitive)
        var words = practiceText.split(' ');
        var highlightedText = '';
        var actualCount = 0;
        for (var i = 0; i < words.length; i++) {
            var cleanWord = words[i].toLowerCase().replace(/[^a-z]/g, '');
            if (cleanWord === 'the') {
                highlightedText += '<span style="background-color: rgba(255, 215, 0, 0.4); padding: 2px 4px; border-radius: 3px;">' + words[i] + '</span> ';
                actualCount++;
            } else {
                highlightedText += words[i] + ' ';
            }
        }
        
        content.innerHTML += highlightedText + `
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <input type="number" id="practiceAnswer" style="padding: 10px; font-size: 18px; width: 100px;">
                    <button onclick="checkPracticeAnswer()" style="margin-left: 10px; padding: 10px 20px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Check Answer
                    </button>
                </div>
                
                <div id="practiceFeedback" style="text-align: center; margin: 20px 0; font-weight: bold;"></div>
                
                <div style="text-align: center;">
                    <button onclick="startPracticeMode()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Back to Practice Menu
                    </button>
                </div>
            </div>
        `;
    } else if (gameType === 'slider') {
        // Practice slider with tick marks from typing
        content.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto;">
                <h3 style="text-align: center; color: #4CAF50;">Practice: Slider Game</h3>
                <div style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #333; padding: 10px 16px; margin: 15px 0; border-radius: 8px; text-align: center; font-size: 14px; font-weight: 600;">
                    💡 Bonus Active: Tick marks added (from completing Typing)!
                </div>
                <p style="text-align: center; color: #666; margin: 20px 0;">Move the slider to: <strong style="font-size: 24px; color: #4CAF50;">7.5</strong></p>
                
                <div style="margin: 30px 0; position: relative;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; font-weight: bold; color: #666;">
                        <span>0</span><span>10</span>
                    </div>
                    <div style="position: relative;">
                        <input type="range" id="practiceSlider" min="0" max="10" step="0.1" value="5" style="width: 100%; height: 8px; -webkit-appearance: none; appearance: none; background: #ddd; outline: none; cursor: pointer;">
                        
                        <!-- Tick marks container - positioned absolutely over the slider -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 8px; pointer-events: none;">
                            <svg style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">`;
        
        // Add tick marks using SVG
        for (var i = 0; i <= 20; i++) {
            var position = (i / 20) * 100;
            var height = i % 2 === 0 ? 20 : 15;
            var y = i % 2 === 0 ? -6 : -3;
            content.innerHTML += `<line x1="${position}%" y1="${y}" x2="${position}%" y2="${height + y}" stroke="#666" stroke-width="1"/>`;
        }
        
        content.innerHTML += `
                            </svg>
                        </div>
                    </div>
                    
                    <!-- Tick labels below slider -->
                    <div style="position: relative; height: 20px; margin-top: 8px;">`;
        
        // Add tick labels
        for (var j = 0; j <= 10; j += 2) {
            var labelPosition = (j / 10) * 100;
            content.innerHTML += `<span style="position: absolute; left: ${labelPosition}%; transform: translateX(-50%); font-size: 11px; color: #666;">${j}</span>`;
        }
        
        content.innerHTML += `
                    </div>
                    
                    <div style="text-align: center; font-size: 36px; color: #4CAF50; margin: 30px 0 20px 0;">
                        <span id="sliderValue">5.0</span>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <button onclick="checkPracticeSlider()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Submit
                    </button>
                </div>
                
                <div id="practiceFeedback" style="text-align: center; margin: 20px 0; font-weight: bold;"></div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="startPracticeMode()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Back to Practice Menu
                    </button>
                </div>
            </div>
        `;
        
        // Add slider listener with proper styling
        setTimeout(function() {
            var slider = document.getElementById('practiceSlider');
            if (slider) {
                // Style the slider thumb
                var style = document.createElement('style');
                style.textContent = `
                    #practiceSlider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 25px;
                        height: 25px;
                        background: #4CAF50;
                        cursor: pointer;
                        border-radius: 50%;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        position: relative;
                        z-index: 2;
                    }
                    #practiceSlider::-moz-range-thumb {
                        width: 25px;
                        height: 25px;
                        background: #4CAF50;
                        cursor: pointer;
                        border-radius: 50%;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        border: none;
                        position: relative;
                        z-index: 2;
                    }
                `;
                document.head.appendChild(style);
                
                slider.oninput = function() {
                    document.getElementById('sliderValue').textContent = parseFloat(this.value).toFixed(1);
                };
            }
        }, 100);
    } else if (gameType === 'typing') {
        // Practice typing with easier pattern from counting
        content.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto;">
                <h3 style="text-align: center; color: #FFC107;">Practice: Typing Game</h3>
                <div style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #333; padding: 10px 16px; margin: 15px 0; border-radius: 8px; text-align: center; font-size: 14px; font-weight: 600;">
                    💡 Bonus Active: Simpler pattern (from completing Counting)!
                </div>
                <p style="text-align: center; color: #666; margin: 20px 0;">Type this pattern exactly:</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <span style="font-size: 24px; font-family: monospace; letter-spacing: 2px;">easy typing</span>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <input type="text" id="practiceTyping" style="padding: 10px; font-size: 18px; width: 300px; font-family: monospace;">
                </div>
                
                <div style="text-align: center;">
                    <button onclick="checkPracticeTyping()" style="padding: 10px 20px; background: #FFC107; color: #333; border: none; border-radius: 4px; cursor: pointer;">
                        Submit
                    </button>
                </div>
                
                <div id="practiceFeedback" style="text-align: center; margin: 20px 0; font-weight: bold;"></div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="startPracticeMode()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Back to Practice Menu
                    </button>
                </div>
            </div>
        `;
    }
}

// Practice check functions
function checkPracticeAnswer() {
    var answer = document.getElementById('practiceAnswer').value;
    var feedback = document.getElementById('practiceFeedback');
    
    if (answer === '6') {
        feedback.style.color = '#4CAF50';
        feedback.textContent = '✓ Correct! The highlighting made it easy to spot all 6 occurrences of "the" (case-insensitive).';
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Not quite. Look for the highlighted words - there are 6 of them! Remember, it\'s case-insensitive.';
    }
}

function checkPracticeSlider() {
    var value = document.getElementById('practiceSlider').value;
    var feedback = document.getElementById('practiceFeedback');
    
    if (value === '7.5') {
        feedback.style.color = '#4CAF50';
        feedback.textContent = '✓ Perfect! The tick marks helped you get exactly 7.5.';
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Close! You selected ' + value + ' but the target was 7.5. Use the tick marks to help!';
    }
}

function checkPracticeTyping() {
    var typed = document.getElementById('practiceTyping').value;
    var feedback = document.getElementById('practiceFeedback');
    
    if (typed === 'easy typing') {
        feedback.style.color = '#4CAF50';
        feedback.textContent = '✓ Excellent! This simple pattern was much easier than symbols and numbers!';
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Not quite right. Type "easy typing" exactly (with the space).';
    }
}

// Start main game
function startMainGame() {
    gameState.isPractice = false;
    gameState.startTime = Date.now();
    
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('gameContent').style.display = 'block';
    window.scrollTo(0, 0);
    
    timerInterval = setInterval(updateGlobalTimer, 1000);
    
    // Update navigation for new game order
    updateNavigationForNewOrder();
    
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            if (!this.disabled) {
                if (gameState.isInBreak || gameState.countdownInterval) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                switchToTab(this.getAttribute('data-tab'));
            }
        });
    });
    
    setupChat();
    switchToTab('g1t1'); // Start with counting game
}

// Update navigation buttons for new game order
function updateNavigationForNewOrder() {
    var navContainer = document.getElementById('tabNav');
    navContainer.innerHTML = `
        <!-- Counting (now first) -->
        <button class="tab-btn" data-tab="g1t1" style="background: #9C27B0; color: white; padding: 10px 6px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;">Count 1</button>
        <button class="tab-btn" data-tab="g1t2" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>C2 🔒</button>
        <button class="tab-btn" data-tab="g1t3" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>C3 🔒</button>
        
        <!-- Slider (now second) -->
        <button class="tab-btn" data-tab="g2t1" style="background: #4CAF50; color: white; padding: 10px 6px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;">Slide 1</button>
        <button class="tab-btn" data-tab="g2t2" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>S2 🔒</button>
        <button class="tab-btn" data-tab="g2t3" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>S3 🔒</button>
        
        <!-- Typing (remains third) -->
        <button class="tab-btn" data-tab="g3t1" style="background: #FFC107; color: #333; padding: 10px 6px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;">Type 1</button>
        <button class="tab-btn" data-tab="g3t2" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>T2 🔒</button>
        <button class="tab-btn" data-tab="g3t3" style="background: #e0e0e0; color: #999; padding: 10px 6px; border: none; border-radius: 4px; cursor: not-allowed; font-weight: bold; font-size: 13px; white-space: nowrap; flex: 1; min-width: 60px;" disabled>T3 🔒</button>
    `;
}

function updateGlobalTimer() {
    if (Object.keys(gameState.completed).length >= 9 || gameState.isPaused) {
        return;
    }
    
    var elapsed = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;
    document.getElementById('globalTimer').textContent = 
        (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function switchToTab(tabId, isAutoAdvance) {
    if (gameState.isInBreak) {
        return;
    }
    
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    if (gameState.currentTab && tabId !== gameState.currentTab && !isAutoAdvance) {
        gameState.switches++;
    }
    
    if (gameState.currentTab && gameState.taskStartTimes[gameState.currentTab]) {
        var timeSpent = Date.now() - gameState.taskStartTimes[gameState.currentTab];
        gameState.taskTotalTimes[gameState.currentTab] = 
            (gameState.taskTotalTimes[gameState.currentTab] || 0) + timeSpent;
    }
    
    gameState.currentTab = tabId;
    gameState.taskStartTimes[tabId] = Date.now();
    
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
    });
    var activeBtn = document.querySelector('[data-tab="' + tabId + '"]');
    if (activeBtn) {
        activeBtn.style.transform = 'translateY(-2px)';
        activeBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    }
    
    loadTab(tabId);
}

function loadTab(tabId) {
    var content = document.getElementById('contentArea');
    
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    content.innerHTML = '<div style="text-align: center; padding: 50px;">Loading...</div>';
    
    var game = parseInt(tabId[1]);
    var task = parseInt(tabId[3]);
    
    var dependency = taskDependencies.getActiveDependency(tabId);
    
    setTimeout(function() {
        switch(game) {
            case 1:
                loadCountingGame(task);
                break;
            case 2:
                loadSliderGame(task);
                break;
            case 3:
                loadTypingGame(task);
                break;
        }
        
        if (dependency) {
            setTimeout(function() {
                var hintBanner = document.createElement('div');
                hintBanner.id = 'dependencyHint';
                hintBanner.style.cssText = 'background: linear-gradient(135deg, #FFD700, #FFA500); color: #333; padding: 10px 16px; margin: 0 0 12px 0; border-radius: 8px; text-align: center; font-size: 14px; font-weight: 600; animation: pulse 2s infinite;';
                hintBanner.innerHTML = '💡 Something feels different about this task...';
                
                var taskContent = content.querySelector('[style*="border"]');
                if (taskContent) {
                    content.insertBefore(hintBanner, taskContent);
                }
                
                // Stop animation after 5 seconds
                setTimeout(function() {
                    if (hintBanner) {
                        hintBanner.style.animation = 'none';
                    }
                }, 5000);
                
                applyDependencyEnhancement(tabId, dependency.type);
            }, 500);
        }
    }, 100);
}

// Enhanced dependency effects
function applyDependencyEnhancement(tabId, type) {
    var game = parseInt(tabId[1]);
    
    switch(type) {
        case 'highlight_words':
        case 'highlight_letters':
        case 'highlight_both':
            if (game === 1) { // Counting game
                setTimeout(function() {
                    // This will be applied when drawing the canvas
                    var instruction = document.getElementById('instruction');
                    if (instruction) {
                        instruction.innerHTML += '<br><span style="color: #FFD700; font-size: 14px;">✨ Bonus: Target text is highlighted!</span>';
                    }
                }, 1000);
            }
            break;
            
        case 'tick_marks':
        case 'tick_marks_detailed':
            if (game === 2) { // Slider game
                setTimeout(function() {
                    var slider = document.getElementById('gameSlider');
                    if (slider) {
                        var tickContainer = document.createElement('div');
                        tickContainer.style.cssText = 'position: relative; width: 100%; height: 20px; margin-top: -10px;';
                        
                        var tickCount = type === 'tick_marks_detailed' ? 21 : 11;
                        for (var i = 0; i < tickCount; i++) {
                            var position = (i / (tickCount - 1)) * 100;
                            var tick = document.createElement('div');
                            tick.style.cssText = 'position: absolute; left: ' + position + '%; width: 1px; height: ' + (i % 5 === 0 ? '15px' : '10px') + '; background: #666; transform: translateX(-50%);';
                            
                            if (i % 5 === 0) {
                                var label = document.createElement('div');
                                label.style.cssText = 'position: absolute; left: ' + position + '%; top: 18px; transform: translateX(-50%); font-size: 10px; color: #666;';
                                label.textContent = (i / (tickCount - 1) * 10).toFixed(type === 'tick_marks_detailed' ? 1 : 0);
                                tickContainer.appendChild(label);
                            }
                            
                            tickContainer.appendChild(tick);
                        }
                        
                        slider.parentNode.insertBefore(tickContainer, slider.nextSibling);
                    }
                }, 1000);
            }
            break;
            
        case 'value_preview':
            if (game === 2) { // Slider game hard mode
                setTimeout(function() {
                    var valueDisplay = document.getElementById('sliderValue');
                    if (valueDisplay && valueDisplay.textContent === '?') {
                        // Show value briefly every 2 seconds
                        setInterval(function() {
                            var slider = document.getElementById('gameSlider');
                            if (slider && valueDisplay.textContent === '?') {
                                valueDisplay.textContent = slider.value;
                                valueDisplay.style.color = '#FFD700';
                                setTimeout(function() {
                                    valueDisplay.textContent = '?';
                                    valueDisplay.style.color = '#4CAF50';
                                }, 500);
                            }
                        }, 2000);
                    }
                }, 1000);
            }
            break;
            
        case 'easier_pattern':
        case 'no_numbers':
        case 'no_symbols':
            // Pattern selection is handled in loadTypingGame
            break;
    }
    
    setTimeout(function() {
        taskDependencies.clearDependency(tabId);
    }, 10000); // Keep enhancement active longer
}

function markTaskComplete(tabId) {
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
    
    gameState.completed[tabId] = true;
    
    // Award bonus prompt
    gameState.bonusPrompts += 1;
    Qualtrics.SurveyEngine.setEmbeddedData('bonusPrompts', gameState.bonusPrompts);
    
    // Show prompt bonus notification
    var promptNotification = document.createElement('div');
    promptNotification.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: #2196F3; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; animation: slideIn 0.5s ease-out;';
    promptNotification.innerHTML = '<strong>+1 Chat Prompt Earned!</strong><br>Total available: ' + (gameState.basePrompts + gameState.bonusPrompts - gameState.numPrompts);
    document.body.appendChild(promptNotification);
    
    setTimeout(function() {
        promptNotification.style.animation = 'slideOut 0.5s ease-in';
        setTimeout(function() {
            document.body.removeChild(promptNotification);
        }, 500);
    }, 2000);
    
    // Check and activate dependencies
    var activatedDeps = taskDependencies.checkDependencies(tabId);
    
    if (activatedDeps.length > 0) {
        var notification = document.createElement('div');
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; animation: slideIn 0.5s ease-out;';
        notification.innerHTML = '<strong>Interesting...</strong><br>Something changed in another game.';
        document.body.appendChild(notification);
        
        setTimeout(function() {
            notification.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(function() {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    var btn = document.querySelector('[data-tab="' + tabId + '"]');
    var btnText = btn.textContent;
    if (!btnText.includes('✓')) {
        btn.textContent = btnText + ' ✓';
    }
    btn.style.opacity = '0.8';
    
    var game = parseInt(tabId[1]);
    var task = parseInt(tabId[3]);
    if (task < 3) {
        var nextTabId = 'g' + game + 't' + (task + 1);
        var btn = document.querySelector('[data-tab="' + nextTabId + '"]');
        if (btn) {
            btn.disabled = false;
            btn.style.background = game === 1 ? '#9C27B0' : game === 2 ? '#4CAF50' : '#FFC107';
            btn.style.color = game === 3 ? '#333' : 'white';
            btn.style.cursor = 'pointer';
            btn.textContent = btn.textContent.replace(' 🔒', '');
        }
    }
    
    var progress = (Object.keys(gameState.completed).length / 9) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    
    storeGameData();
    
    if (Object.keys(gameState.completed).length === 9) {
        showCompletion();
    } else {
        startMandatoryBreak(tabId);
    }
}

function startMandatoryBreak(completedTabId) {
    gameState.isPaused = true;
    gameState.isInBreak = true;
    var pauseStartTime = Date.now();
    
    var game = parseInt(completedTabId[1]);
    var task = parseInt(completedTabId[3]);
    var defaultNext = null;
    
    if (task < 3) {
        defaultNext = 'g' + game + 't' + (task + 1);
    } else {
        for (var g = 1; g <= 3; g++) {
            if (g === game) continue;
            for (var t = 1; t <= 3; t++) {
                var checkTabId = 'g' + g + 't' + t;
                if (!gameState.completed[checkTabId]) {
                    defaultNext = checkTabId;
                    break;
                }
            }
            if (defaultNext) break;
        }
        
        if (!defaultNext) {
            for (var g2 = 1; g2 <= 3; g2++) {
                for (var t2 = 1; t2 <= 3; t2++) {
                    var checkTabId2 = 'g' + g2 + 't' + t2;
                    if (!gameState.completed[checkTabId2]) {
                        defaultNext = checkTabId2;
                        break;
                    }
                }
                if (defaultNext) break;
            }
        }
    }
    
    gameState.nextDestination = defaultNext;
    
    var breakDiv = document.createElement('div');
    breakDiv.id = 'breakOverlay';
    breakDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center;';
    
    var contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'background: white; padding: 40px; border-radius: 10px; text-align: center; max-width: 600px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); position: relative; z-index: 1000000;';
    
    var navCopy = document.createElement('div');
    navCopy.style.cssText = 'display: flex; gap: 2px; margin-bottom: 20px; flex-wrap: nowrap; justify-content: center; overflow-x: auto; width: 90%; padding: 0 5px;';
    
    document.querySelectorAll('.tab-btn').forEach(function(originalBtn) {
        var btnCopy = document.createElement('button');
        var tabId = originalBtn.getAttribute('data-tab');
        var taskNum = parseInt(tabId[3]);
        
        // Use abbreviated names for tasks 2 and 3
        var btnText = originalBtn.textContent;
        if (taskNum === 2) {
            if (tabId.startsWith('g1')) btnText = 'C2';
            else if (tabId.startsWith('g2')) btnText = 'S2';
            else if (tabId.startsWith('g3')) btnText = 'T2';
        } else if (taskNum === 3) {
            if (tabId.startsWith('g1')) btnText = 'C3';
            else if (tabId.startsWith('g2')) btnText = 'S3';
            else if (tabId.startsWith('g3')) btnText = 'T3';
        }
        
        // Add checkmark if completed
        if (gameState.completed[tabId]) {
            btnText = btnText.replace(' 🔒', '') + ' ✓';
        }
        
        btnCopy.textContent = btnText;
        btnCopy.style.cssText = originalBtn.style.cssText;
        
        // Make tasks 2 and 3 narrower
        if (taskNum === 2 || taskNum === 3) {
            btnCopy.style.minWidth = '40px';
            btnCopy.style.padding = '10px 4px';
            btnCopy.style.fontSize = '12px';
        }
        
        btnCopy.setAttribute('data-tab', tabId);
        
        if (originalBtn.disabled || gameState.completed[tabId]) {
            btnCopy.disabled = true;
            btnCopy.style.cursor = 'not-allowed';
            btnCopy.style.opacity = '0.5';
        } else {
            btnCopy.style.cursor = 'pointer';
            btnCopy.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var clickedTabId = this.getAttribute('data-tab');
                gameState.nextDestination = clickedTabId;
                
                var destinationText = this.textContent.replace(' 🔒', '').replace(' ✓', '');
                document.getElementById('autoDestination').innerHTML = destinationText + ' <span style="color: #666; font-size: 12px;">(selected)</span>';
                
                navCopy.querySelectorAll('button').forEach(function(b) {
                    b.style.boxShadow = 'none';
                    b.style.transform = 'scale(1)';
                });
                
                this.style.boxShadow = '0 0 0 3px #2196F3';
                this.style.transform = 'scale(1.05)';
                
                console.log('Task selected:', clickedTabId);
            });
        }
        
        navCopy.appendChild(btnCopy);
    });
    
    var tasksCompleted = Object.keys(gameState.completed).length;
    var tasksRemaining = 9 - tasksCompleted;
    var totalPrompts = gameState.basePrompts + gameState.bonusPrompts;
    var promptsRemaining = totalPrompts - gameState.numPrompts;
    
    contentDiv.innerHTML = '<h2 style="color: #4CAF50; margin-bottom: 30px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Task Complete! +1 Prompt Earned</h2>' +
        '<div style="display: flex; gap: 30px; justify-content: center; margin: 40px 0;">' +
        '<div style="background: #f0f0f0; padding: 10px 20px; border-radius: 6px;">' +
        '<span style="color: #666; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Tasks Remaining:</span> ' +
        '<span style="color: #333; font-weight: bold; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">' + tasksRemaining + '/9</span>' +
        '</div>' +
        '<div style="background: #f0f0f0; padding: 10px 20px; border-radius: 6px;">' +
        '<span style="color: #666; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Prompts Available:</span> ' +
        '<span style="color: #333; font-weight: bold; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">' + promptsRemaining + '</span>' +
        '</div>' +
        '</div>' +
        '<p style="color: #666; font-size: 16px; margin-top: 20px; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">Auto-advancing to: <span style="font-weight: bold; color: #2196F3;" id="autoDestination">' + 
        (defaultNext ? document.querySelector('[data-tab="' + defaultNext + '"]').textContent.replace(' 🔒', '').replace(' ✓', '') : 'Completion') + '</span></p>';
    
    contentDiv.insertBefore(navCopy, contentDiv.firstChild);
    breakDiv.appendChild(contentDiv);
    document.body.appendChild(breakDiv);
    
    setTimeout(function() {
        gameState.countdownInterval = null;
        
        if (document.body.contains(breakDiv)) {
            document.body.removeChild(breakDiv);
        }
        
        gameState.pausedTime += (Date.now() - pauseStartTime);
        gameState.isPaused = false;
        gameState.isInBreak = false;
        
        if (gameState.nextDestination) {
            switchToTab(gameState.nextDestination, true);
        }
        gameState.nextDestination = null;
            }, 3000);
}

function showCompletion() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    var finalElapsed = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
    gameState.finalTime = finalElapsed;
    
    var sliderAccuracies = [];
    var countingCorrect = 0;
    var typingAccuracies = [];
    
    for (var i = 1; i <= 3; i++) {
        var acc = Qualtrics.SurveyEngine.getEmbeddedData('g2t' + i + '_accuracy');
        if (acc) sliderAccuracies.push(parseFloat(acc));
    }
    
    for (var j = 1; j <= 3; j++) {
        var correct = Qualtrics.SurveyEngine.getEmbeddedData('g1t' + j + '_correct');
        if (correct === 'true' || correct === true || correct === '1') countingCorrect++;
    }
    
    for (var k = 1; k <= 3; k++) {
        var typeAcc = Qualtrics.SurveyEngine.getEmbeddedData('g3t' + k + '_accuracy');
        if (typeAcc) typingAccuracies.push(parseFloat(typeAcc));
    }
    
    var sliderAvg = sliderAccuracies.length > 0 ? 
        (sliderAccuracies.reduce(function(a, b) { return a + b; }, 0) / sliderAccuracies.length).toFixed(1) : '0.0';
    
    var countingPercentage = (countingCorrect / 3 * 100).toFixed(1);
    
    var typingAvg = typingAccuracies.length > 0 ? 
        (typingAccuracies.reduce(function(a, b) { return a + b; }, 0) / typingAccuracies.length).toFixed(1) : '0.0';
    
    var overallAccuracy = ((parseFloat(sliderAvg) + parseFloat(countingPercentage) + parseFloat(typingAvg)) / 3).toFixed(1);
    
    document.getElementById('tabNav').style.display = 'none';
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('gameContent').style.display = 'none';
    document.getElementById('completionMsg').style.display = 'block';
    
    var totalTime = finalElapsed;
    document.getElementById('finalTime').textContent = Math.floor(totalTime / 60) + 'm ' + (totalTime % 60) + 's';
    document.getElementById('finalSwitches').textContent = gameState.switches;
    document.getElementById('finalAccuracy').textContent = overallAccuracy + '%';
    
    document.getElementById('countingAccuracy').textContent = countingPercentage + '%';
    document.getElementById('sliderAccuracy').textContent = sliderAvg + '%';
    document.getElementById('typingAccuracy').textContent = typingAvg + '%';
    
    Qualtrics.SurveyEngine.setEmbeddedData('finalOverallAccuracy', overallAccuracy);
    Qualtrics.SurveyEngine.setEmbeddedData('finalCountingAccuracy', countingPercentage);
    Qualtrics.SurveyEngine.setEmbeddedData('finalSliderAccuracy', sliderAvg);
    Qualtrics.SurveyEngine.setEmbeddedData('finalCountingScore', countingCorrect);
    Qualtrics.SurveyEngine.setEmbeddedData('finalTypingAccuracy', typingAvg);
    Qualtrics.SurveyEngine.setEmbeddedData('totalTime', totalTime);
    Qualtrics.SurveyEngine.setEmbeddedData('practiceCompleted', gameState.practiceCompleted);
    
    document.getElementById('continueBtn').addEventListener('click', function() {
        storeGameData();
        
        var qContext = window.qualtricsContext;
        
        if (qContext) {
            qContext.showNextButton();
            
            setTimeout(function() {
                var nextButton = document.getElementById('NextButton');
                if (nextButton) {
                    nextButton.click();
                } else {
                    console.error('NextButton not found after showing');
                }
            }, 100);
        } else {
            console.error('Qualtrics context not available');
            var nextButton = document.getElementById('NextButton');
            if (nextButton) {
                nextButton.click();
            }
        }
    });
}

function storeGameData() {
    Qualtrics.SurveyEngine.setEmbeddedData('gameState', JSON.stringify(gameState));
    Qualtrics.SurveyEngine.setEmbeddedData('completedTasks', Object.keys(gameState.completed).length);
    Qualtrics.SurveyEngine.setEmbeddedData('totalSwitches', gameState.switches);
    Qualtrics.SurveyEngine.setEmbeddedData('totalTime', Math.floor((Date.now() - gameState.startTime) / 1000));
    Qualtrics.SurveyEngine.setEmbeddedData('bonusPromptsEarned', gameState.bonusPrompts);
    
    Object.keys(gameState.completed).forEach(function(tabId) {
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_complete', 'true');
        if (gameState.taskTotalTimes[tabId]) {
            Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_time', Math.floor(gameState.taskTotalTimes[tabId] / 1000));
        }
    });
}

// GAME 1: COUNTING (now first)
function loadCountingGame(taskNum) {
    var textIndex = Math.floor(Math.random() * textSections.length);
    var text = textSections[textIndex];
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    var target, instruction, answer;
    
    if (taskNum === 1) {
        var words = ['the', 'of', 'and', 'in'];
        target = words[Math.floor(Math.random() * words.length)];
        instruction = 'Count how many times the word "' + target + '" appears:';
        answer = (text.match(new RegExp('\\b' + target + '\\b', 'gi')) || []).length;
    } else if (taskNum === 2) {
        var letters = ['e', 'a', 'i', 'o'];
        target = letters[Math.floor(Math.random() * letters.length)];
        instruction = 'Count how many times the letter "' + target + '" appears (case-insensitive):';
        answer = (text.match(new RegExp(target, 'gi')) || []).length;
    } else {
        var letter1Options = ['a', 'e', 'i'];
        var letter2Options = ['n', 't', 's'];
        var letter1 = letter1Options[Math.floor(Math.random() * letter1Options.length)];
        var letter2 = letter2Options[Math.floor(Math.random() * letter2Options.length)];
        target = letter1 + '" and "' + letter2;
        instruction = 'Count how many times the letters "' + letter1 + '" and "' + letter2 + '" appear in total:';
        answer = (text.match(new RegExp(letter1, 'gi')) || []).length + 
                (text.match(new RegExp(letter2, 'gi')) || []).length;
    }
    
    var content = document.getElementById('contentArea');
    
    var html = '<div style="border: 2px solid #9C27B0; border-radius: 8px; padding: 30px; background: white;">';
    html += '<h3 style="text-align: center; color: #333;">Counting Game - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p id="instruction" style="font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0;">' + instruction + '<br><span style="font-size: 14px; color: #666; font-weight: normal;">(Case-insensitive)</span></p>';
    
    html += '<div style="background-color: #fafafa; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">';
    html += '<canvas id="textCanvas" width="750" height="300" style="max-width: 100%; height: auto;"></canvas>';
    html += '</div>';
    
    html += '<div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin: 20px 0;">';
    html += '<label style="font-weight: bold;">Your answer:</label>';
    html += '<input type="number" id="countAnswer" min="0" max="999" placeholder="Enter count" ';
    html += 'style="width: 150px; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 18px; text-align: center;">';
    html += '</div>';
    
    html += '<button id="countSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    // Check for highlighting dependency
    var dependency = taskDependencies.getActiveDependency('g1t' + taskNum);
    var shouldHighlight = dependency && (dependency.type === 'highlight_words' || dependency.type === 'highlight_letters' || dependency.type === 'highlight_both');
    
    var canvas = document.getElementById('textCanvas');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Draw text with highlighting if dependency is active
    if (shouldHighlight && (taskNum === 1 || dependency.type === 'highlight_words')) {
        // Highlight words
        var words = text.split(' ');
        var x = 20;
        var y = 20;
        var lineHeight = 22;
        var spaceWidth = ctx.measureText(' ').width;
        
        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            var wordMetrics = ctx.measureText(word + ' ');
            
            if (x + wordMetrics.width > canvas.width - 20) {
                x = 20;
                y += lineHeight;
                if (y > canvas.height - 40) {
                    canvas.height = y + 100;
                    ctx.font = '14px monospace';
                }
            }
            
            // Check if this word matches target
            if (word.toLowerCase().replace(/[^a-z]/g, '') === target.toLowerCase()) {
                // Draw highlight
                ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
                ctx.fillRect(x - 2, y - 2, wordMetrics.width - spaceWidth + 4, lineHeight - 2);
            }
            
            // Draw word
            ctx.fillStyle = '#333333';
            ctx.fillText(word, x, y);
            x += wordMetrics.width;
        }
    } else if (shouldHighlight && (taskNum === 2 || taskNum === 3)) {
        // Highlight letters
        var chars = text.split('');
        var x = 20;
        var y = 20;
        var lineHeight = 22;
        
        for (var j = 0; j < chars.length; j++) {
            var char = chars[j];
            var charWidth = ctx.measureText(char).width;
            
            if (char === '\n' || x + charWidth > canvas.width - 20) {
                x = 20;
                y += lineHeight;
                if (y > canvas.height - 40) {
                    canvas.height = y + 100;
                    ctx.font = '14px monospace';
                }
                if (char === '\n') continue;
            }
            
            // Check if this character should be highlighted
            var shouldHighlightChar = false;
            if (taskNum === 2) {
                shouldHighlightChar = char.toLowerCase() === target.toLowerCase();
            } else if (taskNum === 3) {
                var targets = target.split('" and "');
                shouldHighlightChar = char.toLowerCase() === targets[0].toLowerCase() || 
                                    char.toLowerCase() === targets[1].toLowerCase();
            }
            
            if (shouldHighlightChar) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
                ctx.fillRect(x - 1, y - 2, charWidth + 2, lineHeight - 2);
            }
            
            ctx.fillStyle = '#333333';
            ctx.fillText(char, x, y);
            x += charWidth;
        }
    } else {
        // Normal text drawing (no highlighting)
        ctx.fillStyle = '#333333';
        var words = text.split(' ');
        var line = '';
        var y = 20;
        var lineHeight = 22;
        var maxWidth = canvas.width - 40;
        var x = 20;
        
        for (var k = 0; k < words.length; k++) {
            var testLine = line + words[k] + ' ';
            var metrics = ctx.measureText(testLine);
            var testWidth = metrics.width;
            
            if (testWidth > maxWidth && k > 0) {
                ctx.fillText(line, x, y);
                line = words[k] + ' ';
                y += lineHeight;
                
                if (y > canvas.height - 40) {
                    canvas.height = y + 100;
                    ctx.font = '14px monospace';
                    ctx.fillStyle = '#333333';
                }
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }
    
    // Add visual noise
    ctx.strokeStyle = 'rgba(156, 39, 176, 0.05)';
    ctx.lineWidth = 1;
    for (var n = 0; n < 3; n++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    
    document.getElementById('countSubmit').onclick = function() {
        var userAnswer = parseInt(document.getElementById('countAnswer').value || 0);
        var correct = userAnswer === answer;
        
        var tabId = 'g1t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_answer', userAnswer);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_correct', correct);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_correctAnswer', answer);
        
        markTaskComplete(tabId);
    };
}

// GAME 2: SLIDER (now second)
function loadSliderGame(taskNum) {
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    var target = difficulty === 'easy' ? Math.floor(Math.random() * 11) :
                 difficulty === 'medium' ? parseFloat((Math.random() * 10).toFixed(1)) :
                 parseFloat((Math.random() * 10).toFixed(2));
    
    var step = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 0.1 : 0.01;
    var showValue = difficulty !== 'hard';
    
    var content = document.getElementById('contentArea');
    
    var html = '<div style="border: 2px solid #4CAF50; border-radius: 8px; padding: 30px; background: white;">';
    html += '<h3 style="text-align: center; color: #333;">Slider Game - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p style="font-size: 20px; text-align: center; margin: 20px 0;">';
    html += 'Move the slider to: <strong style="color: #4CAF50; font-size: 24px;">' + target + '</strong>';
    html += '</p>';
    
    html += '<div style="margin: 30px 0;">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; font-weight: bold; color: #666;">';
    html += '<span>0</span><span>10</span></div>';
    html += '<input type="range" id="gameSlider" min="0" max="10" step="' + step + '" value="5" ';
    html += 'style="width: 100%; height: 8px; -webkit-appearance: none; appearance: none; background: #ddd; outline: none; cursor: pointer;">';
    html += '<div id="sliderValue" style="text-align: center; font-size: 36px; font-weight: bold; color: #4CAF50; margin-top: 20px;">';
    html += showValue ? '5' : '?';
    html += '</div></div>';
    
    html += '<button id="sliderSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    var slider = document.getElementById('gameSlider');
    slider.oninput = function() {
        if (showValue) {
            document.getElementById('sliderValue').textContent = this.value;
        }
    };
    
    document.getElementById('sliderSubmit').onclick = function() {
        var value = parseFloat(slider.value);
        var accuracy = Math.max(0, 100 - (Math.abs(value - target) / 10 * 100));
        
        var tabId = 'g2t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_target', target);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_value', value);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_accuracy', accuracy.toFixed(2));
        
        markTaskComplete(tabId);
    };
}

// GAME 3: TYPING (remains third)
function loadTypingGame(taskNum) {
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    // Check for dependency that makes typing easier
    var dependency = taskDependencies.getActiveDependency('g3t' + taskNum);
    var pattern;
    
    if (dependency) {
        if (dependency.type === 'easier_pattern' && taskNum === 1) {
            // Use very easy patterns
            pattern = patternSets.veryEasy[Math.floor(Math.random() * patternSets.veryEasy.length)];
        } else if (dependency.type === 'no_numbers' && taskNum === 2) {
            // Use easy patterns (no numbers) for medium
            var easyPatterns = ['Hello World', 'Test Pattern', 'Mixed Case', 'Upper Lower'];
            pattern = easyPatterns[Math.floor(Math.random() * easyPatterns.length)];
        } else if (dependency.type === 'no_symbols' && taskNum === 3) {
            // Use medium patterns (no symbols) for hard
            pattern = patternSets.medium[Math.floor(Math.random() * patternSets.medium.length)];
        } else {
            pattern = patternSets[difficulty][Math.floor(Math.random() * patternSets[difficulty].length)];
        }
    } else {
        pattern = patternSets[difficulty][Math.floor(Math.random() * patternSets[difficulty].length)];
    }
    
    var content = document.getElementById('contentArea');
    
    var html = '<div style="border: 2px solid #FFC107; border-radius: 8px; padding: 30px; background: white;">';
    html += '<h3 style="text-align: center; color: #333;">Pattern Typing - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p style="font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0;">Type the following pattern exactly:</p>';
    
    html += '<div style="background-color: #f5f5f5; border: 2px solid #FFC107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">';
    html += '<canvas id="patternCanvas" width="600" height="80" style="max-width: 100%; height: auto;"></canvas>';
    html += '</div>';
    
    html += '<input type="text" id="typeInput" placeholder="Type the pattern here..." ';
    html += 'style="width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; font-size: 20px; font-family: \'Courier New\', monospace; text-align: center; letter-spacing: 2px; box-sizing: border-box;">';
    
    html += '<div style="margin-top: 20px;">';
    html += '<button id="typeSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #FFC107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    var canvas = document.getElementById('patternCanvas');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 36px Courier New, monospace';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pattern, canvas.width / 2, canvas.height / 2);
    
    ctx.strokeStyle = 'rgba(255, 193, 7, 0.1)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    
    var input = document.getElementById('typeInput');
    
    document.getElementById('typeSubmit').onclick = function() {
        var userPattern = input.value;
        var accuracy = userPattern === pattern ? 100 : 0;
        
        if (accuracy === 0 && userPattern.length > 0) {
            var matches = 0;
            for (var i = 0; i < Math.min(userPattern.length, pattern.length); i++) {
                if (userPattern[i] === pattern[i]) matches++;
            }
            accuracy = Math.round((matches / Math.max(userPattern.length, pattern.length)) * 100);
        }
        
        var tabId = 'g3t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_pattern', userPattern);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_accuracy', accuracy);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_expected', pattern);
        
        markTaskComplete(tabId);
    };
}

// CHAT SYSTEM
function setupChat() {
    var MAX_TOTAL_TOKENS = 300;
    var chatbox = document.getElementById('chatbox');
    var userInput = document.getElementById('userInput');
    var sendBtn = document.getElementById('sendBtn');
    
    if (!chatbox || !userInput || !sendBtn) {
        console.error("Chat elements not found");
        return;
    }
    
    function submitChat() {
        var userText = userInput.value.trim();
        if (!userText) return;
        
        var numPrompts = gameState.numPrompts || 0;
        var totalAvailable = gameState.basePrompts + gameState.bonusPrompts;
        
        if (numPrompts >= totalAvailable) {
            appendToChat("System", "⚠️ You've used all your prompts. Complete more tasks to earn additional prompts!");
            userInput.disabled = true;
            sendBtn.disabled = true;
            updatePromptCounter();
            return;
        }
        
        numPrompts += 1;
        gameState.numPrompts = numPrompts;
        Qualtrics.SurveyEngine.setEmbeddedData("numPrompts", numPrompts);
        updatePromptCounter();
        
        var currentTime = Math.floor((Date.now() - gameState.startTime - gameState.pausedTime) / 1000);
        var inquiryData = {
            timestamp: currentTime,
            currentTask: gameState.currentTab || 'none',
            promptNumber: numPrompts,
            userQuery: userText
        };
        
        if (!gameState.inquiries) {
            gameState.inquiries = [];
        }
        gameState.inquiries.push(inquiryData);
        Qualtrics.SurveyEngine.setEmbeddedData("inquiry" + numPrompts + "_timestamp", currentTime);
        Qualtrics.SurveyEngine.setEmbeddedData("inquiry" + numPrompts + "_task", gameState.currentTab || 'none');
        Qualtrics.SurveyEngine.setEmbeddedData("inquiry" + numPrompts + "_query", userText);
        
        gameState.chatHistory.push({ role: "user", content: userText });
        appendToChat("You", userText);
        userInput.value = "";
        
        // Show typing indicator
        var typingIndicator = document.createElement("p");
        typingIndicator.id = "typingIndicator";
        typingIndicator.style.cssText = "margin: 8px 0; padding: 10px 14px; border-radius: 12px; max-width: 80%; word-wrap: break-word; background-color: #ffffff; border: 1px solid #e0e0e0; margin-right: auto;";
        typingIndicator.innerHTML = "<b>AI: </b><span style='color: #999;'>Typing...</span>";
        chatbox.appendChild(typingIndicator);
        chatbox.scrollTop = chatbox.scrollHeight;
        
        // Add 1 second delay before showing response
        setTimeout(function() {
            // Remove typing indicator
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
            }
            
            var selectedResponse = responseSelector.findBestResponse(userText, gameState.currentTab);
            
            gameState.chatHistory.push({ role: "assistant", content: selectedResponse.response });
            appendToChat("AI", selectedResponse.response);
            
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagLevel", selectedResponse.level);
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagType", selectedResponse.type);
            Qualtrics.SurveyEngine.setEmbeddedData("botResponse", selectedResponse.response);
            Qualtrics.SurveyEngine.setEmbeddedData("botResponseId", selectedResponse.id);
            Qualtrics.SurveyEngine.setEmbeddedData("chatHistoryJSON", JSON.stringify(gameState.chatHistory));
        }, 1000);
    }
    
    function appendToChat(sender, message) {
        if (!chatbox) return;
        
        var p = document.createElement("p");
        p.style.cssText = "margin: 8px 0; padding: 10px 14px; border-radius: 12px; max-width: 80%; word-wrap: break-word;";
        
        if (sender === "You") {
            p.style.cssText += "background-color: #e3f2fd; margin-left: auto; text-align: right;";
        } else if (sender === "AI") {
            p.style.cssText += "background-color: #ffffff; border: 1px solid #e0e0e0; margin-right: auto;";
        } else {
            p.style.cssText += "background-color: #fff3cd; border: 1px solid #ffeaa7; margin: 10px auto; text-align: center; max-width: 90%;";
        }
        
        var bold = document.createElement("b");
        bold.textContent = sender + ": ";
        p.appendChild(bold);
        
        var textNode = document.createTextNode(message);
        p.appendChild(textNode);
        
        chatbox.appendChild(p);
        chatbox.scrollTop = chatbox.scrollHeight;
    }
    
    function estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    
    function updatePromptCounter() {
        if (!chatbox) return;
        
        var totalAvailable = gameState.basePrompts + gameState.bonusPrompts;
        var numUsed = gameState.numPrompts || 0;
        var remaining = Math.max(0, totalAvailable - numUsed);
        
        var old = document.getElementById("promptCounterInChat");
        if (old) old.remove();
        
        var div = document.createElement("div");
        div.id = "promptCounterInChat";
        div.style.cssText = "background-color:#fff3e0;border:1px solid #ffcc80;padding:8px;margin:5px 0;text-align:center;font-weight:600;color:#f57c00;border-radius:8px;font-size:13px;";
        div.innerHTML = "Prompts Available: " + remaining + " (Base: 3 + Bonus: " + gameState.bonusPrompts + ")";
        
        chatbox.insertBefore(div, chatbox.firstChild);
        
        Qualtrics.SurveyEngine.setEmbeddedData("remainingPrompts", remaining);
    }
    
    sendBtn.addEventListener('click', submitChat);
    
    userInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            submitChat();
        }
    });
    
    try {
        updatePromptCounter();
    } catch (e) {
        console.error("Error in initial display:", e);
    }
    
    setInterval(function() {
        try {
            updatePromptCounter();
        } catch (e) {
            console.error("Error in interval update:", e);
        }
    }, 300);
}