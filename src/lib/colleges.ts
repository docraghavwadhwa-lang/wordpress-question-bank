import directory from "./college-directory.json";

export const COLLEGE_LOCATIONS = [...new Set(directory.map(row => row.state))].sort();
export function collegesForState(state: string, search = "") {
  const term = search.trim().toLocaleLowerCase();
  return directory.filter(row => row.state === state && row.name.toLocaleLowerCase().includes(term));
}
export function isListedCollege(state: string, name: string) {
  return directory.some(row => row.state === state && row.name === name);
}