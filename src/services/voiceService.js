/**
 * voiceService.js
 * Wraps Web Speech API for recognition (STT) and synthesis (TTS).
 * Provides filler word detection and speaking speed analysis.
 */

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally',
  'actually', 'right', 'so', 'well', 'i mean', 'sort of', 'kind of', 'yeah'];

class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.transcript = '';
    this.wordCount = 0;
    this.fillerCount = 0;
    this.detectedFillers = [];
    this.startTime = null;
    this.onTranscriptUpdate = null;
    this.onListeningChange = null;
    this.onError = null;
    this._initRecognition();
  }

  _initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition not supported in this browser.');
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text;
          this._analyzeText(text);
        } else {
          interimTranscript += text;
        }
      }

      this.transcript += finalTranscript;
      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate({
          final: this.transcript,
          interim: interimTranscript,
          fillerCount: this.fillerCount,
          detectedFillers: this.detectedFillers,
          wpm: this._getWPM()
        });
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      if (this.onError) this.onError(event.error);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Auto-restart if still in listening mode
        try { this.recognition.start(); } catch (e) { /* ignore */ }
      } else {
        if (this.onListeningChange) this.onListeningChange(false);
      }
    };
  }

  _analyzeText(text) {
    const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
    this.wordCount += words.length;

    FILLER_WORDS.forEach(filler => {
      const fillerWords = filler.split(' ');
      if (fillerWords.length === 1) {
        words.forEach(word => {
          if (word.replace(/[^a-z]/g, '') === filler) {
            this.fillerCount++;
            if (!this.detectedFillers.includes(filler)) {
              this.detectedFillers.push(filler);
            }
          }
        });
      } else {
        if (text.toLowerCase().includes(filler)) {
          this.fillerCount++;
          if (!this.detectedFillers.includes(filler)) {
            this.detectedFillers.push(filler);
          }
        }
      }
    });
  }

  _getWPM() {
    if (!this.startTime || this.wordCount === 0) return 0;
    const minutes = (Date.now() - this.startTime) / 60000;
    return minutes > 0 ? Math.round(this.wordCount / minutes) : 0;
  }

  startListening() {
    if (!this.recognition) return false;
    this.isListening = true;
    this.startTime = this.startTime || Date.now();
    try {
      this.recognition.start();
      if (this.onListeningChange) this.onListeningChange(true);
      return true;
    } catch (e) {
      return false;
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) { /* ignore */ }
    }
    if (this.onListeningChange) this.onListeningChange(false);
    return this.transcript;
  }

  resetTranscript() {
    this.transcript = '';
    this.wordCount = 0;
    this.fillerCount = 0;
    this.detectedFillers = [];
    this.startTime = null;
  }

  speak(text, onEnd = null) {
    this.synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Prefer a natural English voice
    const voices = this.synthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') && v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    if (onEnd) utterance.onend = onEnd;
    this.synthesis.speak(utterance);
    return utterance;
  }

  cancelSpeech() {
    this.synthesis.cancel();
  }

  isSpeechSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  getSpeechMetrics() {
    return {
      totalWords: this.wordCount,
      fillerWordCount: this.fillerCount,
      fillerWords: [...this.detectedFillers],
      wordsPerMinute: this._getWPM(),
      fluencyScore: this._calculateFluency()
    };
  }

  _calculateFluency() {
    if (this.wordCount === 0) return 75;
    const fillerRatio = this.fillerCount / this.wordCount;
    const wpm = this._getWPM();
    // Ideal WPM: 120-160 for interviews
    const wpmScore = wpm >= 100 && wpm <= 170
      ? 100
      : wpm < 100
        ? Math.max(40, 100 - (100 - wpm) * 1.5)
        : Math.max(40, 100 - (wpm - 170) * 1.5);
    const fillerPenalty = Math.min(40, fillerRatio * 200);
    return Math.round(Math.max(20, wpmScore - fillerPenalty));
  }

  destroy() {
    this.stopListening();
    this.cancelSpeech();
  }
}

// Singleton instance
const voiceService = new VoiceService();
export default voiceService;
