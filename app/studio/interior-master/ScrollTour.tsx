"use client";

import {useEffect} from "react";
import styles from "./interior-master.module.css";

const TOUR_VIDEO="https://videos.pexels.com/video-files/7239168/7239168-uhd_2160_3840_25fps.mp4";
const HERO_POSTER="https://images.unsplash.com/photo-1758957701419-2c6e266f7988?auto=format&fit=crop&fm=jpg&q=82&w=2200";

export default function ScrollTour(){
  useEffect(()=>{
    const html=document.documentElement;
    const body=document.body;
    const previousHtmlOverflow=html.style.overflow;
    const previousHtmlHeight=html.style.height;
    const previousBodyOverflow=body.style.overflow;
    const previousBodyHeight=body.style.height;
    const previousBodyBackground=body.style.background;
    html.style.overflow="auto";
    html.style.height="auto";
    body.style.overflow="visible";
    body.style.height="auto";
    body.style.background="#ece9e2";

    const section=document.getElementById("interior-scroll-tour");
    const video=document.getElementById("interior-tour-video") as HTMLVideoElement|null;
    const ambient=document.getElementById("interior-tour-ambient") as HTMLVideoElement|null;
    const progress=document.getElementById("interior-tour-progress") as HTMLDivElement|null;
    const chapters=Array.from(document.querySelectorAll<HTMLElement>("[data-tour-chapter]"));

    let target=0;
    let rendered=0;
    let raf=0;
    let activeChapter=-1;

    function updateChapter(next:number){
      if(next===activeChapter)return;
      activeChapter=next;
      chapters.forEach((item,index)=>{
        item.style.opacity=index===next?"1":"0";
        item.style.transform=index===next?"translateY(0)":"translateY(14px)";
        item.style.pointerEvents=index===next?"auto":"none";
      });
    }

    function tick(){
      raf=0;
      if(!video)return;
      const distance=target-rendered;
      rendered+=distance*(Math.abs(distance)>.9?.19:.115);
      if(video.readyState>=2&&Math.abs(video.currentTime-rendered)>.012){try{video.currentTime=rendered}catch{}}
      if(ambient&&ambient.readyState>=2&&Math.abs(ambient.currentTime-rendered)>.04){try{ambient.currentTime=rendered}catch{}}
      if(Math.abs(target-rendered)>.004)raf=window.requestAnimationFrame(tick);
    }

    function measure(){
      if(!section||!video)return;
      const rect=section.getBoundingClientRect();
      const travel=Math.max(1,section.offsetHeight-window.innerHeight);
      const amount=Math.min(1,Math.max(0,-rect.top/travel));
      const duration=(Number.isFinite(video.duration)&&video.duration>0?video.duration:16)-.06;
      target=amount*Math.max(.1,duration);
      if(progress)progress.style.transform=`scaleX(${amount})`;
      updateChapter(amount<.31?0:amount<.66?1:2);
      if(!raf)raf=window.requestAnimationFrame(tick);
    }

    function onReady(){video?.pause();ambient?.pause();measure()}
    function onScroll(){measure()}
    function onResize(){measure()}

    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",onResize,{passive:true});
    video?.addEventListener("loadedmetadata",onReady);
    ambient?.addEventListener("loadedmetadata",onReady);
    updateChapter(0);
    measure();

    return()=>{
      window.removeEventListener("scroll",onScroll);
      window.removeEventListener("resize",onResize);
      video?.removeEventListener("loadedmetadata",onReady);
      ambient?.removeEventListener("loadedmetadata",onReady);
      if(raf)window.cancelAnimationFrame(raf);
      html.style.overflow=previousHtmlOverflow;
      html.style.height=previousHtmlHeight;
      body.style.overflow=previousBodyOverflow;
      body.style.height=previousBodyHeight;
      body.style.background=previousBodyBackground;
    };
  },[]);

  return <section className={styles.tourSection} id="interior-scroll-tour">
    <div className={styles.tourSticky}>
      <video id="interior-tour-ambient" className={styles.tourAmbient} src={TOUR_VIDEO} muted playsInline preload="metadata" aria-hidden="true"/>
      <div className={styles.tourVignette}/><div className={styles.tourGrid}/>
      <video id="interior-tour-video" className={styles.tourVideo} src={TOUR_VIDEO} muted playsInline preload="auto" poster={HERO_POSTER}/>
      <div className={styles.tourTopbar}><span>SCROLL-CONTROLLED TOUR</span><span className={styles.tourReady}>SCROLL TO EXPLORE</span></div>
      <div className={styles.tourChapter} data-tour-chapter="0" style={{opacity:1}}><span>01 / ARRIVAL</span><h2>Enter the atmosphere</h2></div>
      <div className={styles.tourChapter} data-tour-chapter="1" style={{opacity:0}}><span>02 / MATERIAL</span><h2>Move through texture</h2></div>
      <div className={styles.tourChapter} data-tour-chapter="2" style={{opacity:0}}><span>03 / DETAIL</span><h2>Notice what stays</h2></div>
      <div className={styles.tourRail}><span>SCROLL TO MOVE</span><div className={styles.progressTrack}><div id="interior-tour-progress" className={styles.progressFill}/></div><span>KEEP GOING</span></div>
    </div>
  </section>;
}
