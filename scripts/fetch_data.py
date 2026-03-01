#!/usr/bin/env python3
"""
抓取外部数据并更新 data/report-data.json
数据源：GitHub API（免费）、Serper 搜索（需 API Key，可选）
可选：DeepSeek 对 assembly/supplements 生成「说人话」摘要
"""
import json
import os
import sys
import time

from datetime import datetime
from pathlib import Path

# 可选：从 .env 加载 SERPER_API_KEY、DEEPSEEK_API_KEY（本地开发）
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

import requests

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_FILE = DATA_DIR / "report-data.json"
CONFIG_FILE = DATA_DIR / "config.yaml"


def load_config():
    """加载配置，若无可选则使用默认"""
    try:
        import yaml
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception:
        return {
            "sources": {"github": {"enabled": True}},
        }


def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    data["_meta"]["last_fetch"] = datetime.now().strftime("%Y-%m-%d %H:%M UTC")
    data["_meta"]["last_updated"] = datetime.now().strftime("%Y年%m月%d日")
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def fetch_github_stars(owner: str, repo: str) -> int:
    """从 GitHub API 获取仓库 star 数（无需 token，有速率限制）"""
    url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        r = requests.get(url, timeout=10, headers={"Accept": "application/vnd.github.v3+json"})
        if r.status_code == 200:
            return r.json().get("stargazers_count", 0)
    except Exception as e:
        print(f"  GitHub {owner}/{repo} 失败: {e}", file=sys.stderr)
    return 0


def summarize_with_deepseek(text: str, api_key: str) -> str:
    """使用 DeepSeek 生成 1 句通俗摘要"""
    if not api_key or not text:
        return ""
    text = (text or "")[:800]
    prompt = f"请用1句话概括以下内容，通俗易懂、说人话。只输出摘要：\n\n{text}"
    try:
        r = requests.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "temperature": 0.3,
            },
            timeout=30,
        )
        if r.status_code == 200:
            content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            return (content or "").strip()[:200]
    except Exception as e:
        print(f"  DeepSeek 摘要失败: {e}", file=sys.stderr)
    return ""


def fetch_serper(query: str, api_key: str) -> list:
    """使用 Serper API 搜索（需 API Key）"""
    if not api_key:
        return []
    url = "https://google.serper.dev/search"
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    try:
        r = requests.post(url, json={"q": query, "num": 5}, headers=headers, timeout=15)
        if r.status_code == 200:
            results = r.json().get("organic", [])
            return [
                {"title": i.get("title", ""), "snippet": i.get("snippet", ""), "link": i.get("link", "")}
                for i in results[:3]
            ]
    except Exception as e:
        print(f"  Serper 搜索失败: {e}", file=sys.stderr)
    return []


def main():
    data = load_data()
    config = load_config()

    # 1. GitHub 数据
    github_cfg = config.get("sources", {}).get("github", {})
    if github_cfg.get("enabled"):
        repos = github_cfg.get("repos", [
            {"owner": "langchain-ai", "repo": "langchain", "key": "langchain_stars"},
            {"owner": "langgenius", "repo": "dify", "key": "dify_stars"},
            {"owner": "openclaw", "repo": "openclaw", "key": "openclaw_stars"},
        ])
        for r in repos:
            stars = fetch_github_stars(r["owner"], r["repo"])
            key = r.get("key", f"{r['repo']}_stars")
            if "github" not in data:
                data["github"] = {}
            data["github"][key] = stars
            print(f"  {r['owner']}/{r['repo']}: {stars} stars")

    # 2. Serper 搜索（可选）- 国内+国外数据爬取
    serper_cfg = config.get("sources", {}).get("serper", {})
    api_key = os.environ.get("SERPER_API_KEY", "")

    if serper_cfg.get("enabled") and api_key:
        assembly = {"cn": [], "intl": [], "fetch_date": datetime.now().isoformat()[:10]}
        queries_cn = serper_cfg.get("queries_cn", serper_cfg.get("queries", ["中国AI创业 2026"]))[:4]
        queries_intl = serper_cfg.get("queries_intl", [])[:4]
        for q in queries_cn:
            for item in fetch_serper(q, api_key):
                item["query"] = q
                assembly["cn"].append(item)
        for q in queries_intl:
            for item in fetch_serper(q, api_key):
                item["query"] = q
                assembly["intl"].append(item)
        if assembly["cn"] or assembly["intl"]:
            # 可选：DeepSeek 对每条生成「说人话」摘要
            dk = os.environ.get("DEEPSEEK_API_KEY", "")
            ds_cfg = config.get("deepseek", {})
            if ds_cfg.get("enabled") and dk:
                max_n = ds_cfg.get("max_items_per_list", 5)
                for lst_name in ("cn", "intl"):
                    for i, item in enumerate(assembly.get(lst_name, [])):
                        if i >= max_n:
                            break
                        snip = item.get("snippet", "")
                        if snip:
                            summary = summarize_with_deepseek(snip, dk)
                            if summary:
                                item["summary_ai"] = summary
                            time.sleep(0.5)  # 节流
                print("  DeepSeek 已提炼 assembly 摘要")
            data["assembly"] = assembly
            print(f"  国内抓取: {len(assembly['cn'])} 条 | 国外抓取: {len(assembly['intl'])} 条")

    # 3. 具体内容补充（行业/市场/数据）
    supp_cfg = config.get("sources", {}).get("supplement", {})
    if supp_cfg.get("enabled") and api_key:
        queries = supp_cfg.get("queries", [])
        supplements = {}
        labels = {
            "finance_ai": "金融AI",
            "medical_ai": "医疗AI",
            "mfg_ai": "制造业AI",
            "retail_ai": "零售AI",
            "edu_ai": "教育AI",
            "agent_trend": "Agent智能体",
            "rag_app": "RAG应用",
            "ai_market_data": "AI市场数据",
        }
        for item in queries[:8]:
            key = item.get("key", "") if isinstance(item, dict) else ""
            q = item.get("q", "") if isinstance(item, dict) else ""
            if not key or not q:
                continue
            results = fetch_serper(q, api_key)
            if results:
                supplements[key] = {
                    "topic": labels.get(key, key),
                    "query": q,
                    "items": results,
                    "fetch_date": datetime.now().isoformat()[:10],
                }
        if supplements:
            data["supplements"] = supplements
            print(f"  补充搜索: {len(supplements)} 个主题")

    save_data(data)
    print("数据抓取完成:", data["_meta"]["last_updated"])


if __name__ == "__main__":
    main()
