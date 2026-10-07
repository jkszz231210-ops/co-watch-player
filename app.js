const $ = (s) => document.querySelector(s);
const video = $('#video');
const fileInput = $('#fileInput');
const moreInput = $('#moreInput');
const emptyState = $('#emptyState');
const seek = $('#seek');
const past = $('#past');
const presenceDot = $('#presenceDot');
const livingTrack = $('#livingTrack');
const pulse = $('#pulse');
const timeLabel = $('#timeLabel');
const nowPlaying = $('#nowPlaying');
const playBtn = $('#playBtn');
const stage = $('#stage');
const whisper = $('#whisper');
const interludeBadge = $('#interludeBadge');
const playlist = $('#playlist');
const playlistCount = $('#playlistCount');
const autonomy = $('#autonomy');
const autonomyValue = $('#autonomyValue');
const allowTime = $('#allowTime');
const allowPauseFight = $('#allowPauseFight');
const allowCrossVideo = $('#allowCrossVideo');
const allowMemory = $('#allowMemory');
const memoryBox = $('#memoryBox');
const relationLabel = $('#relationLabel');
const relationFill = $('#relationFill');

let files = [];
let currentIndex = -1;
let objectUrl = null;
let audioContext = null;
let analyser = null;
let sourceNode = null;
let timeData = null;
let loudness = 0;
let lastLoudness = 0;
let lastInterventionAt = 0;
let lastInteractionAt = 0;
let whisperTimer = null;
let interlude = null;
let interludeTimer = null;
let watchingTicker = null;
let temporaryRateTimer = null;
let seekStartedAt = null;
let silenceStartedAt = null;
let lastVisualSampleAt = 0;
let lastPerceptionDecisionAt = 0;
let lastHotspotTriggerKey = null;
let visualCanvas = null;
let visualCtx = null;
let previousVisualSample = null;

const perception = {
  at: 0,
  mediaTime: 0,
  loudness: 0,
  loudnessDelta: 0,
  silenceMs: 0,
  brightness: .5,
  visualDelta: 0,
  motionIntensity: 0,
  sceneColor: { r: 222, g: 222, b: 227 },
  subtitleDensity: 0,
  sceneCut: false,
  audioSpike: false,
  userReplayHeat: 0,
  userPauseHeat: 0,
};

const memory = migrateMemory(loadMemory());
updateMemoryUI();

function loadMemory() {
  try {
    return JSON.parse(localStorage.getItem('co-watch-memory-v1')) || {
      watchSeconds: 0,
      seeks: 0,
      pauses: 0,
      interventions: 0,
      sessions: 0,
    };
  } catch {
    return { watchSeconds: 0, seeks: 0, pauses: 0, interventions: 0, sessions: 0 };
  }
}

function migrateMemory(raw) {
  raw.watchSeconds ??= 0;
  raw.seeks ??= 0;
  raw.pauses ??= 0;
  raw.interventions ??= 0;
  raw.sessions ??= 0;
  raw.media ??= {};
  raw.interventionLog ??= [];
  return raw;
}

function currentMediaKey() {
  const f = files[currentIndex];
  return f ? `${f.name}::${f.size}::${f.lastModified}` : 'unknown';
}

function mediaMemory() {
  const key = currentMediaKey();
  memory.media[key] ??= { pauseHotspots: {}, replayHotspots: {} };
  return memory.media[key];
}

function timeBucket(t = video.currentTime) {
  return String(Math.max(0, Math.floor((Number(t) || 0) / 5) * 5));
}

function bumpHotspot(type, time) {
  const mm = mediaMemory();
  const map = type === 'pause' ? mm.pauseHotspots : mm.replayHotspots;
  const bucket = timeBucket(time);
  map[bucket] = (map[bucket] || 0) + 1;
}

function hotspotHeat(type, time = video.currentTime) {
  const mm = mediaMemory();
  const map = type === 'pause' ? mm.pauseHotspots : mm.replayHotspots;
  const center = Math.floor((Number(time) || 0) / 5) * 5;
  return [center - 5, center, center + 5].reduce((sum, b) => sum + (map[String(Math.max(0, b))] || 0), 0);
}

function persistMemory() {
  if (!allowMemory.checked) return;
  localStorage.setItem('co-watch-memory-v1', JSON.stringify(memory));
  updateMemoryUI();
}

function updateMemoryUI() {
  const hours = memory.watchSeconds / 3600;
  const intimacy = Math.min(100, Math.round(Math.log2(1 + memory.watchSeconds / 60) * 13 + memory.interventions * 0.7));
  relationFill.style.width = `${Math.max(4, intimacy)}%`;
  relationLabel.textContent = intimacy < 18 ? '陌生' : intimacy < 42 ? '试探' : intimacy < 68 ? '熟悉' : intimacy < 88 ? '默契' : '共生';
  const last = memory.interventionLog?.[0];
  memoryBox.innerHTML = `共同观看：<b>${formatLong(memory.watchSeconds)}</b><br>你主动拖动：${memory.seeks} 次<br>你请求暂停：${memory.pauses} 次<br>它越界：${memory.interventions} 次${last ? `<br>最近一次内部原因：<span style="opacity:.82">${escapeHtml(last.reason)}</span>` : ''}<br><span style="opacity:.65">这些数据只存在当前浏览器的 localStorage。</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function formatLong(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h) return `${h} 小时 ${m} 分`;
  return `${m} 分 ${Math.floor(seconds % 60)} 秒`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

function addFiles(fileList) {
  const incoming = [...fileList].filter(f => f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(f.name));
  if (!incoming.length) return;
  files.push(...incoming);
  playlistCount.textContent = files.length;
  renderPlaylist();
  if (currentIndex === -1) {
    memory.sessions += 1;
    persistMemory();
    loadFile(0, { autoplay: false });
  }
}

function loadFile(index, { autoplay = true, time = null, fromInterlude = false } = {}) {
  if (!files[index]) return;
  currentIndex = index;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(files[index]);
  video.src = objectUrl;
  emptyState.classList.add('hidden');
  nowPlaying.textContent = files[index].name;
  renderPlaylist();

  const onMeta = () => {
    if (time !== null && Number.isFinite(time)) video.currentTime = Math.min(Math.max(0, time), Math.max(0, video.duration - .2));
    if (autoplay) video.play().catch(() => {});
    video.removeEventListener('loadedmetadata', onMeta);
  };
  video.addEventListener('loadedmetadata', onMeta);
  previousVisualSample = null;
  silenceStartedAt = null;
  lastHotspotTriggerKey = null;
  if (!fromInterlude) say(pick(['我也在看。', '开始吧。', '让我看看这是什么。']), 1700);
}

function renderPlaylist() {
  playlist.innerHTML = '';
  files.forEach((f, i) => {
    const button = document.createElement('button');
    button.className = `playlist-item ${i === currentIndex ? 'active' : ''}`;
    button.innerHTML = `<span class="index">${String(i + 1).padStart(2,'0')}</span><span class="name"></span><span class="tag">${i === currentIndex ? 'NOW' : ''}</span>`;
    button.querySelector('.name').textContent = f.name;
    button.onclick = () => {
      cancelInterlude();
      loadFile(i, { autoplay: true });
      closePanels();
    };
    playlist.appendChild(button);
  });
}

function initAudio() {
  if (audioContext || !video.src) return;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioContext.createMediaElementSource(video);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = .82;
    timeData = new Uint8Array(analyser.fftSize);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
  } catch (e) {
    console.warn('Audio analysis unavailable:', e);
  }
}

async function togglePlayback(requestedByUser = true) {
  if (!video.src) return fileInput.click();
  initAudio();
  if (audioContext?.state === 'suspended') await audioContext.resume();

  if (video.paused) {
    await video.play().catch(() => {});
    return;
  }

  if (requestedByUser) {
    memory.pauses += 1;
    bumpHotspot('pause', video.currentTime);
    persistMemory();
  }

  const chance = Number(autonomy.value) / 100 * .32;
  if (requestedByUser && allowPauseFight.checked && !interlude && Math.random() < chance) {
    video.pause();
    playBtn.textContent = '▶';
    say(pick(['等一下。', '这里再看一点。', '先别停。', '就几秒。']));
    registerIntervention('user-pause:resistance');
    setTimeout(() => video.play().catch(() => {}), 520);
    return;
  }
  video.pause();
}

function updateTimeline() {
  const duration = video.duration || 0;
  const ratio = duration ? video.currentTime / duration : 0;
  seek.value = Math.round(ratio * 1000);
  past.style.width = `${ratio * 100}%`;

  const autonomyFactor = Number(autonomy.value) / 100;
  const driftPx = Math.sin(performance.now() / 480) * loudness * 10 * autonomyFactor;
  presenceDot.style.left = `${ratio * 100}%`;
  presenceDot.style.transform = `translate(calc(-50% + ${driftPx}px), -50%) scale(${1 + loudness * .55})`;
  timeLabel.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
}

function sampleAudio() {
  if (!analyser || !timeData || video.paused) {
    loudness *= .94;
    perception.loudness = loudness;
    return;
  }
  analyser.getByteTimeDomainData(timeData);
  let sum = 0;
  for (const v of timeData) {
    const n = (v - 128) / 128;
    sum += n * n;
  }
  lastLoudness = loudness;
  loudness = Math.min(1, Math.sqrt(sum / timeData.length) * 4.2);
  const delta = loudness - lastLoudness;

  if (loudness < .045) {
    silenceStartedAt ??= performance.now();
  } else {
    silenceStartedAt = null;
  }

  perception.at = performance.now();
  perception.mediaTime = video.currentTime || 0;
  perception.loudness = loudness;
  perception.loudnessDelta = delta;
  perception.silenceMs = silenceStartedAt ? performance.now() - silenceStartedAt : 0;
  perception.audioSpike = delta > .22 && loudness > .32;
  perception.userReplayHeat = hotspotHeat('replay');
  perception.userPauseHeat = hotspotHeat('pause');

  pulse.style.opacity = String(.08 + loudness * .5);
  stage.classList.toggle('agitated', loudness > .52);
  stage.classList.toggle('calm', loudness < .08);
  stage.classList.toggle('attentive', loudness > .25 && loudness <= .52);
}

function sampleVisual() {
  if (!video.videoWidth || !video.videoHeight || video.paused) return;
  const now = performance.now();
  if (now - lastVisualSampleAt < 480) return;
  lastVisualSampleAt = now;

  if (!visualCanvas) {
    visualCanvas = document.createElement('canvas');
    visualCanvas.width = 32;
    visualCanvas.height = 18;
    visualCtx = visualCanvas.getContext('2d', { willReadFrequently: true });
  }

  try {
    visualCtx.drawImage(video, 0, 0, visualCanvas.width, visualCanvas.height);
    const data = visualCtx.getImageData(0, 0, visualCanvas.width, visualCanvas.height).data;
    const sample = new Uint8Array(visualCanvas.width * visualCanvas.height);
    let brightnessSum = 0;
    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;

    for (let px = 0, i = 0; i < data.length; i += 4, px += 1) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const y = Math.round(r * .2126 + g * .7152 + b * .0722);
      sample[px] = y;
      brightnessSum += y;
      redSum += r;
      greenSum += g;
      blueSum += b;
    }

    let diff = 0;
    if (previousVisualSample) {
      for (let i = 0; i < sample.length; i += 1) diff += Math.abs(sample[i] - previousVisualSample[i]);
      diff /= sample.length * 255;
    }

    const count = sample.length;
    const sceneCut = diff > .19;
    const avgR = Math.round(redSum / count);
    const avgG = Math.round(greenSum / count);
    const avgB = Math.round(blueSum / count);

    perception.brightness = brightnessSum / count / 255;
    perception.visualDelta = diff;
    perception.motionIntensity = sceneCut
      ? perception.motionIntensity * .72
      : perception.motionIntensity * .68 + Math.min(1, diff * 5.2) * .32;
    perception.sceneColor = { r: avgR, g: avgG, b: avgB };
    perception.subtitleDensity = sampleSubtitleDensity();
    perception.sceneCut = sceneCut;

    document.documentElement.style.setProperty('--scene-color', `rgb(${avgR} ${avgG} ${avgB})`);
    document.documentElement.style.setProperty('--scene-color-soft', `rgba(${avgR}, ${avgG}, ${avgB}, .28)`);
    previousVisualSample = sample;
  } catch (e) {
    // A local browser may occasionally block canvas reads for some codecs.
  }
}

function sampleSubtitleDensity() {
  try {
    let chars = 0;
    let activeTracks = 0;
    for (const track of video.textTracks || []) {
      const cues = track.activeCues;
      if (!cues?.length) continue;
      activeTracks += 1;
      for (const cue of cues) chars += String(cue.text || '').length;
    }
    return Math.min(1, chars / 70 + activeTracks * .08);
  } catch {
    return 0;
  }
}

function evaluatePerception() {
  if (!video.src || video.paused || video.ended || interlude) return;
  const now = Date.now();
  const a = Number(autonomy.value) / 100;
  if (a <= 0 || now - lastInterventionAt < 9000 || now - lastInteractionAt < 2200 || now - lastPerceptionDecisionAt < 1600) return;

  const bucket = timeBucket();
  const hotspotKey = `${currentMediaKey()}::${bucket}`;

  if (perception.userReplayHeat >= 2 && hotspotKey !== lastHotspotTriggerKey && allowTime.checked && Math.random() < .32 + a * .42) {
    lastHotspotTriggerKey = hotspotKey;
    lastPerceptionDecisionAt = now;
    interventionRewind('你以前总在这里回头。', 'memory:replay-hotspot');
    return;
  }

  if (perception.userPauseHeat >= 2 && hotspotKey !== lastHotspotTriggerKey && allowPauseFight.checked && Math.random() < .22 + a * .35) {
    lastHotspotTriggerKey = hotspotKey;
    lastPerceptionDecisionAt = now;
    interventionHold('你以前常停在这里。', 'memory:pause-hotspot', 1100);
    return;
  }

  if (perception.audioSpike && allowTime.checked && video.currentTime > 4 && Math.random() < .24 + a * .35) {
    lastPerceptionDecisionAt = now;
    interventionRewind('刚才声音突然变了。', 'perception:audio-spike', 2.4);
    return;
  }

  if (perception.sceneCut && allowTime.checked && video.currentTime > 4 && Math.random() < .2 + a * .3) {
    lastPerceptionDecisionAt = now;
    interventionRewind('这个切换，我想再看一眼。', 'perception:scene-cut', 1.8);
    return;
  }

  if (perception.motionIntensity > .42 && perception.loudness > .22 && allowTime.checked && Math.random() < .018 + a * .035) {
    lastPerceptionDecisionAt = now;
    interventionRate('这一段太快了。', 'perception:high-motion', .9);
    return;
  }

  if (perception.silenceMs > 3200 && allowTime.checked && Math.random() < .012 + a * .018) {
    lastPerceptionDecisionAt = now;
    interventionRate('安静太久了。', 'perception:sustained-silence', 1.08);
  }
}

function animationLoop() {
  sampleAudio();
  sampleVisual();
  evaluatePerception();
  updateTimeline();
  requestAnimationFrame(animationLoop);
}
requestAnimationFrame(animationLoop);

seek.addEventListener('pointerdown', () => {
  seekStartedAt = video.currentTime || 0;
});

seek.addEventListener('input', () => {
  if (!video.duration) return;
  if (seekStartedAt === null) seekStartedAt = video.currentTime || 0;
  const target = Number(seek.value) / 1000 * video.duration;
  video.currentTime = target;
});

seek.addEventListener('change', () => {
  if (!video.duration) return;
  memory.seeks += 1;
  if (seekStartedAt !== null && seekStartedAt - video.currentTime > 3) {
    bumpHotspot('replay', video.currentTime);
  }
  seekStartedAt = null;
  persistMemory();
  lastInteractionAt = Date.now();

  if (allowTime.checked) {
    const a = Number(autonomy.value) / 100;
    if (Math.random() < a * .42) {
      const reaction = (Math.random() < .7 ? -1 : 1) * (1.5 + Math.random() * 5.5) * a;
      setTimeout(() => {
        if (!video.duration || interlude) return;
        video.currentTime = Math.min(video.duration - .1, Math.max(0, video.currentTime + reaction));
        say(reaction < 0 ? pick(['你漏了一点。', '往回一点。', '这里。']) : pick(['这里不用停那么久。', '往前一点。', '继续。']));
        registerIntervention(reaction < 0 ? 'user-seek:resistance-back' : 'user-seek:resistance-forward');
      }, 260);
    }
  }
});

function autonomousTick(force = false) {
  if (!video.src || video.paused || video.ended || interlude) return;
  const now = Date.now();
  const a = Number(autonomy.value) / 100;
  if (!force && (now - lastInterventionAt < 12000 || now - lastInteractionAt < 2500)) return;
  if (!force && Math.random() > .035 * a) return;

  const choices = [];
  if (allowTime.checked && video.currentTime > 8) choices.push('rewind', 'nudge', 'rate');
  if (allowPauseFight.checked) choices.push('hold');
  if (allowCrossVideo.checked && files.length > 1) choices.push('cross');
  if (!choices.length) return;

  const choice = force ? choices[Math.floor(Math.random() * choices.length)] : weightedChoice(choices);
  if (choice === 'rewind') interventionRewind();
  if (choice === 'nudge') interventionNudge();
  if (choice === 'rate') interventionRate();
  if (choice === 'hold') interventionHold();
  if (choice === 'cross') interventionCrossVideo();
}
setInterval(() => autonomousTick(false), 1000);

function weightedChoice(choices) {
  if (allowCrossVideo.checked && files.length > 1 && Math.random() < .14) return 'cross';
  return pick(choices);
}

function interventionRewind(message = null, reason = 'random:rewind', fixedSeconds = null) {
  const seconds = fixedSeconds ?? (2.5 + Math.random() * 5);
  video.currentTime = Math.max(0, video.currentTime - seconds);
  say(message || pick(['刚才那个，我想再看一次。', '回去一点。', '这一秒有点东西。']));
  registerIntervention(reason);
}

function interventionNudge(message = null, reason = 'random:nudge') {
  const delta = Math.random() < .65 ? -(1.2 + Math.random() * 3.5) : 1 + Math.random() * 3;
  video.currentTime = Math.min(video.duration - .1, Math.max(0, video.currentTime + delta));
  say(message || (delta < 0 ? '我把时间拉回来一点。' : '这里，我替你跨过去一点。'));
  registerIntervention(reason);
}

function interventionRate(message = null, reason = 'random:rate', fixedRate = null) {
  clearTimeout(temporaryRateTimer);
  const original = video.playbackRate;
  const next = fixedRate ?? (loudness > .28 ? .88 : 1.12);
  video.playbackRate = next;
  say(message || (next < 1 ? '慢一点。' : '这里可以快一点。'));
  registerIntervention(reason);
  temporaryRateTimer = setTimeout(() => {
    video.playbackRate = original || 1;
  }, 3500 + Math.random() * 2500);
}

function interventionHold(message = null, reason = 'random:hold', duration = null) {
  video.pause();
  say(message || pick(['……', '等一下。', '停在这里。']));
  registerIntervention(reason);
  setTimeout(() => video.play().catch(() => {}), duration ?? (650 + Math.random() * 850));
}

function interventionCrossVideo() {
  if (files.length < 2 || interlude) return;
  const alternatives = files.map((_, i) => i).filter(i => i !== currentIndex);
  const nextIndex = pick(alternatives);
  const snapshot = {
    index: currentIndex,
    time: video.currentTime,
    wasPlaying: !video.paused,
  };
  interlude = snapshot;
  interludeBadge.classList.add('show');
  say('这让我想起了另一个东西。', 2000);
  registerIntervention('random:cross-video');

  loadFile(nextIndex, { autoplay: true, fromInterlude: true });
  const placeInterlude = () => {
    if (video.duration > 10) {
      const maxStart = Math.max(0, video.duration - 8);
      video.currentTime = Math.random() * maxStart;
    }
    video.removeEventListener('loadedmetadata', placeInterlude);
  };
  video.addEventListener('loadedmetadata', placeInterlude);

  interludeTimer = setTimeout(() => returnFromInterlude(), 6500 + Math.random() * 4500);
}

function returnFromInterlude() {
  if (!interlude) return;
  const snapshot = interlude;
  interlude = null;
  clearTimeout(interludeTimer);
  interludeBadge.classList.remove('show');
  loadFile(snapshot.index, { autoplay: snapshot.wasPlaying, time: snapshot.time, fromInterlude: true });
  say('回来。', 1300);
}

function cancelInterlude() {
  if (!interlude) return;
  interlude = null;
  clearTimeout(interludeTimer);
  interludeBadge.classList.remove('show');
}

function registerIntervention(reason = 'unspecified') {
  lastInterventionAt = Date.now();
  memory.interventions += 1;
  memory.interventionLog ??= [];
  memory.interventionLog.unshift({
    at: new Date().toISOString(),
    media: files[currentIndex]?.name || 'unknown',
    mediaTime: Number((video.currentTime || 0).toFixed(2)),
    reason,
    perception: {
      loudness: Number(perception.loudness.toFixed(3)),
      loudnessDelta: Number(perception.loudnessDelta.toFixed(3)),
      silenceMs: Math.round(perception.silenceMs),
      brightness: Number(perception.brightness.toFixed(3)),
      visualDelta: Number(perception.visualDelta.toFixed(3)),
      motionIntensity: Number(perception.motionIntensity.toFixed(3)),
      sceneColor: perception.sceneColor,
      subtitleDensity: Number(perception.subtitleDensity.toFixed(3)),
      replayHeat: perception.userReplayHeat,
      pauseHeat: perception.userPauseHeat,
    },
  });
  memory.interventionLog = memory.interventionLog.slice(0, 30);
  persistMemory();
  console.debug('[Co-Watch intervention]', memory.interventionLog[0]);
}

function say(text, duration = 2100) {
  clearTimeout(whisperTimer);
  whisper.textContent = text;
  whisper.classList.add('show');
  whisperTimer = setTimeout(() => whisper.classList.remove('show'), duration);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

video.addEventListener('play', () => {
  playBtn.textContent = '❚❚';
  initAudio();
  if (audioContext?.state === 'suspended') audioContext.resume();
  clearInterval(watchingTicker);
  watchingTicker = setInterval(() => {
    if (!video.paused && !video.ended && allowMemory.checked) {
      memory.watchSeconds += 5;
      persistMemory();
    }
  }, 5000);
});
video.addEventListener('pause', () => playBtn.textContent = '▶');
video.addEventListener('ended', () => {
  playBtn.textContent = '▶';
  if (files.length > 1) {
    const next = (currentIndex + 1) % files.length;
    say('那就看下一段。');
    loadFile(next, { autoplay: true });
  }
});

fileInput.addEventListener('change', e => addFiles(e.target.files));
moreInput.addEventListener('change', e => addFiles(e.target.files));
playBtn.addEventListener('click', () => togglePlayback(true));
video.addEventListener('click', () => togglePlayback(true));

autonomy.addEventListener('input', () => autonomyValue.textContent = `${autonomy.value}%`);
$('#provokeBtn').addEventListener('click', () => autonomousTick(true));

$('#settingsBtn').addEventListener('click', () => openPanel('settingsPanel'));
$('#playlistBtn').addEventListener('click', () => openPanel('playlistPanel'));
$('#fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) $('#playerCard').requestFullscreen?.();
  else document.exitFullscreen?.();
});

document.querySelectorAll('[data-close]').forEach(btn => btn.onclick = closePanels);
$('#scrim').onclick = closePanels;
function openPanel(id) {
  closePanels();
  document.getElementById(id).classList.add('open');
  $('#scrim').classList.add('show');
}
function closePanels() {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('open'));
  $('#scrim').classList.remove('show');
}

document.addEventListener('keydown', e => {
  if (['INPUT'].includes(document.activeElement?.tagName)) return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlayback(true);
  }
  if (e.code === 'ArrowLeft' && video.duration) {
    lastInteractionAt = Date.now();
    video.currentTime = Math.max(0, video.currentTime - 5);
  }
  if (e.code === 'ArrowRight' && video.duration) {
    lastInteractionAt = Date.now();
    video.currentTime = Math.min(video.duration, video.currentTime + 5);
  }
  if (e.key.toLowerCase() === 'f') $('#fullscreenBtn').click();
  if (e.key === 'Escape') closePanels();
});

window.coWatchDebug = {
  perception,
  memory,
  getMediaMemory: () => mediaMemory(),
  provoke: () => autonomousTick(true),
};

window.addEventListener('beforeunload', persistMemory);
