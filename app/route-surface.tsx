"use client";
import { Component, useEffect, useState, type ReactNode } from "react";
import type { Language } from "./i18n";

function RouteFailure({language}: {language:Language}) {
  const [online,setOnline]=useState(true);
  useEffect(()=>{
    const update=()=>setOnline(navigator.onLine);update();
    window.addEventListener("online",update);window.addEventListener("offline",update);
    return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);};
  },[]);
  const en=language==="en";
  return <section className="route-failure" role="alert">
    <h2>{online?(en?"This section could not open":"Bu bölüm açılamadı"):(en?"You're offline":"İnternet bağlantısı yok")}</h2>
    <p>{en?"You can keep using the other sections or try opening this page again.":"Diğer menüleri kullanabilir veya bu sayfayı yeniden açmayı deneyebilirsin."}</p>
    <button type="button" onClick={()=>window.location.reload()}>{en?"Try again":"Yeniden dene"}</button>
  </section>;
}

// Keep the navigation usable if a feature chunk fails. A normal route change
// keeps mounted feeds and their position; only a failed surface is reset.
export default class RouteSurface extends Component<{context:string;language:Language;children:ReactNode},{context:string;failed:boolean}> {
  state={context:this.props.context,failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  static getDerivedStateFromProps(props:{context:string},state:{context:string}){
    return props.context!==state.context?{context:props.context,failed:false}:null;
  }
  render(){return this.state.failed?<RouteFailure language={this.props.language}/>:this.props.children;}
}
