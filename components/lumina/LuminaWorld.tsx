"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X, AtSign, Pin, Sparkles, Minus, Plus, RotateCcw, Heart, Compass, Home, Image as ImageIcon, Link2, Ban, GripVertical, ExternalLink, ScanFace, Bookmark, Clock3, CircleHelp } from "lucide-react";

type Product = {
  id: string;
  title: string;
  brand: string;
  price: number | null;
  currency?: string;
  image: string;
  url?: string;
  tags?: string[];
  x?: number;
  y?: number;
};

type Anchor = { id: string; label: string; x: number; y: number; kind: "tag" | "intent" | "blend" };
type Snapshot = { label: string; query: string; direction: string; taste: string[]; avoid: string[] };

type RefineGroup = { name: string; options: string[] };

const REFINE: Record<string, RefineGroup[]> = {
  fashion: [
    { name: "Silhouette", options: ["Slip", "Maxi", "Midi", "Mini", "A-line", "Wrap", "Bodycon"] },
    { name: "Material", options: ["Satin", "Linen", "Cotton", "Velvet", "Knit", "Mesh"] },
    { name: "Style", options: ["Minimal", "Elegant", "Romantic", "Statement", "Casual"] },
    { name: "Occasion", options: ["Wedding guest", "Dinner", "Party", "Holiday", "Work"] },
    { name: "Fit", options: ["Fitted", "Relaxed", "Oversized"] },
    { name: "Price", options: ["Under €75", "€75–150", "€150–300", "Premium"] },
  ],
  fitness: [
    { name: "Training", options: ["Strength", "Running", "Mobility", "Recovery", "Home gym"] },
    { name: "Performance", options: ["Breathable", "Supportive", "Lightweight", "Durable"] },
    { name: "Fit", options: ["Fitted", "Relaxed", "Compression"] },
    { name: "Price", options: ["Under €50", "Under €80", "€80–150", "Premium"] },
  ],
  hair: [
    { name: "Goal", options: ["Fuller-looking", "Scalp care", "Repair", "Hydration", "Volume"] },
    { name: "Routine", options: ["Daily", "Wash day", "Weekly treatment", "Complete set"] },
    { name: "Feel", options: ["Non-greasy", "Lightweight", "Fragrance-free", "Natural"] },
    { name: "Price", options: ["Under €30", "Under €50", "Premium"] },
  ],
  skin: [
    { name: "Concern", options: ["Uneven tone", "Blemishes", "Sensitive skin", "Barrier repair", "Hydration"] },
    { name: "Product", options: ["Serum", "Cleanser", "Moisturizer", "Treatment", "SPF"] },
    { name: "Formula", options: ["Fragrance-free", "Gentle", "Niacinamide", "Ceramides"] },
    { name: "Price", options: ["Under €30", "Under €50", "Premium"] },
  ],
  smile: [
    { name: "Goal", options: ["Whitening", "Enamel care", "Fresh breath", "Everyday care"] },
    { name: "Sensitivity", options: ["Gentle", "Sensitive teeth", "Peroxide-free"] },
    { name: "Format", options: ["Strips", "Pen", "Toothpaste", "Electric brush", "Complete kit"] },
    { name: "Price", options: ["Under €30", "Under €50", "Premium"] },
  ],
  home: [
    { name: "Style", options: ["Warm minimal", "Scandinavian", "Natural", "Statement"] },
    { name: "Material", options: ["Wood", "Linen", "Bouclé", "Stone", "Metal"] },
    { name: "Room", options: ["Living room", "Bedroom", "Dining", "Small space"] },
  ],
  tech: [
    { name: "Use", options: ["Work", "Travel", "Creative", "Gaming", "Everyday"] },
    { name: "Priority", options: ["Battery life", "Compact", "Performance", "Easy setup"] },
    { name: "Price", options: ["Under €100", "Under €500", "Premium"] },
  ],
  coffee: [
    { name: "Format", options: ["Espresso", "Automatic", "Capsule", "Manual", "Bean-to-cup"] },
    { name: "Priority", options: ["Milk frother", "Built-in grinder", "Compact", "Easy clean"] },
    { name: "Price", options: ["Under €150", "€150–300", "€300–600", "Premium"] },
  ],
  default: [
    { name: "Style", options: ["Minimal", "Premium", "Everyday", "Statement", "Classic"] },
    { name: "Price", options: ["Budget", "Mid-range", "Premium"] },
    { name: "Use", options: ["Everyday", "Occasion", "Gift", "Performance"] },
  ],
};

const SCENE: Record<string, { a: string; b: string; c: string; image: string; query: string }> = {
  fashion: { a: "#eee9e2", b: "#d8c9ba", c: "#78695c", image:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=88", query:"Summer dresses for a Mediterranean wedding under €180" },
  fitness: { a: "#e7ebe6", b: "#b8c4b7", c: "#526258", image:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2200&q=88", query:"Best gym shorts for bodybuilding under €80" },
  hair: { a: "#eee8df", b: "#cdbca8", c: "#766757", image:"https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=2200&q=88", query:"A non-greasy routine for fuller-looking hair" },
  skin: { a: "#f1e9e7", b: "#d8c5c1", c: "#85726f", image:"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=2200&q=88", query:"Skincare for acne marks and uneven tone, sensitive skin" },
  smile: { a: "#edf2f1", b: "#c7d9da", c: "#687c7e", image:"https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=2200&q=88", query:"A gentle at-home routine for a brighter smile" },
  home: { a: "#ece9e1", b: "#c8bcae", c: "#756c62", image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=88", query:"A warm minimal sofa for a small living room" },
  tech: { a: "#e8edf0", b: "#afbac2", c: "#5d6c78", image:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2200&q=88", query:"Lightweight headphones for focused work" },
  coffee: { a: "#eee5dc", b: "#c4a98f", c: "#6e5540", image:"https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=2200&q=88", query:"Compact espresso machine with a milk frother" },
  outdoor: { a: "#e7ebe4", b: "#b5c0ad", c: "#52614d", image:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2200&q=88", query:"Lightweight gear for a weekend hike" },
  kitchen: { a: "#eeeae2", b: "#c9bdac", c: "#756957", image:"https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=2200&q=88", query:"Beautiful tools for everyday cooking" },
  pet: { a: "#ecebe5", b: "#c7c3b6", c: "#706c61", image:"https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=2200&q=88", query:"Comfortable essentials for my dog" },
  travel: { a: "#e9ece9", b: "#bec8c4", c: "#5c6c68", image:"https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2200&q=88", query:"Lightweight essentials for a city break" },
  kids: { a: "#f0ebe4", b: "#d8c8b6", c: "#82705e", image:"https://images.unsplash.com/photo-1560785496-3c9d27877182?auto=format&fit=crop&w=2200&q=88", query:"Thoughtful products for children" },
  retail: { a: "#ecebe7", b: "#c7c8c2", c: "#686e68", image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=2200&q=88", query:"A world shaped around what you mean" },
};

const NICHES = ["fashion", "fitness", "hair", "skin", "smile"] as const;

function category(query: string) {
  const q = query.toLowerCase();
  if (/dog|cat|pet|puppy|kitten|animal/.test(q)) return "pet";
  if (/travel|flight|luggage|suitcase|holiday|city break/.test(q)) return "travel";
  if (/baby|child|children|kid|toy|nursery/.test(q)) return "kids";
  if (/fitness|shoe|running|sport|gym|training|recovery|shorts/.test(q)) return "fitness";
  if (/hair|scalp|shampoo|conditioner|density/.test(q)) return "hair";
  if (/skin|serum|cream|blemish|acne|tone|moistur/.test(q)) return "skin";
  if (/smile|teeth|tooth|oral|whitening|enamel/.test(q)) return "smile";
  if (/sofa|chair|lamp|home|table|furniture|decor|bed|kitchen/.test(q)) return "home";
  if (/phone|laptop|camera|headphone|speaker|monitor|tech|keyboard/.test(q)) return "tech";
  if (/coffee|espresso|grinder|cafetiere/.test(q)) return "coffee";
  if (/hike|camp|outdoor|tent|trail|backpack|climbing/.test(q)) return "outdoor";
  if (/cook|kitchen|pan|knife|bake|food|drink|tea|wine/.test(q)) return "kitchen";
  if (/dress|fashion|shirt|trouser|jean|jacket|coat|sandal|jewelry|jewellery|watch|bag/.test(q)) return "fashion";
  return "retail";
}

function price(p: Product) {
  if (p.price == null) return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency || "EUR", maximumFractionDigits: 0 }).format(p.price);
  } catch {
    return `${p.price}`;
  }
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function LuminaWorld() {
  const [query, setQuery] = useState(SCENE.fashion.query);
  const [submittedQuery, setSubmittedQuery] = useState(query);
  const [direction, setDirection] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [taste, setTaste] = useState<string[]>(["Black", "Wedding guest", "Under €150"]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [pinned, setPinned] = useState<Product[]>([]);
  const [refineOpen, setRefineOpen] = useState(false);
  const [activeRefine, setActiveRefine] = useState<string[]>(["Elegant", "Maxi", "Satin", "Minimal"]);
  const [atOpen, setAtOpen] = useState(false);
  const [atText, setAtText] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("Catalog ready");
  const [crumbs, setCrumbs] = useState<Snapshot[]>([]);
  const [zoom, setZoom] = useState(0.88);
  const [pan, setPan] = useState({ x: -1200, y: -820 });
  const [dropOpen, setDropOpen] = useState(false);
  const [dropText, setDropText] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [cursor, setCursor] = useState("");
  const [draggingTag, setDraggingTag] = useState<string | null>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ dragging: false, px: 0, py: 0 });
  const cat = category(submittedQuery);
  const scene = SCENE[cat] || SCENE.fashion;
  const groups = REFINE[cat] || REFINE.default;

  const semanticTitle = useMemo(() => {
    if (direction) return direction;
    if (cat === "fashion") return "Wedding guest world";
    if (cat === "fitness") return "Built for strength";
    if (cat === "hair") return "Your fuller-hair routine";
    if (cat === "skin") return "Calm, even-tone care";
    if (cat === "smile") return "A brighter, gentler routine";
    if (cat === "home") return "Made for your space";
    if (cat === "tech") return "Technology for the way you work";
    if (cat === "coffee") return "Your better coffee ritual";
    if (cat === "outdoor") return "Ready for the path ahead";
    if (cat === "kitchen") return "Made for the way you cook";
    if (cat === "pet") return "Better choices for your companion";
    if (cat === "travel") return "Ready for where you are going";
    if (cat === "kids") return "Thoughtful choices for growing worlds";
    if (cat === "retail") return "A world shaped around what you mean";
    return "Your product world";
  }, [direction, cat]);

  const fetchProducts = useCallback(async (opts?: { direction?: string; append?: boolean }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: submittedQuery });
      const combined = [opts?.direction || direction, ...taste.slice(-4), ...activeRefine.slice(-4), ...anchors.slice(-3).map(a => a.label)]
        .filter(Boolean)
        .join(", ");
      if (combined) params.set("direction", combined);
      if (opts?.append && cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/catalog?${params.toString()}`);
      const data = await response.json();
      const list: Product[] = data.products || [];
      setCursor(data.pagination?.cursor || "");
      setSource(data.source === "shopify-global-catalog" ? "Live Shopify" : "Prototype catalog");
      setProducts(prev => {
        const incoming = list.map((p, i) => {
          const h = hash(p.id || `${p.title}-${i}`);
          const radius = 190 + (h % 330) + (opts?.append ? 360 : 0);
          const angle = ((h % 628) / 100) + (anchors.length * 0.34);
          return { ...p, x: 1300 + Math.cos(angle) * radius, y: 900 + Math.sin(angle) * radius };
        });
        if (!opts?.append) return incoming;
        const ids = new Set(prev.map(p => p.id));
        return [...prev, ...incoming.filter(p => !ids.has(p.id))].slice(-42);
      });
    } catch {
      setSource("Catalog unavailable");
    } finally {
      setLoading(false);
    }
  }, [submittedQuery, direction, taste, activeRefine, anchors, cursor]);

  useEffect(() => { fetchProducts({ direction: "" }); }, [submittedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  function snapshot(label: string) {
    setCrumbs(c => [...c.slice(-5), { label, query: submittedQuery, direction, taste: [...taste], avoid: [...avoid] }]);
  }

  async function explore(nextDirection: string) {
    snapshot(nextDirection);
    setDirection(nextDirection);
    setTaste(t => [...new Set([...t, nextDirection])].slice(-8));
    await fetchProducts({ direction: nextDirection });
  }

  function restore(s: Snapshot) {
    setSubmittedQuery(s.query);
    setQuery(s.query);
    setDirection(s.direction);
    setTaste(s.taste);
    setAvoid(s.avoid);
  }

  function submitSearch() {
    setDirection("");
    setAnchors([]);
    setSelected(null);
    setSubmittedQuery(query.trim() || "popular products");
    setCrumbs([]);
  }

  function switchNiche(next: string) {
    if (!SCENE[next]) return;
    const nextQuery = SCENE[next].query;
    setQuery(nextQuery); setSubmittedQuery(nextQuery); setDirection(""); setSelected(null);
    setAnchors([]); setPinned([]); setCrumbs([]); setAvoid([]);
    setActiveRefine((REFINE[next] || REFINE.default).flatMap(g=>g.options).slice(0,4));
    setTaste((REFINE[next]] || REFINE.default).flatMap(g=>g.options).slice(0,3));
    window.history.replaceState(null,"",`#${next}`);
  }

  function togglePin(p: Product) {
    setPinned(list => list.some(x => x.id === p.id) ? list.filter(x => x.id !== p.id) : [...list, p].slice(-3));
  }

  async function blend() {
    if (pinned.length < 2) return;
    const blendTags = [...new Set(pinned.flatMap(p => p.tags || []))].slice(0, 5);
    const label = blendTags.length ? blendTags.join(" + ") : pinned.map(p => p.title).join(" + ");
    setAnchors(a => [...a, { id: `blend-${Date.now()}`, label, x: 1380, y: 980, kind: "blend" }]);
    await explore(label);
  }

  async function applyAt() {
    const text = atText.trim();
    if (!text || !selected) return;
    const neg = /\b(no|not|avoid|without|hate|don't|do not)\b/i.test(text);
    if (neg) setAvoid(v => [...new Set([...v, text])].slice(-8));
    else setTaste(v => [...new Set([...v, text])].slice(-8));
    setAtText("");
    setAtOpen(false);
    await explore(`${selected.title}: ${text}`);
  }

  function dropTagAtViewport(tag: string, clientX: number, clientY: number) {
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const stageX = (clientX - rect.left - rect.width / 2 - pan.x) / zoom;
    const stageY = (clientY - rect.top - rect.height / 2 - pan.y) / zoom;
    setAnchors(a => [...a, { id: `tag-${Date.now()}`, label: tag, x: stageX, y: stageY, kind: "tag" } as Anchor].slice(-10));
    setTaste(t => [...new Set([...t, tag])].slice(-8));
    setDirection(tag);
    fetchProducts({ direction: tag });
  }

  const majorBubbles = useMemo(() => {
    const picked = [...new Set([...activeRefine, ...taste.slice(-3)])].filter(Boolean).slice(0, 8);
    return picked.length ? picked : groups.flatMap(g => g.options).slice(0, 7);
  }, [activeRefine, taste, groups]);

  const zoomLabel = zoom < 0.7 ? "Worlds" : zoom < 1.08 ? "Categories + products" : zoom < 1.45 ? "Product neighborhood" : "Similarity universe";

  return (
    <main className="lumina-shell" style={{ "--scene-a": scene.a, "--scene-b": scene.b, "--scene-c": scene.c, "--scene-image": `url(${scene.image})` } as React.CSSProperties}>
      <div className="scene-layer"><div className="scene-photo"/><div className="scene-haze"/><div className="scene-floor"/></div>

      <aside className="float-rail">
        <button className="logo-orb" aria-label="Lumina home"><strong>Lumina <i>@</i></strong><small>See a brighter you</small></button>
        <div className="rail-nav">
          <button className="rail-orb active" aria-label="Discover"><Home /><span>Discover</span></button>
          <button className="rail-orb" aria-label="For you"><Heart /><span>For You</span></button>
          <button className="rail-orb" aria-label="Categories"><Compass /><span>Categories</span></button>
          <button className="rail-orb" onClick={() => setDropOpen(true)}><ScanFace/><span>Try On</span></button>
          <button className="rail-orb" aria-label="Saved"><Bookmark /><span>Saved</span></button>
        </div>
        <div className="rail-bottom"><b><Sparkles/>{cat[0].toUpperCase()+cat.slice(1)}</b><span>{cat in SCENE ? (SCENE[cat].query.split(" under")[0]) : submittedQuery}</span></div>
      </aside>

      <div className="category-corner">
        <label><Sparkles aria-hidden="true"/><select aria-label="Choose a category" value={cat} onChange={e=>switchNiche(e.target.value)}>{Object.keys(SCENE).map(n=><option key={n} value={n}>{n === "retail" ? "Explore all" : n[0].toUpperCase()+n.slice(1)}</option>)}</select></label>
        <span>Discover a world around you.</span>
      </div>

      <div className="profile-tools"><button aria-label="Reset world" onClick={() => { setPan({x:-1200,y:-820}); setZoom(.88); }}><RotateCcw/></button><button aria-label="Help"><CircleHelp/></button><span>J</span></div>

      <header className="search-float">
        <Search />
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && submitSearch()} />
        <button onClick={submitSearch}>Explore</button>
      </header>

      <button className="drop-anything" onClick={() => setDropOpen(true)}><Sparkles /> Drop anything</button>

      <section
        ref={worldRef}
        className="semantic-world"
        onPointerDown={e => {
          if ((e.target as HTMLElement).closest("button,.product-orb,.semantic-anchor")) return;
          panRef.current = { dragging: true, px: e.clientX - pan.x, py: e.clientY - pan.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          if (!panRef.current.dragging) return;
          setPan({ x: e.clientX - panRef.current.px, y: e.clientY - panRef.current.py });
        }}
        onPointerUp={() => {
          panRef.current.dragging = false;
          if (cursor && (zoom > 1.15 || Math.hypot(pan.x + 1200, pan.y + 820) > 520)) fetchProducts({ append: true });
        }}
        onWheel={e => {
          e.preventDefault();
          const next = Math.min(1.9, Math.max(.5, zoom * (e.deltaY < 0 ? 1.075 : .93)));
          setZoom(next);
          if (cursor && next > 1.25) fetchProducts({ append: true });
        }}
        onDragOver={e => draggingTag && e.preventDefault()}
        onDrop={e => {
          const tag = e.dataTransfer.getData("lumina/tag") || draggingTag;
          if (tag) dropTagAtViewport(tag, e.clientX, e.clientY);
          setDraggingTag(null);
        }}
      >
        <div className="world-stage" style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}>
          <div className="world-origin">
            <span>{semanticTitle}</span>
            <small>{submittedQuery}</small>
          </div>

          {majorBubbles.map((label, i) => {
            const a = (i / Math.max(majorBubbles.length,1)) * Math.PI * 2 - .7;
            const r = 245 + (i % 2) * 60;
            return <button key={`${label}-${i}`} className="semantic-anchor intent-anchor" style={{ left:1300+Math.cos(a)*r, top:900+Math.sin(a)*r }} onClick={() => explore(label)}>{label}</button>;
          })}

          {anchors.map(a => <button key={a.id} className={`semantic-anchor user-anchor ${a.kind}`} style={{left:a.x,top:a.y}} onClick={() => explore(a.label)}><GripVertical />{a.label}</button>)}

          {products.map((p, i) => {
            const magnetic = hovered && hovered !== p.id && selected ? ((p.tags||[]).some(t => (selected.tags||[]).includes(t)) ? " magnetic" : "") : "";
            return <button key={`${p.id}-${i}`} className={`product-orb${selected?.id===p.id?" selected":""}${pinned.some(x=>x.id===p.id)?" pinned":""}${magnetic}`} style={{left:p.x??1300,top:p.y??900}} onClick={() => { setSelected(p); setAtOpen(false); }} onMouseEnter={()=>setHovered(p.id)} onMouseLeave={()=>setHovered(null)}>
              <img src={p.image} alt="" />
              {price(p) && <span className="orb-price">{price(p)}</span>}
              {pinned.some(x=>x.id===p.id) && <span className="pin-dot"><Pin /></span>}
              <span className="orb-hover"><b>{p.brand}</b>{p.title}</span>
            </button>;
          })}

          <button className="discovery-pocket" style={{left:1580,top:1110}} onClick={()=>explore("unexpected but relevant")}>✦ Surprise me slightly</button>
        </div>
      </section>

      <div className="journey-dock">
        <div className="catalog-pill"><span className="live-dot"/>{source}</div>
        <div className="taste-strip">
          {taste.slice(-5).map(t => <button key={t} onClick={()=>setTaste(v=>v.filter(x=>x!==t))}>{t}<X /></button>)}
          {avoid.slice(-3).map(t => <button key={t} className="avoid-chip" onClick={()=>setAvoid(v=>v.filter(x=>x!==t))}><Ban />{t}<X /></button>)}
        </div>
        <div className="zoom-pill"><button onClick={()=>setZoom(z=>Math.max(.5,z-.12))}><Minus /></button><span>{zoomLabel}</span><button onClick={()=>setZoom(z=>Math.min(1.9,z+.12))}><Plus /></button></div>
      </div>

      <button className="refine-orb" onClick={()=>setRefineOpen(v=>!v)}><i><SlidersHorizontal /></i><span><b>Refine this world</b><small>{cat} · {activeRefine.length} active</small></span></button>

      {refineOpen && <aside className="refine-panel">
        <div className="panel-head"><div><span>Shape this world</span><h2>Choose what should appear</h2></div><button onClick={()=>setRefineOpen(false)}><X /></button></div>
        <p>These control the large directions in the map. You can still discover outside them.</p>
        {groups.map(group => <div className="refine-group" key={group.name}><label>{group.name}</label><div>{group.options.map(o => <button key={o} className={activeRefine.includes(o)?"active":""} onClick={()=>setActiveRefine(v=>v.includes(o)?v.filter(x=>x!==o):[...v,o].slice(-9))}>{o}</button>)}</div></div>)}
        <div className="not-this-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{const t=e.dataTransfer.getData("lumina/tag");if(t)setAvoid(v=>[...new Set([...v,t])]);}}><Ban/><span>Drop a tag here to move away from it</span></div>
        <button className="apply-refine" onClick={()=>{setRefineOpen(false);fetchProducts({direction:activeRefine.join(", ")})}}>Reshape world</button>
      </aside>}

      {pinned.length > 0 && <div className="pin-shelf"><div>{pinned.map(p=><img key={p.id} src={p.image} alt="" />)}</div><span>{pinned.length} pinned</span>{pinned.length>1&&<button onClick={blend}><Sparkles/> Blend</button>}</div>}

      {crumbs.length>0 && <nav className="crumb-trail">{crumbs.map((c,i)=><button key={`${c.label}-${i}`} onClick={()=>restore(c)}>{c.label}</button>)}</nav>}

      <aside className={`product-panel ${selected?"open":""}`}>
        {selected ? <>
          <button className="panel-close" onClick={()=>setSelected(null)}><X/></button>
          <img className="product-hero" src={selected.image} alt={selected.title}/>
          <div className="product-info">
            <span>{selected.brand || "Shopify merchant"}</span>
            <h2>{selected.title}</h2>
            <div className="product-price">{price(selected)}</div>
            <div className="product-tags">
              {(selected.tags||[]).slice(0,8).map(tag=><button key={tag} draggable onDragStart={e=>{e.dataTransfer.setData("lumina/tag",tag);setDraggingTag(tag);}} onDragEnd={()=>setDraggingTag(null)} title="Drag this tag into the world"><GripVertical/>{tag}</button>)}
            </div>
            <div className="match-row"><span>94% match</span><span>★★★★★ <b>4.8</b></span></div>
            <p className="product-copy">Chosen for its close match to the intent, quality and price signals shaping this world.</p>
            <div className="panel-actions"><a href={selected.url||"#"} target="_blank" rel="noreferrer">View at store <ExternalLink/></a><button onClick={()=>togglePin(selected)} className={pinned.some(x=>x.id===selected.id)?"active":""}><Pin/>{pinned.some(x=>x.id===selected.id)?"Pinned":"Pin"}</button><button className="at-orb" onClick={()=>setAtOpen(v=>!v)}><AtSign/></button></div>
            <button className="try-action" onClick={()=>alert(cat==="fashion"||cat==="fitness"?"Virtual try-on is ready for the selected product.":`Your illustrative ${cat} goal experience is ready.`)}><ScanFace/>{cat==="fashion"||cat==="fitness"?"Try it on":`Explore your ${cat} goal`}</button>
            {atOpen && <div className="at-composer"><label><AtSign/> What do you specifically like or dislike?</label><textarea value={atText} onChange={e=>setAtText(e.target.value)} placeholder="I love the neckline and curve, but not the satin. Show me something cheaper…"/><button onClick={applyAt}>Explore from this</button></div>}
            <div className="quick-branches"><button onClick={()=>explore(`more like ${selected.title}`)}>More like this</button><button onClick={()=>explore(`cheaper than ${selected.title}`)}>Cheaper</button><button onClick={()=>explore(`more premium than ${selected.title}`)}>More premium</button><button onClick={()=>explore(`same shape, different style`)}>Same shape</button></div>
          </div>
        </> : <div className="panel-empty"><AtSign/><h2>Select a product</h2><p>The real product, draggable tags, @ prompt, and product actions appear here.</p></div>}
      </aside>

      {dropOpen && <div className="drop-backdrop" onClick={e=>{if(e.currentTarget===e.target)setDropOpen(false)}}><div className="drop-card"><button className="drop-close" onClick={()=>setDropOpen(false)}><X/></button><Sparkles className="drop-icon"/><h2>Drop anything into Lumina @</h2><p>Start from an idea or product URL. Image search is prepared for the visual-search stage.</p><textarea value={dropText} onChange={e=>setDropText(e.target.value)} placeholder="Paste a product URL, or describe what you want…"/><div className="drop-modes"><button><Link2/> Product URL</button><button disabled><ImageIcon/> Image soon</button></div><button className="drop-explore" onClick={()=>{if(dropText.trim()){setQuery(dropText);setSubmittedQuery(dropText);setDropOpen(false);setDropText("")}}}>Explore this</button></div></div>}

      {loading && <div className="loading-pill"><span/>Searching further into this world…</div>}
    </main>
  );
}
