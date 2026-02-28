// AI+行业落地分析报告 - 交互脚本

// 可访问性：跳转主内容链接（键盘导航）
(function initSkipLink() {
    if (document.getElementById('skip-to-main')) return;
    var a = document.createElement('a');
    a.href = '#main-content';
    a.className = 'skip-link';
    a.id = 'skip-to-main';
    a.textContent = '跳转到主内容';
    a.setAttribute('aria-label', '跳过导航，跳转到主内容');
    document.body.insertBefore(a, document.body.firstChild);
    var main = document.querySelector('.main') || document.querySelector('main');
    if (main && !main.id) main.id = 'main-content';
})();

// 自动加载 data/report-data.json 并填充 [data-update] 元素（含缓存与错误提示）
(function loadReportData() {
  var base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]+$/, '') : '';
  var dataPath = base + 'data/report-data.json';
  var el = document.querySelector('[data-update]');
  if (!el) return;
  var CACHE_KEY = 'ai-report-data';
  var CACHE_HOURS = 24;

  function get(obj, path) {
    var keys = path.split('.');
    for (var i = 0; i < keys.length; i++) obj = obj && obj[keys[i]];
    return obj;
  }
  function applyData(data) {
    if (!data) return;
    document.querySelectorAll('[data-update]').forEach(function(node) {
      var path = node.getAttribute('data-update');
      var val = get(data, path);
      if (val != null) node.textContent = val;
    });
  }
  function showError() {
    var el = document.querySelector('[data-update]');
    if (el && !el.dataset.errorShown) {
      el.dataset.errorShown = '1';
      var tip = document.createElement('small');
      tip.style.cssText = 'display:block;color:#b45309;margin-top:8px;font-size:0.85em;line-height:1.6';
      var isFile = (typeof location !== 'undefined' && location.protocol === 'file:');
      tip.textContent = isFile
        ? '数据加载失败：直接打开 file:// 会有 CORS 限制。请用本地服务器：在项目目录运行 python -m http.server 8000，然后访问 http://localhost:8000/'
        : '数据加载失败，请检查网络或稍后刷新';
      var parent = el.closest('.viz-container, .cover, .chapter');
      if (parent) parent.appendChild(tip);
    }
  }
  function saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: data }));
    } catch (e) {}
  }
  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.d || (Date.now() - o.t) > CACHE_HOURS * 3600000) return null;
      return o.d;
    } catch (e) { return null; }
  }

  var cached = loadCache();
  if (cached) applyData(cached);

  fetch(dataPath)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return;
      saveCache(data);
      applyData(data);
    })
    .catch(function() {
      if (!loadCache()) showError();
    });
})();

// 表格响应式：自动包裹 table 以支持横向滚动
(function wrapTables() {
  document.querySelectorAll('table').forEach(function(t) {
    if (t.parentElement && t.parentElement.classList.contains('table-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    t.parentNode.insertBefore(wrap, t);
    wrap.appendChild(t);
  });
})();

document.addEventListener('DOMContentLoaded', function() {
    // 目录项点击高亮
    document.querySelectorAll('.toc-item').forEach(item => {
        item.addEventListener('click', function(e) {
            document.querySelectorAll('.toc-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // 滚动时自动高亮当前章节
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                document.querySelectorAll('.toc-item').forEach(i => {
                    i.classList.toggle('active', i.getAttribute('href') === '#' + id);
                });
            }
        });
    }, { rootMargin: '-20% 0px -60% 0px' });

    document.querySelectorAll('[id^="ch"],[id^="app"],[id^="ai-knowledge"]').forEach(el => observer.observe(el));

    // Mermaid 流程图初始化
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'neutral',
            securityLevel: 'loose',
            flowchart: { useMaxWidth: true, htmlLabels: true },
            sequence: { useMaxWidth: true }
        });
    }

    // Chart.js 数据可视化
    if (typeof Chart !== 'undefined') {
        const colors = ['#2563eb', '#1e40af', '#374151', '#4b5563', '#6b7280', '#9ca3af'];

        // 图1-2 企业AI采纳与回报（2026数据）
        const adoptionEl = document.getElementById('chartAdoption');
        if (adoptionEl) {
            new Chart(adoptionEl, {
                type: 'doughnut',
                data: {
                    labels: ['多阶段部署Agent 57%', '计划复杂场景 81%', '已见投资回报 80%', '跨职能流程 16%', '多步骤Agent 39%'],
                    datasets: [{
                        data: [57, 81, 80, 16, 39],
                        backgroundColor: colors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
        }

        // 图7-2 智能算力规模
        const computeEl = document.getElementById('chartCompute');
        if (computeEl) {
            new Chart(computeEl, {
                type: 'bar',
                data: {
                    labels: ['2023', '2024', '2025', '2026', '2027', '2028'],
                    datasets: [{
                        label: '智能算力市场(亿元)',
                        data: [5097, 7200, 9500, 15000, 22000, 34000],
                        backgroundColor: 'rgba(37, 99, 235, 0.7)',
                        borderColor: '#2563eb',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // 图3-0b 行业应用分布
        const industryEl = document.getElementById('chartIndustry');
        if (industryEl) {
            new Chart(industryEl, {
                type: 'bar',
                data: {
                    labels: ['金融', '医疗', '教育', '制造', '政务', '汽车', '保险', '零售', '物流', '农业'],
                    datasets: [{
                        label: '平台/案例数',
                        data: [200, 120, 150, 196, 32, 80, 90, 196, 196, 45],
                        backgroundColor: 'rgba(37, 99, 235, 0.5)',
                        borderColor: '#2563eb'
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { beginAtZero: true }
                    }
                }
            });
        }

        // 附录 全球市场
        const marketEl = document.getElementById('chartMarket');
        if (marketEl) {
            new Chart(marketEl, {
                type: 'line',
                data: {
                    labels: ['2024', '2025', '2026', '2027', '2028', '2030'],
                    datasets: [{
                        label: '全球AI市场规模(十亿美元)',
                        data: [616, 750, 950, 1200, 1550, 2600],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // 附录 内容生成
        const contentEl = document.getElementById('chartContent');
        if (contentEl) {
            new Chart(contentEl, {
                type: 'pie',
                data: {
                    labels: ['文本 37%', '视频 29%', '图像 21%', '其他 13%'],
                    datasets: [{
                        data: [37, 29, 21, 13],
                        backgroundColor: ['#2563eb', '#1e40af', '#374151', '#6b7280'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'AIGC内容类型分布' }
                    }
                }
            });
        }
    }

    // ========== 右上角：转为播客 + 播放 ==========
    (function initPodcast() {
        // 注入右上角控件
        var ctrl = document.createElement('div');
        ctrl.className = 'top-right-ctrl';
        ctrl.innerHTML = '<button class="btn-podcast" type="button" aria-label="打开播客模式">转为播客</button>' +
            '<button class="btn-play" type="button" aria-label="播放本页朗读"><span class="icon">▶</span>播放</button>';
        document.body.appendChild(ctrl);

        // 注入播客播放面板
        var panel = document.createElement('div');
        panel.className = 'podcast-panel';
        panel.innerHTML = '<div class="podcast-title">播客模式 · 本页朗读</div>' +
            '<div class="podcast-status-wrap"><span class="podcast-status-label">状态：</span><span class="podcast-status" id="podcast-status">准备就绪</span></div>' +
            '<div class="podcast-tips" id="podcast-tips"><button type="button" class="podcast-test-btn" id="podcast-test-btn">🔊 测试音量</button><button type="button" class="podcast-fallback-btn" id="podcast-fallback-btn">📖 改用浏览器朗读</button> 听不见专业TTS？可试浏览器朗读</div>' +
            '<div class="podcast-episode">章节列表</div>' +
            '<div class="progress-wrap">' +
            '<div class="progress-bar" title="点击跳转"><div class="progress-fill"></div></div>' +
            '<span class="progress-time">0:00 / 0:00</span></div>' +
            '<div class="episode-list"></div>';
        document.body.appendChild(panel);

        var btnPodcast = ctrl.querySelector('.btn-podcast');
        var btnPlay = ctrl.querySelector('.btn-play');
        var statusEl = panel.querySelector('#podcast-status') || panel.querySelector('.podcast-status');
        var progressBar = panel.querySelector('.progress-bar');
        var progressFill = panel.querySelector('.progress-fill');
        var progressTime = panel.querySelector('.progress-time');
        var episodeList = panel.querySelector('.episode-list');

        // 抽取章节与文本（按 h2/h3 分段，播客式组织）
        function getMainContent() {
            var main = document.querySelector('.main') || document.querySelector('main') || document.body;
            var sections = [];

            function getText(node) {
                var t = '';
                var walk = function(n) {
                    if (!n || n.nodeType !== 1) return;
                    if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.classList.contains('mermaid') || n.tagName === 'PRE') return;
                    if (n.tagName === 'TABLE') {
                        var rows = n.querySelectorAll('tr');
                        rows.forEach(function(r) {
                            r.querySelectorAll('th, td').forEach(function(c) { t += (c.textContent || '').trim() + ' '; });
                            t += '\n';
                        });
                        return;
                    }
                    if (n.tagName === 'IMG') return;
                    if (n.childNodes) {
                        for (var i = 0; i < n.childNodes.length; i++) {
                            var c = n.childNodes[i];
                            if (c.nodeType === 3) t += c.textContent;
                            else walk(c);
                        }
                    }
                };
                walk(node);
                return (t || '').replace(/\s+/g, ' ').trim();
            }

            var headers = main.querySelectorAll('h2, h3');
            headers.forEach(function(h) {
                var title = h.textContent.trim();
                if (!title) return;
                var body = '';
                var next = h.nextElementSibling;
                while (next && next.tagName !== 'H2' && next.tagName !== 'H3') {
                    body += getText(next) + '\n';
                    next = next.nextElementSibling;
                }
                sections.push({ id: h.id || 's' + sections.length, title: title, text: body.trim() });
            });
            if (sections.length === 0) {
                var full = getText(main);
                if (full) sections.push({ id: 'main', title: document.title || '正文', text: full });
            }
            return sections;
        }

        var PODCAST_API = (typeof window !== 'undefined' && window.PODCAST_API_URL) || 'http://127.0.0.1:5010';
        var forceBrowserTTS = false;
        var synth = window.speechSynthesis;
        var voices = [];
        var curAudio = null;
        function loadVoices() {
            voices = synth.getVoices();
            if (voices.length === 0) setTimeout(loadVoices, 100);
        }
        loadVoices();
        if (synth.onvoiceschanged) synth.onvoiceschanged = loadVoices;

        var sections = [];
        var curIdx = 0;
        var curUtterance = null;
        var isPlaying = false;
        var isPodcastMode = false;
        var audioCache = {}; // 预生成：idx -> { url, revoke }

        function pickVoice() {
            for (var i = 0; i < voices.length; i++) {
                if (/zh|cn|chinese/i.test(voices[i].lang)) return voices[i];
            }
            return voices[0] || null;
        }

        function setStatus(msg, type) {
            if (statusEl) {
                statusEl.textContent = msg;
                statusEl.className = 'podcast-status' + (type ? ' status-' + type : '');
                statusEl.parentElement.classList.toggle('status-active', type === 'loading' || type === 'playing');
            }
        }

        function fallbackSpeak(text, onEnd) {
            setStatus('播放中 · 浏览器朗读', 'fallback');
            synth.cancel();
            var u = new SpeechSynthesisUtterance(text);
            u.lang = 'zh-CN';
            u.rate = 0.95;
            var v = pickVoice();
            if (v) u.voice = v;
            u.onend = onEnd;
            synth.speak(u);
        }

        function playNextOrStop() {
            curIdx++;
            if (curIdx < sections.length) speakCurrent();
            else {
                isPlaying = false;
                btnPlay.innerHTML = '<span class="icon">▶</span>播放';
                setStatus('播放完成', 'done');
                Object.keys(audioCache).forEach(function(k) { if (audioCache[k] && audioCache[k].url) URL.revokeObjectURL(audioCache[k].url); });
                audioCache = {};
            }
            updateUI();
        }

        function preloadNext() {
            var nextIdx = curIdx + 1;
            if (forceBrowserTTS || nextIdx >= sections.length || audioCache[nextIdx]) return;
            var s = sections[nextIdx];
            if (!s) return;
            var raw = (s.title || '') + '。' + (s.text || '').substring(0, 3000);
            fetch(PODCAST_API + '/api/rewrite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: s.title, text: (s.text || '').substring(0, 6000) }) })
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    var script = (data && data.ok && data.script) ? data.script : (data && data.fallback) ? data.fallback : raw;
                    return fetch(PODCAST_API + '/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: script }) }).then(function(r) { return r.ok ? r.blob() : null; });
                })
                .then(function(blob) {
                    if (blob && !audioCache[nextIdx]) audioCache[nextIdx] = { url: URL.createObjectURL(blob) };
                })
                .catch(function() {});
        }

        function speakCurrent() {
            synth.cancel();
            if (curAudio) { curAudio.pause(); curAudio = null; }
            if (!sections[curIdx]) {
                isPlaying = false;
                btnPlay.innerHTML = '<span class="icon">▶</span>播放';
                return;
            }
            var s = sections[curIdx];
            if (s.id) {
                var elTarget = document.getElementById(s.id);
                if (elTarget) elTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            var raw = (s.title || '') + '。' + (s.text || '').substring(0, 3000);

            if (forceBrowserTTS) {
                setStatus('播放中 · 浏览器朗读', 'fallback');
                fallbackSpeak(raw, playNextOrStop);
                return;
            }

            var cached = audioCache[curIdx];
            if (cached && cached.url) {
                setStatus('播放中 · 专业 TTS（已预生成）', 'playing');
                curAudio = new Audio(cached.url);
                curAudio.volume = 1;
                curAudio.onended = function() {
                    var justPlayed = curIdx;
                    playNextOrStop();
                    if (audioCache[justPlayed]) { URL.revokeObjectURL(audioCache[justPlayed].url); delete audioCache[justPlayed]; }
                };
                curAudio.onerror = function() {
                    var justPlayed = curIdx;
                    playNextOrStop();
                    if (audioCache[justPlayed]) { URL.revokeObjectURL(audioCache[justPlayed].url); delete audioCache[justPlayed]; }
                };
                curAudio.play().catch(function() { playNextOrStop(); });
                preloadNext();
                updateUI();
                return;
            }

            setStatus('正在调用 AI 改写...', 'loading');

            function doPlay(text) {
                setStatus('正在合成语音...', 'loading');
                fetch(PODCAST_API + '/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text })
                }).then(function(r) {
                    if (!r.ok) throw new Error('TTS 失败');
                    return r.blob();
                }).then(function(blob) {
                    setStatus('播放中 · 专业 TTS（Edge 语音） · 若听不见请检查系统音量或标签页是否静音', 'playing');
                    var url = URL.createObjectURL(blob);
                    curAudio = new Audio(url);
                    curAudio.volume = 1;
                    curAudio.onended = function() {
                        URL.revokeObjectURL(url);
                        playNextOrStop();
                    };
                    curAudio.onerror = function() { playNextOrStop(); };
                    var p = curAudio.play();
                    if (p && p.catch) p.catch(function() { fallbackSpeak(text, playNextOrStop); });
                    preloadNext();
                }).catch(function() {
                    setStatus('语音服务连接失败，使用浏览器朗读', 'warn');
                    fallbackSpeak(text, playNextOrStop);
                });
            }

            fetch(PODCAST_API + '/api/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: s.title, text: (s.text || '').substring(0, 6000) })
            }).then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
                var script = (data && data.ok && data.script) ? data.script : (data && data.fallback) ? data.fallback : raw;
                var usedAI = !!(data && data.ok && data.script);
                if (!usedAI) setStatus('播客服务未响应，使用原文朗读', 'warn');
                doPlay(script);
            }).catch(function() {
                setStatus('播客服务未启动，使用浏览器朗读。请运行: python scripts/podcast_server.py', 'warn');
                doPlay(raw);
            });
        }

        function buildEpisodeList() {
            episodeList.innerHTML = '';
            sections.forEach(function(s, i) {
                var el = document.createElement('div');
                el.className = 'episode-item' + (i === curIdx && isPlaying ? ' playing' : '');
                el.textContent = (i + 1) + '. ' + s.title;
                el.dataset.idx = i;
                el.addEventListener('click', function() {
                    curIdx = parseInt(this.dataset.idx, 10);
                    var s = sections[curIdx];
                    if (s && s.id) {
                        var elTarget = document.getElementById(s.id);
                        if (elTarget) elTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    speakCurrent();
                    updateUI();
                });
                episodeList.appendChild(el);
            });
        }

        function updateUI() {
            var cap = Math.min(curIdx, sections.length - 1);
            if (cap < 0) cap = 0;
            panel.querySelector('.podcast-episode').textContent = (cap + 1) + '/' + sections.length + (sections[cap] ? ' · ' + sections[cap].title : '');
            buildEpisodeList();
            var total = 0;
            sections.forEach(function(s) { total += (s.text || '').length; });
            var done = 0;
            for (var i = 0; i < cap; i++) done += (sections[i].text || '').length;
            var curLen = (sections[cap] && sections[cap].text) ? sections[cap].text.length : 0;
            var pct = total > 0 ? ((done + curLen * 0.5) / total) * 100 : 0;
            if (curIdx >= sections.length) pct = 100;
            progressFill.style.width = pct + '%';
            progressTime.textContent = Math.min(curIdx + 1, sections.length) + '/' + sections.length;
        }

        btnPodcast.addEventListener('click', function() {
            isPodcastMode = !isPodcastMode;
            btnPodcast.classList.toggle('active', isPodcastMode);
            if (isPodcastMode) {
                panel.classList.add('visible');
                sections = getMainContent();
                curIdx = 0;
                audioCache = {};
                buildEpisodeList();
                updateUI();
            } else {
                panel.classList.remove('visible');
            }
        });

        function unlockAudio() {
            try {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) {
                    var ctx = new Ctx();
                    var buf = ctx.createBuffer(1, 1, 22050);
                    var src = ctx.createBufferSource();
                    src.buffer = buf;
                    src.connect(ctx.destination);
                    src.start(0);
                }
            } catch (e) {}
        }

        btnPlay.addEventListener('click', function() {
            unlockAudio();
            if (isPlaying) {
                synth.cancel();
                if (curAudio) { curAudio.pause(); curAudio = null; }
                isPlaying = false;
                btnPlay.innerHTML = '<span class="icon">▶</span>播放';
                setStatus('已暂停', '');
                return;
            }
            if (!panel.classList.contains('visible')) {
                panel.classList.add('visible');
                isPodcastMode = true;
                btnPodcast.classList.add('active');
            }
            sections = getMainContent();
            if (sections.length === 0) {
                panel.querySelector('.podcast-episode').textContent = '暂无可朗读内容';
                return;
            }
            curIdx = 0;
            isPlaying = true;
            btnPlay.innerHTML = '<span class="icon">⏸</span>暂停';
            speakCurrent();
            updateUI();
        });

        progressBar.addEventListener('click', function(e) {
            var rect = this.getBoundingClientRect();
            var pct = (e.clientX - rect.left) / rect.width;
            curIdx = Math.min(Math.floor(pct * sections.length), sections.length - 1);
            if (curIdx < 0) curIdx = 0;
            speakCurrent();
            updateUI();
        });

        var fallbackBtn = panel.querySelector('#podcast-fallback-btn');
        if (fallbackBtn) {
            fallbackBtn.addEventListener('click', function() {
                forceBrowserTTS = true;
                fallbackBtn.textContent = '✓ 已切换浏览器朗读';
                fallbackBtn.classList.add('active');
                if (isPlaying) {
                    synth.cancel();
                    if (curAudio) { curAudio.pause(); curAudio = null; }
                    speakCurrent();
                } else {
                    setStatus('已切换为浏览器朗读，点击播放生效', 'warn');
                }
            });
        }

        var testBtn = panel.querySelector('#podcast-test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', function() {
                unlockAudio();
                try {
                    var ctx = new (window.AudioContext || window.webkitAudioContext)();
                    var buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
                    var data = buf.getChannelData(0);
                    for (var i = 0; i < data.length; i++) data[i] = Math.sin(2 * Math.PI * 440 * i / ctx.sampleRate) * 0.3;
                    var src = ctx.createBufferSource();
                    src.buffer = buf;
                    src.connect(ctx.destination);
                    src.start(0);
                    testBtn.textContent = '✓ 有声音吗？';
                    setTimeout(function() { testBtn.textContent = '🔊 测试音量'; }, 2000);
                } catch (e) {
                    testBtn.textContent = '测试失败，请检查浏览器';
                }
            });
        }

        synth.addEventListener('voiceschanged', loadVoices);
    })();
});
