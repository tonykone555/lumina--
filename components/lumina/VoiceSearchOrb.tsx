"use client";

import {useEffect,useRef,useState} from "react";

type VoiceState="idle"|"asking"|"listening"|"preparing"|"searching"|"error";
type VoiceEvent={results:{[index:number]:{[index:number]:{transcript:string}}}};
type VoiceError={error?:string};
type Recognition={lang:string;interimResults:boolean;continuous:boolean;maxAlternatives?:number;onresult:((event:VoiceEvent)=>void)|null;onerror:((event:VoiceError)=>void)|null;onend:(()=>void)|null;start:()=>void;stop?:()=>void;abort?:()=>void};
type Constructor=new()=>Recognition;
type VoiceLanguage="en"|"fr"|"de"|"es"|"it";

const supabaseUrl=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/$/,"");
const DEFAULT_LOCALES:Record<VoiceLanguage,string>={en:"en-GB",fr:"fr-FR",de:"de-DE",es:"es-ES",it:"it-IT"};
const COUNTRY_LOCALES:Record<string,string>={US:"en-US",CA:"en-CA",GB:"en-GB",UK:"en-GB",IE:"en-IE",AU:"en-AU",NZ:"en-NZ",SG:"en-SG",IN:"en-IN",ZA:"en-ZA",FR:"fr-FR",BE:"fr-BE",DE:"de-DE",AT:"de-AT",CH:"de-CH",ES:"es-ES",MX:"es-MX",AR:"es-AR",CL:"es-CL",CO:"es-CO",PE:"es-PE",IT:"it-IT"};
const VOICE_COPY:Record<VoiceLanguage,{tap:string;allow:string;prompt:string;findPrompt:string;asking:string;listening:string;understanding:string;searching:string;retry:string;loading:string;nothing:string;unavailable:string;searchFor:(query:string)=>string}>={
 en:{tap:"Tap to ask YNOT",allow:"Allow microphone access…",prompt:"What can I do for you?",findPrompt:"What would you like me to find?",asking:"YNOT is asking…",listening:"Listening…",understanding:"Understanding…",searching:"Searching",retry:"I didn’t catch that. Tap again.",loading:"Search is still loading. Tap again.",nothing:"I didn’t hear anything. Tap again.",unavailable:"Microphone unavailable. Tap to retry.",searchFor:q=>`Searching for ${q}`},
 fr:{tap:"Touchez pour demander à YNOT",allow:"Autorisez le microphone…",prompt:"Que puis-je faire pour vous ?",findPrompt:"Que voulez-vous que je trouve ?",asking:"YNOT vous écoute…",listening:"J’écoute…",understanding:"Je comprends…",searching:"Recherche",retry:"Je n’ai pas compris. Réessayez.",loading:"La recherche charge encore. Réessayez.",nothing:"Je n’ai rien entendu. Réessayez.",unavailable:"Microphone indisponible. Réessayez.",searchFor:q=>`Recherche de ${q}`},
 de:{tap:"Tippen und YNOT fragen",allow:"Mikrofonzugriff erlauben…",prompt:"Was kann ich für dich tun?",findPrompt:"Was soll ich für dich finden?",asking:"YNOT fragt…",listening:"Ich höre zu…",understanding:"Wird verstanden…",searching:"Suche",retry:"Das habe ich nicht verstanden. Nochmal tippen.",loading:"Die Suche lädt noch. Nochmal tippen.",nothing:"Ich habe nichts gehört. Nochmal tippen.",unavailable:"Mikrofon nicht verfügbar. Erneut versuchen.",searchFor:q=>`Suche nach ${q}`},
 es:{tap:"Toca para preguntarle a YNOT",allow:"Permite el acceso al micrófono…",prompt:"¿Qué puedo hacer por ti?",findPrompt:"¿Qué quieres que encuentre?",asking:"YNOT está preguntando…",listening:"Escuchando…",understanding:"Entendiendo…",searching:"Buscando",retry:"No lo entendí. Toca de nuevo.",loading:"La búsqueda aún se está cargando. Toca de nuevo.",nothing:"No he oído nada. Toca de nuevo.",unavailable:"Micrófono no disponible. Inténtalo de nuevo.",searchFor:q=>`Buscando ${q}`},
 it:{tap:"Tocca per chiedere a YNOT",allow:"Consenti l’accesso al microfono…",prompt:"Cosa posso fare per te?",findPrompt:"Cosa vuoi che trovi?",asking:"YNOT sta chiedendo…",listening:"In ascolto…",understanding:"Sto capendo…",searching:"Ricerca",retry:"Non ho capito. Tocca di nuovo.",loading:"La ricerca si sta ancora caricando. Tocca di nuovo.",nothing:"Non ho sentito nulla. Tocca di nuovo.",unavailable:"Microfono non disponibile. Riprova.",searchFor:q=>`Ricerca di ${q}`}
};

function languageBase(value?:string|null):VoiceLanguage|null{const base=String(value||"").trim().toLowerCase().split("-")[0];return(["en","fr","de","es","it"] as string[]).includes(base)?base as VoiceLanguage:null}
function supportedLocale(value?:string|null){const base=languageBase(value);if(!base)return"";const raw=String(value||"").trim();return raw.includes("-")?raw:DEFAULT_LOCALES[base]}
function selectedCountry(){if(typeof window==="undefined")return"";try{const region=JSON.parse(localStorage.getItem("ynot-region")||"null");if(region?.country)return String(region.country).toUpperCase()}catch{}return String(document.documentElement.dataset.ynotCountry||"").toUpperCase()}
function currentVoiceLanguage(){if(typeof window==="undefined")return"en-GB";try{const manual=supportedLocale(localStorage.getItem("ynot-language"));if(manual)return manual}catch{}const country=supportedLocale(COUNTRY_LOCALES[selectedCountry()]);if(country)return country;const html=supportedLocale(document.documentElement.lang);if(html)return html;for(const candidate of [...(navigator.languages||[]),navigator.language]){const locale=supportedLocale(candidate);if(locale)return locale}return"en-GB"}
function voiceCopy(){return VOICE_COPY[languageBase(currentVoiceLanguage())||"en"]}

function setInput(input:HTMLInputElement,value:string){const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;setter?.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))}

function normalizeVoiceQuery(value:string){
 let q=String(value||"").trim().replace(/^["'“”]+|["'“”]+$/g,"");
 q=q
  .replace(/^(?:hey\s+ynot[, ]*|ynot[, ]*)/i,"")
  .replace(/^(?:can you|could you|please)\s+(?:find|show|get)\s+(?:me\s+)?/i,"")
  .replace(/^(?:peux-tu|pouvez-vous|s['’]il te plaît|s['’]il vous plaît)\s+(?:trouver|chercher|montrer)\s+(?:moi\s+)?/i,"")
  .replace(/^(?:kannst du|könntest du|bitte)\s+(?:finden|finde|suchen|suche|zeigen|zeig)\s*/i,"")
  .replace(/^(?:puedes|podrías|por favor)\s+(?:buscar|encontrar|mostrar)\s*/i,"")
  .replace(/^(?:puoi|potresti|per favore)\s+(?:trovare|cercare|mostrare)\s*/i,"")
  .replace(/^(?:find|show|get)\s+(?:me\s+)?/i,"")
  .replace(/\b(?:less than|no more than|maximum of|max(?:imum)?|below|moins de|weniger als|menos de|meno di)\s+/gi,"under ")
  .replace(/\b(?:more than|at least|minimum of|min(?:imum)?|above|plus de|mehr als|más de|più di)\s+/gi,"over ")
  .replace(/\b(\d+(?:[.,]\d+)?)\s*euros?\b/gi,"€$1")
  .replace(/\b(\d+(?:[.,]\d+)?)\s*(?:pounds?|quid)\b/gi,"£$1")
  .replace(/\b(\d+(?:[.,]\d+)?)\s*(?:dollars?|dólares|dollari)\b/gi,"$$1")
  .replace(/\s+/g," ")
  .trim();
 return q;
}

function detectVoiceSource(value:string){const q=value.toLowerCase();if(/\b(?:etsy|commerce)\b/.test(q))return"commerce";if(/\b(?:ebay|marketplace)\b/.test(q))return"marketplace";if(/\b(?:ynot|shopify)\b/.test(q))return"ynot";return""}

function speakThen(text:string,onEnd?:()=>void){
 if(!("speechSynthesis" in window)){onEnd?.();return}
 window.speechSynthesis.cancel();
 const message=new SpeechSynthesisUtterance(text);message.lang=currentVoiceLanguage();message.rate=1;message.pitch=1;message.volume=1;
 let done=false;const finish=()=>{if(done)return;done=true;onEnd?.()};message.onend=finish;message.onerror=finish;
 window.speechSynthesis.speak(message);window.setTimeout(finish,2200);
}

function speak(text:string,onEnd?:()=>void){
 if(!("speechSynthesis" in window)){onEnd?.();return}
 window.speechSynthesis.cancel();
 const message=new SpeechSynthesisUtterance(text),locale=currentVoiceLanguage().toLowerCase(),language=locale.split("-")[0];
 message.lang=locale;message.rate=1;message.pitch=1;message.volume=1;
 const voices=window.speechSynthesis.getVoices();
 message.voice=voices.find(v=>v.localService&&v.lang.toLowerCase()===locale)||voices.find(v=>v.localService&&v.lang.toLowerCase().startsWith(language))||voices.find(v=>v.lang.toLowerCase().startsWith(language))||null;
 let done=false;const finish=()=>{if(done)return;done=true;onEnd?.()};message.onend=finish;message.onerror=finish;
 window.speechSynthesis.resume();window.speechSynthesis.speak(message);window.setTimeout(finish,3000);
}

export default function VoiceSearchOrb({left,top}:{left:number;top:number}){
 const[state,setState]=useState<VoiceState>("idle");
 const[caption,setCaption]=useState("Tap to ask YNOT");
 const[voiceLocale,setVoiceLocale]=useState("en-GB");
 const recognition=useRef<Recognition|null>(null),recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<number|null>(null),promptAudio=useRef<HTMLAudioElement|null>(null),promptUrl=useRef("");
 function stopTracks(){stream.current?.getTracks().forEach(track=>track.stop());stream.current=null}
 function clearTimer(){if(timer.current!=null)window.clearTimeout(timer.current);timer.current=null}
 function cleanup(){clearTimer();stopTracks()}
 useEffect(()=>{const sync=()=>{const locale=currentVoiceLanguage();setVoiceLocale(locale);if(state==="idle")setCaption(VOICE_COPY[languageBase(locale)||"en"].tap)};sync();window.addEventListener("ynot:language-changed",sync);window.addEventListener("ynot:region-changed",sync);window.addEventListener("storage",sync);return()=>{window.removeEventListener("ynot:language-changed",sync);window.removeEventListener("ynot:region-changed",sync);window.removeEventListener("storage",sync)}},[state]);
 useEffect(()=>{let alive=true;const base=supabaseUrl(),copy=VOICE_COPY[languageBase(voiceLocale)||"en"];if(!base)return;fetch(`${base}/functions/v1/voice-speak`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:copy.prompt,language:languageBase(voiceLocale)||"en"})}).then(async response=>{if(!response.ok)throw new Error("tts_failed");const blob=await response.blob();if(!alive)return;const url=URL.createObjectURL(blob);promptUrl.current=url;const audio=new Audio(url);audio.preload="auto";audio.load();promptAudio.current=audio}).catch(()=>{promptAudio.current=null});return()=>{alive=false;if(promptUrl.current)URL.revokeObjectURL(promptUrl.current);promptAudio.current=null;promptUrl.current=""}},[voiceLocale]);
 useEffect(()=>()=>{cleanup();try{recognition.current?.abort?.()}catch{}try{if(recorder.current?.state==="recording")recorder.current.stop()}catch{}window.speechSynthesis?.cancel()},[]);
 function resetLater(){clearTimer();timer.current=window.setTimeout(()=>{setState("idle");setCaption(voiceCopy().tap)},2200)}
 function playNaturalPrompt(onEnd:()=>void){const copy=voiceCopy(),audio=promptAudio.current;if(!audio){speakThen(copy.prompt,onEnd);return}try{audio.pause();audio.currentTime=0}catch{}let done=false;const finish=()=>{if(done)return;done=true;audio.onended=null;audio.onerror=null;onEnd()};audio.onended=finish;audio.onerror=()=>speakThen(copy.prompt,finish);const result=audio.play();if(result&&typeof result.catch==="function")result.catch(()=>speakThen(copy.prompt,finish));window.setTimeout(finish,3000)}
 function search(query:string){const copy=voiceCopy(),clean=normalizeVoiceQuery(query),source=detectVoiceSource(query);if(clean.length<2){setState("error");setCaption(copy.retry);resetLater();return}setState("searching");setCaption(`${copy.searching} “${clean}”`);window.dispatchEvent(new CustomEvent("ynot:voice-query",{detail:{query:clean,raw:query,source,language:currentVoiceLanguage()}}));const input=document.querySelector<HTMLInputElement>(".lv4-search input"),button=document.querySelector<HTMLButtonElement>(".lv4-search button");if(!input||!button){setState("error");setCaption(copy.loading);resetLater();return}setInput(input,clean);requestAnimationFrame(()=>button.click());resetLater()}
 async function transcribeRecording(blob:Blob){try{const copy=voiceCopy();setState("preparing");setCaption(copy.understanding);const base=supabaseUrl();if(!base)throw new Error("Voice service unavailable");const mime=blob.type||"audio/mp4";const response=await fetch(`${base}/functions/v1/voice-transcribe`,{method:"POST",headers:{"Content-Type":mime,"X-Audio-Mime":mime,"X-Language":currentVoiceLanguage()},body:blob});const data=await response.json().catch(()=>({}));if(!response.ok||!data?.text)throw new Error(data?.error||`voice_http_${response.status}`);search(String(data.text))}catch(reason){console.error("YNOT voice transcription failed",reason);setState("error");const message=reason instanceof Error?reason.message:"";setCaption(message.includes("deepgram_api_key_not_configured")?"Deepgram key missing in Supabase":message.toLowerCase().includes("invalid")||message.toLowerCase().includes("unauthorized")||message.includes("401")?"Deepgram key rejected — check Supabase secret":voiceCopy().retry);resetLater()}}
 async function recordFallback(skipPrompt=false){try{const copy=voiceCopy();if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw new Error("recording_unavailable");setState("asking");setCaption(copy.allow);let media:MediaStream;try{media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}catch{media=await navigator.mediaDevices.getUserMedia({audio:true})}stream.current=media;const formats=["audio/mp4;codecs=mp4a.40.2","audio/mp4","audio/webm;codecs=opus","audio/webm"],mimeType=formats.find(type=>{try{return MediaRecorder.isTypeSupported(type)}catch{return false}}),rec=new MediaRecorder(media,mimeType?{mimeType}:undefined);recorder.current=rec;const chunks:BlobPart[]=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onerror=()=>{cleanup();recorder.current=null;setState("error");setCaption(copy.unavailable);resetLater()};rec.onstop=()=>{clearTimer();stopTracks();recorder.current=null;const blob=new Blob(chunks,{type:rec.mimeType||mimeType||"audio/mp4"});if(blob.size<300){setState("error");setCaption(copy.nothing);resetLater();return}void transcribeRecording(blob)};const startRecording=()=>{try{if(rec.state!=="inactive")return;rec.start();setState("listening");setCaption(`${copy.listening} ${languageBase(currentVoiceLanguage())==="en"?"tap again when done":""}`.trim());timer.current=window.setTimeout(()=>{timer.current=null;if(rec.state==="recording")rec.stop()},4800)}catch(reason){console.error("YNOT recorder start failed",reason);cleanup();recorder.current=null;setState("error");setCaption(copy.unavailable);resetLater()}};if(skipPrompt){startRecording()}else{setState("asking");setCaption(copy.prompt);speakThen(copy.prompt,startRecording)}}catch(reason){console.error("YNOT Safari microphone failed",reason);cleanup();recorder.current=null;setState("error");setCaption(voiceCopy().unavailable);resetLater()}}
 function browserRecognition(VoiceRecognition:Constructor){const copy=voiceCopy(),listener=new VoiceRecognition();recognition.current=listener;listener.lang=currentVoiceLanguage();listener.interimResults=false;listener.continuous=false;if("maxAlternatives" in listener)listener.maxAlternatives=1;listener.onresult=event=>{clearTimer();recognition.current=null;const words=event.results[0]?.[0]?.transcript||"";speak(copy.searchFor(words),()=>search(words))};listener.onerror=event=>{recognition.current=null;const blocked=event?.error==="not-allowed"||event?.error==="service-not-allowed";setState("error");setCaption(blocked?copy.allow:copy.retry);resetLater()};listener.onend=()=>{if(recognition.current){recognition.current=null;setState("idle");setCaption(copy.tap)}};setState("asking");setCaption(copy.asking);speak(copy.findPrompt,()=>{try{setState("listening");setCaption(copy.listening);listener.start();timer.current=window.setTimeout(()=>{try{listener.stop?.()}catch{}},12000)}catch{setState("error");setCaption(copy.allow);resetLater()}})}
 function begin(){const copy=voiceCopy();if(state==="listening"&&recorder.current?.state==="recording"){recorder.current.stop();return}if(state==="asking"||state==="listening"||state==="preparing"||state==="searching")return;clearTimer();const scope=window as unknown as {SpeechRecognition?:Constructor;webkitSpeechRecognition?:Constructor},VoiceRecognition=scope.SpeechRecognition||scope.webkitSpeechRecognition,isIOS=/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);if(VoiceRecognition&&!isIOS){browserRecognition(VoiceRecognition);return}if(isIOS){setState("asking");setCaption(copy.prompt);playNaturalPrompt(()=>void recordFallback(true));return}void recordFallback()}
 return <button className={`ynot-voice-orb ${state}`} style={{left,top}} onClick={begin} aria-label="Ask YNOT to search by voice" aria-live="polite"><img src="/ynot-microphone.jpg" alt=""/><span className="ynot-voice-pulse"/><strong>{caption}</strong></button>
}
