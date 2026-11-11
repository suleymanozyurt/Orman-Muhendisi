export type NaturePhoto={url:string;credit:string;license:string;source:string};
export type NatureObservation={id:number;name:string;commonName:string;taxonId:number;group:string;date:string;author:string;place:string;point?:[number,number];quality:string;license:string;photos:NaturePhoto[];source:string;obscured:boolean};
export type NatureTaxon={id:number;name:string;commonName:string;rank:string;ancestry:{id:number;name:string;rank:string}[];observations:number;source:string};
export type FungiRecord={id:number;name:string;commonName:string;publishedIn:string;rank:string;hierarchy:{rank:string;name:string}[];source:string};
export type NatureSuggestion={id:number;name:string;commonName:string;rank:string};
