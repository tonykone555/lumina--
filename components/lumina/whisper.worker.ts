/// <reference lib="webworker" />
import {pipeline} from "@huggingface/transformers";
const MODEL="onnx-community/whisper-tiny";
let transcriberPromise:Promise<any>|null=null;
function transcriber(){if(!transcriberPromise)transcriberPromise=pipeline("automatic-speech-recognition",MODEL,{dtype:"q4",device:"wasm",progress_callback:(progress:any)=>{if(progress?.status==="progress"&&Number.isFinite(progress.progress))self.postMessage({type:"progress",progress:Math.round(progress.progress)})}}) as Promise<any>;return transcriberPromise}
self.onmessage=async(event:MessageEvent<{type:string;audio?:Float32Array}>)=>{try{if(event.data.type==="load"){await transcriber();self.postMessage({type:"ready"});return}if(event.data.type==="transcribe"&&event.data.audio){const run=await transcriber(),result=await run(event.data.audio);self.postMessage({type:"result",text:String(result?.text||"").trim()})}}catch(error){self.postMessage({type:"error",message:error instanceof Error?error.message:"On-device transcription failed"})}};
export {};