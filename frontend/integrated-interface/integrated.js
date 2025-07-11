// Global state
var gameState = {
    startTime: Date.now(),
    currentTab: null,
    completed: {},
    switches: 0,
    taskStartTimes: {},
    taskTotalTimes: {},
    chatHistory: [],
    numPrompts: 0
};

// Timer interval
var timerInterval;

// Pattern sets for Game 3
var patternSets = {
    easy: ['abc def ghi', 'xyz uvw rst', 'one two six', 'cat dog pig', 'red blue sky'],
    medium: ['AbC xYz 123', 'HeLLo WoRLd', 'TeSt PaTTeRn', 'Mix123 CaSe', 'UpDowN 456'],
    hard: ['a@1 B#2 c$3', 'X!y? Z&w% 9*8', 'Qw3$ Er4# Ty5@', 'Pa$$w0rd! Test', 'C0d3& $ymb0!s']
};

// Text sections for Game 2
var textSections = [
    'The University of California, Berkeley (UC Berkeley, Berkeley, Cal, or California) is a public land-grant research university in Berkeley, California, United States. Founded in 1868 and named after the Anglo-Irish philosopher George Berkeley, it is the state\'s first land-grant university and is the founding campus of the University of California system.',
    'Ten faculty members and forty male students made up the fledgling university when it opened in Oakland in 1869. Frederick Billings, a trustee of the College of California, suggested that a new campus site north of Oakland be named in honor of Anglo-Irish philosopher George Berkeley.',
    'Berkeley has an enrollment of more than 45,000 students. The university is organized around fifteen schools of study on the same campus, including the College of Chemistry, the College of Engineering, College of Letters and Science, and the Haas School of Business.'
];

Qualtrics.SurveyEngine.addOnload(function() {
    console.log('Integrated game system loaded');
});

Qualtrics.SurveyEngine.addOnReady(function() {
    var that = this;
    that.hideNextButton();
    
    // Start global timer
    timerInterval = setInterval(updateGlobalTimer, 1000);
    
    // Set up tab navigation
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (!this.disabled) {
                switchToTab(this.getAttribute('data-tab'));
            }
        });
    });
    
    // Set up chat
    setupChat();
    
    // Load first available tab
    switchToTab('g1t1');
});

Qualtrics.SurveyEngine.addOnUnload(function() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    // Save final state
    storeGameData();
});

// Timer function
function updateGlobalTimer() {
    // Stop updating if all tasks complete
    if (Object.keys(gameState.completed).length >= 9) {
        return;
    }
    
    var elapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    var minutes = Math.floor(elapsed / 60);
    var seconds = elapsed % 60;
    document.getElementById('globalTimer').textContent = 
        (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

// Tab switching
function switchToTab(tabId) {
    // Record switch
    if (gameState.currentTab && tabId !== gameState.currentTab) {
        gameState.switches++;
        document.getElementById('switchCount').textContent = gameState.switches;
        
        // Record time on previous task
        if (gameState.taskStartTimes[gameState.currentTab]) {
            var timeSpent = Date.now() - gameState.taskStartTimes[gameState.currentTab];
            gameState.taskTotalTimes[gameState.currentTab] = 
                (gameState.taskTotalTimes[gameState.currentTab] || 0) + timeSpent;
        }
    }
    
    // Update current tab
    gameState.currentTab = tabId;
    gameState.taskStartTimes[tabId] = Date.now();
    
    // Update UI
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
    });
    var activeBtn = document.querySelector('[data-tab="' + tabId + '"]');
    activeBtn.style.transform = 'translateY(-2px)';
    activeBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    
    // Load content
    loadTab(tabId);
}

// Load tab content
function loadTab(tabId) {
    var content = document.getElementById('contentArea');
    content.innerHTML = '<div style="text-align: center; padding: 50px;">Loading...</div>';
    
    // Parse tab ID
    var game = parseInt(tabId[1]);
    var task = parseInt(tabId[3]);
    
    setTimeout(function() {
        switch(game) {
            case 1:
                loadSliderGame(task);
                break;
            case 2:
                loadCountingGame(task);
                break;
            case 3:
                loadTypingGame(task);
                break;
        }
    }, 100);
}

// Mark task complete
function markTaskComplete(tabId) {
    gameState.completed[tabId] = true;
    
    // Update button appearance
    var btn = document.querySelector('[data-tab="' + tabId + '"]');
    var btnText = btn.textContent;
    if (!btnText.includes('✓')) {
        btn.textContent = btnText + ' ✓';
    }
    btn.style.opacity = '0.8';
    
    // Unlock next task
    var game = parseInt(tabId[1]);
    var task = parseInt(tabId[3]);
    if (task < 3) {
        var nextTabId = 'g' + game + 't' + (task + 1);
        var nextBtn = document.querySelector('[data-tab="' + nextTabId + '"]');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.style.background = game === 1 ? '#4CAF50' : game === 2 ? '#9C27B0' : '#FFC107';
            nextBtn.style.color = game === 3 ? '#333' : 'white';
            nextBtn.style.cursor = 'pointer';
            nextBtn.textContent = nextBtn.textContent.replace(' 🔒', '');
        }
    }
    
    // Update progress
    var progress = (Object.keys(gameState.completed).length / 9) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
    
    // Store data
    storeGameData();
    
    // Check if all tasks complete
    if (Object.keys(gameState.completed).length === 9) {
        showCompletion();
    } else {
        // Auto-advance to next task in same game if available
        if (task < 3) {
            var content = document.getElementById('contentArea');
            var nextTabId = 'g' + game + 't' + (task + 1);
            
            // Show countdown message
            var countdown = 3;
            var countdownInterval = setInterval(function() {
                content.innerHTML = '<div style="text-align: center; padding: 50px;"><h3 style="color: #4CAF50;">Task Complete!</h3><p>Advancing to next task in ' + countdown + ' seconds...</p><p style="font-size: 14px; color: #666;">Or select another task above.</p></div>';
                countdown--;
                
                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    switchToTab(nextTabId);
                }
            }, 1000);
            
            // Initial countdown display
            content.innerHTML = '<div style="text-align: center; padding: 50px;"><h3 style="color: #4CAF50;">Task Complete!</h3><p>Advancing to next task in 3 seconds...</p><p style="font-size: 14px; color: #666;">Or select another task above.</p></div>';
        } else {
            // No more tasks in this game, just show completion
            var content = document.getElementById('contentArea');
            content.innerHTML = '<div style="text-align: center; padding: 50px;"><h3 style="color: #4CAF50;">Game Complete!</h3><p>All tasks in this game are finished.</p><p>Select another game above.</p></div>';
        }
    }
}

// Show completion
function showCompletion() {
    // Stop the timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Record final time
    var finalElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    gameState.finalTime = finalElapsed;
    
    document.getElementById('tabNav').style.display = 'none';
    document.getElementById('contentArea').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('completionMsg').style.display = 'block';
    
    var totalTime = finalElapsed;
    document.getElementById('finalTime').textContent = Math.floor(totalTime / 60) + 'm ' + (totalTime % 60) + 's';
    document.getElementById('finalSwitches').textContent = gameState.switches;
    
    // Just show next button, no auto-advance
    Qualtrics.SurveyEngine.showNextButton();
}

// Store data
function storeGameData() {
    Qualtrics.SurveyEngine.setEmbeddedData('gameState', JSON.stringify(gameState));
    Qualtrics.SurveyEngine.setEmbeddedData('completedTasks', Object.keys(gameState.completed).length);
    Qualtrics.SurveyEngine.setEmbeddedData('totalSwitches', gameState.switches);
    Qualtrics.SurveyEngine.setEmbeddedData('totalTime', Math.floor((Date.now() - gameState.startTime) / 1000));
    
    // Store individual task data
    Object.keys(gameState.completed).forEach(function(tabId) {
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_complete', 'true');
        if (gameState.taskTotalTimes[tabId]) {
            Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_time', Math.floor(gameState.taskTotalTimes[tabId] / 1000));
        }
    });
}

// GAME 1: SLIDER
function loadSliderGame(taskNum) {
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    var target = difficulty === 'easy' ? Math.floor(Math.random() * 11) :
                 difficulty === 'medium' ? parseFloat((Math.random() * 10).toFixed(1)) :
                 parseFloat((Math.random() * 10).toFixed(2));
    
    var step = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 0.1 : 0.01;
    var showValue = difficulty !== 'hard';
    
    var content = document.getElementById('contentArea');
    
    // Build HTML with proper string concatenation
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
    
    // Slider event
    var slider = document.getElementById('gameSlider');
    slider.oninput = function() {
        if (showValue) {
            document.getElementById('sliderValue').textContent = this.value;
        }
    };
    
    // Submit event
    document.getElementById('sliderSubmit').onclick = function() {
        var value = parseFloat(slider.value);
        var accuracy = Math.max(0, 100 - (Math.abs(value - target) / 10 * 100));
        
        var tabId = 'g1t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_target', target);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_value', value);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_accuracy', accuracy.toFixed(2));
        
        markTaskComplete(tabId);
        
        // Don't show completion message, it will be handled by markTaskComplete
    };
}

// GAME 2: COUNTING
function loadCountingGame(taskNum) {
    var text = textSections[Math.floor(Math.random() * textSections.length)];
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    
    var target, instruction, answer;
    
    if (taskNum === 1) {
        // Easy: count word
        var words = ['the', 'of', 'and', 'in'];
        target = words[Math.floor(Math.random() * words.length)];
        instruction = 'Count how many times the word "' + target + '" appears:';
        answer = (text.match(new RegExp('\\b' + target + '\\b', 'gi')) || []).length;
    } else if (taskNum === 2) {
        // Medium: count letter
        var letters = ['e', 'a', 'i', 'o'];
        target = letters[Math.floor(Math.random() * letters.length)];
        instruction = 'Count how many times the letter "' + target + '" appears (case-insensitive):';
        answer = (text.match(new RegExp(target, 'gi')) || []).length;
    } else {
        // Hard: count two letters
        var letter1 = ['a', 'e'][Math.floor(Math.random() * 2)];
        var letter2 = ['n', 't'][Math.floor(Math.random() * 2)];
        target = letter1 + '" and "' + letter2;
        instruction = 'Count how many times the letters "' + letter1 + '" and "' + letter2 + '" appear in total:';
        answer = (text.match(new RegExp(letter1, 'gi')) || []).length + 
                (text.match(new RegExp(letter2, 'gi')) || []).length;
    }
    
    var content = document.getElementById('contentArea');
    
    // Build HTML with proper string concatenation
    var html = '<div style="border: 2px solid #9C27B0; border-radius: 8px; padding: 30px; background: white;">';
    html += '<h3 style="text-align: center; color: #333;">Counting Game - Task ' + taskNum + '</h3>';
    html += '<div style="display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; background-color: ';
    html += (difficulty === 'easy' ? '#4CAF50' : difficulty === 'medium' ? '#FF9800' : '#f44336');
    html += '; color: white;">' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) + '</div>';
    
    html += '<p style="font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0;">' + instruction + '</p>';
    
    // Canvas for text display (like Game 3)
    html += '<div style="background-color: #fafafa; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">';
    html += '<canvas id="textCanvas" width="750" height="300" style="max-width: 100%; height: auto;"></canvas>';
    html += '</div>';
    
    html += '<div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin: 20px 0;">';
    html += '<label style="font-weight: bold;">Your answer:</label>';
    html += '<input type="number" id="countAnswer" min="0" max="999" placeholder="Type here" ';
    html += 'style="width: 150px; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 18px; text-align: center;">';
    html += '</div>';
    
    html += '<button id="countSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    // Draw text on canvas to prevent copying
    var canvas = document.getElementById('textCanvas');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set font and color
    ctx.font = '14px monospace';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Word wrap the text
    var words = text.split(' ');
    var line = '';
    var y = 20;
    var lineHeight = 22;
    var maxWidth = canvas.width - 40;
    var x = 20;
    
    for (var i = 0; i < words.length; i++) {
        var testLine = line + words[i] + ' ';
        var metrics = ctx.measureText(testLine);
        var testWidth = metrics.width;
        
        if (testWidth > maxWidth && i > 0) {
            ctx.fillText(line, x, y);
            line = words[i] + ' ';
            y += lineHeight;
            
            // Check if we've run out of canvas space
            if (y > canvas.height - 40) {
                // Resize canvas if needed
                canvas.height = y + 100;
                ctx.font = '14px monospace';
                ctx.fillStyle = '#333333';
            }
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
    
    // Add slight visual noise to prevent OCR
    ctx.strokeStyle = 'rgba(156, 39, 176, 0.05)';
    ctx.lineWidth = 1;
    for (var j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    
    // Submit event
    document.getElementById('countSubmit').onclick = function() {
        var userAnswer = parseInt(document.getElementById('countAnswer').value || 0);
        var correct = userAnswer === answer;
        
        var tabId = 'g2t' + taskNum;
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_answer', userAnswer);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_correct', correct);
        Qualtrics.SurveyEngine.setEmbeddedData(tabId + '_correctAnswer', answer);
        
        markTaskComplete(tabId);
        
        // Don't show completion message, it will be handled by markTaskComplete
    };
}

// GAME 3: TYPING
function loadTypingGame(taskNum) {
    var difficulties = ['easy', 'medium', 'hard'];
    var difficulty = difficulties[taskNum - 1];
    var patterns = patternSets[difficulty];
    var pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    var content = document.getElementById('contentArea');
    
    // Build HTML with proper string concatenation
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
    
    html += '<div style="text-align: center; margin: 15px 0; height: 30px;">';
    html += '<span id="typeFeedback" style="font-size: 16px; font-weight: bold;"></span>';
    html += '</div>';
    
    html += '<button id="typeSubmit" style="display: block; margin: 0 auto; padding: 12px 30px; background: #FFC107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">Submit</button>';
    html += '</div>';
    
    content.innerHTML = html;
    
    // Draw pattern on canvas
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
    
    // Add visual noise
    ctx.strokeStyle = 'rgba(255, 193, 7, 0.1)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    
    // Real-time feedback
    var input = document.getElementById('typeInput');
    var feedback = document.getElementById('typeFeedback');
    
    input.oninput = function() {
        var value = this.value;
        if (value.length === 0) {
            feedback.textContent = '';
            return;
        }
        
        var correct = true;
        for (var i = 0; i < value.length && i < pattern.length; i++) {
            if (value[i] !== pattern[i]) {
                correct = false;
                break;
            }
        }
        
        if (correct && value.length <= pattern.length) {
            feedback.textContent = '✓ Looking good!';
            feedback.style.color = '#4CAF50';
        } else {
            feedback.textContent = '✗ Check your typing';
            feedback.style.color = '#f44336';
        }
    };
    
    // Submit event
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
        
        // Don't show completion message, it will be handled by markTaskComplete
    };
}

// CHAT SYSTEM
function setupChat() {
    var MAX_TOTAL_TOKENS = 300;
    var chatbox = document.getElementById('chatbox');
    var userInput = document.getElementById('userInput');
    var sendBtn = document.getElementById('sendBtn');
    
    // Check if elements exist
    if (!chatbox || !userInput || !sendBtn) {
        console.error("Chat elements not found");
        return;
    }
    
    function submitChat() {
        var userText = userInput.value.trim();
        if (!userText) return;
        
        // Read from embedded data
        var numPrompts = gameState.numPrompts || 0;
        
        // Enforce limit
        if (numPrompts >= 3) {
            appendToChat("System", "⚠️ You've reached your 3-prompt limit for this round.");
            userInput.disabled = true;
            sendBtn.disabled = true;
            updatePromptCounter();
            return;
        }
        
        var userTokenEstimate = estimateTokens(userText);
        var historyTokenEstimate = gameState.chatHistory.reduce(function(sum, msg) {
            return sum + estimateTokens(msg.content);
        }, 0);
        var estimatedTotal = userTokenEstimate + historyTokenEstimate;
        
        if (estimatedTotal > MAX_TOTAL_TOKENS) {
            appendToChat("System", "⚠️ Exceeds token limit. Please shorten your message.");
            return;
        }
        
        // Track + increment
        numPrompts += 1;
        gameState.numPrompts = numPrompts;
        Qualtrics.SurveyEngine.setEmbeddedData("numPrompts", numPrompts);
        updatePromptCounter();
        
        // Proceed with chat
        gameState.chatHistory.push({ role: "user", content: userText });
        appendToChat("You", userText);
        userInput.value = "";
        updateTokenCounter();
        
        Qualtrics.SurveyEngine.setEmbeddedData("userText", userText);
        
        fetch("https://bobalab-chatgpt-backend.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, history: gameState.chatHistory })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var reply = data.reply || "";
            var split = splitBotReply(reply);
            
            gameState.chatHistory.push({ role: "assistant", content: split.answer });
            appendToChat("AI", split.answer);
            
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagLevel", split.flag1);
            Qualtrics.SurveyEngine.setEmbeddedData("botFlagType", split.flag2);
            Qualtrics.SurveyEngine.setEmbeddedData("botResponse", split.answer);
            Qualtrics.SurveyEngine.setEmbeddedData("chatHistoryJSON", JSON.stringify(gameState.chatHistory));
        })
        .catch(function(err) {
            console.error("Chat error:", err);
            appendToChat("AI", "⚠️ Error talking to the server.");
        });
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
    
    function splitBotReply(raw) {
        var lines = raw.split("\n").filter(Boolean);
        return {
            flag1: lines.length > 0 ? lines[0] : "",
            flag2: lines.length > 1 ? lines[1] : "",
            answer: lines.length > 2 ? lines.slice(2).join("\n") : raw
        };
    }
    
    function estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    
    function updatePromptCounter() {
        if (!chatbox) return;
        
        var maxPrompts = 3;
        var numUsed = gameState.numPrompts || 0;
        var remaining = Math.max(0, maxPrompts - numUsed);
        
        // Remove old counter
        var old = document.getElementById("promptCounterInChat");
        if (old) old.remove();
        
        // Create new counter
        var div = document.createElement("div");
        div.id = "promptCounterInChat";
        div.style.cssText = "background-color:#fff3e0;border:1px solid #ffcc80;padding:8px;margin:5px 0;text-align:center;font-weight:600;color:#f57c00;border-radius:8px;font-size:13px;";
        div.innerHTML = "Prompt Cap: " + remaining + " / " + maxPrompts;
        
        // Insert at top
        var tokenCounter = document.getElementById("tokenCounterInChat");
        if (tokenCounter && tokenCounter.nextSibling) {
            chatbox.insertBefore(div, tokenCounter.nextSibling);
        } else {
            chatbox.insertBefore(div, chatbox.firstChild);
        }
        
        Qualtrics.SurveyEngine.setEmbeddedData("remainingPrompts", remaining);
    }
    
    function updateTokenCounter() {
        if (!chatbox || !userInput) return;
        
        var text = userInput.value.trim();
        var tokenEstimate = text ? estimateTokens(text) : 0;
        
        // Remove old counter
        var oldTokenCounter = document.getElementById("tokenCounterInChat");
        if (oldTokenCounter) oldTokenCounter.remove();
        
        // Create new counter
        var tokenDiv = document.createElement("div");
        tokenDiv.id = "tokenCounterInChat";
        
        // Calculate total tokens
        var historyTokens = gameState.chatHistory.reduce(function(sum, msg) {
            return sum + estimateTokens(msg.content);
        }, 0);
        var totalEstimate = tokenEstimate + historyTokens;
        
        // Style based on usage
        if (totalEstimate > MAX_TOTAL_TOKENS * 0.8) {
            tokenDiv.style.cssText = "background-color: #ffebee; border: 1px solid #ef5350; padding: 8px; margin: 5px 0; text-align: center; font-size: 13px; color: #c62828; border-radius: 8px; font-weight: 600;";
        } else {
            tokenDiv.style.cssText = "background-color: #e3f2fd; border: 1px solid #64b5f6; padding: 8px; margin: 5px 0; text-align: center; font-size: 13px; color: #1565c0; border-radius: 8px; font-weight: 600;";
        }
        tokenDiv.innerHTML = "Token Cap: " + totalEstimate + "/" + MAX_TOTAL_TOKENS;
        
        // Insert at top
        chatbox.insertBefore(tokenDiv, chatbox.firstChild);
        
        Qualtrics.SurveyEngine.setEmbeddedData("inputTokenEstimate", tokenEstimate);
    }
    
    // Attach event listeners
    sendBtn.addEventListener('click', submitChat);
    userInput.addEventListener("input", updateTokenCounter);
    
    userInput.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            submitChat();
        }
    });
    
    // Initial display
    try {
        updateTokenCounter();
        updatePromptCounter();
    } catch (e) {
        console.error("Error in initial display:", e);
    }
    
    // Update counters periodically
    setInterval(function() {
        try {
            var currentValue = userInput.value;
            if (!userInput.hasAttribute('data-last-value') || userInput.getAttribute('data-last-value') !== currentValue) {
                userInput.setAttribute('data-last-value', currentValue);
                updateTokenCounter();
            }
            updatePromptCounter();
        } catch (e) {
            console.error("Error in interval update:", e);
        }
    }, 300);
}