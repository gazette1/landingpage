"""Build sitemap.xml and feed.xml for russh.work from the blog manifest.

    python tools/build_feeds.py

Run it after /publish (step 8) and after adding or retiring a listed page. The sitemap holds the homepage, the
writing index, every published post and the listed pages in LISTED; unlisted demos stay out. Last-modified dates
come from git. feed.xml is the RSS 2.0 feed behind the writing index's RSS link."""
import json
import subprocess
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://russh.work"
LISTED = ["blue-sweep/index.html"]  # indexable pages outside the blog that the homepage links to


def git_date(path):
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", path], cwd=ROOT, capture_output=True, text=True)
    return out.stdout.strip() or None


def url_for(path):
    """Cloudflare Pages serves posts without .html and folders with a trailing slash."""
    if path == "index.html":
        return SITE + "/"
    if path.endswith("/index.html"):
        return f"{SITE}/{path[:-len('index.html')]}"
    return f"{SITE}/{path.removesuffix('.html')}"


def main():
    posts = json.loads((ROOT / "content" / "blog" / "manifest.json").read_text(encoding="utf-8"))["posts"]
    pages = ["index.html", "blog/index.html"] + LISTED + [p["url"] for p in posts]
    missing = [p for p in pages if not (ROOT / p).exists()]
    if missing:
        raise SystemExit(f"missing pages: {missing}")
    rows = []
    for path in pages:
        lastmod = git_date(path)
        rows.append(f"  <url><loc>{escape(url_for(path))}</loc>" + (f"<lastmod>{lastmod}</lastmod>" if lastmod else "")
                    + "</url>")
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      + "\n".join(rows) + "\n</urlset>\n", encoding="utf-8")
    items = []
    for p in posts:  # the manifest is newest first
        link = url_for(p["url"])
        when = format_datetime(datetime.strptime(p["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc))
        items.append(f"    <item><title>{escape(p['title'])}</title><link>{link}</link><guid>{link}</guid>"
                     f"<pubDate>{when}</pubDate><description>{escape(p.get('summary') or '')}</description></item>")
    (ROOT / "feed.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n'
                                   f"    <title>russh.work / Writing</title>\n    <link>{SITE}/blog/</link>\n"
                                   "    <description>Thesis posts, ship notes and field notes by Russell Harris."
                                   "</description>\n" + "\n".join(items) + "\n  </channel>\n</rss>\n", encoding="utf-8")
    print(f"sitemap.xml: {len(pages)} pages; feed.xml: {len(posts)} posts")


if __name__ == "__main__":
    main()
