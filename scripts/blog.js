// blog.js — homepage Writing section pulls the latest 3 posts from content/blog/manifest.json
// and renders them in-place. Falls back to the existing placeholder copy if the manifest is empty
// or unreachable.

(function () {
  const container = document.querySelector('[data-latest-posts]');
  if (!container) return;

  fetch('content/blog/manifest.json', { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error('manifest fetch failed');
      return r.json();
    })
    .then((manifest) => {
      const posts = (manifest.posts || []).slice(0, 3);
      if (posts.length === 0) return; // keep the placeholder

      const html = posts
        .map((p) => {
          const date = p.date.replace(/-/g, '.');
          const archetype = (p.archetype || '').toUpperCase().replace('-', ' ');
          return `
            <a class="latest-row" href="${p.url}">
              <span class="archetype">${archetype}</span>
              <span class="title">${escapeHtml(p.title)}</span>
              <span class="date">${date}</span>
            </a>
          `;
        })
        .join('');

      container.innerHTML = `
        <div class="latest-posts">${html}</div>
        <a class="see-all-writing" href="blog/">See all writing &rarr;</a>
      `;
    })
    .catch(() => {
      // Manifest missing or malformed. Leave the placeholder in place.
    });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
