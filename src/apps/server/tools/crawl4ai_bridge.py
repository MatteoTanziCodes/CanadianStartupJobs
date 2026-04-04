import asyncio
import contextlib
import io
import json
import os
import re
import sys
import warnings
from typing import Any
from urllib.parse import urljoin, urlparse

from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, LinkPreviewConfig
import requests
from requests import RequestsDependencyWarning
from bs4 import BeautifulSoup

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

warnings.filterwarnings("ignore", category=RequestsDependencyWarning)


def extract_markdown(result: Any) -> str:
    markdown = getattr(result, "markdown", None)
    if markdown is None:
        return ""
    if isinstance(markdown, str):
        return markdown
    raw_markdown = getattr(markdown, "raw_markdown", None)
    if isinstance(raw_markdown, str):
        return raw_markdown
    fit_markdown = getattr(markdown, "fit_markdown", None)
    if isinstance(fit_markdown, str):
        return fit_markdown
    return str(markdown)


def normalize_links(result: Any) -> list[str]:
    links = getattr(result, "links", {}) or {}
    items: list[str] = []
    for bucket in ("internal", "external"):
      for entry in links.get(bucket, []) or []:
          href = entry.get("href")
          if isinstance(href, str) and href not in items:
              items.append(href)
    return items


def summarize(markdown: str) -> str:
    normalized = re.sub(r"\s+", " ", markdown).strip()
    return normalized[:1000]


def normalize_url(url: str) -> str:
    if url.startswith("file:///") and re.match(r"^file:///[A-Za-z]:/", url):
        return f"file://{url[8:]}"
    return url


def extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def fallback_fetch(url: str) -> tuple[str, list[dict[str, Any]]]:
    if url.startswith("file://"):
        local_path = url[7:]
        if local_path.startswith("/") and re.match(r"^/[A-Za-z]:/", local_path):
            local_path = local_path[1:]
        with open(local_path, "r", encoding="utf-8") as file_handle:
            html = file_handle.read()
        base_url = f"file://{local_path}"
    else:
        response = requests.get(
            url,
            timeout=30,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; CanadianStartupJobsBot/1.0; +https://canadianstartupjobs.com)"
            },
        )
        response.raise_for_status()
        html = response.text
        base_url = url

    soup = BeautifulSoup(html, "html.parser")
    current_host = urlparse(base_url).netloc

    links: list[dict[str, Any]] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        href = urljoin(base_url, str(anchor.get("href")))
        if href in seen:
            continue
        seen.add(href)

        target_host = urlparse(href).netloc
        category = "internal" if target_host == current_host else "external"
        links.append(
            {
                "url": href,
                "title": anchor.get("title") or anchor.get_text(" ", strip=True) or "",
                "description": "",
                "category": category,
            }
        )

    return extract_text_from_html(html), links


def format_map_links(result: Any, query: str | None, limit: int) -> dict[str, list[dict[str, Any]]]:
    links = getattr(result, "links", {}) or {}
    rows: list[dict[str, Any]] = []
    lowered_query = query.lower() if query else None

    for bucket in ("internal", "external"):
        for entry in links.get(bucket, []) or []:
            href = entry.get("href")
            if not isinstance(href, str):
                continue

            head_data = entry.get("head_data") or {}
            meta = head_data.get("meta") or {}
            title = head_data.get("title") or entry.get("title") or entry.get("text") or ""
            description = meta.get("description") or entry.get("context") or ""

            row = {
                "url": href,
                "title": title,
                "description": description,
                "category": bucket,
            }

            if lowered_query:
                haystack = " ".join(
                    [
                        href,
                        str(entry.get("text") or ""),
                        str(entry.get("title") or ""),
                        str(entry.get("context") or ""),
                        str(title or ""),
                        str(description or ""),
                    ]
                ).lower()
                if lowered_query not in haystack:
                    continue

            rows.append(row)

    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in rows:
        url = row["url"]
        if url in seen:
            continue
        seen.add(url)
        deduped.append(row)

    return {"links": deduped[:limit]}


async def handle_scrape(url: str, options: dict[str, Any]) -> dict[str, Any]:
    url = normalize_url(url)
    formats = options.get("formats") or ["markdown", "links"]
    config = CrawlerRunConfig(
        only_text=True,
        verbose=False,
    )

    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            async with AsyncWebCrawler(verbose=False) as crawler:
                result = await crawler.arun(url=url, config=config)

        if not getattr(result, "success", False):
            raise RuntimeError(getattr(result, "error_message", "Crawl4AI scrape failed"))

        markdown = extract_markdown(result)
        links = normalize_links(result)
    except Exception:
        markdown, fallback_links = fallback_fetch(url)
        links = [entry["url"] for entry in fallback_links]

    payload: dict[str, Any] = {}
    if "markdown" in formats:
        payload["markdown"] = markdown
    if "links" in formats:
        payload["links"] = links
    if "summary" in formats:
        payload["summary"] = summarize(markdown)

    return payload


async def handle_map(url: str, options: dict[str, Any]) -> dict[str, Any]:
    url = normalize_url(url)
    limit = int(options.get("limit") or 50)
    query = options.get("search")
    link_preview_config = LinkPreviewConfig(
        include_internal=True,
        include_external=True,
        max_links=limit,
        query=query,
        score_threshold=0.15 if query else 0.0,
        verbose=False,
    )
    config = CrawlerRunConfig(
        only_text=True,
        score_links=bool(query),
        link_preview_config=link_preview_config,
        verbose=False,
    )

    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            async with AsyncWebCrawler(verbose=False) as crawler:
                result = await crawler.arun(url=url, config=config)

        if not getattr(result, "success", False):
            raise RuntimeError(getattr(result, "error_message", "Crawl4AI map failed"))

        return format_map_links(result, query, limit)
    except Exception:
        _, fallback_links = fallback_fetch(url)
        rows = fallback_links
        if query:
            lowered_query = query.lower()
            rows = [
                row for row in rows
                if lowered_query in " ".join(
                    [
                        row["url"],
                        str(row.get("title") or ""),
                        str(row.get("description") or ""),
                    ]
                ).lower()
            ]
        return {"links": rows[:limit]}


async def main() -> None:
    raw = sys.stdin.read()
    request = json.loads(raw)

    command = request.get("command")
    url = request.get("url")
    options = request.get("options") or {}

    if not isinstance(url, str) or not url:
        raise RuntimeError("Missing url")

    url = normalize_url(url)

    if command == "scrape":
        data = await handle_scrape(url, options)
    elif command == "map":
        data = await handle_map(url, options)
    else:
        raise RuntimeError(f"Unknown command: {command}")

    print(json.dumps({"ok": True, "data": data}))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(error),
                }
            )
        )
        raise
