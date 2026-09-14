"use client";
import {useEffect,useRef,useState} from "react";
type VoiceState="idle"|"asking"|"listening"|"preparing"|"searching"|"error";type VoiceEvent={results:{[index:number]:{[index:number]:{transcript:string}}}};type VoiceError={error?:string};type Recognition={lang:string;interimResults:boolean;continuous:boolean;maxAlternatives:number;onresult:((event:VoiceEvent)=>void)|null;onerror:((event:VoiceError)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};type Constructor=new()=>Recognition;type WorkerMessage={type:"ready"|"progress"|"result"|"error";progress?:number;text?:string;message?:string};
function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function speak(text:string,onEnd?:()=>void){if(!("speechSynthesis" in window)){onEnd?.();return}window.speechSynthesis.cancel();const message=new SpeechSynthesisUtterance(text);message.rate=.96;message.pitch=.92;message.onend=()=>onEnd?.();message.onerror=()=>onEnd?.();window.speechSynthesis.speak(message)}
async function samples(blob:Blob){const bytes=await blob.arrayBuffer(),AudioContextClass=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext,context=new AudioContextClass(),decoded=await context.decodeAudioData(bytes.slice(0)),length=Math.max(1,Math.ceil(decoded.duration*16000)),offline=new OfflineAudioContext(1,length,16000),source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();await context.close();return rendered.getChannelData(0).slice()}
export default function VoiceSearchOrb({left,top}:{left:number;top:number}){const [state,setState]=useState<VoiceState>("idle"),[caption,setCaption]=useState("Tap to ask YNOT"),recognition=useRef<Recognition|null>(null),worker=useRef<Worker|null>(null),timer=useRef<number|null>(null),stream=useRef<MediaStream|null>(null);
function clear(){if(timer.current!=null)window.clearTimeout(timer.current);timer.current=null;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null}
useEffect(()=>()=>{clear();recognition.current?.abort();worker.current?.terminate();window.speechSynthesis?.cancel()},[]);
function resetLater(){timer.current=window.setTimeout(()=>{setState("idle");setCaption("Tap to ask YNOT")},2200)}
function search(query:string){const clean=query.trim();if(clean.length<2){setState("error");setCaption("I didn’t catch that. Tap again.");return}setState("searching");setCaption(`Searching “${clean}”`);const input=document.querySelector<HTMLInputElement>(".lv4-search input"),button=document.querySelector<HTMLButtonElement>(".lv4-search button");if(!input||!button){setState("error");setCaption("Search is still loading. Tap again.");return}setInput(input,clean);requestAnimationFrame(()=>button.click());resetLater()}
function localWorker(){if(worker.current)return worker.current;const instance=new Worker(new URL("./whisper.worker.ts",import.meta.url),{type:"module"});instance.onmessage=(event:MessageEvent<WorkerMessage>)=>{const data=event.data;if(data.type==="progress"){setState("preparing");setCaption(`Preparing private voice AI… ${Math.max(0,Math.min(100,data.progress||0))}%`)}else if(data.type==="result"){clear();speak(`Searching for ${data.text||""}`,()=>search(data.text||""))}else if(data.type==="error"){clear();setState("error");setCaption("Voice model could not load. Tap to retry.")}};instance.onerror=()=>{clear();setState("error");setCaption("Voice model could not load. Tap to retry.")};worker.current=instance;instance.postMessage({type:"load"});return instance}
async function recordLocally(){
try{
if(!navigator.mediaDevices?.getUserMedia)throw new Error("Microphone unavailable");
setState("asking");
setCaption("Allow microphone access…");
const model=localWorker(),media=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
stream.current=media;
speak("What would you like me to find?",()=>{
try{
const formats=["audio/webm;codecs=opus","audio/mp4","audio/webm"],mimeType=formats.find(type=>MediaRecorder.isTypeSupported(type)),recorder=new MediaRecorder(media,mimeType?{mimeType}:undefined),chunks:BlobPart[]=[];
recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
recorder.onerror=()=>{clear();setState("error");setCaption("Recording failed. Tap to retry.")};
recorder.onstop=async()=>{setState("preparing");setCaption("Understanding on your device…");stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;try{const audio=await samples(new Blob(chunks,{type:recorder.mimeType}));model.postMessage({type:"transcribe",audio},[audio.buffer])}catch{setState("error");setCaption("I couldn’t process that recording.")}};
recorder.start(250);
setState("listening");
setCaption("Listening…");
timer.current=window.setTimeout(()=>{timer.current=null;if(recorder.state==="recording")recorder.stop()},6500);
}catch{
clear();
setState("error");
setCaption("Microphone recording is unavailable.");
}
});
}catch{
clear();
setState("error");
setCaption("Allow microphone access in Safari Settings");
}
}
function browserRecognition(VoiceRecognition:Constructor){const listener=new VoiceRecognition();recognition.current=listener;listener.lang=navigator.language||"en-US";listener.interimResults=false;listener.continuous=false;listener.maxAlternatives=1;listener.onresult=event=>{clear();recognition.current=null;const words=event.results[0]?.[0]?.transcript||"";speak(`Searching for ${words}`,()=>search(words))};listener.onerror=event=>{recognition.current=null;if(event.error==="not-allowed"||event.error==="service-not-allowed"||event.error==="audio-capture"){void recordLocally();return}clear();setState("error");setCaption(event.error==="network"?"Speech service needs internet":"I couldn’t hear that. Tap to retry.")};listener.onend=()=>{if(recognition.current){clear();recognition.current=null;setState("idle");setCaption("Tap to ask YNOT")}};setState("asking");setCaption("YNOT is asking…");speak("What would you like me to find?",()=>{try{setState("listening");setCaption("Listening…");listener.start();timer.current=window.setTimeout(()=>{try{listener.stop()}catch{}},12000)}catch{void recordLocally()}})}
function begin(){if(state==="asking"||state==="listening"||state==="preparing"||state==="searching")return;clear();const scope=window as unknown as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor},VoiceRecognition=scope.SpeechRecognition||scope.webkitSpeechRecognition,isSafari=/Safari/i.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);if(isSafari||!VoiceRecognition){void recordLocally();return}browserRecognition(VoiceRecognition)}
return <button className={`ynot-voice-orb ${state}`} style={{left,top}} onClick={begin} aria-label="Ask YNOT to search by voice" aria-live="polite"><img src="/ynot-microphone.jpg" alt=""/><span className="ynot-voice-pulse"/><strong>{caption}</strong></button>}