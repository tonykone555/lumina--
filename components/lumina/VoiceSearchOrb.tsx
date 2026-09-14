"use client";
import {useEffect,useRef,useState} from "react";

type VoiceState="idle"|"asking"|"listening"|"searching"|"error";
type VoiceEvent={results:{[index:number]:{[index:number]:{transcript:string}}}};
type VoiceError={error?:string};
type Recognition={lang:string;interimResults:boolean;continuous:boolean;maxAlternatives:number;onresult:((event:VoiceEvent)=>void)|null;onerror:((event:VoiceError)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void;abort:()=>void};
type Constructor=new()=>Recognition;

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}
function speak(text:string,onEnd?:()=>void){if(!("speechSynthesis" in window)){onEnd?.();return}window.speechSynthesis.cancel();const message=new SpeechSynthesisUtterance(text);message.rate=.96;message.pitch=.92;message.onend=()=>onEnd?.();message.onerror=()=>onEnd?.();window.speechSynthesis.speak(message)}

export default function VoiceSearchOrb({left,top}:{left:number;top:number}){
 const [state,setState]=useState<VoiceState>("idle"),[caption,setCaption]=useState("Tap to ask YNOT"),recognition=useRef<Recognition|null>(null),listenTimer=useRef<number|null>(null),resetTimer=useRef<number|null>(null);
 function clearTimers(){if(listenTimer.current!=null)window.clearTimeout(listenTimer.current);if(resetTimer.current!=null)window.clearTimeout(resetTimer.current);listenTimer.current=null;resetTimer.current=null}
 useEffect(()=>()=>{clearTimers();recognition.current?.abort();window.speechSynthesis?.cancel()},[]);

 function search(query:string){const clean=query.trim();if(clean.length<2){setState("error");setCaption("I didn’t catch that. Tap again.");return}setState("searching");setCaption(`Searching “${clean}”`);const input=document.querySelector<HTMLInputElement>(".lv4-search input"),button=document.querySelector<HTMLButtonElement>(".lv4-search button");if(!input||!button){setState("error");setCaption("Search is still loading. Tap again.");return}setInput(input,clean);requestAnimationFrame(()=>button.click());resetTimer.current=window.setTimeout(()=>{setState("idle");setCaption("Tap to ask YNOT")},2200)}
 function fail(message:string){clearTimers();recognition.current=null;setState("error");setCaption(message)}
 function begin(){
  if(state==="asking"||state==="listening"||state==="searching")return;
  clearTimers();
  const scope=window as unknown as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor},VoiceRecognition=scope.SpeechRecognition||scope.webkitSpeechRecognition;
  if(!VoiceRecognition){fail(/Safari/i.test(navigator.userAgent)&&!/CriOS/i.test(navigator.userAgent)?"Enable Siri & Dictation, then reopen in Safari":"Voice unavailable—use search below");document.querySelector<HTMLInputElement>(".ynot-bottom-search input")?.focus();return}
  const listener=new VoiceRecognition();recognition.current=listener;listener.lang=navigator.language||"en-US";listener.interimResults=false;listener.continuous=false;listener.maxAlternatives=1;
  listener.onresult=event=>{clearTimers();const words=event.results[0]?.[0]?.transcript||"";recognition.current=null;speak(`Searching for ${words}`,()=>search(words))};
  listener.onerror=event=>{const code=event.error||"";if(code==="not-allowed"||code==="service-not-allowed")fail("Allow microphone, Siri & Dictation in Safari");else if(code==="network")fail("Speech service needs an internet connection");else fail("I couldn’t hear that. Tap to retry.")};
  listener.onend=()=>{if(recognition.current){clearTimers();recognition.current=null;setState(current=>current==="listening"?"idle":current);setCaption(current=>current==="Listening…"?"Tap to ask YNOT":current)}};
  setState("asking");setCaption("YNOT is asking…");
  speak("What would you like me to find?",()=>{try{setState("listening");setCaption("Listening…");listener.start();listenTimer.current=window.setTimeout(()=>{try{listener.stop()}catch{}},12000)}catch{fail("Allow microphone, Siri & Dictation in Safari")}})
 }
 return <button className={`ynot-voice-orb ${state}`} style={{left,top}} onClick={begin} aria-label="Ask YNOT to search by voice" aria-live="polite"><img src="/ynot-microphone.jpg" alt=""/><span className="ynot-voice-pulse"/><strong>{caption}</strong></button>
}