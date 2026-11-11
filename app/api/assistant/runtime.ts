export type AssistantRuntime = { apiKey?: string; model?: string; geminiKey?: string; geminiModel?: string; plantnetKey?:string };

export async function assistantRuntime(): Promise<AssistantRuntime> {
  try {
    const env = (await import("cloudflare:workers")).env as unknown as {
      OPENAI_API_KEY?: string; OPENAI_MODEL?: string; GEMINI_API_KEY?: string; GEMINI_MODEL?: string; PLANTNET_API_KEY?:string;
      DB?: { prepare: (sql: string) => { bind: (key: string) => { first: <T>() => Promise<T | null> } } };
    };
    const stored = async (key: string) => {
      try { return (await env.DB?.prepare("SELECT value FROM site_settings WHERE key=?").bind(key).first<{ value: string }>())?.value; }
      catch { return undefined; }
    };
    const [apiKey,geminiKey,plantnetKey] = await Promise.all([
      env.OPENAI_API_KEY || stored("assistant_openai_key"), env.GEMINI_API_KEY || stored("assistant_gemini_key"),
      env.PLANTNET_API_KEY || stored("assistant_plantnet_key"),
    ]);
    return {apiKey,model:env.OPENAI_MODEL,geminiKey,geminiModel:env.GEMINI_MODEL,plantnetKey};
  } catch { return {}; }
}
