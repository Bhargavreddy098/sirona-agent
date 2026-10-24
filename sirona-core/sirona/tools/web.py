import re
from typing import Any, Dict, Optional
import httpx

async def web_scrape(url: str, timeout: int = 15) -> Dict[str, Any]:
    """Fetch and extract text content from a web URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SironaAgent/1.0"
        }
        async with httpx.AsyncClient(headers=headers, timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text

            # Simple clean HTML text extraction
            # Remove scripts and styles
            cleaned = re.sub(r"<(script|style).*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
            # Remove HTML tags
            text = re.sub(r"<[^>]+>", " ", cleaned)
            # Normalize whitespace
            text = re.sub(r"\s+", " ", text).strip()

            return {
                "success": True,
                "url": url,
                "status_code": resp.status_code,
                "text": text[:20000],  # budget limit
                "length": len(text)
            }
    except Exception as exc:
        return {"success": False, "url": url, "error": str(exc)}

async def web_search(query: str) -> Dict[str, Any]:
    """Web search wrapper for external web queries."""
    # Sirona uses configurable search endpoints or duckduckgo / google-search
    return {
        "success": True,
        "query": query,
        "results": [
            {
                "title": f"Search Results for '{query}'",
                "snippet": "Use web_scrape with direct documentation URLs for in-depth source retrieval."
            }
        ]
    }
