"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, ShoppingBag, X } from "lucide-react";

type Deal = {
  id: string;
  title: string;
  brand?: string;
  price: number;
  currency: string;
  image: string;
  url: string;
  section: string;
  sections: string[];
  badge: string;
  note: string;
  installments?: number;
  score?: number;
  source?: string;
};
type FeedItem = {
  source: string;
  source_product_id: string;
  title: string;
  brand?: string;
  price: number | null;
  currency?: string;
  image_url: string;
  product_url: string;
  primary_section: string;
  sections?: string[];
  badge?: string;
  offer_score?: number;
  installment_eligible?: boolean;
  free_delivery_evidence?: boolean;
};
type AmazonItem = {
  id: string;
  title: string;
  brand?: string;
  price: number;
  currency: string;
  image: string;
  url: string;
  section: string;
  sections: string[];
  badge: string;
  score: number;
  rating?: number | null;
  reviews?: number;
  source: string;
};

const sections = ["Best Value", "Amazon", "Under €25", "Pay in 4", "Selling Fast", "Fast Delivery", "Jewelry", "Accessories", "Bags", "Phone Accessories", "Watches", "Tech", "Pets", "Home", "Kitchen", "Beauty & Hair", "Fitness", "Car", "Travel", "Free Delivery"];
const fallback: Deal[] = [
  {
    id: "preview-jewelry",
    title: "Minimal Chain Necklace",
    brand: "YNOT preview",
    price: 19,
    currency: "EUR",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=700&q=82",
    url: "#",
    section: "Jewelry",
    sections: ["Best Value", "Jewelry", "Under €25"],
    badge: "Preview",
    note: "Preview product while live offers load.",
  },
  {
    id: "preview-watch",
    title: "Minimal Steel Watch",
    brand: "YNOT preview",
    price: 39,
    currency: "EUR",
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=700&q=82",
    url: "#",
    section: "Watches",
    sections: ["Best Value", "Watches"],
    badge: "Preview",
    note: "Preview product while live offers load.",
  },
];

function money(v: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}
function normalizeSections(item: FeedItem) {
  return (item.sections || []).map((s) => (s === "Under 25" ? "Under €25" : s));
}
function toDeal(item: FeedItem): Deal | null {
  if (item.price == null || !item.image_url || !item.product_url) return null;
  const ss = normalizeSections(item);
  if (item.source.toLowerCase().includes("amazon") && !ss.includes("Amazon")) ss.push("Amazon");
  return {
    id: `${item.source}:${item.source_product_id}`,
    title: item.title,
    brand: item.brand,
    price: Number(item.price),
    currency: item.currency || "EUR",
    image: item.image_url,
    url: item.product_url,
    section: item.primary_section || "Best Value",
    sections: ss.length ? ss : [item.primary_section || "Best Value"],
    badge: item.badge || "Worth a look",
    note: `${item.brand || "Independent store"} · ${item.offer_score || 0}/100 offer score`,
    installments: item.installment_eligible ? 4 : undefined,
    score: item.offer_score || 0,
    source: item.source,
  };
}
function amazonToDeal(item: AmazonItem): Deal {
  return {
    id: item.id,
    title: item.title,
    brand: item.brand,
    price: item.price,
    currency: item.currency,
    image: item.image,
    url: item.url,
    section: item.section,
    sections: item.sections || [item.section, "Best Value"],
    badge: item.badge || "Amazon value",
    note: `Amazon · ${item.rating ? `${item.rating}★ · ` : ""}${item.reviews ? `${item.reviews.toLocaleString()} reviews · ` : ""}${item.score}/100 value score`,
    score: item.score,
    source: item.source,
  };
}
function sourceLabel(source?: string) {
  const value = (source || "").toLowerCase();
  if (value.includes("amazon")) return "Amazon";
  if (value.includes("shopify")) return "Shopify";
  return source || "Marketplace";
}
function dedupe(list: Deal[]) {
  const seen = new Set<string>();
  return list.filter((d) => {
    const k = d.id || `${d.title}|${d.brand}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default function YnotDrawer() {
  const [open, setOpen] = useState(false),
    [active, setActive] = useState("Best Value"),
    [deals, setDeals] = useState<Deal[]>(fallback),
    [selected, setSelected] = useState<Deal | null>(null),
    [query, setQuery] = useState(""),
    [, setLoading] = useState(true),
    [loadingMore, setLoadingMore] = useState(false),
    [live, setLive] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pageBySectionRef = useRef<Record<string, number>>({});
  const loadingMoreRef = useRef(false);
  useEffect(() => {
    let alive = true;
    Promise.allSettled([fetch("https://iycxkwoxbkanfyraohge.supabase.co/functions/v1/ynot-feed").then((r) => r.json()), fetch("/api/ynot-amazon?country=FR").then((r) => r.json())])
      .then((results) => {
        if (!alive) return;
        const base = results[0].status === "fulfilled" ? ((results[0].value?.items || []).map(toDeal).filter(Boolean) as Deal[]) : [];
        const amazon = results[1].status === "fulfilled" ? (results[1].value?.items || []).map(amazonToDeal) : [];
        const merged = dedupe([...base, ...amazon]).sort((a, b) => (b.score || 0) - (a.score || 0));
        if (merged.length) {
          setDeals(merged);
          setLive(true);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);
  const activeDeals = useMemo(() => deals.filter((d) => active === "Best Value" || d.sections.includes(active) || d.section === active).slice(0, 1000), [deals, active]);
  const searched = useMemo(() => (query.trim() ? deals.filter((d) => `${d.title} ${d.brand || ""} ${d.section} ${d.badge} ${d.source || ""}`.toLowerCase().includes(query.toLowerCase())) : null), [query, deals]);
  function chooseSection(section: string) {
    setActive(section);
    setSelected(null);
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function loadMore(section = active) {
    if (loadingMoreRef.current) return;
    const currentCount = deals.filter((d) => section === "Best Value" || d.sections.includes(section) || d.section === section).length;
    if (currentCount >= 1000) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const page = (pageBySectionRef.current[section] || 0) + 1;
    try {
      const params = new URLSearchParams({ country: "FR", page: String(page), section });
      const feedParams = new URLSearchParams({ limit: "250", offset: String(currentCount), section });
      const results = await Promise.allSettled([fetch(`https://iycxkwoxbkanfyraohge.supabase.co/functions/v1/ynot-feed?${feedParams}`).then((r) => r.json()), fetch(`/api/ynot-amazon?${params}`).then((r) => r.json())]);
      const feed = results[0].status === "fulfilled" ? ((results[0].value?.items || []).map(toDeal).filter(Boolean) as Deal[]) : [];
      const amazon = results[1].status === "fulfilled" ? (results[1].value?.items || []).map(amazonToDeal) : [];
      const known = new Set(deals.map((deal) => deal.id));
      const fresh = dedupe([...feed, ...amazon]).filter((deal) => !known.has(deal.id) && (section === "Best Value" || deal.sections.includes(section) || deal.section === section));
      pageBySectionRef.current[section] = page;
      if (fresh.length) {
        setDeals((previous) => dedupe([...previous, ...fresh]));
      }
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }
  useEffect(() => {
    if (open && !query.trim() && activeDeals.length < 24) void loadMore(active);
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || query.trim() || activeDeals.length >= 1000 || loadingMore) return;
    const body=bodyRef.current;
    if (body&&body.scrollHeight-body.scrollTop-body.clientHeight<520) void loadMore(active);
  }, [open,active,activeDeals.length,loadingMore,query]); // eslint-disable-line react-hooks/exhaustive-deps
  function openDeal() {
    if (selected?.url && selected.url !== "#") window.open(selected.url, "_blank", "noopener,noreferrer");
  }
  return (
    <>
      <button className="ynot-peek" onClick={() => setOpen(true)} aria-label="Open YNOT deals">
        <span className="ynot-peek-mark">YNOT</span>
        <span>{live ? "Live offers" : "Worth a look"}</span>
        <ChevronRight />
      </button>
      <div className={`ynot-backdrop ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`ynot-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="ynot-head">
          <div>
            <small>LUMINA DEAL WORLD</small>
            <h2>YNOT</h2>
            <p>Shopify, Amazon and marketplace products ranked by value and opportunity.</p>
          </div>
          <button className="ynot-close" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <label className="ynot-search">
          <Search />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search YNOT" />
        </label>
        <nav className="ynot-dock" aria-label="YNOT sections">
          {sections.map((s) => (
              <button key={s} className={active === s ? "active" : ""} onClick={() => chooseSection(s)}>
                <span>{s}</span>
              </button>
            ))}
        </nav>
        <div className="ynot-body" ref={bodyRef} onScroll={(event) => {const element=event.currentTarget;if(element.scrollHeight-element.scrollTop-element.clientHeight<480)void loadMore()}}>
          {searched ? (
            <section className="ynot-section">
              <div className="ynot-section-title">
                <span>Search results</span>
                <small>{searched.length} finds</small>
              </div>
              <div className="ynot-grid">
                {searched.map((d) => (
                  <DealOrb key={d.id} deal={d} active={selected?.id === d.id} onSelect={setSelected} />
                ))}
              </div>
            </section>
          ) : (
              <section className="ynot-section" key={active}>
                <div className="ynot-section-title">
                  <span>{active}</span>
                  <small>{activeDeals.length} finds</small>
                </div>
                <div className="ynot-grid">
                  {activeDeals.map((d) => (
                    <DealOrb key={`${active}-${d.id}`} deal={d} active={selected?.id === d.id} onSelect={setSelected} />
                  ))}
                </div>
                {activeDeals.length<1000&&<button className="ynot-load-more" onClick={()=>void loadMore()} disabled={loadingMore}>{loadingMore?"Loading more…":"Load more products"}</button>}
              </section>
          )}
        </div>
        {selected && (
          <div className="ynot-selected">
            <button className="ynot-selected-close" onClick={() => setSelected(null)} aria-label="Close product details">
              <X />
            </button>
            <img src={selected.image} alt="" />
            <div className="ynot-selected-copy">
              <small>
                {selected.badge}
                {selected.score ? ` · ${selected.score}/100` : ""}
              </small>
              <h3>{selected.title}</h3>
              <strong>{money(selected.price, selected.currency)}</strong>
              {selected.installments && (
                <span>
                  {money(selected.price / selected.installments, selected.currency)} × {selected.installments}
                </span>
              )}
              <p>{selected.note}</p>
            </div>
            <button className="ynot-shop" onClick={openDeal} disabled={selected.url === "#"}>
              <ShoppingBag />
              <span>Open deal</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
function DealOrb({ deal, active, onSelect }: { deal: Deal; active: boolean; onSelect: (d: Deal) => void }) {
  return (
    <button className={`ynot-orb ${active ? "active" : ""}`} onClick={() => onSelect(deal)}>
      <span className="ynot-orb-img">
        <img src={deal.image} alt="" />
      </span>
      <span className="ynot-orb-copy">
        <b>{deal.title}</b>
        <em>
          {sourceLabel(deal.source)} · {deal.badge}
        </em>
        <strong>{money(deal.price, deal.currency)}</strong>
      </span>
    </button>
  );
}
