"use client";

import {useEffect,useRef,useState} from "react";

type VoiceState="idle"|"asking"|"listening"|"preparing"|"searching"|"error";
type VoiceEvent={results:{[index:number]:{[index:number]:{transcript:string}}}};
type VoiceError={error?:string};
type Recognition={lang:string;interimResults:boolean;continuous:boolean;maxAlternatives?:number;onresult:((event:VoiceEvent)=>void)|null;onerror:((event:VoiceError)=>void)|null;onend:(()=>void)|null;start:()=>void;stop?:()=>void;abort?:()=>void};
type Constructor=new()=>Recognition;

const supabaseUrl=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/$/,"");

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}

function normalizeVoiceQuery(value:string){
 let q=String(value||"").trim().replace(/^["'“”]+|["'“”]+$/g,"");
 q=q
  .replace(/^(?:hey\s+ynot[, ]*|ynot[, ]*)/i,"")
  .replace(/^(?:can you|could you|please)\s+(?:find|show|get)\s+(?:me\s+)?/i,"")
  .replace(/^(?:find|show|get)\s+(?:me\s+)?/i,"")
  .replace(/\b(?:less than|no more than|maximum of|max(?:imum)?|below)\s+/gi,"under ")
  .replace(/\b(?:more than|at least|minimum of|min(?:imum)?|above)\s+/gi,"over ")
  .replace(/\b(\d+(?:[.,]\d+)?)\s*euros?\b/gi,"€$1")
  .replace(/\b(\d+(?:[.,]\d+)?)\s*(?:pounds?|quid)\b/gi,"£$1")
  .replace(/\b(\d+(?:[.,]\d+)?)\s*dollars?\b/gi,"$$1")
  .replace(/\s+/g," ")
  .trim();
 return q;
}

function detectVoiceSource(value:string){
 const q=value.toLowerCase();
 if(/\b(?:etsy|commerce)\b/.test(q))return"commerce";
 if(/\b(?:ebay|marketplace)\b/.test(q))return"marketplace";
 if(/\b(?:ynot|shopify)\b/.test(q))return"ynot";
 return"";
}

function speak(text:string,onEnd?:()=>void){
 if(!("speechSynthesis" in window)){onEnd?.();return}
 window.speechSynthesis.cancel();
 const message=new SpeechSynthesisUtterance(text);
 message.lang=navigator.language||"en-US";
 message.rate=1;
 message.pitch=1;
 message.volume=1;
 const voices=window.speechSynthesis.getVoices();
 const locale=(navigator.language||"en-US").toLowerCase();
 const language=locale.split("-")[0];
 message.voice=voices.find(v=>v.localService&&v.lang.toLowerCase()===locale)||voices.find(v=>v.localService&&v.lang.toLowerCase().startsWith(language))||voices.find(v=>v.lang.toLowerCase().startsWith(language))||null;
 let done=false;
 const finish=()=>{if(done)return;done=true;onEnd?.()};
 message.onend=finish;
 message.onerror=finish;
 window.speechSynthesis.resume();
 window.speechSynthesis.speak(message);
 window.setTimeout(finish,2600);
}

export default function VoiceSearchOrb({left,top}:{left:number;top:number}){
 const[state,setState]=useState<VoiceState>("idle");
 const[caption,setCaption]=useState("Tap to ask YNOT");
 const recognition=useRef<Recognition|null>(null),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<number|null>(null);
 function stopTracks(){stream.current?.getTracks().forEach(track=>track.stop());stream.current=null}
 function clearTimer(){if(timer.current!=null)window.clearTimeout(timer.current);timer.current=null}
 function cleanup(){clearTimer();stopTracks()}
 useEffect(()=>()=>{cleanup();try{recognition.current?.abort?.()}catch{}try{if(recorder.current?.state==="recording")recorder.current.stop()}catch{}window.speechSynthesis?.cancel()},[]);
 function resetLater(){clearTimer();timer.current=window.setTimeout(()=>{setState("idle");setCaption("Tap to ask YNOT")},2200)}
 function search(query:string){const clean=normalizeVoiceQuery(query),source=detectVoiceSource(query);if(clean.length<2){setState("error");setCaption("I didn’t catch that. Tap again.");resetLater();return}setState("searching");setCaption(`Searching “${clean}”`);window.dispatchEvent(new CustomEvent("ynot:voice-query",{detail:{query:clean,raw:query,source}}));const input=document.querySelector<HTMLInputElement>(".lv4-search input"),button=document.querySelector<HTMLButtonElement>(".lv4-search button");if(!input||!button){setState("error");setCaption("Search is still loading. Tap again.");resetLater();return}setInput(input,clean);requestAnimationFrame(()=>button.click());resetLater()}
 async function transcribeRecording(blob:Blob){try{setState("preparing");setCaption("Understanding…");const base=supabaseUrl();if(!base)throw new Error("Voice service unavailable");const mime=blob.type||"audio/mp4";const response=await fetch(`${base}/functions/v1/voice-transcribe`,{method:"POST",headers:{"Content-Type":mime,"X-Audio-Mime":mime,"X-Language":navigator.language||"en-US"},body:blob});const data=await response.json().catch(()=>({}));if(!response.ok||!data?.text)throw new Error(data?.error||"Unable to understand recording");search(String(data.text))}catch(reason){console.error("YNOT voice transcription failed",reason);setState("error");setCaption(reason instanceof Error&&reason.message.includes("deepgram_api_key_not_configured")?"Voice key is not connected yet":"I couldn’t understand that. Tap to retry.");resetLater()}}
 async function recordFallback(){try{if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw new Error("recording_unavailable");setState("asking");setCaption("Allow microphone access…");let media:MediaStream;try{media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}catch{media=await navigator.mediaDevices.getUserMedia({audio:true})}stream.current=media;const formats=["audio/mp4;codecs=mp4a.40.2","audio/mp4","audio/webm;codecs=opus","audio/webm"],mimeType=formats.find(type=>{try{return MediaRecorder.isTypeSupported(type)}catch{return false}}),rec=new MediaRecorder(media,mimeType?{mimeType}:undefined);recorder.current=rec;const chunks:BlobPart[]=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onerror=()=>{cleanup();recorder.current=null;setState("error");setCaption("Microphone unavailable. Tap to retry.");resetLater()};rec.onstop=()=>{clearTimer();stopTracks();recorder.current=null;const blob=new Blob(chunks,{type:rec.mimeType||mimeType||"audio/mp4"});if(blob.size<300){setState("error");setCaption("I didn’t hear anything. Tap again.");resetLater();return}void transcribeRecording(blob)};rec.start();setState("listening");setCaption("Listening… tap again when done");timer.current=window.setTimeout(()=>{timer.current=null;if(rec.state==="recording")rec.stop()},4800)}catch(reason){console.error("YNOT Safari microphone failed",reason);cleanup();recorder.current=null;setState("error");setCaption("Microphone unavailable. Check Safari permission.");resetLater()}}
 function browserRecognition(VoiceRecognition:Constructor){const listener=new VoiceRecognition();recognition.current=listener;listener.lang=navigator.language||"en-US";listener.interimResults=false;listener.continuous=false;if("maxAlternatives" in listener)listener.maxAlternatives=1;listener.onresult=event=>{clearTimer();recognition.current=null;const words=event.results[0]?.[0]?.transcript||"";speak(`Searching for ${words}`,()=>search(words))};listener.onerror=event=>{recognition.current=null;const blocked=event?.error==="not-allowed"||event?.error==="service-not-allowed";setState("error");setCaption(blocked?"Allow microphone access and tap again":"I didn’t catch that. Tap to retry.");resetLater()};listener.onend=()=>{if(recognition.current){recognition.current=null;setState("idle");setCaption("Tap to ask YNOT")}};setState("asking");setCaption("YNOT is asking…");speak("What would you like me to find?",()=>{try{setState("listening");setCaption("Listening…");listener.start();timer.current=window.setTimeout(()=>{try{listener.stop?.()}catch{}},12000)}catch{setState("error");setCaption("Allow microphone access and tap again");resetLater()}})}
 function begin(){if(state==="listening"&&recorder.current?.state==="recording"){recorder.current.stop();return}if(state==="asking"||state==="listening"||state==="preparing"||state==="searching")return;clearTimer();const scope=window as unknown as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor},VoiceRecognition=scope.SpeechRecognition||scope.webkitSpeechRecognition,isIOS=/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);if(VoiceRecognition&&!isIOS){browserRecognition(VoiceRecognition);return}void recordFallback()}
 return <button className={`ynot-voice-orb ${state}`} style={{left,top}} onClick={begin} aria-label="Ask YNOT to search by voice" aria-live="polite"><img src="/ynot-microphone.jpg" alt=""/><span className="ynot-voice-pulse"/><strong>{caption}</strong></button>
}
