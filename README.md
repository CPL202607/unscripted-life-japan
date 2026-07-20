# 人生沒有劇本，有時會在日本

靜態部落格。文章以 Markdown 撰寫於 `posts/`，由 `scripts/build.js` 產生 `dist/`。

## 開發

```bash
npm install
npm run build   # 產生 dist/
npm run dev     # 產生並在本機預覽（http://localhost:3000）
```

## 新增文章

1. 在 `posts/` 新增一個 `.md` 檔，檔名建議用日期＋slug，例如 `2026-08-01-my-post.md`。
2. Frontmatter 需包含：

   ```yaml
   ---
   title: 文章標題
   slug: my-post          # 網址路徑 /posts/my-post/
   date: 2026-08-01        # 發佈日期
   author: Peilun
   excerpt: 一句話摘要，會顯示在首頁卡片
   ---
   ```

3. 內文用 Markdown 撰寫。
4. commit + push 後，Cloudflare Pages 會自動重新 build 並部署，首頁卡片會自動依「最後更新時間」重新排序（最後更新時間取自該檔案最後一次 git commit 的時間）。

## 瀏覽次數計數器

使用 Supabase。第一次使用前，到 Supabase 專案的 SQL Editor 執行 `supabase/schema.sql` 建立資料表與函式。
