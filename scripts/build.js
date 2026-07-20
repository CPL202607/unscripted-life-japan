import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
import { marked } from 'marked';
import { site } from '../site.config.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "Updated" date resolution order: last git commit touching the file > frontmatter `updated` > frontmatter `date` > file mtime.
function resolveUpdatedDate(filePath, frontmatterUpdated, frontmatterDate) {
  try {
    const out = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (out) return out;
  } catch {
    // git not available or file not tracked yet — fall through
  }
  if (frontmatterUpdated) return new Date(frontmatterUpdated).toISOString();
  if (frontmatterDate) return new Date(frontmatterDate).toISOString();
  return fs.statSync(filePath).mtime.toISOString();
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadPosts() {
  const files = fs.existsSync(POSTS_DIR)
    ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))
    : [];

  return files.map((filename) => {
    const filePath = path.join(POSTS_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    const slug = data.slug || filename.replace(/\.md$/, '');
    const publishedDate = new Date(data.date).toISOString();
    const updatedDate = resolveUpdatedDate(filePath, data.updated, data.date);

    return {
      slug,
      title: data.title || slug,
      author: data.author || site.defaultAuthor,
      excerpt: data.excerpt || '',
      thumbnail: data.thumbnail || '',
      publishedDate,
      updatedDate,
      html: marked.parse(content),
    };
  });
}

function loadSpecialPosts() {
  return (site.specialPosts || []).map((sp) => {
    const sourcePath = path.join(ROOT, sp.sourceDir);
    const publishedDate = new Date(sp.date).toISOString();
    const updatedDate = resolveUpdatedDate(sourcePath, sp.updated, sp.date);

    return {
      slug: sp.slug,
      title: sp.title,
      author: sp.author || site.defaultAuthor,
      excerpt: sp.excerpt || '',
      thumbnail: sp.thumbnail || '',
      publishedDate,
      updatedDate,
      external: true,
      sourceDir: sp.sourceDir,
    };
  });
}

function injectBlogBarIntoExternalPost(indexHtmlPath, post) {
  const html = fs.readFileSync(indexHtmlPath, 'utf-8');

  // Kept deliberately small: the host page (seinan-war-3d) already has its own
  // fixed UI in every corner (#titleCard top-left, #legend top-right, #playbar
  // bottom), so this only adds a minimal back-button. The view count still
  // increments silently — it's surfaced on the homepage card, not duplicated here.
  const bar = `
<a href="/" title="回到「${escapeHtml(site.shortTitle)}」" class="view-counter" data-slug="${escapeHtml(post.slug)}" style="position:fixed;top:10px;left:10px;z-index:9999;display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:rgba(12,14,19,.78);border:1px solid rgba(216,184,119,.4);border-radius:50%;color:#d8b877;text-decoration:none;font-size:15px;line-height:1;backdrop-filter:blur(4px);">&larr;<span class="count" style="display:none;"></span></a>
<script type="module">
  import { incrementAndShowCount } from '/js/counter.js';
  incrementAndShowCount(${JSON.stringify(post.slug)});
</script>
`;

  fs.writeFileSync(indexHtmlPath, html.replace('</body>', `${bar}</body>`));
}

function layout({ title, description, bodyHtml, extraHead = '' }) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/style.css">
${extraHead}
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

function heroFooterCredit() {
  return `<a href="${site.hero.creditSourceUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    site.hero.creditText
  )}</a> by ${escapeHtml(site.hero.creditAuthor)}, licensed under <a href="${site.hero.licenseUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    site.hero.licenseName
  )}</a>`;
}

function siteFooter() {
  return `<footer class="site-footer">
  <p class="hero-credit">Hero 圖片來源：${heroFooterCredit()}</p>
  <p class="copyright">&copy; ${new Date().getFullYear()} ${escapeHtml(site.title)}</p>
</footer>`;
}

function renderPostPage(post) {
  const body = `
<header class="site-header">
  <a class="site-brand" href="/">${escapeHtml(site.shortTitle)}</a>
</header>
<main class="container post">
  <article>
    <h1 class="post-title">${escapeHtml(post.title)}</h1>
    <p class="post-meta">
      <span class="post-author">作者：${escapeHtml(post.author)}</span>
      <span class="post-dates">
        <time datetime="${post.publishedDate}">發佈於 ${formatDate(post.publishedDate)}</time>
        <span class="updated-sep">·</span>
        <time class="updated-time" datetime="${post.updatedDate}">最後更新 ${formatDate(post.updatedDate)}</time>
      </span>
    </p>
    <div class="post-content">
      ${post.html}
    </div>
    <p class="view-counter" data-slug="${escapeHtml(post.slug)}">瀏覽次數：<span class="count">—</span></p>
  </article>
</main>
${siteFooter()}
<script type="module">
  import { incrementAndShowCount } from '/js/counter.js';
  incrementAndShowCount(${JSON.stringify(post.slug)});
</script>
`;
  return layout({ title: `${post.title} - ${site.shortTitle}`, description: post.excerpt || site.description, bodyHtml: body });
}

function renderIndexPage(posts) {
  const sorted = [...posts].sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate));

  const cards = sorted
    .map(
      (post) => `
    <a class="card" href="/posts/${post.slug}/" data-slug="${escapeHtml(post.slug)}">
      ${
        post.thumbnail
          ? `<img class="card-thumb" src="${escapeHtml(post.thumbnail)}" alt="" loading="lazy">`
          : `<div class="card-thumb card-thumb-placeholder" aria-hidden="true">${escapeHtml((post.title || '').slice(0, 1))}</div>`
      }
      <div class="card-body">
      <h2 class="card-title">${escapeHtml(post.title)}</h2>
      <p class="card-excerpt">${escapeHtml(post.excerpt)}</p>
      <p class="card-meta">
        <span class="card-author">${escapeHtml(post.author)}</span>
        <time class="card-updated" datetime="${post.updatedDate}">最後更新 ${formatDate(post.updatedDate)}</time>
      </p>
      <p class="card-views">瀏覽次數：<span class="count">—</span></p>
      </div>
    </a>`
    )
    .join('\n');

  const body = `
<header class="site-header">
  <a class="site-brand" href="/">${escapeHtml(site.shortTitle)}</a>
</header>
<section class="hero">
  <img class="hero-image" src="${site.hero.image}" alt="${escapeHtml(site.hero.alt)}">
  <div class="hero-text">
    <h1>${escapeHtml(site.title)}</h1>
    <p>${escapeHtml(site.description)}</p>
  </div>
</section>
<main class="container">
  <p class="site-view-counter">網站總瀏覽次數：<span class="count">—</span></p>
  <div class="card-grid">
    ${cards}
  </div>
</main>
${siteFooter()}
<script type="module">
  import { incrementAndShowSiteCount, hydrateCardCounts } from '/js/counter.js';
  incrementAndShowSiteCount();
  hydrateCardCounts();
</script>
`;
  return layout({ title: site.title, description: site.description, bodyHtml: body });
}

function build() {
  rimraf(DIST_DIR);
  fs.mkdirSync(DIST_DIR, { recursive: true });

  if (fs.existsSync(PUBLIC_DIR)) copyDir(PUBLIC_DIR, DIST_DIR);

  const posts = loadPosts();
  const specialPosts = loadSpecialPosts();

  for (const post of posts) {
    const postDir = path.join(DIST_DIR, 'posts', post.slug);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, 'index.html'), renderPostPage(post));
  }

  for (const post of specialPosts) {
    const postDir = path.join(DIST_DIR, 'posts', post.slug);
    copyDir(path.join(ROOT, post.sourceDir), postDir);
    injectBlogBarIntoExternalPost(path.join(postDir, 'index.html'), post);
  }

  const allPosts = [...posts, ...specialPosts];
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), renderIndexPage(allPosts));

  console.log(`Built ${posts.length} post(s) and ${specialPosts.length} special post(s) into dist/`);
}

build();
