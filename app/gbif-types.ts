import type {FeedPhoto} from "./feed-data";
export type GbifOccurrence={id:number;taxonKey?:number;name:string;acceptedName:string;rank:string;status:string;basis:string;date:string;year?:number;place:string;country:string;point?:[number,number];uncertainty?:number;datasetKey:string;datasetTitle:string;publisher:string;recordedBy:string;identifiedBy:string;institution:string;collection:string;catalogueNumber:string;occurrenceId:string;license:string;issues:string[];informationWithheld:string;generalization:string;classification:{rank:string;name:string}[];photos:FeedPhoto[];hasMedia:boolean;source:string};
export type GbifFacet={field:string;counts:{name:string;count:number}[]};
export type GbifResults={records:GbifOccurrence[];total:number;offset:number;hasMore:boolean;facets:GbifFacet[];retrievedAt:string;source:string;map:string;queryKey:string};
export type GbifDataset={id:string;title:string;type:string;description:string;license:string;doi:string;citation:string;publisher:string;homepage:string;source:string;retrievedAt:string};
export type GbifTaxon={id:number;name:string;rank:string;family:string;status:string};
