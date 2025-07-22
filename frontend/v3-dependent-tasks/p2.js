Qualtrics.SurveyEngine.addOnload(function() {
    console.log('Integrated game system loaded');
    
    // Add CSS animations including golden glow
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
        
        @keyframes goldenGlow {
            0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
            50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.6); }
            100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
        }
        
        .highlighted-text {
            animation: highlight 1.5s ease-in-out infinite;
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        .enhanced-task {
            animation: goldenGlow 2s ease-in-out infinite;
            border: 2px solid rgba(255, 215, 0, 0.6) !important;
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
            <p style="color: #666; margin-bottom: 20px;">Practice mode lets you try each game type without time pressure.</p>
            <p style="color: #888; font-size: 14px; margin-bottom: 30px; font-style: italic;">
                Tip: Try completing different tasks and revisiting them to see what changes. Tasks are dependent - plan your strategy accordingly!
            </p>
            
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
            <h2 style="text-align: center; color: #333; margin-bottom: 20px;">Practice Mode</h2>
            <p style="text-align: center; color: #666; margin-bottom: 30px; font-style: italic;">
                Try completing tasks in different orders and see what happens!
            </p>
            
            <div style="display: grid; gap: 20px; max-width: 600px; margin: 0 auto;">
                <div id="counting-practice-card" style="border: 2px solid #9C27B0; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #9C27B0; margin-bottom: 10px;">Counting Game</h3>
                    <p style="color: #666; margin-bottom: 15px;">Count words or letters in a text passage.</p>
                    <button class="practice-btn" data-game="counting" style="background: #9C27B0; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Try Counting
                    </button>
                </div>
                
                <div id="slider-practice-card" style="border: 2px solid #4CAF50; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #4CAF50; margin-bottom: 10px;">Slider Game</h3>
                    <p style="color: #666; margin-bottom: 15px;">Move a slider to match target values.</p>
                    <button class="practice-btn" data-game="slider" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                        Try Slider
                    </button>
                </div>
                
                <div id="typing-practice-card" style="border: 2px solid #FFC107; border-radius: 8px; padding: 20px;">
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
    
    // Check if this task has been enhanced by another practice task
    var isEnhanced = false;
    if (gameType === 'counting' && (gameState.practiceTasksCompleted['slider1'] || gameState.practiceTasksCompleted['slider2'] || gameState.practiceTasksCompleted['slider3'])) {
        isEnhanced = true;
    } else if (gameType === 'slider' && (gameState.practiceTasksCompleted['typing1'] || gameState.practiceTasksCompleted['typing2'] || gameState.practiceTasksCompleted['typing3'])) {
        isEnhanced = true;
    } else if (gameType === 'typing' && (gameState.practiceTasksCompleted['counting1'] || gameState.practiceTasksCompleted['counting2'] || gameState.practiceTasksCompleted['counting3'])) {
        isEnhanced = true;
    }
    
    if (gameType === 'counting') {
        // Practice counting
        var practiceText = 'The quick brown fox jumps over the lazy dog. The dog was sleeping under the tree. The fox was very clever and the tree provided shade.';
        
        content.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto; ${isEnhanced ? 'animation: goldenGlow 2s ease-in-out infinite; border: 2px solid rgba(255, 215, 0, 0.6);' : ''}">
                <h3 style="text-align: center; color: #9C27B0;">Practice: Counting Game</h3>
                <p style="text-align: center; color: #666; margin: 20px 0; font-size: 16px;">Count how many times the word "the" appears:<br><span style="font-size: 13px; color: #888;">(Case-insensitive)</span></p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; line-height: 1.8;">`;
        
        if (isEnhanced) {
            // Highlight "the" words (enhanced version)
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
            content.innerHTML += highlightedText;
        } else {
            // Normal text (unenhanced version)
            content.innerHTML += practiceText;
        }
        
        content.innerHTML += `
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
        // Practice slider
        content.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto; ${isEnhanced ? 'animation: goldenGlow 2s ease-in-out infinite; border: 2px solid rgba(255, 215, 0, 0.6);' : ''}">
                <h3 style="text-align: center; color: #4CAF50;">Practice: Slider Game</h3>
                <p style="text-align: center; color: #666; margin: 20px 0;">Move the slider to: <strong style="font-size: 24px; color: #4CAF50;">7.5</strong></p>
                
                <div style="margin: 30px 0; position: relative;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; font-weight: bold; color: #666;">
                        <span>0</span><span>10</span>
                    </div>
                    <div style="position: relative;">
                        <input type="range" id="practiceSlider" min="0" max="10" step="0.1" value="5" style="width: 100%; height: 8px; -webkit-appearance: none; appearance: none; background: #ddd; outline: none; cursor: pointer;">`;
        
        if (isEnhanced) {
            // Add tick marks (enhanced version)
            content.innerHTML += `
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
                        </div>`;
        }
        
        content.innerHTML += `
                    </div>`;
        
        if (isEnhanced) {
            // Add tick labels below slider (enhanced version)
            content.innerHTML += `
                    <!-- Tick labels below slider -->
                    <div style="position: relative; height: 20px; margin-top: 8px;">`;
            
            // Add tick labels
            for (var j = 0; j <= 10; j += 2) {
                var labelPosition = (j / 10) * 100;
                content.innerHTML += `<span style="position: absolute; left: ${labelPosition}%; transform: translateX(-50%); font-size: 11px; color: #666;">${j}</span>`;
            }
            
            content.innerHTML += `
                    </div>`;
        }
        
        content.innerHTML += `
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
        // Practice typing
        var pattern = isEnhanced ? 'easy typing' : 'Pa$$w0rd! Test';
        
        content.innerHTML = `
            <div style="background: white; border-radius: 8px; padding: 30px; max-width: 800px; margin: 0 auto; ${isEnhanced ? 'animation: goldenGlow 2s ease-in-out infinite; border: 2px solid rgba(255, 215, 0, 0.6);' : ''}">
                <h3 style="text-align: center; color: #FFC107;">Practice: Typing Game</h3>
                <p style="text-align: center; color: #666; margin: 20px 0;">Type this pattern exactly:</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <span style="font-size: 24px; font-family: monospace; letter-spacing: 2px;">${pattern}</span>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <input type="text" id="practiceTyping" style="padding: 10px; font-size: 18px; width: 300px; font-family: monospace;">
                </div>
                
                <div style="text-align: center;">
                    <button onclick="checkPracticeTyping('${pattern.replace(/'/g, "\\'")}')" style="padding: 10px 20px; background: #FFC107; color: #333; border: none; border-radius: 4px; cursor: pointer;">
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
        feedback.textContent = '✓ Correct! You found all 6 occurrences of "the".';
        gameState.practiceTasksCompleted['counting1'] = true;
        
        // Update buttons with golden glow
        setTimeout(function() {
            updatePracticeButtons();
        }, 1000);
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Not quite. Count again - there are 6 occurrences of "the" (case-insensitive).';
    }
}

function checkPracticeSlider() {
    var value = document.getElementById('practiceSlider').value;
    var feedback = document.getElementById('practiceFeedback');
    
    if (value === '7.5') {
        feedback.style.color = '#4CAF50';
        feedback.textContent = '✓ Perfect! You got exactly 7.5.';
        gameState.practiceTasksCompleted['slider1'] = true;
        
        // Update buttons with golden glow
        setTimeout(function() {
            updatePracticeButtons();
        }, 1000);
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Close! You selected ' + value + ' but the target was 7.5.';
    }
}

function checkPracticeTyping(expectedPattern) {
    var typed = document.getElementById('practiceTyping').value;
    var feedback = document.getElementById('practiceFeedback');
    
    if (typed === expectedPattern) {
        feedback.style.color = '#4CAF50';
        feedback.textContent = '✓ Excellent! Perfect match.';
        gameState.practiceTasksCompleted['typing1'] = true;
        
        // Update buttons with golden glow
        setTimeout(function() {
            updatePracticeButtons();
        }, 1000);
    } else {
        feedback.style.color = '#f44336';
        feedback.textContent = '✗ Not quite right. Type "' + expectedPattern + '" exactly.';
    }
}

// Update practice buttons with golden glow
function updatePracticeButtons() {
    // Check which tasks should glow
    if (gameState.practiceTasksCompleted['slider1'] || gameState.practiceTasksCompleted['slider2'] || gameState.practiceTasksCompleted['slider3']) {
        var countingCard = document.getElementById('counting-practice-card');
        if (countingCard && !countingCard.classList.contains('enhanced-task')) {
            countingCard.classList.add('enhanced-task');
        }
    }
    
    if (gameState.practiceTasksCompleted['typing1'] || gameState.practiceTasksCompleted['typing2'] || gameState.practiceTasksCompleted['typing3']) {
        var sliderCard = document.getElementById('slider-practice-card');
        if (sliderCard && !sliderCard.classList.contains('enhanced-task')) {
            sliderCard.classList.add('enhanced-task');
        }
    }
    
    if (gameState.practiceTasksCompleted['counting1'] || gameState.practiceTasksCompleted['counting2'] || gameState.practiceTasksCompleted['counting3']) {
        var typingCard = document.getElementById('typing-practice-card');
        if (typingCard && !typingCard.classList.contains('enhanced-task')) {
            typingCard.classList.add('enhanced-task');
        }
    }
}