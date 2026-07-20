export const site = {
  title: '人生沒有劇本 有時會在日本',
  shortTitle: '人生沒有劇本',
  description: '記錄旅行與生活裡那些沒有事先寫好的片段',
  defaultAuthor: 'Peilun',
  url: '', // 填入 Cloudflare Pages 網址後可補上，用於 SEO 的 og:url（非必填）
  supabaseUrl: 'https://xfwgefzoocvizdufpnqm.supabase.co',
  supabaseAnonKey: 'sb_publishable_ieZMTe9vcLo2r273tLVSJw_sLwoAsad',
  hero: {
    image: '/images/hero.jpg',
    alt: '嚴島神社的海上大鳥居，背景是宮島的山與嚴島神社',
    creditText: 'Itsukushima-jinja torii, Miyajima, Japan',
    creditAuthor: 'Jakub Hałun',
    creditSourceUrl: 'https://commons.wikimedia.org/wiki/File:Itsukushima-jinja_torii,_Miyajima,_Japan,_20240816_1716_4048.jpg',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  // Special posts are full-page interactive experiences (not markdown articles).
  // Their sourceDir is copied verbatim into dist/posts/<slug>/, then a small
  // back-link + author/date + view-counter bar is injected before </body>.
  specialPosts: [
    {
      slug: 'seinan-war-3d',
      title: '西南戰爭 3D 戰場全記錄',
      author: 'Peilun',
      date: '2026-07-20',
      excerpt: '明治十年西南戰爭互動 3D 沙盤：從鹿兒島火藥庫事件到城山最後決戰，十二幕重現日本最後的內戰。',
      sourceDir: 'special-posts/seinan-war-3d',
      thumbnail: '/posts/seinan-war-3d/og-image.png',
    },
  ],
};
