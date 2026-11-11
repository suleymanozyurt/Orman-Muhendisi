"use client";
import { useEffect,useState } from "react";
import type { LensHistoryEntry } from "./lens-capture";
import type { Language } from "./i18n";

function Entry({entry,language,onChoose}:{entry:LensHistoryEntry;language:Language;onChoose:()=>void}){
 const [url,setUrl]=useState("");
 useEffect(()=>{const url=URL.createObjectURL(entry.file);setUrl(url);return()=>URL.revokeObjectURL(url);},[entry.file]);
 const first=entry.reply.candidates[0];
 const label=entry.query || first?.commonName || first?.scientificName || (language==="en"?"Photo search":"Fotoğraf araması");
 return <li><button type="button" onClick={onChoose}>{url&&<img src={url} alt=""/>}<span><strong data-user-content>{label}</strong><time dateTime={new Date(entry.at).toISOString()}>{new Intl.DateTimeFormat(language==="en"?"en-GB":"tr-TR",{hour:"2-digit",minute:"2-digit"}).format(entry.at)}</time></span></button></li>;
}
export default function LensHistory({entries,language,onChoose,onClear}:{entries:LensHistoryEntry[];language:Language;onChoose:(entry:LensHistoryEntry)=>void;onClear:()=>void}){
 const en=language==="en";
 if(!entries.length)return <p className="lens-library-empty">{en?"Completed searches from this session will appear here.":"Bu oturumda tamamlanan aramalar burada görünür."}</p>;
 return <><ul className="lens-history-list">{entries.map(entry=><Entry key={entry.id} entry={entry} language={language} onChoose={()=>onChoose(entry)}/>)}</ul><button type="button" className="lens-clear-history" onClick={onClear}>{en?"Clear this session’s searches":"Bu oturumun aramalarını temizle"}</button></>;
}
