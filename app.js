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
let pendingFeedback = null;
let feedbackTimer = null;

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

const mind = {
  mood: '安静',
  arousal: .12,
  curiosity: .18,
  impatience: .08,
  attachment: 0,
  desires: {
    rewatch: .08,
    linger: .08,
    accelerate: .05,
    wander: .03,
    silence: .76,
  },
  socialConfidence: .5,
  tension: 0,
  restrainedUntil: 0,
  moodCandidate: '安静',
  moodCandidateSince: Date.now(),
  lastDecision: null,
  lastMoodChangedAt: Date.now(),
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
  raw.feedbackLog ??= [];
  raw.feedback ??= { accepted: 0, resisted: 0, score: .5 };
  raw.personality ??= createPersonality();
  return raw;
}

function createPersonality() {
  const personality = {
    stubbornness: .2 + Math.random() * .65,
    deference: .2 + Math.random() * .65,
    curiosityBias: .25 + Math.random() * .6,
    wanderlust: .15 + Math.random() * .7,
  };
  personality.label = labelPersonality(personality);
  return personality;
}

function labelPersonality(p) {
  const traits = [
    ['执拗', p.stubbornness],
    ['克制', p.deference],
    ['好奇', p.curiosityBias],
    ['游荡', p.wanderlust],
  ];
  return traits.sort((a, b) => b[1] - a[1])[0][0];
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
  const p = memory.personality || {};
  const feedback = memory.feedback || { accepted: 0, resisted: 0, score: .5 };
  memoryBox.innerHTML = `共同观看：<b>${formatLong(memory.watchSeconds)}</b><br>你主动拖动：${memory.seeks} 次<br>你请求暂停：${memory.pauses} 次<br>它越界：${memory.interventions} 次<br>当前状态：<b>${escapeHtml(mind.mood)}</b><br>性格倾向：<b>${escapeHtml(p.label || '未定')}</b> · 执拗 ${pct(p.stubbornness)} · 克制 ${pct(p.deference)}<br>互动反馈：默许 ${feedback.accepted} / 拒绝 ${feedback.resisted} · 信心 ${pct(mind.socialConfidence)}${last ? `<br>最近一次内部原因：<span style="opacity:.82">${escapeHtml(last.reason)}</span>` : ''}<br><span style="opacity:.65">这些数据只存在当前浏览器的 localStorage。</span>`;
}

function pct(value) {
  return `${Math.round(clamp01(Number(value) || 0) * 100)}%`;
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
      observeUserResponse('playlist-choice', { index: i });
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
  if (requestedByUser && !video.paused) observeUserResponse('pause-request', { at: video.currentTime });
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
    registerIntervention('user-pause:resistance', 'pause-resistance', { beforeTime: video.currentTime, afterTime: video.currentTime });
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

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeToward(current, target, speed) {
  return current + (target - current) * speed;
}

function updateMind() {
  if (!video.src) return;

  const personality = memory.personality;
  const feedbackScore = memory.feedback?.score ?? .5;
  const attachmentTarget = clamp01(
    Math.log2(1 + memory.watchSeconds / 90) * .12 +
    Math.min(.28, memory.interventions * .008) +
    feedbackScore * .08
  );
  const confidenceTarget = clamp01(.22 + feedbackScore * .72);

  const arousalTarget = clamp01(
    perception.loudness * .44 +
    perception.motionIntensity * .46 +
    (perception.sceneCut ? .18 : 0) +
    (perception.audioSpike ? .16 : 0)
  );

  const curiosityTarget = clamp01(
    perception.visualDelta * 1.35 +
    perception.subtitleDensity * .22 +
    Math.min(.34, perception.userReplayHeat * .11) +
    Math.min(.24, perception.userPauseHeat * .08) +
    (perception.sceneCut ? .2 : 0) +
    (perception.audioSpike ? .13 : 0)
  );

  const quietness = clamp01(1 - perception.loudness);
  const stillness = clamp01(1 - perception.motionIntensity);
  const impatienceTarget = clamp01(
    quietness * .24 +
    stillness * .2 +
    Math.min(.38, perception.silenceMs / 9000) -
    perception.subtitleDensity * .18 -
    curiosityTarget * .16
  );

  mind.arousal = easeToward(mind.arousal, arousalTarget, .035);
  mind.curiosity = easeToward(mind.curiosity, curiosityTarget, .028);
  mind.impatience = easeToward(mind.impatience, impatienceTarget, .018);
  mind.attachment = easeToward(mind.attachment, attachmentTarget, .012);
  mind.socialConfidence = easeToward(mind.socialConfidence, confidenceTarget, .018);
  mind.tension = easeToward(mind.tension, 0, .006);

  const rewatch = clamp01(
    mind.curiosity * (.42 + personality.curiosityBias * .2) +
    mind.arousal * .16 +
    personality.stubbornness * mind.tension * .16 +
    Math.min(.45, perception.userReplayHeat * .14) +
    (perception.sceneCut ? .16 : 0) +
    (perception.audioSpike ? .13 : 0)
  );
  const linger = clamp01(
    mind.curiosity * .3 +
    mind.attachment * .18 +
    perception.subtitleDensity * .32 +
    Math.min(.44, perception.userPauseHeat * .15)
  );
  const accelerate = clamp01(
    mind.impatience * .72 +
    Math.min(.24, perception.silenceMs / 12000) -
    mind.curiosity * .18
  );
  const wander = clamp01(
    mind.curiosity * .2 +
    mind.impatience * .2 +
    mind.attachment * .18 +
    personality.wanderlust * .28 +
    (files.length > 1 ? .08 : 0)
  );
  const strongest = Math.max(rewatch, linger, accelerate, allowCrossVideo.checked ? wander : 0);

  mind.desires.rewatch = easeToward(mind.desires.rewatch, rewatch, .06);
  mind.desires.linger = easeToward(mind.desires.linger, linger, .06);
  mind.desires.accelerate = easeToward(mind.desires.accelerate, accelerate, .055);
  mind.desires.wander = easeToward(mind.desires.wander, wander, .045);
  mind.desires.silence = easeToward(mind.desires.silence, clamp01(1 - strongest * .92), .07);

  let nextMood = '安静';
  if (mind.curiosity > .56 && mind.arousal > .5) nextMood = '着迷';
  else if (mind.arousal > .57) nextMood = '躁动';
  else if (mind.curiosity > .44) nextMood = '专注';
  else if (mind.impatience > .48) nextMood = '游离';
  else if (mind.tension > .46) nextMood = '别扭';

  const moodNow = Date.now();
  if (nextMood !== mind.moodCandidate) {
    mind.moodCandidate = nextMood;
    mind.moodCandidateSince = moodNow;
  } else if (nextMood !== mind.mood && moodNow - mind.moodCandidateSince > 1800) {
    mind.mood = nextMood;
    mind.lastMoodChangedAt = moodNow;
    updateMemoryUI();
  }

  // 事件被吸收到 Mind 后不应在每个动画帧重复叠加。
  perception.sceneCut = false;
  perception.audioSpike = false;
}

function evaluatePerception() {
  updateMind();
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
  const userSeekFrom = seekStartedAt;
  const userSeekTo = video.currentTime;
  observeUserResponse('seek', { from: userSeekFrom, to: userSeekTo });
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
        registerIntervention(
          reaction < 0 ? 'user-seek:resistance-back' : 'user-seek:resistance-forward',
          'seek-resistance',
          { beforeTime: video.currentTime - reaction, afterTime: video.currentTime }
        );
      }, 260);
    }
  }
});

function autonomousTick(force = false) {
  if (!video.src || video.paused || video.ended || interlude) return;

  const now = Date.now();
  const a = Number(autonomy.value) / 100;
  if (!force && (now - lastInterventionAt < 12000 || now - lastInteractionAt < 2500)) return;

  const candidates = [];
  if (allowTime.checked && video.currentTime > 5) {
    candidates.push({ desire: 'rewatch', weight: mind.desires.rewatch, action: 'rewind' });
    candidates.push({ desire: 'accelerate', weight: mind.desires.accelerate, action: 'rate' });
  }
  if (allowPauseFight.checked) {
    candidates.push({ desire: 'linger', weight: mind.desires.linger, action: 'hold' });
  }
  if (allowCrossVideo.checked && files.length > 1) {
    candidates.push({ desire: 'wander', weight: mind.desires.wander, action: 'cross' });
  }
  candidates.push({ desire: 'silence', weight: mind.desires.silence * .82, action: 'silence' });

  const urge = Math.max(...candidates.filter(c => c.action !== 'silence').map(c => c.weight), 0);
  const personality = memory.personality;
  const permission = .58 + mind.socialConfidence * .52;
  const stubbornTension = mind.tension * personality.stubbornness * .5;
  const restraint = now < mind.restrainedUntil ? .28 : 1;
  const executeChance = (.006 + urge * a * .055) * (permission + stubbornTension) * restraint;
  if (!force && Math.random() > executeChance) return;

  let selected;
  if (force) {
    selected = candidates
      .filter(c => c.action !== 'silence')
      .sort((x, y) => y.weight - x.weight)[0];
  } else {
    selected = chooseWeighted(candidates);
  }
  if (!selected || selected.action === 'silence') {
    mind.lastDecision = { at: now, mood: mind.mood, desire: 'silence', action: 'none' };
    return;
  }

  mind.lastDecision = {
    at: now,
    mood: mind.mood,
    desire: selected.desire,
    action: selected.action,
    weight: Number(selected.weight.toFixed(3)),
  };

  const reason = `mind:${mind.mood}:${selected.desire}`;
  if (selected.action === 'rewind') {
    interventionRewind(mind.mood === '着迷' ? '这个，我还想看一遍。' : null, reason);
  }
  if (selected.action === 'rate') {
    interventionRate(mind.mood === '游离' ? '这里有点拖。' : null, reason, mind.impatience > .6 ? 1.14 : 1.08);
  }
  if (selected.action === 'hold') {
    interventionHold(mind.mood === '专注' ? '先留在这里。' : null, reason, 900 + mind.curiosity * 900);
  }
  if (selected.action === 'cross') {
    interventionCrossVideo(reason);
  }
}
setInterval(() => autonomousTick(false), 1000);

function chooseWeighted(items) {
  const total = items.reduce((sum, item) => sum + Math.max(.001, item.weight), 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= Math.max(.001, item.weight);
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function interventionRewind(message = null, reason = 'random:rewind', fixedSeconds = null) {
  const beforeTime = video.currentTime;
  const seconds = fixedSeconds ?? (2.5 + Math.random() * 5);
  video.currentTime = Math.max(0, video.currentTime - seconds);
  say(message || pick(['刚才那个，我想再看一次。', '回去一点。', '这一秒有点东西。']));
  registerIntervention(reason, 'rewind', { beforeTime, afterTime: video.currentTime });
}

function interventionNudge(message = null, reason = 'random:nudge') {
  const beforeTime = video.currentTime;
  const delta = Math.random() < .65 ? -(1.2 + Math.random() * 3.5) : 1 + Math.random() * 3;
  video.currentTime = Math.min(video.duration - .1, Math.max(0, video.currentTime + delta));
  say(message || (delta < 0 ? '我把时间拉回来一点。' : '这里，我替你跨过去一点。'));
  registerIntervention(reason, 'nudge', { beforeTime, afterTime: video.currentTime });
}

function interventionRate(message = null, reason = 'random:rate', fixedRate = null) {
  clearTimeout(temporaryRateTimer);
  const original = video.playbackRate;
  const next = fixedRate ?? (loudness > .28 ? .88 : 1.12);
  video.playbackRate = next;
  say(message || (next < 1 ? '慢一点。' : '这里可以快一点。'));
  registerIntervention(reason, 'rate', { beforeRate: original, afterRate: next, beforeTime: video.currentTime, afterTime: video.currentTime });
  temporaryRateTimer = setTimeout(() => {
    video.playbackRate = original || 1;
  }, 3500 + Math.random() * 2500);
}

function interventionHold(message = null, reason = 'random:hold', duration = null) {
  const beforeTime = video.currentTime;
  video.pause();
  say(message || pick(['……', '等一下。', '停在这里。']));
  registerIntervention(reason, 'hold', { beforeTime, afterTime: video.currentTime });
  setTimeout(() => video.play().catch(() => {}), duration ?? (650 + Math.random() * 850));
}

function interventionCrossVideo(reason = 'random:cross-video') {
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
  registerIntervention(reason, 'cross', {
    sourceIndex: snapshot.index,
    destinationIndex: nextIndex,
    beforeTime: snapshot.time,
    afterTime: 0,
  });

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

function registerIntervention(reason = 'unspecified', action = 'unknown', context = {}) {
  lastInterventionAt = Date.now();
  memory.interventions += 1;
  memory.interventionLog ??= [];
  memory.interventionLog.unshift({
    at: new Date().toISOString(),
    media: files[currentIndex]?.name || 'unknown',
    mediaTime: Number((video.currentTime || 0).toFixed(2)),
    reason,
    action,
    context,
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
    mind: {
      mood: mind.mood,
      arousal: Number(mind.arousal.toFixed(3)),
      curiosity: Number(mind.curiosity.toFixed(3)),
      impatience: Number(mind.impatience.toFixed(3)),
      attachment: Number(mind.attachment.toFixed(3)),
      desires: Object.fromEntries(Object.entries(mind.desires).map(([k, v]) => [k, Number(v.toFixed(3))])),
      socialConfidence: Number(mind.socialConfidence.toFixed(3)),
      tension: Number(mind.tension.toFixed(3)),
      restrainedUntil: mind.restrainedUntil,
      personality: memory.personality,
      lastDecision: mind.lastDecision,
    },
  });
  memory.interventionLog = memory.interventionLog.slice(0, 30);
  persistMemory();
  beginFeedbackWindow(action, reason, context);
  console.debug('[Co-Watch intervention]', memory.interventionLog[0]);
}

function beginFeedbackWindow(action, reason, context = {}) {
  clearTimeout(feedbackTimer);
  pendingFeedback = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    reason,
    context,
    at: Date.now(),
    mediaKey: currentMediaKey(),
    mediaIndex: currentIndex,
  };
  feedbackTimer = setTimeout(() => resolveFeedback('accepted', 'no-immediate-correction'), action === 'cross' ? 5200 : 4800);
}

function observeUserResponse(kind, detail = {}) {
  if (!pendingFeedback) return;
  const age = Date.now() - pendingFeedback.at;
  if (age > 6500) return;

  const action = pendingFeedback.action;
  let rejected = false;
  let why = '';

  if ((action === 'rewind' || action === 'nudge' || action === 'seek-resistance') && kind === 'seek') {
    const before = Number(pendingFeedback.context.beforeTime);
    const after = Number(pendingFeedback.context.afterTime);
    const to = Number(detail.to);
    if (Number.isFinite(before) && Number.isFinite(after) && Number.isFinite(to)) {
      const interventionDelta = after - before;
      const correctionDelta = to - after;
      rejected = Math.abs(correctionDelta) > 2 &&
        (Math.sign(correctionDelta) === -Math.sign(interventionDelta) || Math.abs(to - before) < Math.abs(after - before) * .55);
      why = 'user-undid-time-change';
    }
  }

  if ((action === 'hold' || action === 'pause-resistance') && kind === 'pause-request') {
    rejected = true;
    why = 'user-insisted-on-pause';
  }

  if (action === 'cross' && (kind === 'playlist-choice' || kind === 'seek')) {
    rejected = true;
    why = 'user-left-cross-video';
  }

  if (rejected) resolveFeedback('resisted', why);
}

function resolveFeedback(outcome, why) {
  if (!pendingFeedback) return;
  clearTimeout(feedbackTimer);

  const item = {
    at: new Date().toISOString(),
    outcome,
    why,
    action: pendingFeedback.action,
    reason: pendingFeedback.reason,
    media: files[currentIndex]?.name || 'unknown',
    personality: memory.personality?.label || 'unknown',
  };
  memory.feedbackLog ??= [];
  memory.feedbackLog.unshift(item);
  memory.feedbackLog = memory.feedbackLog.slice(0, 40);

  if (outcome === 'resisted') {
    memory.feedback.resisted += 1;
    memory.feedback.score = clamp01(memory.feedback.score - .075);
    mind.socialConfidence = clamp01(mind.socialConfidence - .12);
    mind.tension = clamp01(mind.tension + .32);

    if (memory.personality.stubbornness > .62) {
      mind.desires.rewatch = clamp01(mind.desires.rewatch + .1);
      mind.desires.linger = clamp01(mind.desires.linger + .07);
      say(pick(['你很坚持。', '……我知道了。', '你不想听我的。']), 1800);
    } else {
      mind.restrainedUntil = Date.now() + 9000 + memory.personality.deference * 7000;
      mind.desires.silence = clamp01(mind.desires.silence + .22);
      say(pick(['好。你来。', '知道了。', '那我先不碰。']), 1800);
    }
  } else {
    memory.feedback.accepted += 1;
    memory.feedback.score = clamp01(memory.feedback.score + .022);
    mind.socialConfidence = clamp01(mind.socialConfidence + .035);
    mind.tension = clamp01(mind.tension - .06);
  }

  pendingFeedback = null;
  persistMemory();
  console.debug('[Co-Watch feedback]', item, memory.feedback);
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
  mind,
  memory,
  getMediaMemory: () => mediaMemory(),
  getPendingFeedback: () => pendingFeedback,
  provoke: () => autonomousTick(true),
  force(action) {
    if (!video.src) return '请先加载视频';
    if (action === 'rewind') return interventionRewind('测试：我想再看一次。', 'debug:rewind', 4);
    if (action === 'hold') return interventionHold('测试：先停在这里。', 'debug:hold', 1000);
    if (action === 'rate') return interventionRate('测试：这里快一点。', 'debug:rate', 1.15);
    if (action === 'cross') return interventionCrossVideo('debug:cross');
    return '可用 action: rewind / hold / rate / cross';
  },
  setPersonality(patch = {}) {
    for (const key of ['stubbornness', 'deference', 'curiosityBias', 'wanderlust']) {
      if (key in patch) memory.personality[key] = clamp01(Number(patch[key]));
    }
    memory.personality.label = labelPersonality(memory.personality);
    persistMemory();
    return memory.personality;
  },
  resetFeedback() {
    memory.feedback = { accepted: 0, resisted: 0, score: .5 };
    memory.feedbackLog = [];
    mind.socialConfidence = .5;
    mind.tension = 0;
    mind.restrainedUntil = 0;
    persistMemory();
    return memory.feedback;
  },
};

window.addEventListener('beforeunload', persistMemory);
