// AI+行业落地分析报告 - 交互脚本

// 自动加载 data/report-data.json 并填充 [data-update] 元素
(function loadReportData() {
  var base = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^/]+$/, '') : '';
  var dataPath = base + 'data/report-data.json';
  var el = document.querySelector('[data-update]');
  if (!el) return;
  fetch(dataPath)
    .then(r => r.ok ? r.json() : null)
    .then(function(data) {
      if (!data) return;
      function get(obj, path) {
        const keys = path.split('.');
        for (let i = 0; i < keys.length; i++) {
          obj = obj && obj[keys[i]];
        }
        return obj;
      }
      document.querySelectorAll('[data-update]').forEach(function(node) {
        const path = node.getAttribute('data-update');
        const val = get(data, path);
        if (val != null) node.textContent = val;
      });
    })
    .catch(function() {});
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
        ctrl.innerHTML = '<button class="btn-podcast" type="button">转为播客</button>' +
            '<button class="btn-play" type="button"><span class="icon">▶</span>播放</button>';
        document.body.appendChild(ctrl);

        // 注入播客播放面板
        var panel = document.createElement('div');
        panel.className = 'podcast-panel';
        panel.innerHTML = '<div class="podcast-title">播客模式 · 本页朗读</div>' +
            '<div class="podcast-episode">章节列表</div>' +
            '<div class="progress-wrap">' +
            '<div class="progress-bar" title="点击跳转"><div class="progress-fill"></div></div>' +
            '<span class="progress-time">0:00 / 0:00</span></div>' +
            '<div class="episode-list"></div>';
        document.body.appendChild(panel);

        var btnPodcast = ctrl.querySelector('.btn-podcast');
        var btnPlay = ctrl.querySelector('.btn-play');
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

        function pickVoice() {
            for (var i = 0; i < voices.length; i++) {
                if (/zh|cn|chinese/i.test(voices[i].lang)) return voices[i];
            }
            return voices[0] || null;
        }

        function fallbackSpeak(text, onEnd) {
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
            }
            updateUI();
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

            function doPlay(text) {
                fetch(PODCAST_API + '/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text })
                }).then(function(r) {
                    if (!r.ok) throw new Error('TTS 失败');
                    return r.blob();
                }).then(function(blob) {
                    var url = URL.createObjectURL(blob);
                    curAudio = new Audio(url);
                    curAudio.onended = function() {
                        URL.revokeObjectURL(url);
                        playNextOrStop();
                    };
                    curAudio.onerror = function() { playNextOrStop(); };
                    curAudio.play();
                }).catch(function() {
                    fallbackSpeak(text, playNextOrStop);
                });
            }

            fetch(PODCAST_API + '/api/rewrite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: s.title, text: (s.text || '').substring(0, 6000) })
            }).then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
                var script = (data && data.ok && data.script) ? data.script : (data && data.fallback) ? data.fallback : raw;
                doPlay(script);
            }).catch(function() {
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
            panel.querySelector('.podcast-episode').textContent = (curIdx + 1) + '/' + sections.length + ' · ' + (sections[curIdx] ? sections[curIdx].title : '');
            buildEpisodeList();
            var total = 0;
            sections.forEach(function(s) { total += (s.text || '').length; });
            var done = 0;
            for (var i = 0; i < curIdx; i++) done += (sections[i].text || '').length;
            var curLen = (sections[curIdx] && sections[curIdx].text) ? sections[curIdx].text.length : 0;
            var pct = total > 0 ? ((done + curLen * 0.5) / total) * 100 : 0;
            progressFill.style.width = pct + '%';
            progressTime.textContent = (curIdx + 1) + '/' + sections.length;
        }

        function speakCurrent() {
            synth.cancel();
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
            curUtterance = new SpeechSynthesisUtterance(s.title + '。' + (s.text || '').substring(0, 3000));
            curUtterance.lang = 'zh-CN';
            curUtterance.rate = 0.95;
            var v = pickVoice();
            if (v) curUtterance.voice = v;
            curUtterance.onend = function() {
                curIdx++;
                if (curIdx < sections.length) speakCurrent();
                else {
                    isPlaying = false;
                    btnPlay.innerHTML = '<span class="icon">▶</span>播放';
                }
                updateUI();
            };
            synth.speak(curUtterance);
        }

        btnPodcast.addEventListener('click', function() {
            isPodcastMode = !isPodcastMode;
            btnPodcast.classList.toggle('active', isPodcastMode);
            if (isPodcastMode) {
                panel.classList.add('visible');
                sections = getMainContent();
                curIdx = 0;
                buildEpisodeList();
                updateUI();
            } else {
                panel.classList.remove('visible');
            }
        });

        btnPlay.addEventListener('click', function() {
            if (isPlaying) {
                synth.cancel();
                if (curAudio) { curAudio.pause(); curAudio = null; }
                isPlaying = false;
                btnPlay.innerHTML = '<span class="icon">▶</span>播放';
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

        synth.addEventListener('voiceschanged', loadVoices);
    })();
});
