import { createRoot } from "react-dom/client";
import Home from "../app/site-shell";
import { readSiteRoute } from "../app/navigation";
import { installPreviewApi } from "./read-api";
import "./styles.generated.css";

installPreviewApi();
const params = new URL(location.href).searchParams;
document.documentElement.lang = "tr";
createRoot(document.getElementById("root")!).render(<>
  <aside className="preview-status" aria-label="Geliştirme önizlemesi">
    <span><strong>Geliştirme önizlemesi</strong> · Tasarım ve keşif ekranları. Üyelik, buluta kayıt ve yapay zekâ için sunucu bağlantısı gerekir.</span>
    <a href="lens-onizleme/">Orman Lens önizlemesi</a>
    <a href="https://github.com/suleymanozyurt/Orman-Muhendisi/actions" target="_blank" rel="noreferrer">Yayın durumu</a>
  </aside>
  <Home initialRoute={readSiteRoute(params)} authenticated={false} initialLanguage="tr" signInUrl="?view=auth&tab=signin" />
</>);
