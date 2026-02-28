#!/usr/bin/env python3
"""
播客专业 TTS 本地服务
- DeepSeek：将正文改写为口语化播客脚本（非原文朗读）
- Edge TTS：微软专业语音，中文效果好，无需 API Key
用法：python scripts/podcast_server.py
需在 .env 配置 DEEPSEEK_API_KEY
"""
import os
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


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "deepseek": bool(DEEPSEEK_API_KEY)})


if __name__ == "__main__":
    print("播客 TTS 服务: http://127.0.0.1:5010")
    print("DeepSeek 改写: " + ("已配置" if DEEPSEEK_API_KEY else "未配置，将用原文"))
    app.run(host="0.0.0.0", port=5010, debug=False)
