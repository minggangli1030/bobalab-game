// src/services/aiTaskHelper.js
export class AITaskHelper {
  constructor() {
    this.usageCount = {
      slider: 0,
      counting: 0,
      typing: 0,
    };

    // Vague responses that don't hint at reliability
    this.vagueResponses = [
      "I've helped you complete the task!",
      "Task assistance provided!",
      "There you go!",
      "Done! I've given my input.",
      "I've made my attempt!",
      "Task completed with AI assistance.",
      "My work here is done!",
      "AI help delivered!",
      "I've done what I can!",
      "Assistance complete!",
    ];
  }

  getVagueResponse() {
    return this.vagueResponses[
      Math.floor(Math.random() * this.vagueResponses.length)
    ];
  }

  // SLIDER HELPER - Moves the slider with errors (but doesn't say if it's wrong)
  helpWithSlider(targetValue) {
    this.usageCount.slider++;

    // 50% chance to be correct, gets worse with use
    const accuracy = Math.max(0.3, 0.5 - (this.usageCount.slider - 1) * 0.1);

    let suggestedValue;
    if (Math.random() < accuracy) {
      // Correct value
      suggestedValue = targetValue;
    } else {
      // Wrong by ±1 (or more as it degrades)
      const error =
        (Math.random() < 0.5 ? -1 : 1) * (this.usageCount.slider > 3 ? 2 : 1);
      suggestedValue = Math.max(0, Math.min(10, targetValue + error));
    }

    return {
      action: "moveSlider",
      value: suggestedValue,
      animate: true,
      message: this.getVagueResponse(), // Vague message
    };
  }

  // COUNTING HELPER - Highlights with errors (but doesn't hint at accuracy)
  helpWithCounting(text, targetPattern) {
    this.usageCount.counting++;

    // Start at 60% accurate, degrades
    const accuracy = Math.max(0.2, 0.6 - (this.usageCount.counting - 1) * 0.1);

    // Split text into words for highlighting
    const words = text.split(/(\s+)/); // Keep spaces
    const highlights = new Set();
    let aiCount = 0;

    // Find matches (with errors)
    words.forEach((word, idx) => {
      if (word.toLowerCase().includes(targetPattern.toLowerCase())) {
        // AI might miss this one
        if (Math.random() < accuracy) {
          highlights.add(idx);
          aiCount++;
        }
      } else {
        // AI might wrongly highlight this
        if (Math.random() < (1 - accuracy) * 0.3) {
          highlights.add(idx);
          aiCount++;
        }
      }
    });

    // Add some counting error
    if (Math.random() < 0.4) {
      aiCount += Math.random() < 0.5 ? 1 : -1;
    }

    return {
      action: "highlightAndCount",
      highlightIndices: Array.from(highlights),
      suggestedCount: Math.max(0, aiCount),
      message: this.getVagueResponse(), // Vague message
      actualText: words,
    };
  }

  // TYPING HELPER - Always perfect (but still vague about it)
  helpWithTyping(pattern) {
    this.usageCount.typing++;

    return {
      action: "autoType",
      text: pattern,
      typeSpeed: 50, // ms per character
      message: this.getVagueResponse(), // Still vague even though it's perfect
      perfect: true,
    };
  }

  // Reset for new game
  reset() {
    this.usageCount = {
      slider: 0,
      counting: 0,
      typing: 0,
    };
  }
}

// Export singleton
export const aiTaskHelper = new AITaskHelper();
