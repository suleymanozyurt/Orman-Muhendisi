import { headers } from "next/headers";
import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { publicObservation, type SharedObservation } from "./shared-content";
import Home from "./site-shell";
import { readSiteRoute } from "./navigation";
import { automaticLanguage } from "./preferences";
import { jsonForHtml } from "./seo";
import { pageContent, taxonData, type SearchValues } from "./page-metadata";
export { generateMetadata } from "./page-metadata";
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<SearchValues> }) {
  const values = await searchParams, params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) { if (typeof value === "string") params.set(key, value); else if (Array.isArray(value)) value.forEach(item => params.append(key, item)); }
  const route = readSiteRoute(params), user = await getChatGPTUser(), requestHeaders = await headers();
  const language = automaticLanguage(requestHeaders.get("cf-ipcountry") || "", requestHeaders.get("accept-language") || "tr");
  const { flora: initialFlora } = pageContent(route, language), data = taxonData(route, language);
  let initialObservation: SharedObservation | null | undefined, sharedUnavailable = false;
  if (route.view === "home" && route.observation) { try { initialObservation = await publicObservation(route.observation); } catch { initialObservation = null; sharedUnavailable = true; } }
  return <>{data.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForHtml(data) }} />}<Home initialObservation={initialObservation} sharedUnavailable={sharedUnavailable} initialRoute={route} initialFlora={initialFlora} authenticated={Boolean(user)} accountId={user?.id} signInUrl={chatGPTSignInPath(params.get("view") === "auth" ? "/?view=profile" : "/?" + params)} initialLanguage={language} /></>;
}
