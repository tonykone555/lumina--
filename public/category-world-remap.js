(()=>{
  const MAP={
    fashion:{label:"Fashion",subtitle:"Men · women · shoes · accessories",query:"men women fashion clothing menswear womenswear streetwear sneakers dresses jackets jeans",tags:["Men","Women","Menswear","Womenswear","Streetwear","Sneakers","Jackets","Jeans","Dresses","Activewear","Accessories","New Arrivals"]},
    tech:{label:"Tech",subtitle:"Electronics · gaming · audio · mobile",query:"tech electronics gadgets computers phones gaming audio cameras smart home accessories",tags:["Phones","Computers","Gaming","Audio","Headphones","Cameras","Smart Home","Wearables","Charging","Desk Tech","TV & Display","Accessories"]},
    fitness:{label:"Fitness & Sports",subtitle:"Gym · equipment · activewear · sports",query:"fitness sports gym equipment activewear training shoes football basketball boxing running cycling",tags:["Gym Equipment","Activewear","Training","Running","Football","Basketball","Boxing","Cycling","Recovery","Training Shoes","Outdoor Sports","Accessories"]},
    skin:{label:"Beauty",subtitle:"Skincare · makeup · self care",query:"beauty skincare makeup self care products",tags:["Skincare","Makeup","Fragrance","Beauty Tools","Body Care","Grooming","Sensitive Skin","Glow","SPF","Premium"]},
    hair:{label:"Health & Wellness",subtitle:"Wellness · recovery · health · self care",query:"health wellness recovery massage sleep hydration wellness equipment vitamins supplements self care",tags:["Recovery","Massage","Sleep","Hydration","Wellness Tech","Mobility","Posture","Vitamins","Supplements","Self Care","Fitness Recovery","Relaxation"]},
    home:{label:"Home",subtitle:"Furniture · lighting · decor",query:"premium home furniture lighting decor storage kitchen",tags:["Furniture","Lighting","Decor","Kitchen","Storage","Bedroom","Bathroom","Smart Home","Office","Outdoor Living"]},
    jewelry:{label:"Jewelry & Watches",subtitle:"Necklaces · rings · bracelets · watches",query:"jewelry watches necklaces rings bracelets earrings gold silver mens jewelry womens jewelry luxury affordable watches",tags:["Necklaces","Rings","Bracelets","Earrings","Watches","Men's Jewelry","Women's Jewelry","Gold","Silver","Luxury","Everyday","Gifts"]},
    retail:{label:"Digital Products",subtitle:"Software · AI tools · templates · courses",query:"digital products software AI tools templates ebooks courses productivity downloads design assets creator tools subscriptions",tags:["Software","AI Tools","Templates","Ebooks","Courses","Productivity","Design Assets","Business Tools","Digital Downloads","Education","Creator Tools","Subscriptions"]}
  };
  const ORDER=["fashion","tech","fitness","skin","hair","home","jewelry","retail"];
  let activeKey="";
  const keyOf=bubble=>bubble?.dataset?.ynotCategoryKey||[...(bubble?.classList||[])].find(x=>x.startsWith("cat-"))?.slice(4)||"";
  const runSearch=query=>{const input=document.querySelector(".lv4-search-visible input,.lv4-search input");const button=document.querySelector(".lv4-search-visible button,.lv4-search button");if(!(input instanceof HTMLInputElement)||!(button instanceof HTMLElement))return;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,query);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));requestAnimationFrame(()=>button.click())};
  const ensureJewelry=()=>{
    const world=document.querySelector(".lv4-stage");if(!world)return;
    let jewelry=world.querySelector(".lv4-category-bubble.cat-jewelry");
    if(!jewelry){const source=world.querySelector(".lv4-category-bubble.cat-tech");if(!(source instanceof HTMLButtonElement))return;jewelry=source.cloneNode(true);jewelry.className="lv4-category-bubble cat-jewelry";jewelry.dataset.ynotCategoryKey="jewelry";jewelry.removeAttribute("style");jewelry.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();activeKey="jewelry";runSearch(MAP.jewelry.query)});world.appendChild(jewelry)}
    const bubbles=[...world.querySelectorAll(".lv4-category-bubble")].filter(node=>ORDER.includes(keyOf(node)));
    const byKey=new Map(bubbles.map(node=>[keyOf(node),node]));
    ORDER.forEach((key,i)=>{const node=byKey.get(key);if(!(node instanceof HTMLElement))return;node.dataset.ynotCategoryKey=key;const a=i/ORDER.length*Math.PI*2-Math.PI/2,x=100000+Math.cos(a)*800,y=100000+Math.sin(a)*800;node.style.left=`${x}px`;node.style.top=`${y}px`;const cfg=MAP[key],b=node.querySelector("b"),s=node.querySelector("span");if(b)b.textContent=cfg.label;if(s)s.textContent=cfg.subtitle});
  };
  const apply=()=>{ensureJewelry();const intent=(document.querySelector(".lv4-intent span")?.textContent||"").toLowerCase();for(const [key,cfg] of Object.entries(MAP))if(intent.includes(cfg.label.toLowerCase()))activeKey=key;const cfg=MAP[activeKey];if(!cfg)return;document.querySelectorAll(".lv4-textbubble").forEach((node,i)=>{if(node instanceof HTMLElement)node.textContent=cfg.tags[i%cfg.tags.length]})};
  document.addEventListener("click",event=>{const target=event.target instanceof Element?event.target:null;if(!target)return;const category=target.closest(".lv4-category-bubble");if(category&&!category.classList.contains("cat-jewelry")){activeKey=keyOf(category);setTimeout(apply,50)}},false);
  const observer=new MutationObserver(()=>{if(document.querySelector(".lv4-category-bubble")&&!document.querySelector(".lv4-category-bubble.cat-jewelry"))requestAnimationFrame(apply)});observer.observe(document.documentElement,{childList:true,subtree:true});
  apply();
})();
