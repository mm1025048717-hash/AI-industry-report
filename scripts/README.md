# 自动更新脚本说明

## 工作流程

1. **fetch_data.py**：从外部源抓取数据，更新 `data/report-data.json`
   - GitHub API（免费）：LangChain、Dify、OpenCLAW 等仓库 star 数
   - Serper API（可选）：需配置 `SERPER_API_KEY`，可搜索最新行业数据

2. **report-data.json**：报告数据源，由 `fetch_data.py` 更新

3. **客户端加载**：`script.js` 在页面加载时请求 `data/report-data.json`，填充带 `data-update` 属性的元素

## 本地运行

```bash
pip install -r requirements.txt
python scripts/fetch_data.py
```

## Serper 爬取（国内+国外）已启用

**每周自动运行**：GitHub Actions 每周一 08:00（北京时）自动执行；首次需配置 `SERPER_API_KEY`。

### 配置 SERPER_API_KEY

**GitHub 自动运行（推荐）**
1. 注册 [Serper](https://serper.dev/) 获取 API Key（免费 2500 次/月）
2. 仓库 → Settings → Secrets and variables → Actions → New repository secret
3. 名称填 `SERPER_API_KEY`，值填你的 Key

**本地运行**
```bash
# 方式一：复制 .env.example 为 .env，填入 SERPER_API_KEY=你的Key
# 方式二：环境变量
export SERPER_API_KEY=你的Key   # Linux/macOS
set SERPER_API_KEY=你的Key     # Windows CMD
$env:SERPER_API_KEY="你的Key"  # Windows PowerShell

python scripts/fetch_data.py
```

### 爬取关键词

| 国内 | 国外 |
|------|------|
| 中国AI创业 2026 | AI startup opportunities |
| AI 垂直行业 创业 | AI startup failure |
| AI创业 失败案例 | indie hacker AI |
| 一人公司 AI | |

结果写入 `report-data.json` 的 `assembly.cn` / `assembly.intl`，[创业汇编页](chapters/99-AI创业机会全行业汇编.html) 实时展示。

### 行业/数据补充（自动化）

`config.yaml` 中 `sources.supplement` 配置具体内容搜索，自动抓取行业、市场、数据类资料：

| 主题 | 搜索关键词 |
|------|-----------|
| 金融AI | 金融AI 市场规模 2026 银行 保险 |
| 医疗AI | 医疗AI 影像 慢病管理 2026 市场规模 |
| 制造业AI | 制造业AI 质检 视觉检测 落地 2026 |
| 零售AI | 零售 数字人直播 智能客服 AI 2026 |
| 教育AI | 教育AI K12 职教 2026 政策 |
| Agent智能体 | AI Agent 智能体 2026 企业应用 |
| RAG应用 | RAG 检索增强 企业知识库 应用 |
| AI市场数据 | 中国AI产业规模 2026 信通院 艾瑞 |

结果写入 `report-data.json` 的 `supplements`，创业汇编页「数据来源与方法」下展示。可在 `config.yaml` 中增减 `supplement.queries`。

## 播客专业 TTS（非原文朗读）

右上角「转为播客」+「播放」支持**专业语音**：AI 改写 + 微软 Edge TTS，说话自然好听。

### 工作原理

1. **DeepSeek**：将正文改写为口语化播客脚本（过滤冗余、口语化表达）
2. **Edge TTS**：微软神经网络语音，中文效果好，**无需 API Key**

### 使用步骤

1. 复制 `.env.example` 为 `.env`，填入 `DEEPSEEK_API_KEY`（[获取](https://platform.deepseek.com/api_keys)）
2. 启动播客服务：`python scripts/podcast_server.py`
3. 用浏览器打开报告（需通过 HTTP 访问，如 `python -m http.server 8000`）
4. 点击右上角「播放」，自动调用改写 + TTS

未启动服务时，自动降级为浏览器原生朗读。

### DeepSeek 在报告中的其他用途

| 功能 | 说明 | 用法 |
|------|------|------|
| **AI 对话** | 顶部「AI 助手」按钮 | **顶级执行型 Agent**：支持 **web_search 联网搜索**（需 SERPER_API_KEY）、open_link、search_report、load_skill，可联网查最新动态并回答，输出可点击超链接 |
| **fetch_data 提炼** | 对 assembly 爬取结果生成「说人话」摘要 | 在 `config.yaml` 设置 `deepseek.enabled: true`，运行 `fetch_data.py` 时自动提炼 |
| **播客改写** | 正文 → 口语化脚本 | 右上角「转为播客」时调用 |

## 新增可更新字段

1. 在 `data/report-data.json` 添加对应键值
2. 在 HTML 中用 `<span data-update="path.to.key">默认值</span>` 包裹
3. 客户端会自动用 JSON 中的值覆盖
