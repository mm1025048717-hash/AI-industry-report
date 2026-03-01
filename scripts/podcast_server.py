#!/usr/bin/env python3
"""
播客专业 TTS 本地服务
- DeepSeek：将正文改写为口语化播客脚本（非原文朗读）
- Edge TTS：微软专业语音，中文效果好，无需 API Key
用法：python scripts/podcast_server.py
需在 .env 配置 DEEPSEEK_API_KEY
"""
import json
import os
import re
import sys
from pathlib import Path

# 加载 .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

try:
    from flask import Flask, request, jsonify, Response
    from flask_cors import CORS
except ImportError:
    print("请安装: pip install flask flask-cors", file=sys.stderr)
    sys.exit(1)

try:
    import edge_tts
except ImportError:
    print("请安装: pip install edge-tts", file=sys.stderr)
    sys.exit(1)

import requests

app = Flask(__name__)
CORS(app, origins=["*"])

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")
DEEPSEEK_BASE = "https://api.deepseek.com"
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")

# Edge TTS 播客风格中文女声
TTS_VOICE = "zh-CN-XiaoxiaoNeural"


REWRITE_PROMPT = """你是一位专业播客主播。请将以下报告内容改写为适合播客朗读的口语化脚本。
要求：
1. 保留核心信息与数据，去掉冗余
2. 用语自然、像在聊天，不要太书面
3. 适合朗读，每段 100-200 字
4. 只输出改写后的脚本，不要解释

原标题：{title}

原文：
{text}
"""

SUMMARY_PROMPT = """请用1～2句话概括以下内容，要求通俗易懂、说人话，适合小白快速理解。只输出摘要，不要解释。

原文：
{text}
"""


def summarize_with_deepseek(text: str) -> str:
    """使用 DeepSeek 生成通俗摘要（1～2句）"""
    if not DEEPSEEK_API_KEY:
        return None
    text = (text or "")[:4000]
    prompt = SUMMARY_PROMPT.format(text=text)
    try:
        r = requests.post(
            f"{DEEPSEEK_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "temperature": 0.3,
            },
            timeout=45,
        )
        if r.status_code == 200:
            content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            return content.strip() if content else None
    except Exception as e:
        print(f"DeepSeek 摘要失败: {e}", file=sys.stderr)
    return None


def rewrite_with_deepseek(title: str, text: str) -> str:
    """使用 DeepSeek 改写为播客脚本"""
    if not DEEPSEEK_API_KEY:
        return None
    text = (text or "")[:6000]  # 限制长度
    prompt = REWRITE_PROMPT.format(title=title or "本节", text=text)
    try:
        r = requests.post(
            f"{DEEPSEEK_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "temperature": 0.7,
            },
            timeout=60,
        )
        if r.status_code == 200:
            content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            return content.strip() if content else None
    except Exception as e:
        print(f"DeepSeek 调用失败: {e}", file=sys.stderr)
    return None


@app.route("/api/rewrite", methods=["POST", "OPTIONS"])
def rewrite():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    title = data.get("title", "")
    text = data.get("text", "")
    result = rewrite_with_deepseek(title, text)
    if result:
        return jsonify({"ok": True, "script": result})
    return jsonify({"ok": False, "script": None, "fallback": (title + "。" + (text or "")[:2000])})


@app.route("/api/tts", methods=["POST", "OPTIONS"])
def tts():
    """Edge TTS 生成音频，返回 mp3"""
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "缺少 text"}), 400
    text = text[:5000]
    voice = data.get("voice", TTS_VOICE)
    try:
        import asyncio
        from io import BytesIO

        async def gen():
            buf = BytesIO()
            com = edge_tts.Communicate(text, voice)
            async for chunk in com.stream():
                if chunk.get("type") == "audio":
                    buf.write(chunk["data"])
            buf.seek(0)
            return buf.getvalue()

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        audio_bytes = loop.run_until_complete(gen())
        return Response(audio_bytes, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ========== 顶级执行型 Agent：可执行工具定义 ==========
AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "open_link",
            "description": "为用户准备好可点击的超链接。当需要引导用户访问报告内章节、独立页面或外部文档时调用。执行后返回链接信息，你需在回复中用 [显示文字](url) 格式呈现。",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "完整 URL，如 https://docs.openclaw.ai 或 #ai-knowledge 或 chapters/00-小白总指南.html"},
                    "display_text": {"type": "string", "description": "链接显示文字，如「OpenClaw 文档」"}
                },
                "required": ["url", "display_text"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_report",
            "description": "在报告上下文中搜索关键词，获取相关片段。当用户问题涉及报告具体内容且 context 较长时，可先搜索定位再回答。",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词或短语"}
                },
                "required": ["query"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "联网搜索互联网上的实时信息。当用户问最新动态、当前数据、新闻、产品更新、或报告 context 中找不到的内容时调用。执行后返回搜索结果摘要，你据此回答并可用 [标题](链接) 格式附上来源链接。",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词，如「OpenClaw 2026 最新」「DeepSeek R1 发布」「AI Agent 趋势」"}
                },
                "required": ["query"],
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "load_skill",
            "description": "加载预设执行技能。skill_name 可选：openclaw（OpenClaw 网关快速参考）、langchain（LangChain Agent 框架）、skills（LangChain Skills 按需加载）、langgraph（LangGraph 编排）。执行后返回技能摘要，你结合其内容回答并附带可点击链接。",
            "parameters": {
                "type": "object",
                "properties": {
                    "skill_name": {
                        "type": "string",
                        "enum": ["openclaw", "langchain", "skills", "langgraph"],
                        "description": "要加载的技能名"
                    }
                },
                "required": ["skill_name"],
            }
        }
    },
]

# 技能内容（load_skill 执行时返回）
SKILL_CONTENT = {
    "openclaw": """OpenClaw 是自托管 AI Agent 网关，MIT 开源。
核心：一个 Gateway 进程连接 WhatsApp/Telegram/Discord/iMessage 与 AI 编码助手。
安装：npm install -g openclaw@latest
快速开始：https://docs.openclaw.ai/start/quickstart
Agent 概念：https://docs.openclaw.ai/concepts/agent
工具配置：https://docs.openclaw.ai/tools""",
    "langchain": """LangChain 将大模型与工具结合的 Agent 框架，支持推理、工具调用、多步任务。
英文文档：https://python.langchain.com
中文文档：https://langchain-doc.cn
Agent 智能体：https://python.langchain.com/docs/concepts/agents/""",
    "skills": """LangChain Skills：轻量级技能组合，按需加载专属 prompt。
适合多领域助手，不同团队可独立维护技能。
文档：https://docs.langchain.com/oss/python/langchain/multi-agent/skills""",
    "langgraph": """LangGraph 是 LangChain 推荐的 Agent 编排框架，更灵活可控。
官网：https://langchain-ai.github.io/langgraph/""",
}


def _fetch_serper(query: str) -> list:
    """Serper API 联网搜索"""
    if not SERPER_API_KEY:
        print("Serper: 未配置 SERPER_API_KEY", file=sys.stderr)
        return []
    url = "https://google.serper.dev/search"
    headers = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}
    try:
        r = requests.post(url, json={"q": query, "num": 5}, headers=headers, timeout=20)
        if r.status_code == 200:
            data = r.json()
            results = data.get("organic") or data.get("organicResults") or []
            out = [
                {"title": i.get("title", ""), "snippet": i.get("snippet", ""), "link": i.get("link", "")}
                for i in results[:5]
            ]
            if out:
                print(f"Serper 成功: {query[:40]}... -> {len(out)} 条", file=sys.stderr)
            return out
        print(f"Serper 失败: HTTP {r.status_code}, body={r.text[:200]}", file=sys.stderr)
    except requests.exceptions.Timeout:
        print("Serper: 请求超时", file=sys.stderr)
    except Exception as e:
        print(f"Serper 搜索失败: {e}", file=sys.stderr)
    return []


def _execute_tool(name: str, args: dict, context: str) -> str:
    """执行工具并返回结果"""
    if name == "web_search":
        q = (args.get("query") or "").strip()
        if not q:
            return "搜索关键词为空"
        results = _fetch_serper(q)
        if not results:
            return "联网搜索无结果，请检查 SERPER_API_KEY 或稍后重试。"
        lines = []
        for i, r in enumerate(results, 1):
            title = (r.get("title") or "").strip()
            snippet = (r.get("snippet") or "").strip()
            link = (r.get("link") or "").strip()
            lines.append(f"{i}. [{title}]({link})\n   {snippet}")
        return "联网搜索结果：\n\n" + "\n\n".join(lines)
    if name == "open_link":
        url = args.get("url", "")
        display = args.get("display_text", "链接")
        if url and display:
            return f"已准备链接：[{display}]({url})，请在回复中用该格式呈现供用户点击。"
        return "参数不完整"
    if name == "search_report":
        q = (args.get("query") or "").strip().lower()
        if not q or not context:
            return "无可用上下文或查询为空"
        ctx = context.lower()
        idx = ctx.find(q)
        if idx >= 0:
            start = max(0, idx - 80)
            end = min(len(context), idx + len(q) + 120)
            snippet = context[start:end].replace("\n", " ")
            return f"找到相关内容：...{snippet}..."
        return "未在报告中找到匹配内容"
    if name == "load_skill":
        sk = (args.get("skill_name") or "").lower()
        content = SKILL_CONTENT.get(sk, "")
        if content:
            return content
        return f"未知技能，可用：{list(SKILL_CONTENT.keys())}"
    return "未知工具"


ASK_SYSTEM_BASE = """你是《AI+行业落地从0到1实战教程》的**顶级执行型智能体**（Execution Agent）。当消息开头有【联网搜索结果】时，说明系统已执行搜索，你必须基于该结果回答，并用 [标题](链接) 格式附上来源。否则可调用 web_search、load_skill、open_link、search_report 等工具。

**必须使用工具的场景**：
- 问最新/更新/动态/2026 等 → 若有【联网搜索结果】则直接据此回答；否则必须调用 web_search
- 问 OpenClaw/LangChain/Skills 框架 → 调用 load_skill 并 open_link
- 问报告章节 → 调用 open_link 准备 #anchor 或 chapters/xxx.html

**格式**：**加粗**；- 或 1. 分点；### 小标题。引用一律 [显示文字](链接)。"""


def _build_system_with_profile(user_profile: str) -> str:
    """根据用户偏好扩展系统提示，越用越懂你"""
    if not (user_profile or "").strip():
        return ASK_SYSTEM_BASE
    return ASK_SYSTEM_BASE + f"\n\n【用户偏好（越用越懂你）】该用户关注过：{user_profile.strip()}。回答时可适当呼应、延展或推荐相关内容。"


def _needs_web_search(question: str) -> bool:
    """判断是否需要联网搜索（最新/更新/动态类问题）"""
    q = (question or "").replace(" ", "").replace("\u3000", "").lower()
    triggers = ["最新", "更新", "动态", "最近", "刚刚", "2026", "有什么新", "怎么用", "进展", "动向", "新闻"]
    return any(t in q for t in triggers)


def _build_search_query(question: str) -> str:
    """从问题中提取更简洁的搜索关键词，提高命中率"""
    q = (question or "").strip()[:100]
    keywords = []
    for k in ["DeepSeek", "OpenClaw", "Agent", "RAG", "2026", "AI"]:
        if k in q:
            keywords.append(k)
    for m in re.finditer(r"[\u4e00-\u9fa5]{2,6}", q):
        w = m.group()
        if w in ("最新", "更新", "动态", "进展", "动向", "新闻"):
            keywords.append(w)
            break
    if keywords:
        return " ".join(keywords[:6])
    return q[:60] if q else "AI 2026"


TOOL_DISPLAY_NAMES = {
    "web_search": "联网搜索",
    "open_link": "准备链接",
    "search_report": "搜索报告",
    "load_skill": "加载技能",
}


def ask_with_deepseek(question: str, context: str = "", history=None, user_profile: str = "", on_status=None):
    """顶级执行型 Agent：DeepSeek + Function Calling 循环。on_status(text) 可选，用于流式推送状态"""
    def emit(txt):
        if callable(on_status):
            on_status(txt)

    if not DEEPSEEK_API_KEY:
        return None
    user_content = question
    if context:
        user_content = f"【当前报告片段（供参考）】\n{context[:6000]}\n\n【用户问题】\n{question}"
    if _needs_web_search(question) and SERPER_API_KEY:
        emit("正在联网搜索…")
        q = _build_search_query(question)
        results = _fetch_serper(q)
        if results:
            lines = []
            for i, r in enumerate(results[:5], 1):
                title = (r.get("title") or "").strip()
                snippet = (r.get("snippet") or "").strip()
                link = (r.get("link") or "").strip()
                lines.append(f"{i}. [{title}]({link})\n   {snippet}")
            user_content = f"【联网搜索结果 - 请据此回答并附上 [标题](链接)】\n\n" + "\n\n".join(lines) + "\n\n---\n\n" + user_content
        else:
            user_content = "【重要】预联网搜索未返回结果，请立即调用 web_search 工具获取最新信息后再回答。\n\n" + user_content
    messages = [{"role": "system", "content": _build_system_with_profile(user_profile)}]
    for h in (history or [])[-10:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": str(h["content"])[:2000]})
    messages.append({"role": "user", "content": user_content})
    max_turns = 5
    for turn in range(max_turns):
        try:
            emit("正在思考…")
            payload = {
                "model": "deepseek-chat",
                "messages": messages,
                "stream": False,
                "temperature": 0.5,
            }
            payload["tools"] = AGENT_TOOLS
            payload["tool_choice"] = "auto"
            r = requests.post(
                f"{DEEPSEEK_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
                json=payload,
                timeout=60,
            )
            if r.status_code != 200:
                break
            msg = r.json().get("choices", [{}])[0].get("message", {})
            tool_calls = msg.get("tool_calls") or []
            content = (msg.get("content") or "").strip()
            assistant_msg = {"role": "assistant", "content": content or ""}
            if tool_calls:
                assistant_msg["tool_calls"] = tool_calls
            messages.append(assistant_msg)
            if not tool_calls:
                return content or None
            for tc in tool_calls:
                fname = (tc.get("function") or {}).get("name", "")
                disp = TOOL_DISPLAY_NAMES.get(fname, fname)
                emit(f"正在调用 {disp}…")
                fargs_str = (tc.get("function") or {}).get("arguments", "{}")
                try:
                    fargs = json.loads(fargs_str)
                except Exception:
                    fargs = {}
                result = _execute_tool(fname, fargs, context)
                emit("正在生成回答…")
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", ""),
                    "content": str(result),
                })
        except Exception as e:
            print(f"DeepSeek Agent 失败: {e}", file=sys.stderr)
            break
    return None


def _ask_with_deepseek_stream(question: str, context: str, history=None, user_profile: str = ""):
    """Generator: 每步 yield {'type':'status'|'done'|'error', ...}"""
    if not DEEPSEEK_API_KEY:
        yield {"type": "error", "message": "未配置 DEEPSEEK_API_KEY"}
        return
    user_content = question
    if context:
        user_content = f"【当前报告片段（供参考）】\n{context[:6000]}\n\n【用户问题】\n{question}"
    if _needs_web_search(question) and SERPER_API_KEY:
        yield {"type": "status", "text": "正在联网搜索…"}
        q = _build_search_query(question)
        results = _fetch_serper(q)
        if results:
            lines = []
            for i, r in enumerate(results[:5], 1):
                title = (r.get("title") or "").strip()
                snippet = (r.get("snippet") or "").strip()
                link = (r.get("link") or "").strip()
                lines.append(f"{i}. [{title}]({link})\n   {snippet}")
            user_content = f"【联网搜索结果 - 请据此回答并附上 [标题](链接)】\n\n" + "\n\n".join(lines) + "\n\n---\n\n" + user_content
        else:
            user_content = "【重要】预联网搜索未返回结果，请立即调用 web_search 工具获取最新信息后再回答。\n\n" + user_content
    messages = [{"role": "system", "content": _build_system_with_profile(user_profile)}]
    for h in (history or [])[-10:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": str(h["content"])[:2000]})
    messages.append({"role": "user", "content": user_content})
    max_turns = 5
    for _ in range(max_turns):
        try:
            yield {"type": "status", "text": "正在思考…"}
            payload = {
                "model": "deepseek-chat",
                "messages": messages,
                "stream": False,
                "temperature": 0.5,
            }
            payload["tools"] = AGENT_TOOLS
            payload["tool_choice"] = "auto"
            r = requests.post(
                f"{DEEPSEEK_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
                json=payload,
                timeout=60,
            )
            if r.status_code != 200:
                yield {"type": "error", "message": f"API 错误 {r.status_code}"}
                return
            msg = r.json().get("choices", [{}])[0].get("message", {})
            tool_calls = msg.get("tool_calls") or []
            content = (msg.get("content") or "").strip()
            assistant_msg = {"role": "assistant", "content": content or ""}
            if tool_calls:
                assistant_msg["tool_calls"] = tool_calls
            messages.append(assistant_msg)
            if not tool_calls:
                yield {"type": "done", "answer": content or ""}
                return
            for tc in tool_calls:
                fname = (tc.get("function") or {}).get("name", "")
                disp = TOOL_DISPLAY_NAMES.get(fname, fname)
                yield {"type": "status", "text": f"正在调用 {disp}…"}
                fargs_str = (tc.get("function") or {}).get("arguments", "{}")
                try:
                    fargs = json.loads(fargs_str)
                except Exception:
                    fargs = {}
                result = _execute_tool(fname, fargs, context)
                yield {"type": "status", "text": "正在生成回答…"}
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", ""),
                    "content": str(result),
                })
        except Exception as e:
            yield {"type": "error", "message": str(e)}
            return
    yield {"type": "error", "message": "达到最大轮次"}


@app.route("/api/ask", methods=["POST", "OPTIONS"])
def ask():
    """自然语言问答：基于报告内容回答用户问题。支持 stream=true 返回 SSE 流式状态"""
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    question = (data.get("question") or "").strip()
    if not question:
        return jsonify({"ok": False, "answer": None, "error": "缺少 question"}), 400
    context = (data.get("context") or "")[:6000]
    history = data.get("history") or []
    user_profile = (data.get("user_profile") or "").strip()
    use_stream = data.get("stream") is True
    if use_stream:
        def gen():
            for event in _ask_with_deepseek_stream(question, context, history=history, user_profile=user_profile):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        return Response(
            gen(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    result = ask_with_deepseek(question, context, history=history, user_profile=user_profile)
    if result:
        return jsonify({"ok": True, "answer": result})
    return jsonify({"ok": False, "answer": None})


@app.route("/api/summarize", methods=["POST", "OPTIONS"])
def summarize():
    """DeepSeek 生成通俗摘要（供报告「AI 智能摘要」等功能调用）"""
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"ok": False, "summary": None, "error": "缺少 text"}), 400
    result = summarize_with_deepseek(text)
    if result:
        return jsonify({"ok": True, "summary": result})
    return jsonify({"ok": False, "summary": None})


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "deepseek": bool(DEEPSEEK_API_KEY)})


if __name__ == "__main__":
    print("播客 TTS 服务: http://127.0.0.1:5010")
    print("DeepSeek 改写: " + ("已配置" if DEEPSEEK_API_KEY else "未配置，将用原文"))
    print("Agent 联网搜索: " + ("已配置 (Serper)" if SERPER_API_KEY else "未配置，.env 中 SERPER_API_KEY 可启用"))
    app.run(host="0.0.0.0", port=5010, debug=False)
