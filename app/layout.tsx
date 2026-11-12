import type { Metadata, Viewport } from "next";
import {headers} from "next/headers";
import {automaticLanguage} from "./preferences";
import "./globals.css";
import "./usability.css";
import "./app-experience.css";
import "./assistant.css";
import "./care.css";
import "./mobile-app.css";
import "./new-sections.css";
import "./theme.css";
import "./refinements.css";
import "./workspaces.css";
import "./design-system.css";
import "./account-interface.css";
import "./life-discover.css";
import "./brand-palette.css";
import "./adaptive.css";
import "./field-notebook.css";
import "./completion.css";
import "./social-archive.css";
import "./gbif.css";
import "./mobile-flow.css";
import "./fast-interactions.css";
import "./source-catalog.css";
import "./lens.css";
import "./social-connections.css";
import "./quiet-interface.css";
import "./social-sharing.css";
import "./fluid-experience.css";
import "./section-menu.css";
import "./navigation-hubs.css";
import "./calm-redesign.css";
import "./forest-reference.css";
import "./atlas-workbench.css";
import "./orman-atlas.css";
import {themeBootstrap} from "./theme";
import {siteOrigin} from "./seo";

// Vinext 0.0.50 omits viewportFit and interactiveWidget during serialization.
// Include them in its supported string width so one complete viewport tag is rendered.
export const viewport: Viewport = { width:"device-width, viewport-fit=cover, interactive-widget=resizes-content", initialScale:1, viewportFit:"cover", themeColor:"#ffffff", interactiveWidget:"resizes-content" };

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Orman Mühendisi | Bitkileri Keşfet",
  description:
    "Bitki veri tabanı, tür künyeleri, sözlük ve kişisel doğa gözlemleri.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable:true, title:"Orman Mühendisi", statusBarStyle:"default" },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "google": "notranslate",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/app-180.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders=await headers();
  const language=automaticLanguage(requestHeaders.get("cf-ipcountry")||"",requestHeaders.get("accept-language")||"tr");
  return (
    <html lang={language} translate="no" className="notranslate" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:themeBootstrap}}/></head>
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
