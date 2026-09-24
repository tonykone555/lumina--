(()=>{
  const WORLD_CENTER=100000;
  const FIT=0.78;
  let applied=false;

  function fitCategoryTribe(){
    const world=document.querySelector('.lv4-world.level-worlds');
    const stage=world?.querySelector('.lv4-stage');
    if(!world||!stage){applied=false;return}
    if(applied&&stage.dataset.categoryFit==='1')return;

    const raw=stage.style.transform||'';
    const match=raw.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/);
    if(!match)return;
    const tx=Number(match[1]),ty=Number(match[2]),zoom=Number(match[3]);
    if(!Number.isFinite(tx)||!Number.isFinite(ty)||!Number.isFinite(zoom))return;

    // Zoom the complete category world out while keeping its world centre fixed
    // at exactly the same screen coordinate. This preserves the tribe geometry,
    // makes the labels/bubbles smaller together, and does not touch product worlds.
    const nextZoom=zoom*FIT;
    const centreScreenX=tx+WORLD_CENTER*zoom;
    const centreScreenY=ty+WORLD_CENTER*zoom;
    const nextTx=centreScreenX-WORLD_CENTER*nextZoom;
    const nextTy=centreScreenY-WORLD_CENTER*nextZoom;
    stage.style.transform=`translate(${nextTx}px, ${nextTy}px) scale(${nextZoom})`;
    stage.dataset.categoryFit='1';
    applied=true;
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(fitCategoryTribe));
  const start=()=>{observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});fitCategoryTribe()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
