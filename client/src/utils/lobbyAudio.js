// ═══════════════════════════════════════════════════════════════
// Lobby Audio Singleton Manager
// Ensures Alma's song can be unlocked during user interaction (e.g. Join)
// and seamlessly continues playing on mobile without requiring a manual tap.
// Immediately kills audio and blocks playback once match is underway.
// ═══════════════════════════════════════════════════════════════

import socket from '../socket';

class LobbyAudioManager {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = 0.35;
    this.isUnlocked = false;
    this.isGameActive = false;
    this.listeners = new Set();

    // Automatically kill lobby music the instant the game or a round starts
    if (typeof window !== 'undefined' && socket) {
      socket.on('game-started', () => {
        this.isGameActive = true;
        this.stop();
      });
      socket.on('round-started', () => {
        this.isGameActive = true;
        this.stop();
      });
    }
  }

  getAudio() {
    if (typeof window === 'undefined') return null;
    if (!this.audio) {
      this.audio = new Audio('/almaCancion.mp3');
      this.audio.loop = true;
      this.audio.volume = this.volume;

      this.audio.onplay = () => {
        this.isPlaying = true;
        this.notify();
      };
      this.audio.onpause = () => {
        this.isPlaying = false;
        this.notify();
      };
      this.audio.onerror = (e) => {
        console.warn('[LobbyAudio] Audio error:', e);
        this.isPlaying = false;
        this.notify();
      };
    }
    return this.audio;
  }

  // Pre-unlock and start playing synchronously during a direct user touch/click
  unlockAndPlay(volume = 0.35) {
    if (this.isGameActive) return;

    const a = this.getAudio();
    if (!a) return;
    this.volume = volume;
    a.volume = volume;
    this.isUnlocked = true;

    const p = a.play();
    if (p !== undefined) {
      p.then(() => {
        this.isPlaying = true;
        this.notify();
      }).catch((err) => {
        console.log('[LobbyAudio] Autoplay pending next gesture:', err);
      });
    }
  }

  play(volume = null) {
    if (this.isGameActive) return Promise.resolve();

    const a = this.getAudio();
    if (!a) return Promise.reject(new Error('No audio context'));
    if (volume !== null) {
      this.volume = volume;
      a.volume = volume;
    }
    return a.play();
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      this.notify();
    }
  }

  resetGameActive() {
    this.isGameActive = false;
  }

  togglePlay(volume = null) {
    if (this.isGameActive) return;
    const a = this.getAudio();
    if (!a) return;
    if (this.isPlaying) {
      a.pause();
    } else {
      if (volume !== null) {
        this.volume = volume;
        a.volume = volume;
      }
      a.play().catch(console.warn);
    }
  }

  toggleMute() {
    const a = this.getAudio();
    if (!a) return;
    a.muted = !a.muted;
    this.isMuted = a.muted;
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = { isPlaying: this.isPlaying, isMuted: this.isMuted };
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.error('[LobbyAudio] Listener error:', err);
      }
    });
  }
}

export const lobbyAudioManager = new LobbyAudioManager();
