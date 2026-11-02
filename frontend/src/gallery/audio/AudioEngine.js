/* eslint-disable require-jsdoc */
// The gallery's sound: a recorded soundtrack in the main hall and the festival, and
// everything else (the annex ambience, footsteps, rain, chimes) synthesized with the
// Web Audio API. The context can only start after a user gesture, which is why the
// gallery opens with an "enter" button.

// Rooms with a recorded soundtrack; the others get the synthesized ambience.
const TRACKS = {main: "/audio/hikari.mp3", festival: "/audio/kagura.mp3"};
// the recordings are mastered loud; this keeps them behind the sound effects
const TRACK_LEVEL = 0.32;
const CROSSFADE_SECONDS = 2.4;

// Slow, open chords (MIDI note numbers): Cmaj9, Am9, Fmaj7#11, Gsus
const CHORDS = [
  [48, 55, 64, 71, 74],
  [45, 52, 60, 67, 71],
  [41, 48, 57, 64, 71],
  [43, 50, 57, 62, 69],
];
// Notes for the sparse glassy melody, a C major pentatonic.
const MELODY = [72, 74, 76, 79, 81, 84, 86, 88];
const CHORD_SECONDS = 9;

const midiToHz = (note) => 440 * Math.pow(2, (note - 69) / 12);

class AudioEngine {
  constructor() {
    this.context = null;
    this.musicOn = true;
    this.volume = 0.6;
    this.rainOn = false;
    // true while the gallery is open; nothing plays anywhere else on the site
    this.active = false;
    this.chordTimer = null;
    this.melodyTimer = null;
    this.room = "main";
    // room -> {element, gain}, created the first time a room's soundtrack plays
    this.tracks = {};
    // rooms whose soundtrack couldn't play; they fall back to the synthesized music
    this.failedTracks = new Set();
  }

  // Must be called from a user gesture handler (or after one, on returning to the gallery).
  start() {
    if (this.context) {
      if (this.active) return;
      this.active = true;
      this.context.resume();
      this.scheduleChords();
      this.scheduleMelody();
      this.setMusicOn(this.musicOn, 3);
      this.setRain(this.rainOn);
      this.applyRoom(0.5);
      return;
    }
    this.active = true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    this.context = context;

    this.master = context.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(context.destination);

    this.reverb = context.createConvolver();
    this.reverb.buffer = this.impulseResponse(3.2);
    const reverbReturn = context.createGain();
    reverbReturn.gain.value = 0.55;
    this.reverb.connect(reverbReturn).connect(this.master);

    this.music = context.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);
    // the music's reverb send, faded together with the music so "music off" is silent
    this.musicWet = context.createGain();
    this.musicWet.gain.value = 0;
    this.musicWet.connect(this.reverb);

    // the synthesized ambience, faded in only in rooms without a soundtrack
    this.synth = context.createGain();
    this.synth.gain.value = 0;
    this.synth.connect(this.music);
    this.synth.connect(this.musicWet);

    this.sfx = context.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);

    this.noise = this.noiseBuffer(2);
    this.startRain();
    this.scheduleChords();
    this.scheduleMelody();
    this.setMusicOn(this.musicOn, 4);
    this.applyRoom(0.5);

    document.addEventListener("visibilitychange", () => {
      const track = this.tracks[this.room];
      if (document.hidden) {
        context.suspend();
        track?.element.pause();
      } else if (this.active) {
        context.resume();
        if (track && this.musicOn && !this.failedTracks.has(this.room)) this.playTrack(this.room);
      }
    });
  }

  // Leaving the gallery: fade everything out and pause the audio engine.
  stop() {
    if (!this.context || !this.active) return;
    this.active = false;
    clearTimeout(this.chordTimer);
    clearTimeout(this.melodyTimer);
    const now = this.context.currentTime;
    [this.music.gain, this.musicWet.gain, this.rainGain.gain].forEach((gain) => {
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(0, now, 0.1);
    });
    setTimeout(() => {
      if (this.active) return;
      this.context.suspend();
      Object.values(this.tracks).forEach(({element}) => element.pause());
    }, 500);
  }

  // The soundtrack element for a room, wired into the music bus.
  track(room) {
    if (!TRACKS[room]) return null;
    if (!this.tracks[room]) {
      const element = new Audio(TRACKS[room]);
      element.loop = true;
      element.preload = "auto";
      element.addEventListener("error", () => this.trackFailed(room));
      const gain = this.context.createGain();
      gain.gain.value = 0;
      this.context.createMediaElementSource(element).connect(gain).connect(this.music);
      this.tracks[room] = {element, gain};
    }
    return this.tracks[room];
  }

  // Walking into another room crossfades to its music.
  setRoom(room) {
    if (room === this.room) return;
    this.room = room;
    if (this.context && this.active) this.applyRoom(CROSSFADE_SECONDS);
  }

  // whether this room plays its recording (otherwise the synthesized music)
  hasTrack(room = this.room) {
    return Boolean(TRACKS[room]) && !this.failedTracks.has(room);
  }

  playTrack(room) {
    this.track(room).element.play().catch(() => this.trackFailed(room));
  }

  // A missing file, an undecodable one or a blocked play() falls back to the synthesized music.
  trackFailed(room) {
    if (this.failedTracks.has(room)) return;
    console.warn(`[igallery] the ${room} soundtrack can't play; using the synthesized music instead`);
    this.failedTracks.add(room);
    if (this.context && this.active && room === this.room) this.applyRoom(1);
  }

  applyRoom(fadeSeconds) {
    const now = this.context.currentTime;
    const ease = fadeSeconds / 3;
    this.synth.gain.setTargetAtTime(this.hasTrack() ? 0 : 1, now, ease);
    Object.keys(TRACKS).forEach((room) => {
      if (room === this.room && this.hasTrack(room)) {
        // with music off nothing is downloaded or played
        if (this.musicOn) this.playTrack(room);
        this.track(room).gain.gain.setTargetAtTime(TRACK_LEVEL, now, ease);
      } else if (this.tracks[room]) {
        this.tracks[room].gain.gain.setTargetAtTime(0, now, ease);
        // pause once it has faded, unless the visitor came straight back
        setTimeout(() => {
          if (this.room !== room || !this.hasTrack(room)) this.tracks[room].element.pause();
        }, fadeSeconds * 1000 + 600);
      }
    });
  }

  impulseResponse(seconds) {
    const {sampleRate} = this.context;
    const length = Math.floor(sampleRate * seconds);
    const buffer = this.context.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
    return buffer;
  }

  noiseBuffer(seconds) {
    const {sampleRate} = this.context;
    const buffer = this.context.createBuffer(1, sampleRate * seconds, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  scheduleChords() {
    let index = 0;
    const playNext = () => {
      // only build the synth voices where they can be heard
      if (this.musicOn && !this.hasTrack()) this.playChord(CHORDS[index % CHORDS.length]);
      index++;
      this.chordTimer = setTimeout(playNext, CHORD_SECONDS * 1000);
    };
    playNext();
  }

  playChord(notes) {
    const context = this.context;
    const now = context.currentTime;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.3;
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    lfo.frequency.value = 0.07;
    lfoDepth.gain.value = 350;
    lfo.connect(lfoDepth).connect(filter.frequency);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.055, now + 3);
    envelope.gain.setValueAtTime(0.055, now + CHORD_SECONDS - 1);
    envelope.gain.linearRampToValueAtTime(0, now + CHORD_SECONDS + 3);
    filter.connect(envelope).connect(this.synth);

    const end = now + CHORD_SECONDS + 3.2;
    notes.forEach((note) => {
      [-6, 6].forEach((detune) => {
        const oscillator = context.createOscillator();
        oscillator.type = note < 52 ? "sine" : "triangle";
        oscillator.frequency.value = midiToHz(note);
        oscillator.detune.value = detune;
        oscillator.connect(filter);
        oscillator.start(now);
        oscillator.stop(end);
      });
    });
    lfo.start(now);
    lfo.stop(end);
  }

  scheduleMelody() {
    const playNext = () => {
      if (this.musicOn && !this.hasTrack() && Math.random() < 0.75) this.bell(MELODY[Math.floor(Math.random() * MELODY.length)], 0.035, this.synth);
      this.melodyTimer = setTimeout(playNext, 1400 + Math.random() * 3200);
    };
    this.melodyTimer = setTimeout(playNext, 3000);
  }

  bell(note, level, destination = this.sfx) {
    const context = this.context;
    const now = context.currentTime;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(level, now + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    envelope.connect(destination);
    // sound effects get their own reverb; the music bus already sends to it
    if (destination === this.sfx) envelope.connect(this.reverb);
    // a bell is a fundamental plus a few inharmonic partials
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([ratio, gain]) => {
      const oscillator = context.createOscillator();
      const partial = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = midiToHz(note) * ratio;
      partial.gain.value = gain;
      oscillator.connect(partial).connect(envelope);
      oscillator.start(now);
      oscillator.stop(now + 2.7);
    });
  }

  noiseBurst({duration, frequency, q = 1, level, type = "bandpass", sweepTo, destination = this.sfx}) {
    if (!this.context) return;
    const context = this.context;
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    source.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, now);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
    filter.Q.value = q;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(level, now + Math.min(0.01, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(envelope).connect(destination);
    source.start(now, Math.random() * 1.5);
    source.stop(now + duration + 0.05);
  }

  startRain() {
    const context = this.context;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.4;
    this.rainGain = context.createGain();
    this.rainGain.gain.value = 0;
    source.connect(filter).connect(this.rainGain).connect(this.master);
    source.start();
  }

  setRain(on) {
    this.rainOn = on;
    if (!this.context || !this.active) return;
    this.rainGain.gain.setTargetAtTime(on ? 0.12 : 0, this.context.currentTime, 1.2);
  }

  setMusicOn(on, fadeSeconds = 1.5) {
    const changed = on !== this.musicOn;
    this.musicOn = on;
    if (!this.context || !this.active) return;
    const now = this.context.currentTime;
    [this.music.gain, this.musicWet.gain].forEach((gain) => {
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(on ? 1 : 0, now + fadeSeconds);
    });
    if (!changed) return;
    const track = this.tracks[this.room];
    if (on && this.hasTrack()) this.playTrack(this.room);
    // pause the recording once it has faded out, so it stops streaming
    if (!on && track) setTimeout(() => !this.musicOn && track.element.pause(), fadeSeconds * 1000 + 200);
  }

  setVolume(volume) {
    this.volume = volume;
    if (this.context) this.master.gain.setTargetAtTime(volume, this.context.currentTime, 0.1);
  }

  footstep() {
    this.noiseBurst({duration: 0.09, frequency: 700 + Math.random() * 300, q: 1.2, level: 0.18, type: "lowpass"});
  }

  chime() {
    if (this.context) this.bell(84, 0.06);
  }

  whoosh() {
    this.noiseBurst({duration: 1.4, frequency: 180, sweepTo: 3200, q: 2, level: 0.35});
    if (this.context) setTimeout(() => this.bell(79, 0.05), 500);
  }

  shutter() {
    this.noiseBurst({duration: 0.05, frequency: 3000, q: 0.8, level: 0.4, type: "highpass"});
    setTimeout(() => this.noiseBurst({duration: 0.07, frequency: 1800, q: 0.8, level: 0.3, type: "highpass"}), 90);
  }

  bounce(strength) {
    this.noiseBurst({duration: 0.12, frequency: 160 + strength * 120, q: 3, level: Math.min(0.35, strength * 0.12), type: "lowpass"});
  }

  // a distant firework: a low thump, then crackle
  firework() {
    if (!this.context || !this.active) return;
    this.noiseBurst({duration: 0.7, frequency: 110, q: 0.8, level: 0.16, type: "lowpass"});
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.noiseBurst({duration: 0.05, frequency: 3500 + Math.random() * 2000, q: 1, level: 0.025, type: "highpass"}), 350 + i * 90 + Math.random() * 80);
    }
  }

  click() {
    this.noiseBurst({duration: 0.03, frequency: 2500, q: 3, level: 0.12});
  }
}

const audio = new AudioEngine();
export default audio;
