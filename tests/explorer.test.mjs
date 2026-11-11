import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/explore/route.ts";

test("invalid map bounds never reach the upstream service", async () => {
  for (const bounds of ["NaN,35,45,43", "25,35,25,43", "-181,35,45,43", "25,43,45,35", "1,2,3"]) {
    const result = await GET(new Request(`https://example.org/api/explore?bounds=${bounds}`));
    assert.equal(result.status, 400);
  }
});

test("regional totals come from facets and records retain their licence and source id", async () => {
  const original = globalThis.fetch;
  const queries = [];
  globalThis.fetch = async url => {
    queries.push(String(url));
    if (String(url).includes("/occurrence/search")) return Response.json({ count: 1500, facets: [{ field: "SPECIES_KEY", counts: [{ name: "5284682", count: 950 }] }], results: [{ key: 123, speciesKey: 5284682, species: "Cedrus libani", decimalLatitude: 37, decimalLongitude: 32, license: "https://creativecommons.org/licenses/by/4.0/", eventDate: "2024-05-01" }] });
    return Response.json({ key: 5284682, canonicalName: "Cedrus libani", scientificName: "Cedrus libani A.Rich.", kingdom: "Plantae", family: "Pinaceae" });
  };
  try {
    const response = await GET(new Request("https://example.org/api/explore?bounds=25,35,45,43&country=TR&year=2020"));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.count, 1500);
    assert.equal(data.species[0].count, 950);
    assert.equal(data.records.length, 1);
    assert.equal(data.records[0].id, 123);
    assert.equal(data.records[0].license, "https://creativecommons.org/licenses/by/4.0/");
    const search = new URL(queries[0]);
    assert.equal(search.searchParams.get("kingdomKey"), "6");
    assert.equal(search.searchParams.get("country"), "TR");
    assert.equal(search.searchParams.get("limit"), "200");
    assert.match(search.searchParams.get("geometry"), /^POLYGON/);
    assert.equal(search.searchParams.get("year"), `2020,${new Date().getFullYear()}`);
  } finally { globalThis.fetch = original; }
});

test("an unmatched or higher-rank name does not turn into an unfiltered plant search", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ usageKey: 10, rank: "GENUS", matchType: "HIGHERRANK" }); };
  try {
    const response = await GET(new Request("https://example.org/api/explore?name=Unknown%20plant"));
    assert.equal((await response.json()).unmatched, true);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test("upstream failure is reported as unavailable rather than zero observations", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unavailable"); };
  try { assert.equal((await GET(new Request("https://example.org/api/explore"))).status, 502); }
  finally { globalThis.fetch = original; }
});

test("only the exact unfiltered Türkiye region may use the real dated fallback", async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error("Unavailable");};
 try{const response=await GET(new Request("https://example.org/api/explore?country=TR&bounds=25,35,45,43"));const data=await response.json();assert.equal(response.status,200);assert.equal(data.cached,true);assert(data.fetchedAt);assert.equal(data.records.length,200);assert(data.count>data.records.length);
 for(const q of ["country=FR","country=TR&year=2020","country=TR&key=123","country=TR&bounds=26,35,45,43"]){assert.equal((await GET(new Request(`https://example.org/api/explore?${q}`))).status,502);}
 }finally{globalThis.fetch=original;}
});
