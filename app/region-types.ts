export type Region = { id: string; label: string; kind: "country" | "state" | "city"; country: string; bounds: [number,number,number,number]; approximate: boolean };
