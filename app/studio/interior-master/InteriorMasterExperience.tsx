"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowDown,ArrowRight,ArrowUpRight} from "lucide-react";
import styles from "./interior-master.module.css";

const STUDIO={
  name:"AURELIA",
  descriptor:"INTERIOR ARCHITECTURE",
  location:"LONDON · PARIS · MARBELLA",
  headline:"Spaces made to be felt.",
  intro:"Residential interiors shaped through light, material and movement.",
  email:"studio@aurelia.design",
};

const IMAGES={
  hero:"https://images.unsplash.com/photo-1758957701419-2c6e266f7988?auto=format&fit=crop&fm=jpg&q=82&w=2200",
  calm:"https://images.unsplash.com/photo-1771888703723-01d85da1dae1?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  white:"https://images.unsplash.com/photo-1771371097061-3befd4b71b59?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  fireplace:"https://images.unsplash.com/photo-1771371428960-35a50c2d4e7c?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  shelves:"https://images.unsplash.com/photo-1760072513442-9872656c1b07?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  penthouse:"https://images.unsplash.com/photo-1776362355123-ca966d36e29c?auto=format&fit=crop&fm=jpg&q=82&w=1800",
  courtyard:"https://images.unsplash.com/photo-1758448756362-e323282ccbcc?auto=format&fit=crop&fm=jpg&q=82&w=1800",
};

const PROJECTS=[
  {image:IMAGES.hero,eyebrow:"PRIVATE RESIDENCE · 01",title:"Sculpted living",meta:"Material · Light · Art"},
  {image:IMAGES.calm,eyebrow:"PRIVATE RESIDENCE · 02",title:"Quiet composition",meta:"Texture · Oak · Restraint"},
  {image:IMAGES.penthouse,eyebrow:"PRIVATE RESIDENCE · 03",title:"Vertical light",meta:"Volume · Stone · Glow"},
  {image:IMAGES.shelves,eyebrow:"PRIVATE RESIDENCE · 04",title:"Soft geometry",meta:"Joinery · Warmth · Detail"},
  {image:IMAGES.fireplace,eyebrow:"PRIVATE RESIDENCE · 05",title:"Living frame",meta:"Flow · Framing · Rhythm"},
  {image:IMAGES.courtyard,eyebrow:"HOSPITALITY · 06",title:"Threshold garden",meta:"Stone · Water · Light"},
];

const CHAPTERS=[
  {at:0,label:"01 / ARRIVAL",title:"Enter the atmosphere"},
  {at:.31,label:"02 / MATERIAL",title:"Move through texture"},
  {at:.66,label:"03 / DETAIL",title:"Notice what stays"},
];

export default function InteriorMasterExperience(){
  const tourRef=useRef<HTMLElement>(null);
  const videoRef=useRef<HTMLVideoElement>(null);
  const ambientVideoRef=useRef<HTMLVideoElement>(null);
  const progressRef=useRef<HTMLDivElement>(null);
  const [chapter,setChapter]=useState(0);
  const [videoUrl,setVideoUrl]=useState<string>("");
  const [menuOpen,setMenuOpen]=useState(false);

  const chapterData=useMemo(()=>CHAPTERS[chapter]||CHAPTERS[0],[chapter]);

  useEffect(()=>{
    let objectUrl="";
    let cancelled=false;
    Promise.all(Array.from({length:8},(_,i)=>fetch(`/studio/interior/tour-chunks/${i}.txt`).then(r=>{if(!r.ok)throw new Error(`Tour chunk ${i} failed`);return r.text()})))
      .then(parts=>{
        if(cancelled)return;
        const binary=atob(parts.join(""));
        const bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
        objectUrl=URL.createObjectURL(new Blob([bytes],{type:"video/mp4"}));
        setVideoUrl(objectUrl);
      })
      .catch(()=>setVideoUrl(""));
    return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl)};
  },[]);

  useEffect(()=>{
    const html=document.documentElement;
    const body=document.body;
    const previous={htmlOverflow:html.style.overflow,htmlOverflowX:html.style.overflowX,htmlHeight:html.style.height,bodyOverflow:body.style.overflow,bodyHeight:body.style.height,bodyBg:body.style.background};
    html.style.overflowY="auto";
    html.style.overflowX="hidden";
    html.style.height="auto";
    body.style.overflow="visible";
    body.style.height="auto";
    body.style.background="#ece9e2";
    return()=>{
      html.style.overflow=previous.htmlOverflow;
      html.style.overflowX=previous.htmlOverflowX;
      html.style.height=previous.htmlHeight;
      body.style.overflow=previous.bodyOverflow;
      body.style.height=previous.bodyHeight;
      body.style.background=previous.bodyBg;
    };
  },[]);

  useEffect(()=>{
    const section=tourRef.current;
    const video=videoRef.current;
    const ambient=ambientVideoRef.current;
    if(!section||!video)return;

    let target=0;
    let rendered=0;
    let raf=0;
    let lastChapter=-1;
    const durationFallback=15.8;

    const measure=()=>{
      const rect=section.getBoundingClientRect();
      const travel=Math.max(1,section.offsetHeight-window.innerHeight);
      const progress=Math.min(1,Math.max(0,-rect.top/travel));
      const duration=(Number.isFinite(video.duration)&&video.duration>0?video.duration:durationFallback)-.06;
      target=progress*Math.max(.1,duration);
      progressRef.current?.style.setProperty("--tour-progress",String(progress));
      const next=progress<.31?0:progress<.66?1:2;
      if(next!==lastChapter){lastChapter=next;setChapter(next)}
      if(!raf)raf=requestAnimationFrame(tick);
    };

    const tick=()=>{
      raf=0;
      const distance=target-rendered;
      const ease=Math.abs(distance)>.9?.19:.115;
      rendered+=distance*ease;
      if(video.readyState>=2&&Math.abs(video.currentTime-rendered)>.012){
        try{video.currentTime=rendered}catch{}
      }
      if(ambient&&ambient.readyState>=2&&Math.abs(ambient.currentTime-rendered)>.04){
        try{ambient.currentTime=rendered}catch{}
      }
      if(Math.abs(target-rendered)>.004)raf=requestAnimationFrame(tick);
    };

    const onScroll=()=>measure();
    const onResize=()=>measure();
    const onReady=()=>{video.pause();ambient?.pause();measure()};
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",onResize,{passive:true});
    video.addEventListener("loadedmetadata",onReady);
    ambient?.addEventListener("loadedmetadata",onReady);
    measure();
    return()=>{
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("resize",onResize);
      video.removeEventListener("loadedmetadata",onReady);
      ambient?.removeEventListener("loadedmetadata",onReady);
      if(raf)cancelAnimationFrame(raf);
    };
  },[]);

  const scrollTo=(id:string)=>{
    document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
    setMenuOpen(false);
  };

  return <main className={styles.interiorMaster}>
    <header className={styles.nav}>
      <button className={styles.wordmark} onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="Back to top">
        <span data-personalize="company-name">{STUDIO.name}</span>
        <small>{STUDIO.descriptor}</small>
      </button>
      <div className={styles.navMeta} data-personalize="location">{STUDIO.location}</div>
      <nav className={`${styles.navLinks} ${menuOpen?styles.navOpen:""}`}>
        <button onClick={()=>scrollTo("tour")}>Experience</button>
        <button onClick={()=>scrollTo("projects")}>Projects</button>
        <button onClick={()=>scrollTo("studio")}>Studio</button>
        <button onClick={()=>scrollTo("contact")}>Contact</button>
      </nav>
      <button className={styles.menuButton} onClick={()=>setMenuOpen(v=>!v)} aria-label="Toggle menu"><span/><span/></button>
    </header>

    <section className={styles.hero}>
      <div className={styles.heroBackdrop} aria-hidden="true">
        <img src={IMAGES.hero} alt=""/>
      </div>
      <div className={styles.heroShade}/>
      <div className={styles.heroTopline}>RESIDENTIAL · HOSPITALITY · BESPOKE</div>
      <div className={styles.heroCopy}>
        <p>INTERIORS / 2026</p>
        <h1 data-personalize="hero-headline">{STUDIO.headline}</h1>
        <div className={styles.heroBottom}>
          <p data-personalize="hero-intro">{STUDIO.intro}</p>
          <button onClick={()=>scrollTo("tour")}><span>Enter the space</span><ArrowDown/></button>
        </div>
      </div>
      <div className={styles.heroIndex}>01 — 05</div>
    </section>

    <section className={styles.manifesto} id="studio">
      <div className={styles.sectionKicker}>A / APPROACH</div>
      <p className={styles.manifestoLead}>We design interiors as <em>experiences</em> — composed through proportion, restraint and the way a room reveals itself in motion.</p>
      <div className={styles.manifestoGrid}>
        <p>Every project begins with atmosphere. We reduce noise, amplify material and let light create the rhythm.</p>
        <p>The result is not a style applied to a space. It is a space that feels inevitable to the people who live inside it.</p>
      </div>
    </section>

    <section className={styles.tourSection} id="tour" ref={tourRef}>
      <div className={styles.tourSticky}>
        <video className={styles.tourAmbient} ref={ambientVideoRef} src={videoUrl||undefined} muted playsInline preload="auto" aria-hidden="true"/>
        <div className={styles.tourVignette}/>
        <div className={styles.tourGrid}/>
        <video className={styles.tourVideo} ref={videoRef} src={videoUrl||undefined} muted playsInline preload="auto" poster={IMAGES.hero}/>

        <div className={styles.tourTopbar}>
          <span>SCROLL-CONTROLLED TOUR</span>
          <span className={styles.tourReady}>{videoUrl?"TOUR READY":"LOADING TOUR"}</span>
        </div>

        <div className={styles.tourChapter} key={chapterData.label}>
          <span>{chapterData.label}</span>
          <h2>{chapterData.title}</h2>
        </div>

        <div className={styles.tourRail}>
          <span>SCROLL TO MOVE</span>
          <div className={styles.progressTrack}><div ref={progressRef} className={styles.progressFill}/></div>
          <span>KEEP GOING</span>
        </div>
      </div>
    </section>

    <section className={styles.projects} id="projects">
      <div className={styles.projectsHeader}>
        <span>B / SELECTED WORK</span>
        <h2>Projects that reward<br/>a closer look.</h2>
        <p>Replace these master images with a prospect’s strongest projects and the site becomes theirs.</p>
      </div>
      <div className={styles.projectGrid}>
        {PROJECTS.map((project,index)=><article className={`${styles.projectCard} ${index%3===1?styles.projectTall:""}`} key={project.title}>
          <div className={styles.projectImage}>
            <img src={project.image} alt={project.title}/>
            <span>{String(index+1).padStart(2,"0")}</span>
          </div>
          <div className={styles.projectCopy}>
            <small>{project.eyebrow}</small>
            <h3>{project.title}</h3>
            <p>{project.meta}</p>
          </div>
        </article>)}
      </div>
    </section>

    <section className={styles.services}>
      <div className={styles.sectionKicker}>C / SERVICES</div>
      <div className={styles.serviceRows}>
        {["INTERIOR ARCHITECTURE","SPATIAL PLANNING","BESPOKE JOINERY","MATERIAL DIRECTION"].map((item,i)=><div className={styles.serviceRow} key={item}>
          <span>{String(i+1).padStart(2,"0")}</span><h3>{item}</h3><ArrowUpRight/>
        </div>)}
      </div>
    </section>

    <section className={styles.future}>
      <div className={styles.futureOrb}>NEXT / SCREEN</div>
      <p>The web is becoming more immersive.</p>
      <h2>We design digital experiences that stand out now — and feel ready for what comes next.</h2>
      <div className={styles.futureMeta}>LARGER DISPLAYS · FOLDABLES · SPATIAL INTERFACES</div>
    </section>

    <section className={styles.contact} id="contact">
      <div className={styles.contactTop}>
        <span>D / START A PROJECT</span>
        <span data-personalize="location">{STUDIO.location}</span>
      </div>
      <h2>Make your first<br/>impression <em>felt.</em></h2>
      <a href={`mailto:${STUDIO.email}`} data-personalize="contact-email"><span>{STUDIO.email}</span><ArrowRight/></a>
      <footer>
        <div><strong data-personalize="company-name">{STUDIO.name}</strong><small>INTERIOR ARCHITECTURE / MASTER EXPERIENCE</small></div>
        <div><span>INSTAGRAM</span><span>PINTEREST</span><span>LINKEDIN</span></div>
        <small>© 2026 — BUILT FOR THE NEXT SCREEN.</small>
      </footer>
    </section>
  </main>;
}
