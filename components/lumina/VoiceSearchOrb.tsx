"use client";

import {useEffect,useRef,useState} from "react";

type VoiceState="idle"|"asking"|"listening"|"preparing"|"searching"|"error";
type VoiceEvent={results:{[index:number]:{[index:number]:{transcript:string}}}};
type VoiceError={error?:string};
type Recognition={
  lang:string;
  interimResults:boolean;
  continuous:boolean;
  maxAlternatives?:number;
  onresult:((event:VoiceEvent)=>void)|null;
  onerror:((event:VoiceError)=>void)|null;
  onend:(()=>void)|null;
  start:()=>void;
  stop?:()=>void;
  abort?:()=>void;
};
type Constructor=new()=>Recognition;

const supabaseUrl=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/$/,"");

function setInput(input:HTMLInputElement,value:string){
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
  setter?.call(input,value);
  input.dispatchEvent(new Event("input",{bubbles:true}));
}

function speak(text:string,onEnd?:()=>void){
  if(!("speechSynthesis" in window)){onEnd?.();return;}
  window.speechSynthesis.cancel();
  const message=new SpeechSynthesisUtterance(text);
  message.rate=.96;
  message.pitch=.92;
  message.onend=()=>onEnd?.();
  message.onerror=()=>onEnd?.();
  window.speechSynthesis.speak(message);
}

async function blobToBase64(blob:Blob){
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let binary="";
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(binary);
}

export default function VoiceSearchOrb({left,top}:{left:number;top:number}){
  const[state,setState]=useState<VoiceState>("idle");
  const[caption,setCaption]=useState("Tap to ask YNOT");
  const recognition=useRef<Recognition|null>(null);
  const recorder=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const timer=useRef<number|null>(null);

  function stopTracks(){
    stream.current?.getTracks().forEach(track=>track.stop());
    stream.current=null;
  }

  function clearTimer(){
    if(timer.current!=null)window.clearTimeout(timer.current);
    timer.current=null;
  }

  function cleanup(){
    clearTimer();
    stopTracks();
  }

  useEffect(()=>()=>{
    cleanup();
    try{recognition.current?.abort?.();}catch{}
    try{if(recorder.current?.state==="recording")recorder.current.stop();}catch{}
    window.speechSynthesis?.cancel();
  },[]);

  function resetLater(){
    clearTimer();
    timer.current=window.setTimeout(()=>{
      setState("idle");
      setCaption("Tap to ask YNOT");
    },2200);
  }

  function search(query:string){
    const clean=query.trim().replace(/^["'“”]+|["'“”]+$/g,"");
    if(clean.length<2){
      setState("error");
      setCaption("I didn’t catch that. Tap again.");
      resetLater();
      return;
    }
    setState("searching");
    setCaption(`Searching “${clean}”`);
    const input=document.querySelector<HTMLInputElement>(".lv4-search input");
    const button=document.querySelector<HTMLButtonElement>(".lv4-search button");
    if(!input||!button){
      setState("error");
      setCaption("Search is still loading. Tap again.");
      resetLater();
      return;
    }
    setInput(input,clean);
    requestAnimationFrame(()=>button.click());
    resetLater();
  }

  async function transcribeRecording(blob:Blob){
    try{
      setState("preparing");
      setCaption("Understanding…");
      const base=supabaseUrl();
      if(!base)throw new Error("Voice service unavailable");
      const audio=await blobToBase64(blob);
      const response=await fetch(`${base}/functions/v1/voice-transcribe`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({audio,mime_type:blob.type||"audio/mp4",language:navigator.language||"en-US"}),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data?.text)throw new Error(data?.error||"Unable to understand recording");
      search(String(data.text));
    }catch{
      setState("error");
      setCaption("I couldn’t understand that. Tap to retry.");
      resetLater();
    }
  }

  async function recordForMobileSafari(){
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw new Error("recording_unavailable");
      setState("asking");
      setCaption("Allow microphone access…");
      const media=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      stream.current=media;
      const formats=["audio/mp4","audio/webm;codecs=opus","audio/webm"];
      const mimeType=formats.find(type=>MediaRecorder.isTypeSupported(type));
      const rec=new MediaRecorder(media,mimeType?{mimeType}:undefined);
      recorder.current=rec;
      const chunks:BlobPart[]=[];
      rec.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      rec.onerror=()=>{
        cleanup();
        recorder.current=null;
        setState("error");
        setCaption("Microphone unavailable. Tap to retry.");
        resetLater();
      };
      rec.onstop=()=>{
        clearTimer();
        stopTracks();
        recorder.current=null;
        const blob=new Blob(chunks,{type:rec.mimeType||mimeType||"audio/mp4"});
        if(blob.size<600){
          setState("error");
          setCaption("I didn’t hear anything. Tap again.");
          resetLater();
          return;
        }
        void transcribeRecording(blob);
      };
      rec.start(250);
      setState("listening");
      setCaption("Listening… tap again when done");
      timer.current=window.setTimeout(()=>{
        timer.current=null;
        if(rec.state==="recording")rec.stop();
      },5200);
    }catch{
      cleanup();
      recorder.current=null;
      setState("error");
      setCaption("Microphone unavailable. Check Safari permission and retry.");
      resetLater();
    }
  }

  function browserRecognition(VoiceRecognition:Constructor){
    const listener=new VoiceRecognition();
    recognition.current=listener;
    listener.lang=navigator.language||"en-US";
    listener.interimResults=false;
    listener.continuous=false;
    if("maxAlternatives" in listener)listener.maxAlternatives=1;
    listener.onresult=event=>{
      clearTimer();
      recognition.current=null;
      const words=event.results[0]?.[0]?.transcript||"";
      speak(`Searching for ${words}`,()=>search(words));
    };
    listener.onerror=()=>{
      recognition.current=null;
      setState("error");
      setCaption("Microphone unavailable. Tap to retry.");
      resetLater();
    };
    listener.onend=()=>{
      if(recognition.current){
        recognition.current=null;
        setState("idle");
        setCaption("Tap to ask YNOT");
      }
    };
    setState("asking");
    setCaption("YNOT is asking…");
    speak("What would you like me to find?",()=>{
      try{
        setState("listening");
        setCaption("Listening…");
        listener.start();
        timer.current=window.setTimeout(()=>{try{listener.stop?.();}catch{}},12000);
      }catch{
        setState("error");
        setCaption("Allow microphone access and tap again");
        resetLater();
      }
    });
  }

  function begin(){
    if(state==="listening"&&recorder.current?.state==="recording"){
      recorder.current.stop();
      return;
    }
    if(state==="asking"||state==="listening"||state==="preparing"||state==="searching")return;
    clearTimer();
    const scope=window as unknown as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor};
    const VoiceRecognition=scope.SpeechRecognition||scope.webkitSpeechRecognition;
    const isIOS=/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
    if(isIOS){
      void recordForMobileSafari();
      return;
    }
    if(VoiceRecognition){
      browserRecognition(VoiceRecognition);
      return;
    }
    void recordForMobileSafari();
  }

  return <button className={`ynot-voice-orb ${state}`} style={{left,top}} onClick={begin} aria-label="Ask YNOT to search by voice" aria-live="polite"><img src="/ynot-microphone.jpg" alt=""/><span className="ynot-voice-pulse"/><strong>{caption}</strong></button>;
}
