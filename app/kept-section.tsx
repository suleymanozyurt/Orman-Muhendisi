"use client";
import { Component, Suspense, type ReactNode } from "react";
import type { Language } from "./i18n";
import RouteSurface from "./route-surface";

type Props = { active: boolean; name: string; language: Language; children: ReactNode };

// Open each primary section once. An inactive section keeps its last props,
// loaded results and photo position, without rendering the other page's props.
export default class KeptSection extends Component<Props, { content: ReactNode }> {
  state = { content: this.props.active ? this.props.children : null };
  static getDerivedStateFromProps(props: Props) {
    return props.active ? { content: props.children } : null;
  }
  shouldComponentUpdate(next: Props) { return next.active || this.props.active; }
  render() {
    return this.state.content === null ? null : <section className="view-surface kept-section" data-kept-section={this.props.name} hidden={!this.props.active} inert={!this.props.active}><RouteSurface context={this.props.name} language={this.props.language}><Suspense fallback={<div className="surface-skeleton" role="status"><span className="sr-only">{this.props.language === "en" ? "Opening this section…" : "Bölüm açılıyor…"}</span><span/><span/><span/></div>}>{this.state.content}</Suspense></RouteSurface></section>;
  }
}
