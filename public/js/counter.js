import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public anon key — safe to expose client-side; write access is gated by the
// increment_page_view() RPC (SECURITY DEFINER), not by table-level grants.
const SUPABASE_URL = 'https://xfwgefzoocvizdufpnqm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ieZMTe9vcLo2r273tLVSJw_sLwoAsad';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const numberFormat = new Intl.NumberFormat('zh-Hant');

function paint(el, count) {
  if (el) el.textContent = numberFormat.format(count ?? 0);
}

export async function incrementAndShowCount(slug) {
  const { data, error } = await supabase.rpc('increment_page_view', { slug_input: slug });
  if (error) {
    console.error('view counter error', error);
    return;
  }
  document.querySelectorAll(`.view-counter[data-slug="${slug}"] .count`).forEach((el) => paint(el, data));
}

export async function incrementAndShowSiteCount() {
  const { data, error } = await supabase.rpc('increment_page_view', { slug_input: 'home' });
  if (error) {
    console.error('site counter error', error);
    return;
  }
  document.querySelectorAll('.site-view-counter .count').forEach((el) => paint(el, data));
}

export async function hydrateCardCounts() {
  const cards = document.querySelectorAll('.card[data-slug]');
  const slugs = [...cards].map((c) => c.dataset.slug);
  if (!slugs.length) return;

  const { data, error } = await supabase.from('page_views').select('slug, views').in('slug', slugs);
  if (error) {
    console.error('card counter error', error);
    return;
  }

  const counts = Object.fromEntries(data.map((row) => [row.slug, row.views]));
  cards.forEach((card) => {
    const el = card.querySelector('.card-views .count');
    paint(el, counts[card.dataset.slug] ?? 0);
  });
}
