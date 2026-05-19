---
description: Promote a draft to published, regenerate the blog HTML, update the manifest
argument-hint: <slug-or-filename>
---

You are the publishing pipeline for russh.work.

When run, this command:
1. Locates the draft in `content/blog/_drafts/`
2. Audits the draft against brand voice rules
3. Updates the frontmatter `status` to `published`
4. Moves the file to `content/blog/published/`
5. Renders the markdown to a standalone HTML page at `blog/<slug>.html` using the template at `blog/_template.html`
6. Regenerates `content/blog/manifest.json` with all published posts
7. Regenerates `blog/index.html` (the blog listing page)
8. Reports back to Russ with the post URL and a summary

This is the only command that writes to `published/`. Drafts cannot be promoted by hand because the manifest, the blog index, and the individual HTML page must stay in sync. Run `/publish` and it does all of them.

## Inputs

`$ARGUMENTS` is the slug or filename of the draft. Examples:
- `inside-trialedge`
- `inside-trialedge.md`
- `content/blog/_drafts/inside-trialedge.md`

If no argument is given, list the files in `content/blog/_drafts/` and ask which to publish.

## Process

### 1. Locate and read the draft

Find the file in `content/blog/_drafts/`. Read it. If multiple matches exist (e.g. `inside-trialedge.md` and `inside-trialedge-v2.md`), ask which to publish.

### 2. Audit

Scan the body for brand-voice violations. Block the publish if any are found, and report them to Russ for review:

- Em-dashes (`—`, `–`)
- Exclamation points
- Banned superlatives ("amazing", "incredible", "world-class", "revolutionary", "best in class", "robust", "seamless")
- Banned phrases ("AI-powered", "trusted by", "next generation")
- Unresolved `[TODO: confirm]` markers
- Missing required frontmatter fields: `title`, `slug`, `archetype`, `date`, `status`, `summary`

If any violation is found, **stop**. Report the violations and the line numbers. Do not modify anything. Wait for Russ to fix the draft and re-run.

### 3. Update frontmatter

Set `status: published`. Confirm `date` is today's date in `YYYY-MM-DD` format (or the date Russ specified in the draft, if it is in the past). Confirm `slug` matches the filename.

### 4. Move the file

Move from `content/blog/_drafts/<slug>.md` to `content/blog/published/<slug>.md`. Use `git mv` if the project is git-tracked.

### 5. Render the post page

Read `blog/_template.html`. It has these template tokens to replace:

- `{{TITLE}}` - frontmatter title
- `{{DATE}}` - frontmatter date, formatted as `YYYY.MM.DD`
- `{{ARCHETYPE}}` - frontmatter archetype, uppercased (THESIS, SHIP NOTE, FIELD NOTE)
- `{{PROJECT}}` - frontmatter project, uppercased, or empty string
- `{{VERSION}}` - frontmatter version, or empty string
- `{{SUMMARY}}` - frontmatter summary
- `{{TAGS}}` - frontmatter tags, joined by ` / `, uppercased
- `{{BODY_HTML}}` - the markdown body rendered to HTML
- `{{WORD_COUNT}}` - word count of the body (no frontmatter)
- `{{READ_TIME}}` - estimated read time at 220 wpm, rounded to nearest minute
- `{{PREV_POST_URL}}` and `{{PREV_POST_TITLE}}` - the previous published post (by date), or empty
- `{{NEXT_POST_URL}}` and `{{NEXT_POST_TITLE}}` - the next, or empty

For markdown to HTML: convert with these rules (do it by hand if a markdown library is not available):
- `# H1` -> `<h1 class="h1">...</h1>`
- `## H2` -> `<h2 class="h2">...</h2>`
- `### H3` -> `<h3 class="h3">...</h3>`
- `**bold**` -> `<strong>...</strong>`
- `*italic*` -> `<em>...</em>`
- Backtick inline code -> `<code>...</code>`
- Triple-backtick fenced blocks -> `<pre><code>...</code></pre>`
- `==highlight==` -> `<mark class="callout">...</mark>`
- Paragraphs -> `<p class="body">...</p>`
- `> blockquote` -> `<blockquote class="pull-quote">...</blockquote>`
- Lists: `<ol>`/`<ul>` with `<li>`
- Horizontal rule `---` -> `<hr class="rule">`

Write the rendered HTML to `blog/<slug>.html`.

### 6. Regenerate the manifest

Read every `.md` file in `content/blog/published/`. Extract frontmatter. Build:

```json
{
  "generated": "<ISO timestamp>",
  "count": <int>,
  "posts": [
    {
      "title": "...",
      "slug": "...",
      "url": "/blog/<slug>.html",
      "archetype": "thesis | ship-note | field-note",
      "date": "YYYY-MM-DD",
      "project": "...",
      "version": "...",
      "tags": [...],
      "summary": "...",
      "word_count": <int>,
      "read_time_min": <int>
    },
    ...
  ]
}
```

Sort posts by `date` descending. Write to `content/blog/manifest.json`.

### 7. Regenerate the blog index

Read `blog/_index-template.html`. It has these tokens:
- `{{POST_COUNT}}` - total published count
- `{{LATEST_DATE}}` - the latest post's date
- `{{POSTS_HTML}}` - the rendered list of posts

For each post in the manifest, render the row below. **Special case:** the first row whose archetype is `field-note` must also carry `id="field-notes"` so the homepage and blog post navs can anchor to the field notes section.

```html
<li class="post-row"<add id="field-notes" if this is the first field-note row> data-slug="<slug>" data-archetype="<archetype>">
  <a href="<url>">
    <span class="post-num">/<index padded to 2 digits></span>
    <span class="post-archetype"><archetype uppercased></span>
    <span class="post-date"><YYYY.MM.DD></span>
    <h2 class="post-title"><title></h2>
    <p class="post-summary"><summary></p>
    <div class="post-meta">
      <span class="tag">PROJECT: <project></span>
      <span class="tag">VERSION: <version></span>
      <span class="tag">READ: <read_time_min> MIN</span>
    </div>
  </a>
</li>
```

Empty fields (e.g. project null on a Field Note) are omitted from the meta line.

Write to `blog/index.html`.

### 8. Report back

After all writes succeed, tell Russ:
1. The published post URL: `/blog/<slug>.html`
2. The post archetype, project, version, and word count
3. The count of total published posts and the date of the previous one
4. Any `[TODO: confirm]` markers that survived the audit (these were not blocking but should be addressed in a follow-up edit)
5. The next-step suggestion: deploy via `git push` if the project is git-tracked, or "deploy is not yet configured" if not

## Failure modes

- **Draft not found.** List `_drafts/` contents and ask which to publish.
- **Frontmatter malformed.** Quote the malformed line and ask Russ to fix.
- **Brand voice violations.** Quote each violation with line number. Block the publish.
- **Slug collision with existing published post.** Stop. Ask Russ whether to overwrite or rename.
- **Template token missing.** If a token in the template has no matching frontmatter field, render it as empty string and log a warning. Do not crash.

This command is the only writer to `published/`. Drafts can be edited freely; published posts can only be modified by editing the markdown and re-running `/publish`.
