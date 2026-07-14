/* =====================================================================
   오디오 엔진 — 배경음악 · 효과음 · 음성 내레이션
   외부 파일 없이 Web Audio API + SpeechSynthesis로 실시간 생성
   ===================================================================== */
const GameAudio = (function () {
  let actx = null;
  let master = null;
  const S = { sfxOn: true, musicOn: true, voiceOn: true, timer: null, step: 0 };

  function init() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.9;
      master.connect(actx.destination);
    } catch (e) { actx = null; }
  }
  function resume() { if (actx && actx.state === "suspended") actx.resume(); }

  /* 단순 음 하나 */
  function tone(freq, type, dur, vol, when, attack) {
    if (!actx || !S.sfxOn) return;
    when = when || 0; attack = attack || 0.008;
    const t = actx.currentTime + when;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }
  /* 필터된 노이즈 (나무·금속 마찰음) */
  function noise(dur, vol, when) {
    if (!actx || !S.sfxOn) return;
    when = when || 0;
    const t = actx.currentTime + when;
    const n = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, n, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = actx.createBufferSource(); src.buffer = buf;
    const g = actx.createGain(); g.gain.value = vol;
    const f = actx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }

  const SFX = {
    click()   { tone(420, "sine", 0.05, 0.08, 0, 0.002); },
    pickup()  { tone(659, "triangle", 0.12, 0.25, 0, 0.005); tone(988, "triangle", 0.16, 0.22, 0.09, 0.005); },
    open()    { noise(0.18, 0.22, 0); tone(130, "triangle", 0.25, 0.28, 0, 0.005); },
    door()    { tone(160, "sawtooth", 0.4, 0.16, 0, 0.01); tone(90, "sine", 0.5, 0.2, 0.05, 0.01); noise(0.3, 0.14, 0); },
    error()   { tone(140, "sawtooth", 0.18, 0.26, 0, 0.005); tone(115, "sawtooth", 0.2, 0.26, 0.16, 0.005); },
    success() { [523, 659, 784, 1046].forEach((f, i) => tone(f, "triangle", 0.3, 0.2, i * 0.09, 0.005)); },
    tick()    { tone(1200, "square", 0.03, 0.1, 0, 0.001); },
    wind()    { for (let i = 0; i < 6; i++) tone(280 + i * 45, "square", 0.045, 0.07, i * 0.05, 0.001); },
    unlock()  { noise(0.4, 0.2, 0); tone(80, "sine", 0.6, 0.24, 0, 0.01); tone(523, "triangle", 0.3, 0.2, 0.2, 0.005); tone(784, "triangle", 0.45, 0.2, 0.35, 0.005); },
    win()     { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, "triangle", 0.5, 0.24, i * 0.12, 0.005)); tone(261, "sine", 1.3, 0.14, 0, 0.02); },
  };
  function play(name) { init(); resume(); if (SFX[name]) SFX[name](); }

  /* 배경음악 — 오르골풍 잔잔한 루프 (A단조) */
  const MEL = [440, 523, 659, 587, 523, 440, 392, 0, 349, 440, 523, 494, 440, 392, 330, 0];
  function startMusic() {
    init(); resume(); stopMusic(); S.step = 0;
    if (!S.musicOn || !actx) return;
    S.timer = setInterval(() => {
      if (!S.musicOn || !actx) return;
      const f = MEL[S.step % MEL.length]; S.step++;
      if (f <= 0) return;
      const t = actx.currentTime;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.65);
      if (S.step % 4 === 1) { // 부드러운 베이스
        const o2 = actx.createOscillator(), g2 = actx.createGain();
        o2.type = "sine"; o2.frequency.value = f / 2;
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.exponentialRampToValueAtTime(0.04, t + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        o2.connect(g2).connect(master); o2.start(t); o2.stop(t + 0.85);
      }
    }, 360);
  }
  function stopMusic() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }

  /* 음성 내레이션 (한국어 TTS) */
  function speak(text) {
    if (!S.voiceOn || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const clean = text.replace(/[—–]/g, ", ").replace(/["""]/g, "");
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "ko-KR"; u.rate = 1.0; u.pitch = 1.0;
      const ko = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith("ko"));
      if (ko) u.voice = ko;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function stopSpeak() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
  if ("speechSynthesis" in window) {
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
  }

  return {
    init, resume, play, startMusic, stopMusic, speak, stopSpeak,
    toggleSound() {
      const on = !S.sfxOn; S.sfxOn = on; S.musicOn = on;
      if (on) startMusic(); else stopMusic();
      return on;
    },
    toggleVoice() {
      S.voiceOn = !S.voiceOn;
      if (!S.voiceOn) stopSpeak();
      return S.voiceOn;
    },
  };
})();
