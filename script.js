// AI+行业落地分析报告 - 交互脚本

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
});
