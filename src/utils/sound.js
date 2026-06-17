// Web Audio API Sound Synthesizer for Retro 8-bit Game Sound Effects
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, type, duration, volume = 0.1, slideToFreq = null) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, ctx.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    // Exponential decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio failed to play:", e);
  }
}

export const sound = {
  playClick() {
    playTone(600, 'sine', 0.08, 0.12, 150);
  },
  
  playCorrect() {
    // Play double chime: C5 (523Hz) then E5 (659Hz)
    playTone(523.25, 'triangle', 0.15, 0.15);
    setTimeout(() => {
      playTone(659.25, 'triangle', 0.25, 0.15);
    }, 100);
  },
  
  playIncorrect() {
    // Play low buzz sliding down: 150Hz -> 80Hz
    playTone(150, 'sawtooth', 0.35, 0.15, 80);
  },
  
  playWin() {
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 'triangle', 0.2, 0.12);
      }, idx * 120);
    });
  },
  
  playGameOver() {
    const notes = [392.00, 349.23, 311.13, 246.94]; // G4, F4, Eb4, B3
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 'sawtooth', 0.3, 0.15, freq - 30);
      }, idx * 220);
    });
  },

  playJump() {
    // Quick upward sweep
    playTone(200, 'triangle', 0.12, 0.08, 800);
  }
};
