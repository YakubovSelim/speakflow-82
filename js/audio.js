/**
 * SpeakFlow 82 - Audio Engine
 * Generates precise tick sounds using Web Audio API
 */

class AudioEngine {
  constructor() {
    this.context = null;
    this.soundType = 'click';
    this.volume = 0.8;
    this.initialized = false;
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  init() {
    if (this.initialized) return;
    
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Resume AudioContext if suspended (required for iOS)
   */
  resume() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  /**
   * Set sound type
   * @param {string} type - 'click', 'soft', or 'beep'
   */
  setSoundType(type) {
    this.soundType = type;
  }

  /**
   * Play a single tick sound
   */
  playTick() {
    if (!this.context) {
      this.init();
    }
    
    if (!this.context) return;

    switch (this.soundType) {
      case 'click':
        this.playClick();
        break;
      case 'soft':
        this.playSoft();
        break;
      case 'beep':
        this.playBeep();
        break;
      default:
        this.playClick();
    }
  }

  /**
   * Click sound - crisp, short percussive tick
   */
  playClick() {
    const ctx = this.context;
    const now = ctx.currentTime;
    
    // Main click oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
    
    gain.gain.setValueAtTime(this.volume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
    
    // Add noise burst for attack
    this.addNoiseBurst(now, 0.03, this.volume * 0.15);
  }

  /**
   * Soft sound - muted knock
   */
  playSoft() {
    const ctx = this.context;
    const now = ctx.currentTime;
    
    // Low thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    
    gain.gain.setValueAtTime(this.volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.1);
    
    // Muted click
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(600, now);
    
    gain2.gain.setValueAtTime(this.volume * 0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(now);
    osc2.stop(now + 0.04);
  }

  /**
   * Beep sound - clean electronic tone
   */
  playBeep() {
    const ctx = this.context;
    const now = ctx.currentTime;
    
    // Main tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    
    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.setValueAtTime(this.volume * 0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.1);
    
    // Harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now);
    
    gain2.gain.setValueAtTime(this.volume * 0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(now);
    osc2.stop(now + 0.08);
  }

  /**
   * Add noise burst for attack character
   */
  addNoiseBurst(startTime, duration, volume) {
    const ctx = this.context;
    
    // Create noise buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    // Play noise
    const noise = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  /**
   * Play session complete chime
   */
  playComplete() {
    if (!this.context) {
      this.init();
    }
    
    if (!this.context) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const start = now + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  /**
   * Play warning beep (last minute)
   */
  playWarning() {
    if (!this.context) {
      this.init();
    }
    
    if (!this.context) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 440;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.02);
    gain.gain.setValueAtTime(this.volume * 0.2, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

// Export singleton instance
window.audioEngine = new AudioEngine();
