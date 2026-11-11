export type ResourceKind="forestry"|"publication"|"nursery"|"health";
export type Resource={id:string;kind:ResourceKind;title:string;status:"draft"|"published";data:Record<string,string>;author:string;owner:boolean;revision:number;created_at:string;updated_at:string};
export type Offering={id:string;kind:"book"|"seedling";title:string;data:Record<string,string>;price_cents:number;stock:number;status:"draft"|"published";owner:boolean;revision:number;seller:string;created_at:string};
export type CartItem=Offering&{quantity:number};
export type Order={id:string;status:"requested"|"confirmed"|"cancelled";seller:boolean;items:{id:string;title:string;quantity:number;price_cents:number;kind:string}[];total_cents:number;buyer_name:string;contact:string;note:string;created_at:string;revision:number};
export const money=(cents:number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(cents/100);
