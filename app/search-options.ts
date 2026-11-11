export type SearchOption = { value: string; label: string; disabled?: boolean };
export const searchText = (value: string) => value.toLocaleLowerCase("tr").replaceAll("ı", "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const filterOptions = (options: SearchOption[], query: string) => options.filter(option => searchText(option.label).includes(searchText(query)));
