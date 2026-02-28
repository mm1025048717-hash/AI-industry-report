# 贡献指南

欢迎参与本报告的完善与更新。以下是参与方式与规范说明。

## 参与方式

1. **Fork** 本仓库
2. 创建分支：`git checkout -b feature/your-feature`
3. 修改后提交：`git commit -m "描述你的修改"`
4. 推送并创建 Pull Request

## 内容规范

### 报告结构

- **主报告**：`AI行业落地分析报告.html` 为入口，涵盖总论、技术基础、行业应用与附录
- **章节**：`chapters/` 下各行业深度报告、实战教程、产品/公司名录等
- **数据**：`data/report-data.json` 由 `scripts/fetch_data.py` 自动或手动更新

### 数据更新

- 关键指标（市场规模、企业数等）通过 `[data-update="path.to.key"]` 绑定到 `report-data.json`
- 修改数据后需运行 `python scripts/fetch_data.py`（如有 Serper 配置则需 `.env` 中的 `SERPER_API_KEY`）
- 数据会缓存在浏览器 `localStorage`，24 小时后自动刷新

### 样式与脚本

- **样式**：统一使用 `styles.css`，遵循 `--blue`、`--gray-50` 等 CSS 变量
- **内容规范**：详见 [STYLE-GUIDE.md](STYLE-GUIDE.md)（语言风格、提示框、结构、排版）
- **脚本**：`script.js` 负责数据加载、目录高亮、Chart.js、Mermaid、播客 TTS
- 新增交互时注意移动端响应式（`@media (max-width: 768px)`）与可访问性（`aria-label`、`:focus`）

### 章节说明

- 新章节建议放在 `chapters/`，命名如 `99x-标题.html`
- 侧边栏需在对应主报告或汇编页中添加目录链接
- 表格建议使用 `class="comp-table"`，小屏下会自动横向滚动

## 技术栈

- 静态 HTML + CSS + 原生 JS
- Chart.js（图表）、Mermaid（流程图）
- 无构建工具，直接浏览器打开或部署至 GitHub Pages

## 反馈

如有数据错误或建议，欢迎提 Issue。
