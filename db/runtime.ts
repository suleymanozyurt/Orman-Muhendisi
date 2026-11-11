export type RawDB={prepare(sql:string):Statement;batch(statements:Statement[]):Promise<unknown[]>};
export type Statement={bind(...values:unknown[]):Statement;first<T=Record<string,unknown>>():Promise<T|null>;all<T=Record<string,unknown>>():Promise<{results:T[]}>;run():Promise<unknown>};
export async function rawDatabase(){try{return (await import("cloudflare:workers")).env.DB as unknown as RawDB|undefined;}catch{return undefined;}}
