# 报告自动更新机制说明

## 一、架构概览

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  GitHub Actions │────▶│  scripts/fetch_data  │────▶│ data/report-data.json│
│  (定时/手动触发)  │     │  (GitHub API/Serper)  │     │  (数据源)             │
└─────────────────┘     └──────────────────────┘     └──────────┬──────────┘
                                                               │
                                                               ▼
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  用户打开报告    │────▶│  script.js  fetch     │────▶│  [data-update] 元素  │
│  (浏览器)        │     │  report-data.json     │     │  自动填充最新数据     │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
```

## 二、已接入的自动更新

| 字段 | 数据源 | 更新频率 |
|------|--------|----------|
| 附录A 市场规模、企业数、用户数等 | report-data.json（可扩展 Serper） | 每周一 / 手动 |
| 页脚「数据更新」日期 | fetch_data.py 自动写入 | 每次抓取 |
| LangChain / Dify / OpenCLAW GitHub stars | GitHub API | 每次抓取 |

## 三、使用方式

### 手动触发一次更新
1. 打开仓库 → **Actions**
2. 选择「报告自动更新」
3. 点击 **Run workflow**

### 自动触发条件
- **每周一 08:00（北京时）**：定时运行
- **push 到 main**：仅当修改 `data/`、`scripts/` 或工作流文件时

## 四、扩展数据源

### 1. 启用 Serper 网页搜索（可选）
- 注册 [serper.dev](https://serper.dev) 获取 API Key（免费 2500 次/月）
- 仓库 **Settings** → **Secrets and variables** → **Actions** → 新建 `SERPER_API_KEY`
- 编辑 `data/config.yaml`，将 `sources.serper.enabled` 设为 `true`

### 2. 新增可更新字段
1. 在 `data/report-data.json` 中增加字段
2. 在 HTML 中用 `<span data-update="path.to.key">默认值</span>` 包裹
3. 页面加载时会自动用 JSON 中的值替换

### 3. 扩展抓取源
修改 `scripts/fetch_data.py`，在 `main()` 中增加新的抓取逻辑，将结果写入 `data["xxx"]` 即可。

## 五、文件清单

| 文件 | 作用 |
|------|------|
| `data/report-data.json` | 数据源，由 fetch 脚本更新 |
| `data/config.yaml` | 抓取配置（GitHub 仓库、Serper 查询等） |
| `scripts/fetch_data.py` | 抓取脚本 |
| `scripts/apply_to_report.py` | 占位符注入（备用，当前未用） |
| `.github/workflows/update-report.yml` | CI 工作流 |
| `script.js` | 客户端加载 JSON 并填充 `[data-update]` |
