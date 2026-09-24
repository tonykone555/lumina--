(()=>{
  const MAP={
    fashion:{label:"Fashion",subtitle:"Men · women · shoes · accessories",query:"men women fashion clothing menswear womenswear streetwear sneakers dresses jackets jeans",tags:["Men","Women","Menswear","Womenswear","Streetwear","Sneakers","Jackets","Jeans","Dresses","Activewear","Accessories","New Arrivals"]},
    tech:{label:"Tech",subtitle:"Electronics · gaming · audio · mobile",query:"tech electronics gadgets computers phones gaming audio cameras smart home accessories",tags:["Phones","Computers","Gaming","Audio","Headphones","Cameras","Smart Home","Wearables","Charging","Desk Tech","TV & Display","Accessories"]},
    fitness:{label:"Fitness & Sports",subtitle:"Gym · equipment · activewear · sports",query:"fitness sports gym equipment activewear training shoes football basketball boxing running cycling",tags:["Gym Equipment","Activewear","Training","Running","Football","Basketball","Boxing","Cycling","Recovery","Training Shoes","Outdoor Sports","Accessories"]},
    skin:{label:"Beauty",subtitle:"Skincare · makeup · self care",query:"beauty skincare makeup self care products",tags:["Skincare","Makeup","Fragrance","Beauty Tools","Body Care","Grooming","Sensitive Skin","Glow","SPF","Premium"]},
    hair:{label:"Health & Wellness",subtitle:"Wellness · recovery · health · self care",query:"health wellness recovery massage sleep hydration wellness equipment vitamins supplements self care",tags:["Recovery","Massage","Sleep","Hydration","Wellness Tech","Mobility","Posture","Vitamins","Supplements","Self Care","Fitness Recovery","Relaxation"]},
    home:{label:"Home",subtitle:"Furniture · lighting · decor",query:"premium home furniture lighting decor storage kitchen",tags:["Furniture","Lighting","Decor","Kitchen","Storage","Bedroom","Bathroom","Smart Home","Office","Outdoor Living"]},
    retail:{label:"Jewelry & Watches",subtitle:"Necklaces · rings · bracelets · watches",query:"jewelry watches necklaces rings bracelets earrings gold silver mens jewelry womens jewelry luxury affordable watches",tags:["Necklaces","Rings","Bracelets","Earrings","Watches","Men's Jewelry","Women's Jewelry","Gold","Silver","Luxury","Everyday","Gifts"]}
  };
  const ORDER=["fashion","tech","fitness","skin","hair","home","retail"];
  const WORLD_CENTER=100000,FIT=0.78;
  let activeKey="";
  const keyOf=bubble=>bubble?.dataset?.ynotCategoryKey||[...(bubble?.classList||[])].find(x=>x.startsWith("cat-"))?.slice(4)||"";
  const fitTribe=()=>{
    const world=document.querySelector('.lv4-world.level-worlds'),stage=world?.querySelector('.lv4-stage');if(!(stage instanceof HTMLElement))return;
    const raw=stage.style.transform||"",match=raw.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/);if(!match)return;
    const tx=Number(match[1]),ty=Number(match[2]),zoom=Number(match[3]);if(!Number.isFinite(tx)||!Number.isFinite(ty)||!Number.isFinite(zoom))return;
    if(stage.dataset.ynotCategoryFit==='1')return;
    const nextZoom=zoom*FIT,cx=tx+WORLD_CENTER*zoom,cy=ty+WORLD_CENTER*zoom,nextTx=cx-WORLD_CENTER*nextZoom,nextTy=cy-WORLD_CENTER*nextZoom;
    stage.style.transform=`translate(${nextTx}px, ${nextTy}px) scale(${nextZoom})`;stage.dataset.ynotCategoryFit='1';
  };
  const arrange=()=>{
    const world=document.querySelector(".lv4-stage");if(!world)return;
    const bubbles=[...world.querySelectorAll(".lv4-category-bubble")].filter(node=>ORDER.includes(keyOf(node)));
    const byKey=new Map(bubbles.map(node=>[keyOf(node),node]));
    ORDER.forEach((key,i)=>{const node=byKey.get(key);if(!(node instanceof HTMLElement))return;node.dataset.ynotCategoryKey=key;const a=i/ORDER.length*Math.PI*2-Math.PI/2,x=WORLD_CENTER+Math.cos(a)*800,y=WORLD_CENTER+Math.sin(a)*800;node.style.left=`${x}px`;node.style.top=`${y}px`;const cfg=MAP[key],b=node.querySelector("b"),s=node.querySelector("span");if(b){b.textContent=cfg.label;b.style.fontSize="24px";b.style.lineHeight="1.05"}if(s){s.textContent=cfg.subtitle;s.style.fontSize="14px";s.style.lineHeight="1.2"}});
  };
  const apply=()=>{arrange();fitTribe();const intent=(document.querySelector(".lv4-intent span")?.textContent||"").toLowerCase();for(const [key,cfg] of Object.entries(MAP))if(intent.includes(cfg.label.toLowerCase()))activeKey=key;const cfg=MAP[activeKey];if(!cfg)return;document.querySelectorAll(".lv4-textbubble").forEach((node,i)=>{if(node instanceof HTMLElement)node.textContent=cfg.tags[i%cfg.tags.length]})};
  document.addEventListener("click",event=>{const target=event.target instanceof Element?event.target:null;if(!target)return;const category=target.closest(".lv4-category-bubble");if(category){activeKey=keyOf(category);setTimeout(apply,50)}},false);
  const observer=new MutationObserver(()=>{const stage=document.querySelector('.lv4-world.level-worlds .lv4-stage');if(stage instanceof HTMLElement&&stage.dataset.ynotCategoryFit!=='1')requestAnimationFrame(apply)});observer.observe(document.documentElement,{childList:true,subtree:true});
  apply();setTimeout(apply,120);setTimeout(apply,500);
})();
