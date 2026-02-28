#!/usr/bin/env python3
"""
将 data/report-data.json 中的值注入到 HTML 报告的 {{DATA.xxx}} 占位符
支持嵌套键，如 DATA.market.core_2026 -> data["market"]["core_2026"]
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "report-data.json"
REPORT_FILE = ROOT / "AI行业落地分析报告.html"


def get_nested(data: dict, path: str):
    """从嵌套 dict 取值，如 'market.core_2026' -> data['market']['core_2026']"""
    keys = [k for k in path.split(".") if not k.startswith("_")]
    for i, k in enumerate(keys):
        if i == len(keys) - 1:
            return data.get(k)
        data = data.get(k, {})
        if not isinstance(data, dict):
            return None
    return None


def apply_placeholders(content: str, data: dict) -> str:
    """替换 {{DATA.xxx.yyy}} 为对应值"""
    pattern = r'\{\{DATA\.([a-zA-Z0-9_.]+)\}\}'
    def replacer(m):
        path = m.group(1)
        val = get_nested(data, path)
        if val is None:
            return m.group(0)  # 保持原样
        return str(val)
    return re.sub(pattern, replacer, content)


def apply_date_footer(content: str, data: dict) -> str:
    """更新页脚「数据更新：YYYY年MM月DD日」"""
    last = data.get("_meta", {}).get("last_updated", "")
    if not last:
        return content
    # 只替换日期部分，保留后面说明
    pattern = r'(数据更新：)[0-9]+年[0-9]+月[0-9]+日'
    return re.sub(pattern, rf'\g<1>{last}', content, count=1)


def main():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    with open(REPORT_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # 占位符替换（若存在）
    content = apply_placeholders(content, data)
    # 页脚日期
    content = apply_date_footer(content, data)

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write(content)

    print("报告已应用最新数据:", data.get("_meta", {}).get("last_updated", ""))


if __name__ == "__main__":
    main()
