// AI+行业落地分析报告 - 交互脚本

// 引导界面：点赞后进入（localStorage 记录，已点赞则不显示）
(function initWelcomeOverlay() {
    var STORAGE_KEY = 'ai_report_star_liked';
    var overlay = document.getElementById('welcome-overlay');
    var btn = document.getElementById('welcome-star-btn');
    if (!overlay || !btn) return;
    try {
        if (localStorage.getItem(STORAGE_KEY)) {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            return;
        }
    } catch (e) {}
    btn.addEventListener('click', function() {
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
        var icon = btn.querySelector('.welcome-star-icon');
        if (icon) icon.textContent = '✓';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.add('hidden');
        setTimeout(function() {
            overlay.style.display = 'none';
        }, 350);
    });
})();

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
    renderLatestUpdates(data);
  }
  function renderLatestUpdates(data) {
    var container = document.getElementById('latest-updates-feed');
    var listEl = document.getElementById('latest-updates-list');
    if (!container || !listEl) return;
    if (!data || !Array.isArray(data.latest_updates) || data.latest_updates.length === 0) {
      container.classList.add('hidden');
      return;
    }
    var items = data.latest_updates;
    var html = '<ul class="latest-updates-list">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var title = (it.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var snippet = (it.snippet || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var link = (it.link || '#');
      var topic = (it.topic || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var ext = link.indexOf('http') === 0 ? ' target="_blank" rel="noopener noreferrer"' : '';
      html += '<li class="latest-updates-item">';
      html += '<span class="latest-updates-topic">' + topic + '</span> ';
      html += '<a href="' + link + '" class="latest-updates-link"' + ext + '>' + title + '</a>';
      if (snippet) html += '<p class="latest-updates-snippet">' + snippet + '</p>';
      html += '</li>';
    }
    html += '</ul>';
    listEl.innerHTML = html;
    container.classList.remove('hidden');
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
    // 目录可折叠/展开
    (function initCollapsibleToc() {
        var sidebar = document.querySelector('.sidebar[data-toc-collapsible]');
        if (!sidebar) return;
        var items = Array.from(sidebar.querySelectorAll('.toc-item'));
        if (items.length === 0) return;

        var groups = [];
        var i = 0;
        while (i < items.length) {
            var el = items[i];
            var isL1 = el.classList.contains('level1');
            var group = { header: el, children: [] };
            groups.push(group);
            if (isL1) {
                i++;
                while (i < items.length && !items[i].classList.contains('level1')) {
                    group.children.push(items[i]);
                    i++;
                }
            } else {
                i++;
            }
        }

        var storageKey = 'ai-report-toc-collapsed';
        function getStored() {
            try {
                var s = localStorage.getItem(storageKey);
                return s ? JSON.parse(s) : {};
            } catch (e) { return {}; }
        }
        function setStored(key, val) {
            var o = getStored();
            o[key] = val;
            try { localStorage.setItem(storageKey, JSON.stringify(o)); } catch (e) {}
        }

        var stored = getStored();
        var header = sidebar.querySelector('.sidebar-header') || sidebar.querySelector('.sidebar-title');
        var container = document.createDocumentFragment();
        if (header) container.appendChild(header.cloneNode(true));

        groups.forEach(function(g, idx) {
            var gkey = (g.header.getAttribute('href') || g.header.textContent || idx).replace(/[#\/\.]/g, '_');
            var hasChildren = g.children.length > 0;
            var collapseRef = gkey.indexOf('ch3') >= 0 || gkey.indexOf('ch4') >= 0 || gkey.indexOf('appendix') >= 0;
            var defaultOpen = stored[gkey] !== undefined ? !stored[gkey] : (idx === 0 ? true : !collapseRef);

            var wrap = document.createElement('div');
            wrap.className = 'toc-group';
            var headerRow = document.createElement('div');
            headerRow.className = 'toc-group-header' + (hasChildren ? ' toc-has-children' : '');
            headerRow.setAttribute('data-group', gkey);
            var toggleSpan = document.createElement('span');
            toggleSpan.className = 'toc-toggle';
            toggleSpan.setAttribute('aria-hidden', 'true');
            if (hasChildren) {
                toggleSpan.textContent = '\u25BC';
                toggleSpan.style.visibility = 'visible';
                if (!defaultOpen) toggleSpan.classList.add('collapsed');
            } else {
                toggleSpan.textContent = '\u25B6';
                toggleSpan.style.visibility = 'hidden';
            }
            headerRow.appendChild(toggleSpan);
            var link = g.header.cloneNode(true);
            headerRow.appendChild(link);
            wrap.appendChild(headerRow);

            if (hasChildren) {
                var childWrap = document.createElement('div');
                childWrap.className = 'toc-group-children' + (defaultOpen ? '' : ' collapsed');
                var inner = document.createElement('div');
                inner.className = 'toc-group-children-inner';
                g.children.forEach(function(c) { inner.appendChild(c.cloneNode(true)); });
                childWrap.appendChild(inner);
                wrap.appendChild(childWrap);

                headerRow.addEventListener('click', function(e) {
                    e.preventDefault();
                    var w = this.closest('.toc-group');
                    var ch = w.querySelector('.toc-group-children');
                    var tg = w.querySelector('.toc-toggle');
                    if (!ch || !tg) return;
                    var wasCollapsed = ch.classList.contains('collapsed');
                    var collapsed = ch.classList.toggle('collapsed');
                    tg.classList.toggle('collapsed', collapsed);
                    setStored(gkey, collapsed);
                    if (wasCollapsed && !collapsed) {
                        var href = link.getAttribute('href');
                        if (href && href[0] === '#') {
                            var target = document.querySelector(href);
                            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                });
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            }
            container.appendChild(wrap);
        });

        sidebar.innerHTML = '';
        sidebar.appendChild(container);

        // 目录搜索：过滤、展开匹配项，Enter 跳转
        (function initTocSearch() {
            var searchEl = document.getElementById('toc-search');
            var clearEl = document.getElementById('toc-search-clear');
            if (!searchEl || !sidebar.contains(searchEl)) return;

            function getItemText(el) {
                var t = el && el.textContent ? el.textContent.replace(/\s+/g, ' ').trim() : '';
                return t;
            }
            function matches(q, text) {
                if (!q) return true;
                return text.toLowerCase().indexOf(q.toLowerCase()) >= 0;
            }

            function doSearch() {
                var q = (searchEl.value || '').trim();
                var groups = sidebar.querySelectorAll('.toc-group');
                var anyVisible = false;
                groups.forEach(function(g) {
                    var header = g.querySelector('.toc-group-header .toc-item');
                    var children = g.querySelectorAll('.toc-group-children-inner .toc-item');
                    var headerText = header ? getItemText(header) : '';
                    var headerMatch = matches(q, headerText);
                    var childMatches = [];
                    children.forEach(function(c) {
                        var ct = getItemText(c);
                        var m = matches(q, ct);
                        childMatches.push({ el: c, match: m });
                    });
                    var hasMatch = headerMatch || childMatches.some(function(x) { return x.match; });
                    g.classList.toggle('toc-group-hidden', !hasMatch);
                    if (hasMatch) anyVisible = true;
                    if (q && hasMatch) {
                        var ch = g.querySelector('.toc-group-children');
                        var tg = g.querySelector('.toc-toggle');
                        if (ch && ch.classList.contains('collapsed')) {
                            ch.classList.remove('collapsed');
                            if (tg) tg.classList.remove('collapsed');
                        }
                        childMatches.forEach(function(x) {
                            x.el.style.display = x.match ? '' : 'none';
                        });
                    } else if (!q) {
                        children.forEach(function(c) { c.style.display = ''; });
                    }
                });
                if (q) sidebar.classList.add('toc-searching');
                else sidebar.classList.remove('toc-searching');
                if (clearEl) clearEl.style.visibility = q ? 'visible' : 'hidden';
            }

            var debounceTimer;
            searchEl.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(doSearch, 120);
            });
            searchEl.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    searchEl.value = '';
                    doSearch();
                    searchEl.blur();
                    e.preventDefault();
                } else if (e.key === 'Enter') {
                    var q = (searchEl.value || '').trim().toLowerCase();
                    var candidates = sidebar.querySelectorAll('.toc-group:not(.toc-group-hidden) .toc-item[href^="#"]');
                    var first = null;
                    for (var i = 0; i < candidates.length; i++) {
                        var txt = (candidates[i].textContent || '').toLowerCase();
                        if (!q || txt.indexOf(q) >= 0) { first = candidates[i]; break; }
                    }
                    if (first) {
                        var href = first.getAttribute('href');
                        if (href && href.length > 1) {
                            var target = document.querySelector(href);
                            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                    e.preventDefault();
                }
            });
            if (clearEl) {
                clearEl.style.visibility = 'hidden';
                clearEl.addEventListener('click', function() {
                    searchEl.value = '';
                    doSearch();
                    searchEl.focus();
                });
            }
        })();
    })();

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

    document.querySelectorAll('[id^="ch"],[id^="app"],[id^="ai-knowledge"],#learning-path,#zero2one-link').forEach(el => observer.observe(el));

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

    // ========== 封面中部：AI 助手大按钮（主报告）| 章节页右上角简约按钮 ==========
    (function initPodcast() {
        var ctaWrap = document.getElementById('assistant-cta');
        var ctrl = document.createElement('div');
        if (ctaWrap) {
            ctrl.className = 'assistant-cta-inner';
            ctrl.innerHTML = '<button class="btn-assistant-main btn-chat" type="button" aria-label="打开AI对话">AI 助手</button>' +
                '<button class="btn-assistant-sub btn-podcast" type="button" aria-label="转为播客">转为播客</button>' +
                '<button class="btn-assistant-sub btn-play" type="button" aria-label="播放"><span class="icon">▶</span>播放</button>';
            ctaWrap.appendChild(ctrl);
        } else {
            ctrl.className = 'top-right-ctrl';
            ctrl.innerHTML = '<button class="btn-chat" type="button" aria-label="打开AI对话">AI对话</button>' +
                '<button class="btn-podcast" type="button" aria-label="转为播客">转为播客</button>' +
                '<button class="btn-play" type="button" aria-label="播放"><span class="icon">▶</span>播放</button>';
            document.body.appendChild(ctrl);
        }

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

        // AI对话必须在 initPodcast 之后执行（按钮由 initPodcast 动态创建）
        (function initChatPanel() {
            var layout = document.querySelector('.layout');
            var chatPanel = document.getElementById('chat-panel');
            var chatMessages = document.getElementById('chat-messages');
            var chatInput = document.getElementById('chat-input');
            var chatSend = document.getElementById('chat-send');
            var chatClose = document.getElementById('chat-panel-close');
            var btnChat = document.querySelector('.btn-chat');
            var API_BASE = (typeof location !== 'undefined' && /github\.io/i.test(location.hostname))
                ? '' : 'http://127.0.0.1:5010';
            var IS_ONLINE_DEPLOY = !API_BASE;
            var USER_PROFILE_KEY = 'ai_report_user_profile';
            var MAX_HISTORY_TURNS = 5;
            var MAX_PROFILE_ITEMS = 12;
            var chatHistory = [];
            if (!layout || !chatPanel || !btnChat) return;
            if (IS_ONLINE_DEPLOY) {
                var welcome = chatMessages.querySelector('.chat-msg-bot');
                if (welcome) {
                    welcome.innerHTML = '<p>在线版可阅读报告。AI 对话需<strong>本地运行</strong>：克隆仓库后执行 <code>python scripts/podcast_server.py</code>，再用 <code>python -m http.server 8000</code> 打开本页即可使用。</p>';
                }
            }
            function getSavedProfile() {
                try {
                    var raw = localStorage.getItem(USER_PROFILE_KEY);
                    if (!raw) return '';
                    var o = JSON.parse(raw);
                    return (o.items || []).slice(0, MAX_PROFILE_ITEMS).join('、') || '';
                } catch (e) { return ''; }
            }
            function extractProfileTerms(text) {
                if (!text || typeof text !== 'string') return [];
                var terms = [];
                var keywords = ['金融','医疗','教育','零售','制造','政务','保险','房地产','文旅','物流','能源','法律','农业','汽车','OpenClaw','LangChain','LangGraph','RAG','Agent','技术选型','从零起步','创业','落地'];
                for (var i = 0; i < keywords.length; i++) {
                    if (text.indexOf(keywords[i]) >= 0) terms.push(keywords[i]);
                }
                return terms;
            }
            function updateProfile(question, answer) {
                try {
                    var raw = localStorage.getItem(USER_PROFILE_KEY);
                    var o = raw ? JSON.parse(raw) : { items: [], updated: 0 };
                    var terms = extractProfileTerms(question).concat(extractProfileTerms(answer));
                    terms.forEach(function(t) {
                        if (t && o.items.indexOf(t) < 0) o.items.unshift(t);
                    });
                    o.items = o.items.slice(0, MAX_PROFILE_ITEMS);
                    o.updated = Date.now();
                    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(o));
                } catch (e) {}
            }
            function getHistoryForApi() {
                return chatHistory.slice(-MAX_HISTORY_TURNS * 2);
            }
            function clearMemory() {
                chatHistory = [];
                var welcome = chatMessages.querySelector('.chat-msg-bot');
                if (welcome) {
                    chatMessages.innerHTML = '';
                    chatMessages.appendChild(welcome);
                } else {
                    chatMessages.innerHTML = '<div class="chat-msg chat-msg-bot"><p>已开启新对话，继续提问吧。</p></div>';
                }
            }
            function toggleChat() {
                layout.classList.toggle('layout-chat-open');
                btnChat.classList.toggle('active', layout.classList.contains('layout-chat-open'));
                if (layout.classList.contains('layout-chat-open') && chatInput) chatInput.focus();
            }
            function esc(s) {
                return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
            }
            function parseTableCell(txt) {
                return (txt || '').trim().replace(/\n/g, '<br>');
            }
            function mdTableToHtml(md) {
                var lines = md.split('\n').filter(function(l) { return l.trim(); });
                if (lines.length < 2) return '<p>' + md.replace(/\n/g,'<br>') + '</p>';
                var rows = [];
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (/^\|[-:\s|]+\|$/.test(line)) continue;
                    var cells = line.split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c; });
                    if (cells.length) rows.push(cells);
                }
                if (rows.length === 0) return '<p>' + md.replace(/\n/g,'<br>') + '</p>';
                var html = '<div class="chat-table-wrap"><table class="chat-table"><thead><tr>';
                var cols = rows[0].length;
                for (var c = 0; c < cols; c++) {
                    html += '<th>' + parseTableCell(rows[0][c]) + '</th>';
                }
                html += '</tr></thead><tbody>';
                for (var r = 1; r < rows.length; r++) {
                    html += '<tr>';
                    for (var c = 0; c < cols; c++) {
                        html += '<td>' + parseTableCell(rows[r][c] || '') + '</td>';
                    }
                    html += '</tr>';
                }
                html += '</tbody></table></div>';
                return html;
            }
            /** 将 AI 返回内容转为美观富文本：无 # 符号、纯文本样式、支持图片/链接、表格 */
            function formatBotReply(text) {
                if (!text || typeof text !== 'string') return '';
                var s = (text + '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                s = s.replace(/^### (.+)$/gm, '<h4 class="chat-heading">$1</h4>');
                s = s.replace(/^## (.+)$/gm, '<h3 class="chat-heading">$1</h3>');
                s = s.replace(/^# (.+)$/gm, '<h2 class="chat-heading">$1</h2>');
                s = s.replace(/^---+$/gm, '<hr class="chat-divider">');
                s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<img src="$2" alt="$1" class="chat-img" loading="lazy" onerror="this.style.display=\'none\'">');
                s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<strong>$1</strong>');
                s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
                s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function(_, txt, url) {
                    if (/^javascript:|^data:/i.test(url)) return '[' + txt + '](' + url + ')';
                    var href = url, path = location.pathname || '';
                    if (path.indexOf('chapters/') >= 0) {
                        if (url.indexOf('chapters/') === 0) href = '../' + url;
                        else if (url.indexOf('#') === 0) href = '../AI行业落地分析报告.html' + url;
                    }
                    var ext = url.indexOf('https') === 0 ? ' target="_blank" rel="noopener noreferrer"' : '';
                    return '<a href="' + href + '" class="chat-link"' + ext + '>' + txt + '</a>';
                });
                var blocks = s.split(/\n\n+/);
                var out = '';
                for (var i = 0; i < blocks.length; i++) {
                    var b = blocks[i];
                    if (/^<hr /.test(b)) { out += b; continue; }
                    var headingMatch = b.match(/^(<h[234] class="chat-heading">.*?<\/h[234]>)\n?/);
                    var rest = headingMatch ? b.slice(headingMatch[0].length) : b;
                    if (headingMatch) out += headingMatch[1];
                    if (rest) {
                        if (/^\|.+\|[\s\S]*\|[-:\s|]+\|/.test(rest)) {
                            out += mdTableToHtml(rest);
                        } else if (/^[-*]\s+/m.test(rest) || /^\d+\.\s+/m.test(rest)) {
                            rest = rest.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>').replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
                            out += '<ul class="chat-list">' + rest.replace(/\n/g,'') + '</ul>';
                        } else {
                            out += '<p>' + rest.replace(/\n/g,'<br>') + '</p>';
                        }
                    }
                }
                return out || '<p>' + s.replace(/\n/g,'<br>') + '</p>';
            }
            function appendMsg(role, text) {
                var div = document.createElement('div');
                div.className = 'chat-msg chat-msg-' + role;
                div.innerHTML = role === 'bot' ? formatBotReply(text) : '<p>' + esc(text) + '</p>';
                chatMessages.appendChild(div);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            function getReportContext() {
                var main = document.getElementById('main-content') || document.querySelector('.main');
                return main ? (main.innerText || main.textContent || '').slice(0, 5000) : '';
            }
            function sendQuestion() {
                if (IS_ONLINE_DEPLOY) {
                    appendMsg('bot', '在线版暂不支持 AI 对话。请克隆仓库到本地，执行 python scripts/podcast_server.py 后使用。');
                    return;
                }
                var q = (chatInput.value || '').trim();
                if (!q) return;
                chatInput.value = '';
                chatInput.style.height = 'auto';
                appendMsg('user', q);
                var loadingDiv = document.createElement('div');
                loadingDiv.className = 'chat-msg chat-msg-bot chat-msg-loading';
                loadingDiv.innerHTML = '<p>正在思考…</p>';
                chatMessages.appendChild(loadingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                function updateStatus(txt) {
                    var p = loadingDiv.querySelector('p');
                    if (p) p.textContent = txt;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                var payload = {
                    question: q,
                    context: getReportContext(),
                    history: getHistoryForApi(),
                    user_profile: getSavedProfile(),
                    stream: true
                };
                fetch(API_BASE + '/api/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                    .then(function(res) {
                        if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || '请求失败'); });
                        var contentType = res.headers.get('content-type') || '';
                        if (contentType.indexOf('text/event-stream') >= 0 && res.body) {
                            var reader = res.body.getReader();
                            var decoder = new TextDecoder();
                            var buffer = '';
                            var finished = false;
                            function readChunk() {
                                if (finished) return Promise.resolve();
                                return reader.read().then(function(chunk) {
                                    if (chunk.done) {
                                        if (!finished) {
                                            finished = true;
                                            loadingDiv.remove();
                                            appendMsg('bot', '无法获取回答。请确保已启动 python scripts/podcast_server.py 且 .env 配置了 DEEPSEEK_API_KEY。');
                                            chatMessages.scrollTop = chatMessages.scrollHeight;
                                        }
                                        return;
                                    }
                                    buffer += decoder.decode(chunk.value, { stream: true });
                                    var parts = buffer.split('\n\n');
                                    buffer = parts.pop() || '';
                                    for (var i = 0; i < parts.length; i++) {
                                        var line = parts[i].split('\n').filter(function(l) { return l.indexOf('data: ') === 0; })[0];
                                        if (line) {
                                            try {
                                                var ev = JSON.parse(line.slice(6));
                                                if (ev.type === 'status' && ev.text) updateStatus(ev.text);
                                                else if (ev.type === 'done') {
                                                    finished = true;
                                                    var ans = ev.answer || '';
                                                    loadingDiv.remove();
                                                    appendMsg('bot', ans);
                                                    chatHistory.push({ role: 'user', content: q });
                                                    chatHistory.push({ role: 'assistant', content: ans });
                                                    updateProfile(q, ans);
                                                    chatMessages.scrollTop = chatMessages.scrollHeight;
                                                    return;
                                                } else if (ev.type === 'error') {
                                                    finished = true;
                                                    loadingDiv.remove();
                                                    appendMsg('bot', '错误：' + (ev.message || '未知错误'));
                                                    chatMessages.scrollTop = chatMessages.scrollHeight;
                                                    return;
                                                }
                                            } catch (e) {}
                                        }
                                    }
                                    return readChunk();
                                });
                            }
                            return readChunk();
                        }
                        return res.json().then(function(data) {
                            loadingDiv.remove();
                            if (data && data.ok && data.answer) {
                                appendMsg('bot', data.answer);
                                chatHistory.push({ role: 'user', content: q });
                                chatHistory.push({ role: 'assistant', content: data.answer });
                                updateProfile(q, data.answer);
                            } else {
                                appendMsg('bot', '无法获取回答。请确保已启动 python scripts/podcast_server.py 且 .env 配置了 DEEPSEEK_API_KEY。');
                            }
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        });
                    })
                    .catch(function(err) {
                        loadingDiv.remove();
                        appendMsg('bot', '连接失败。请启动 python scripts/podcast_server.py（端口 5010）后重试。');
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    });
            }
            btnChat.addEventListener('click', toggleChat);
            if (chatClose) chatClose.addEventListener('click', toggleChat);
            var btnNew = document.getElementById('chat-new-conversation');
            if (btnNew) btnNew.addEventListener('click', clearMemory);
            if (chatSend) chatSend.addEventListener('click', sendQuestion);
            document.querySelectorAll('.chat-prompt-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var prompt = (this.getAttribute('data-prompt') || '').trim();
                    if (prompt && chatInput) {
                        chatInput.value = prompt;
                        sendQuestion();
                    }
                });
            });
            if (chatInput) {
                chatInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
                });
                chatInput.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
                });
            }
        })();
    })();
});
