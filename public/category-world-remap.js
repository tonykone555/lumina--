(()=>{
  const MAP={
    fashion:{label:"Fashion Men & Women",subtitle:"Menswear · womenswear · shoes · accessories",query:"men women fashion clothing menswear womenswear streetwear sneakers dresses jackets jeans",tags:["Men","Women","Menswear","Womenswear","Streetwear","Sneakers","Jackets","Jeans","Dresses","Activewear","Accessories","New Arrivals"]},
    fitness:{label:"Fitness & Sports",subtitle:"Gym · nutrition · equipment · sports",query:"fitness sports gym equipment supplements protein creatine activewear training shoes football basketball boxing",tags:["Gym Equipment","Gym Nutrition","Protein","Creatine","Supplements","Pre-Workout","Weight Training","Bodybuilding","Men's Activewear","Training Shoes","Football","Basketball","Boxing","Nike","adidas","Gymshark"]},
    skin:{label:"Beauty",subtitle:"Skincare · makeup · self care",query:"beauty skincare makeup self care products",tags:["Skincare","Makeup","Fragrance","Beauty Tools","Body Care","Grooming","Sensitive Skin","Glow","SPF","Premium"]},
    hair:{label:"Health & Wellness",subtitle:"Wellness · recovery · health · self care",query:"health wellness recovery massage sleep hydration wellness equipment supplements self care",tags:["Recovery","Massage","Sleep","Hydration","Wellness Tech","Mobility","Posture","Vitamins","Supplements","Self Care","Fitness Recovery","Relaxation"]},
    home:{label:"Home",subtitle:"Furniture · lighting · decor",query:"premium home furniture lighting decor storage kitchen",tags:["Furniture","Lighting","Decor","Kitchen","Storage","Bedroom","Bathroom","Smart Home","Office","Outdoor Living"]},
    tech:{label:"Tech & Electronics",subtitle:"Electronics · gaming · audio · mobile",query:"tech electronics gadgets computers phones gaming audio cameras smart home accessories",tags:["Phones","Computers","Gaming","Audio","Headphones","Cameras","Smart Home","Wearables","Charging","Desk Tech","TV & Display","Accessories"]},
    retail:{label:"Digital Product",subtitle:"Software · templates · courses · downloads",query:"digital products software templates ebooks courses productivity downloads design assets",tags:["Software","Templates","Ebooks","Courses","Productivity","Design Assets","Business Tools","AI Tools","Digital Downloads","Education","Creator Tools","Subscriptions"]}
  };
  let activeKey="";
  const detectActive=()=>{
    const intent=(document.querySelector(".lv4-intent span")?.textContent||"").trim().toLowerCase();
    if(!intent)return activeKey;
    for(const [key,cfg] of Object.entries(MAP))if(intent===cfg.label.toLowerCase()||intent.includes(cfg.label.toLowerCase()))return key;
    if(intent.includes("fashion"))return"fashion";if(intent.includes("fitness")||intent.includes("sport"))return"fitness";if(intent.includes("beauty"))return"skin";if(intent.includes("health")||intent.includes("wellness")||intent.includes("hair"))return"hair";if(intent.includes("home"))return"home";if(intent.includes("tech")||intent.includes("electronic"))return"tech";if(intent.includes("digital")||intent.includes("discover")||intent.includes("trending"))return"retail";
    return activeKey;
  };
  const apply=()=>{
    document.querySelectorAll(".lv4-category-bubble").forEach((bubble)=>{
      const cls=[...bubble.classList].find(x=>x.startsWith("cat-"));if(!cls)return;const key=cls.slice(4),cfg=MAP[key];if(!cfg)return;
      bubble.dataset.ynotCategoryKey=key;
      const b=bubble.querySelector("b"),s=bubble.querySelector("span");if(b&&b.textContent!==cfg.label)b.textContent=cfg.label;if(s&&s.textContent!==cfg.subtitle)s.textContent=cfg.subtitle;
    });
    const key=detectActive();if(key)activeKey=key;const cfg=MAP[activeKey];if(!cfg)return;
    const tags=[...document.querySelectorAll(".lv4-textbubble")];
    tags.forEach((node,i)=>{const text=cfg.tags[i%cfg.tags.length];if(node.textContent!==text)node.textContent=text;node.dataset.ynotCategoryKey=activeKey;node.dataset.ynotTag=text});
  };
  // Important: category bubbles are React buttons. Never prevent/stop their event;
  // let LuminaWorld.chooseCategory own the actual category search and state transition.
  document.addEventListener("click",event=>{
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    const category=target.closest(".lv4-category-bubble");
    if(category){activeKey=category.dataset.ynotCategoryKey||[...category.classList].find(x=>x.startsWith("cat-"))?.slice(4)||activeKey;setTimeout(apply,80);return}
    const tag=target.closest(".lv4-textbubble");
    if(tag){const key=tag.dataset.ynotCategoryKey||activeKey;if(key&&MAP[key])activeKey=key;setTimeout(apply,80)}
  },false);
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("shop:tags-changed",()=>setTimeout(apply,0));
  apply();
})();
