/**
 * SpeakFlow 82 - Main Application
 */

class SpeakFlowApp {
  constructor() {
    // State
    this.isPlaying = false;
    this.bpm = 82;
    this.duration = 18; // minutes
    this.beatCount = 0;
    this.secondsRemaining = this.duration * 60;
    this.selectedPreset = 'presentation';
    this.soundType = 'click';
    this.voiceEnabled = false;
    
    // Timer references
    this.metronomeInterval = null;
    this.timerInterval = null;
    this.lastBeatTime = 0;
    
    // Voice detection
    this.voiceAnalyzer = null;
    this.speechThreshold = 0.02;
    
    // DOM elements
    this.elements = {};
    
    // Presets
    this.presets = {
      presentation: { bpm: 82, duration: 15, name: 'Presentation' },
      teaching: { bpm: 72, duration: 20, name: 'Teaching' },
      practice: { bpm: 90, duration: 10, name: 'Practice' }
    };
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    this.cacheElements();
    this.loadSettings();
    this.bindEvents();
    this.updateDisplay();
    this.applyTheme();
    this.updatePulseCircle();
    
    // Check for service worker support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      // Theme
      themeToggle: document.getElementById('themeToggle'),
      
      // Main UI
      pulseCircle: document.getElementById('pulseCircle'),
      timer: document.getElementById('timer'),
      beatCount: document.getElementById('beatCount'),
      bpmDisplay: document.querySelector('.bpm-display'),
      voiceFeedback: document.getElementById('voiceFeedback'),
      feedbackText: document.getElementById('feedbackText'),
      
      // Controls
      playBtn: document.getElementById('playBtn'),
      resetBtn: document.getElementById('resetBtn'),
      soundBtn: document.getElementById('soundBtn'),
      
      // Presets
      presetBtns: document.querySelectorAll('.preset-btn'),
      
      // Settings
      settingsToggle: document.getElementById('settingsToggle'),
      settingsPanel: document.getElementById('settingsPanel'),
      bpmSlider: document.getElementById('bpmSlider'),
      bpmValue: document.getElementById('bpmValue'),
      durationSlider: document.getElementById('durationSlider'),
      durationValue: document.getElementById('durationValue'),
      soundBtns: document.querySelectorAll('.sound-btn'),
      voiceToggle: document.getElementById('voiceToggle'),
      
      // Overlay
      sessionOverlay: document.getElementById('sessionOverlay'),
      sessionStats: document.getElementById('sessionStats'),
      overlayClose: document.getElementById('overlayClose')
    };
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Play/Pause
    this.elements.playBtn.addEventListener('click', () => this.togglePlay());
    
    // Reset
    this.elements.resetBtn.addEventListener('click', () => this.reset());
    
    // Sound change
    this.elements.soundBtn.addEventListener('click', () => this.cycleSound());
    
    // Presets
    this.elements.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => this.selectPreset(btn.dataset.preset));
    });
    
    // Settings toggle
    this.elements.settingsToggle.addEventListener('click', () => this.toggleSettings());
    
    // BPM slider
    this.elements.bpmSlider.addEventListener('input', (e) => {
      this.setBpm(parseInt(e.target.value));
    });
    
    // Duration slider
    this.elements.durationSlider.addEventListener('input', (e) => {
      this.setDuration(parseInt(e.target.value));
    });
    
    // Sound selection
    this.elements.soundBtns.forEach(btn => {
      btn.addEventListener('click', () => this.selectSound(btn.dataset.sound));
    });
    
    // Voice toggle
    this.elements.voiceToggle.addEventListener('click', () => this.toggleVoice());
    
    // Overlay close
    this.elements.overlayClose.addEventListener('click', () => this.closeOverlay());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        this.togglePlay();
      }
    });
    
    // Save settings on change
    this.saveSettingsTimeout = null;
    const saveHandler = () => {
      clearTimeout(this.saveSettingsTimeout);
      this.saveSettingsTimeout = setTimeout(() => this.saveSettings(), 500);
    };
    
    [this.elements.bpmSlider, this.elements.durationSlider].forEach(el => {
      el.addEventListener('change', saveHandler);
    });
  }

  /**
   * Toggle play/pause
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Start the metronome
   */
  play() {
    // Initialize audio on first user interaction
    window.audioEngine.init();
    window.audioEngine.resume();
    
    this.isPlaying = true;
    this.elements.playBtn.classList.add('playing');
    
    // Start metronome
    const intervalMs = 60000 / this.bpm;
    const intervalSec = intervalMs / 1000;
    
    // Play first tick immediately
    this.tick();
    
    // Set up precise timing
    this.lastBeatTime = performance.now();
    
    this.metronomeInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - this.lastBeatTime;
      
      if (elapsed >= intervalMs - 1) { // Allow 1ms tolerance
        this.tick();
        this.lastBeatTime = now;
      }
    }, 10); // Check every 10ms for precision
    
    // Start countdown timer
    this.timerInterval = setInterval(() => {
      this.secondsRemaining--;
      this.updateTimerDisplay();
      
      // Warning at 1 minute
      if (this.secondsRemaining === 60) {
        this.elements.timer.classList.add('warning');
        window.audioEngine.playWarning();
      }
      
      // Session complete
      if (this.secondsRemaining <= 0) {
        this.complete();
      }
    }, 1000);
    
    // Start voice analysis if enabled
    if (this.voiceEnabled) {
      this.startVoiceAnalysis();
    }
    
    this.updatePulseCircle();
  }

  /**
   * Pause the metronome
   */
  pause() {
    this.isPlaying = false;
    this.elements.playBtn.classList.remove('playing');
    
    clearInterval(this.metronomeInterval);
    clearInterval(this.timerInterval);
    
    if (this.voiceAnalyzer) {
      this.stopVoiceAnalysis();
    }
    
    this.updatePulseCircle();
  }

  /**
   * Reset everything
   */
  reset() {
    this.pause();
    this.beatCount = 0;
    this.secondsRemaining = this.duration * 60;
    this.elements.timer.classList.remove('warning', 'complete');
    
    this.updateDisplay();
    this.elements.pulseCircle.classList.remove('pulsing');
  }

  /**
   * Complete session
   */
  complete() {
    this.pause();
    this.elements.timer.classList.add('complete');
    this.elements.timer.textContent = 'Done!';
    
    // Play completion chime
    window.audioEngine.playComplete();
    
    // Show overlay
    const totalMinutes = this.duration;
    this.elements.sessionStats.textContent = `${totalMinutes} minutes • ${this.beatCount} beats`;
    this.elements.sessionOverlay.classList.add('show');
  }

  /**
   * Close overlay
   */
  closeOverlay() {
    this.elements.sessionOverlay.classList.remove('show');
    this.reset();
  }

  /**
   * Handle a single beat
   */
  tick() {
    this.beatCount++;
    this.elements.beatCount.textContent = this.beatCount;
    
    // Play sound
    window.audioEngine.playTick();
    
    // Visual pulse
    this.pulse();
  }

  /**
   * Visual pulse animation
   */
  pulse() {
    const circle = this.elements.pulseCircle;
    circle.classList.remove('pulsing');
    
    // Trigger reflow
    void circle.offsetWidth;
    
    circle.classList.add('pulsing');
    
    // Remove class after animation
    setTimeout(() => {
      circle.classList.remove('pulsing');
    }, 100);
  }

  /**
   * Update pulse circle display
   */
  updatePulseCircle() {
    const circle = this.elements.pulseCircle;
    const label = circle.querySelector('.pulse-label');
    
    label.textContent = this.bpm;
    
    if (this.isPlaying) {
      circle.style.borderColor = 'var(--accent)';
      circle.style.boxShadow = '0 0 30px var(--accent-glow)';
    } else {
      circle.style.borderColor = 'var(--text-muted)';
      circle.style.boxShadow = 'none';
    }
  }

  /**
   * Update all displays
   */
  updateDisplay() {
    this.updateTimerDisplay();
    this.updateBeatCounter();
    this.elements.bpmSlider.value = this.bpm;
    this.elements.bpmValue.textContent = `${this.bpm} BPM`;
    this.elements.durationSlider.value = this.duration;
    this.elements.durationValue.textContent = `${this.duration} min`;
    this.elements.beatCount.textContent = this.beatCount;
    this.updatePulseCircle();
  }

  /**
   * Update timer display
   */
  updateTimerDisplay() {
    const minutes = Math.floor(this.secondsRemaining / 60);
    const seconds = this.secondsRemaining % 60;
    this.elements.timer.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Update beat counter
   */
  updateBeatCounter() {
    this.elements.bpmDisplay.textContent = `${this.bpm} BPM`;
  }

  /**
   * Set BPM
   */
  setBpm(value) {
    this.bpm = value;
    this.elements.bpmValue.textContent = `${this.bpm} BPM`;
    this.updateBeatCounter();
    this.updatePulseCircle();
    
    // Restart if playing to apply new tempo
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  /**
   * Set duration
   */
  setDuration(value) {
    this.duration = value;
    this.elements.durationValue.textContent = `${this.duration} min`;
    
    // Only update timer if not playing
    if (!this.isPlaying) {
      this.secondsRemaining = this.duration * 60;
      this.updateTimerDisplay();
    }
  }

  /**
   * Select preset
   */
  selectPreset(preset) {
    // Don't switch while playing
    if (this.isPlaying) {
      this.pause();
    }
    
    this.selectedPreset = preset;
    const config = this.presets[preset];
    
    // Update buttons
    this.elements.presetBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });
    
    // Apply settings
    this.setBpm(config.bpm);
    this.setDuration(config.duration);
    
    // Update slider values
    this.elements.bpmSlider.value = config.bpm;
    this.elements.durationSlider.value = config.duration;
    
    this.saveSettings();
  }

  /**
   * Cycle through sounds
   */
  cycleSound() {
    const sounds = ['click', 'soft', 'beep'];
    const currentIndex = sounds.indexOf(this.soundType);
    const nextIndex = (currentIndex + 1) % sounds.length;
    this.selectSound(sounds[nextIndex]);
  }

  /**
   * Select sound type
   */
  selectSound(sound) {
    this.soundType = sound;
    window.audioEngine.setSoundType(sound);
    
    // Update UI
    this.elements.soundBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sound === sound);
    });
    
    // Play preview
    if (this.isPlaying) {
      // Will apply on next tick
    } else {
      window.audioEngine.init();
      window.audioEngine.playTick();
    }
    
    this.saveSettings();
  }

  /**
   * Toggle settings panel
   */
  toggleSettings() {
    const toggle = this.elements.settingsToggle;
    const panel = this.elements.settingsPanel;
    
    toggle.classList.toggle('open');
    panel.classList.toggle('open');
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    this.applyTheme();
    this.saveSettings();
  }

  /**
   * Apply theme to CSS variables
   */
  applyTheme() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Toggle voice detection
   */
  toggleVoice() {
    if (!this.voiceEnabled) {
      // Request microphone permission
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this.voiceEnabled = true;
          this.elements.voiceToggle.classList.add('active');
          this.elements.voiceFeedback.classList.add('active');
          this.feedbackText.textContent = 'Listening...';
          
          // Keep stream reference
          this.audioStream = stream;
          
          // Initialize analyzer
          this.initVoiceAnalyzer(stream);
          this.saveSettings();
        })
        .catch(err => {
          console.warn('Microphone access denied:', err);
          this.feedbackText.textContent = 'Mic denied';
        });
    } else {
      this.voiceEnabled = false;
      this.elements.voiceToggle.classList.remove('active');
      this.elements.voiceFeedback.classList.remove('active', 'fast', 'slow');
      this.feedbackText.textContent = 'Voice off';
      
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
      }
      
      this.saveSettings();
    }
  }

  /**
   * Initialize voice analyzer
   */
  initVoiceAnalyzer(stream) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.voiceContext = new AudioContext();
    this.voiceAnalyzer = this.voiceContext.createAnalyser();
    this.voiceAnalyzer.fftSize = 256;
    
    const source = this.voiceContext.createMediaStreamSource(stream);
    source.connect(this.voiceAnalyzer);
    
    this.voiceDataArray = new Uint8Array(this.voiceAnalyzer.frequencyBinCount);
    this.analyzeVoice();
  }

  /**
   * Analyze voice input
   */
  analyzeVoice() {
    if (!this.voiceEnabled || !this.voiceAnalyzer) return;
    
    this.voiceAnalyzer.getByteFrequencyData(this.voiceDataArray);
    
    // Calculate average volume
    const average = this.voiceDataArray.reduce((a, b) => a + b) / this.voiceDataArray.length;
    const normalized = average / 255;
    
    // Update feedback
    if (normalized < 0.02) {
      this.feedbackText.textContent = 'Silence';
      this.elements.voiceFeedback.classList.remove('fast', 'slow');
      this.elements.voiceFeedback.classList.add('active');
    } else if (normalized > 0.15) {
      this.feedbackText.textContent = 'Too fast';
      this.elements.voiceFeedback.classList.remove('slow');
      this.elements.voiceFeedback.classList.add('active', 'fast');
    } else {
      this.feedbackText.textContent = 'Good pace';
      this.elements.voiceFeedback.classList.remove('fast');
      this.elements.voiceFeedback.classList.add('active');
    }
    
    // Continue analysis
    requestAnimationFrame(() => this.analyzeVoice());
  }

  /**
   * Stop voice analysis
   */
  stopVoiceAnalysis() {
    if (this.voiceAnalyzer) {
      this.voiceAnalyzer = null;
    }
    if (this.voiceContext) {
      this.voiceContext.close();
      this.voiceContext = null;
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    const settings = {
      bpm: this.bpm,
      duration: this.duration,
      soundType: this.soundType,
      voiceEnabled: this.voiceEnabled,
      preset: this.selectedPreset,
      theme: document.documentElement.getAttribute('data-theme') || 'dark'
    };
    
    localStorage.setItem('speakflow-settings', JSON.stringify(settings));
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('speakflow-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        
        this.bpm = settings.bpm || 82;
        this.duration = settings.duration || 18;
        this.soundType = settings.soundType || 'click';
        this.voiceEnabled = settings.voiceEnabled || false;
        this.selectedPreset = settings.preset || 'presentation';
        this.secondsRemaining = this.duration * 60;
        
        // Apply theme
        if (settings.theme) {
          document.documentElement.setAttribute('data-theme', settings.theme);
        }
        
        // Apply sound
        window.audioEngine.setSoundType(this.soundType);
        
        // Update UI
        this.elements.soundBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.sound === this.soundType);
        });
        
        // Update preset buttons
        this.elements.presetBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.preset === this.selectedPreset);
        });
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.speakFlowApp = new SpeakFlowApp();
});
