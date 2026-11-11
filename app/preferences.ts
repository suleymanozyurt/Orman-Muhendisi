export type Preferences={language:"auto"|"tr"|"en";theme:"system"|"light"|"dark";automaticLanguage:"tr"|"en";country:string};
export function automaticLanguage(country:string,locale:string):"tr"|"en"{return country&&country!=="XX"&&/^[A-Z]{2}$/.test(country)?country==="TR"?"tr":"en":locale.toLowerCase().startsWith("tr")?"tr":"en";}
