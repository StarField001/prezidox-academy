/**
 * PrezidoxCBTEngine - A shared JavaScript class that powers all CBT modes
 * Manages state only. Does NOT touch the DOM directly.
 * The page calls renderQuestion() to get HTML and injects it.
 * The page calls getNavigationState() to render the nav panel.
 */
class PrezidoxCBTEngine {
  constructor(config) {
    // config shape:
    // {
    //   mode: 'flash-cbt' | 'topic-drill' | 'year-vault' | 'speed-burst'
    //   questions: [...],        // array of question objects
    //   timeLimit: null | N,     // total seconds (null = no limit)
    //   timePerQuestion: null|N, // seconds per question (speed-burst only)
    //   showAnswers: false | 'immediate' | 'flash', // when to show correct answer
    //   navigation: 'free' | 'linear' | 'linear-no-back' | 'sections'
    //   sections: null | [...],  // for OAU: [{name, questions:[...]}]
    //   autoSubmit: true | false,
    //   onComplete: function(results),  // callback when exam ends
    //   onAnswer: function(qIdx, answer, isCorrect), // callback per answer
    //   onTick: function(remaining),    // callback per second
    // }

    this.config = {
      mode: 'flash-cbt',
      questions: [],
      timeLimit: null,
      timePerQuestion: null,
      showAnswers: false,
      navigation: 'free',
      sections: null,
      autoSubmit: true,
      onComplete: null,
      onAnswer: null,
      onTick: null,
      ...config
    };

    // Internal state
    this.currentIndex = 0;
    this.answers = {};           // { questionIndex: { selected: "A", isCorrect: boolean } }
    this.flagged = new Set();     // Set of question indices
    this.startTime = null;
    this.endTime = null;
    this.timerInterval = null;
    this.remainingTime = null;
    this.currentSectionIndex = 0;
    this.questionStartTime = null;
    this.speedBurstTimes = [];   // Array of time taken per question (speed-burst)

    // Result cache
    this._results = null;
  }

  /**
   * Initialize the engine and start timer if needed
   */
  init() {
    this.currentIndex = 0;
    this.answers = {};
    this.flagged = new Set();
    this.startTime = Date.now();
    this.endTime = null;
    this.currentSectionIndex = 0;
    this.questionStartTime = Date.now();
    this.speedBurstTimes = [];
    this._results = null;

    // Start timer if time limit is set
    if (this.config.timeLimit) {
      this.remainingTime = this.config.timeLimit;
      this.startTimer();
    }

    // Handle speed-burst mode - per-question timer
    if (this.config.timePerQuestion) {
      this.remainingTime = this.config.timePerQuestion;
    }

    return this;
  }

  /**
   * Start the countdown timer
   */
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (!this.config.timeLimit && !this.config.timePerQuestion) return;

    this.timerInterval = setInterval(() => {
      if (this.config.timePerQuestion) {
        // Speed-burst: per-question timer
        this.remainingTime--;
        if (this.remainingTime <= 0) {
          // Time's up for this question - mark as wrong and move on
          this.selectAnswer(this.currentIndex, null); // null = no answer (time ran out)
        }
      } else {
        // Overall timer
        this.remainingTime--;
        if (this.remainingTime <= 0) {
          this.submit();
          return;
        }
      }

      if (this.config.onTick) {
        this.config.onTick(this.remainingTime);
      }
    }, 1000);
  }

  /**
   * Stop the timer
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Render question at specified index
   * Returns HTML string for the question
   */
  renderQuestion(index) {
    if (index < 0 || index >= this.config.questions.length) {
      return '';
    }

    const q = this.config.questions[index];
    const selectedOption = this.answers[index]?.selected || null;
    const isAnswered = selectedOption !== null;
    const isFlagged = this.flagged.has(index);

    // Generate glossary terms if any
    let questionText = q.question || '';
    const glossary = q.glossary || {};
    if (glossary && typeof glossary === 'object') {
      Object.keys(glossary).forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        questionText = questionText.replace(regex, 
          `<span class="glossary-term" data-term="${term}">${term}</span>`);
      });
    }

    // Build options HTML
    const options = ['A', 'B', 'C', 'D'].map(key => {
      const optionText = q['option' + key];
      const isSelected = selectedOption === key;
      const isCorrect = (this.config.showAnswers === 'immediate' || this.config.showAnswers === 'flash') 
        ? key === q.answer 
        : null;
      
      let optionClass = 'option';
      if (isSelected) optionClass += ' selected';
      if (isCorrect === true) optionClass += ' correct';
      if (isCorrect === false && isSelected) optionClass += ' wrong';

      return {
        key,
        text: optionText,
        className: optionClass,
        isSelected
      };
    });

    // Determine feedback state
    let feedbackState = null;
    if (this.config.showAnswers === 'immediate' || this.config.showAnswers === 'flash') {
      const answerData = this.answers[index];
      if (answerData) {
        feedbackState = {
          isCorrect: answerData.isCorrect,
          correctAnswer: q.answer,
          selectedAnswer: answerData.selected,
          explanation: q.explanation
        };
      }
    }

    const html = {
      index: index,
      total: this.config.questions.length,
      questionNumber: index + 1,
      question: q,
      questionText: questionText,
      options: options,
      isAnswered: isAnswered,
      isFlagged: isFlagged,
      selectedAnswer: selectedOption,
      canGoBack: this.config.navigation !== 'linear-no-back',
      feedback: feedbackState,
      section: this.config.sections ? this.config.sections[this.currentSectionIndex] : null
    };

    return html;
  }

  /**
   * Get HTML string for question (for direct injection)
   */
  getQuestionHTML(index) {
    const data = this.renderQuestion(index);
    if (!data) return '';

    const optionsHTML = data.options.map(opt => `
      <div class="option ${opt.className}" data-option="${opt.key}" role="radio" aria-checked="${opt.isSelected}">
        <div class="opt-key">${opt.key}</div>
        <div class="opt-text">${opt.text}</div>
      </div>
    `).join('');

    let feedbackHTML = '';
    if (data.feedback) {
      const fb = data.feedback;
      feedbackHTML = `
        <div class="feedback-box ${fb.isCorrect ? 'correct' : 'wrong'}">
          <div class="feedback-label">${fb.isCorrect ? 'Correct!' : 'Incorrect'}</div>
          ${!fb.isCorrect ? `<div class="correct-answer">The correct answer is ${fb.correctAnswer}</div>` : ''}
        </div>
      `;
      if (fb.explanation) {
        feedbackHTML += `
          <div class="explanation-box">
            <div class="expl-title">Explanation</div>
            <div class="expl-body">${fb.explanation}</div>
          </div>
        `;
      }
    }

    return `
      <div class="q-toprow">
        <div class="q-num-label">Question ${data.questionNumber} of ${data.total}</div>
        <button class="flag-btn ${data.isFlagged ? 'flagged' : ''}" data-flag="${data.isFlagged}">
          ${data.isFlagged ? 'Flagged' : 'Flag'}
        </button>
      </div>
      ${data.section ? `<div class="section-label">${data.section.name}</div>` : ''}
      <div class="q-text">${data.questionText}</div>
      <div class="options">${optionsHTML}</div>
      ${feedbackHTML}
      <div class="q-nav">
        <button class="nav-btn nav-prev" ${!data.canGoBack || data.questionNumber === 1 ? 'disabled' : ''}>Previous</button>
        <div class="q-counter">
          <span>Answered: <strong>${Object.keys(this.answers).length}</strong></span>
          <span>Flagged: <strong>${this.flagged.size}</strong></span>
        </div>
        <button class="nav-btn nav-next">${data.questionNumber === data.total ? 'Finish' : 'Next'}</button>
      </div>
    `;
  }

  /**
   * Select an answer for current question
   */
  selectAnswer(questionIndex, answer) {
    const q = this.config.questions[questionIndex];
    if (!q) return;

    // Record time taken for speed-burst
    if (this.config.timePerQuestion && this.questionStartTime) {
      const timeTaken = Math.max(0, this.config.timePerQuestion - this.remainingTime);
      this.speedBurstTimes[questionIndex] = timeTaken;
    }

    // Determine if correct
    let isCorrect = null;
    if (this.config.showAnswers === 'immediate' || this.config.showAnswers === 'flash') {
      isCorrect = answer === q.answer;
      if (answer === null) isCorrect = false; // Time ran out
    }

    this.answers[questionIndex] = {
      selected: answer,
      isCorrect: isCorrect,
      correct: q.answer
    };

    // Trigger callback
    if (this.config.onAnswer) {
      this.config.onAnswer(questionIndex, answer, isCorrect);
    }

    // For speed-burst, immediately move to next question
    if (this.config.timePerQuestion) {
      this.remainingTime = this.config.timePerQuestion;
      if (questionIndex < this.config.questions.length - 1) {
        this.navigateTo(questionIndex + 1);
      } else {
        this.submit();
      }
    }
  }

  /**
   * Navigate to specific question index
   */
  navigateTo(index) {
    if (index < 0 || index >= this.config.questions.length) return;

    // Check navigation restrictions
    if (this.config.navigation === 'linear') {
      // Can only go to adjacent or previously answered
      if (index > this.currentIndex + 1 || index < this.currentIndex - 1) {
        const answered = Object.keys(this.answers).map(Number);
        if (!answered.includes(index)) return;
      }
    } else if (this.config.navigation === 'linear-no-back') {
      if (index !== this.currentIndex + 1) return;
    }

    this.currentIndex = index;
    this.questionStartTime = Date.now();

    // For speed-burst per-question timer
    if (this.config.timePerQuestion) {
      this.remainingTime = this.config.timePerQuestion;
    }
  }

  /**
   * Mark question for review
   */
  markForReview(index) {
    if (this.config.navigation !== 'free' && this.config.navigation !== 'sections') {
      return; // Only free navigation allows marking for review
    }

    if (this.flagged.has(index)) {
      this.flagged.delete(index);
    } else {
      this.flagged.add(index);
    }
  }

  /**
   * Navigate to next/previous question
   */
  navigate(direction) {
    const nextIndex = this.currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < this.config.questions.length) {
      this.navigateTo(nextIndex);
    }
  }

  /**
   * Calculate results and trigger callback
   */
  submit() {
    this.stopTimer();
    this.endTime = Date.now();

    const results = this.getResults();

    // Store in sessionStorage
    sessionStorage.setItem('px_last_result', JSON.stringify(results));

    if (this.config.onComplete) {
      this.config.onComplete(results);
    }

    return results;
  }

  /**
   * Get results object
   */
  getResults() {
    if (this._results) return this._results;

    const questions = this.config.questions;
    const answered = Object.keys(this.answers);
    
    let correctAnswers = 0;
    const subjectBreakdown = {};

    answered.forEach(idx => {
      const q = questions[Number(idx)];
      const answerData = this.answers[idx];

      if (answerData.isCorrect === true) {
        correctAnswers++;
      }

      // Subject breakdown
      const subject = q.subject || 'Unknown';
      if (!subjectBreakdown[subject]) {
        subjectBreakdown[subject] = { correct: 0, total: 0 };
      }
      subjectBreakdown[subject].total++;
      if (answerData.isCorrect === true) {
        subjectBreakdown[subject].correct++;
      }
    });

    const totalQuestions = questions.length;
    const timeTaken = Math.floor((this.endTime - this.startTime) / 1000);

    this._results = {
      mode: this.config.mode,
      answers: this.answers,
      score: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      correctAnswers: correctAnswers,
      totalQuestions: totalQuestions,
      wrongAnswers: totalQuestions - correctAnswers,
      timeTaken: timeTaken,
      subjectBreakdown: subjectBreakdown,
      avgTimePerQuestion: totalQuestions > 0 ? Math.round(timeTaken / totalQuestions) : 0,
      speedBurstTimes: this.config.timePerQuestion ? this.speedBurstTimes : null,
    };

    return this._results;
  }

  /**
   * Get navigation state for rendering nav panel
   */
  getNavigationState() {
    return this.config.questions.map((_, idx) => {
      let status = 'not-visited';
      
      if (this.flagged.has(idx)) {
        status = 'review';
      } else if (this.answers[idx]) {
        status = 'answered';
      } else if (idx === this.currentIndex) {
        status = 'current';
      }

      return {
        index: idx,
        questionNumber: idx + 1,
        status: status
      };
    });
  }

  /**
   * Get navigation grid HTML
   */
  getNavigationHTML() {
    const navState = this.getNavigationState();
    
    return navState.map(item => {
      let className = 'q-bub';
      if (item.status === 'answered') className += ' ans';
      else if (item.status === 'review') className += ' flg';
      else if (item.status === 'current') className += ' cur';
      
      return {
        index: item.index,
        number: item.questionNumber,
        className: className,
        status: item.status
      };
    });
  }

  /**
   * Clean up timers and state
   */
  destroy() {
    this.stopTimer();
    this.answers = {};
    this.flagged.clear();
    this._results = null;
  }

  /**
   * Get current state for saving/resuming
   */
  getState() {
    return {
      currentIndex: this.currentIndex,
      answers: this.answers,
      flagged: Array.from(this.flagged),
      startTime: this.startTime,
      remainingTime: this.remainingTime
    };
  }

  /**
   * Restore state
   */
  restoreState(state) {
    this.currentIndex = state.currentIndex;
    this.answers = state.answers;
    this.flagged = new Set(state.flagged);
    this.startTime = state.startTime;
    this.remainingTime = state.remainingTime;
  }
}

// Export for global use
window.PrezidoxCBTEngine = PrezidoxCBTEngine;
