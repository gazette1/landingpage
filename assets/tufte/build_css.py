"""Build russh-tufte.css: Tufte CSS (MIT) with the three ET Book faces inlined
as base64 woff, plus russh-extensions.css. Demo pages inline the output so
they make no runtime requests. Run: python build_css.py"""
import base64, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "tufte.css"), encoding="utf-8").read()
ext = open(os.path.join(HERE, "russh-extensions.css"), encoding="utf-8").read()

def b64(name):
    return base64.b64encode(open(os.path.join(HERE, name), "rb").read()).decode()

faces = "".join(
    '@font-face{font-family:"et-book";src:url(data:font/woff;base64,%s) format("woff");'
    "font-weight:%s;font-style:%s;font-display:swap}\n" % (b64(f), w, s)
    for f, w, s in [
        ("et-book-roman-line-figures.woff", "normal", "normal"),
        ("et-book-display-italic-old-style-figures.woff", "normal", "italic"),
        ("et-book-bold-line-figures.woff", "bold", "normal"),
    ]
)
# Drop every original @font-face block (they point at files we do not serve).
body = re.sub(r"@font-face\s*\{[^}]*\}\s*", "", src)
# The old-style-figures family is not shipped; fall back to et-book.
body = body.replace("font-family: et-book-roman-old-style;", "font-family: et-book;")
lic = "/* Tufte CSS, MIT License, Copyright (c) 2014 Dave Liepmann. ET Book fonts, MIT, Dmitry Krasny, Bonnie Scranton, Edward Tufte. */\n"
out = lic + faces + body + "\n" + ext
open(os.path.join(HERE, "russh-tufte.css"), "w", encoding="utf-8").write(out)
print("russh-tufte.css", len(out), "bytes;", out.count("@font-face"), "faces;", "http" in re.sub(r"https?://github\.com[^\s]*", "", out))
