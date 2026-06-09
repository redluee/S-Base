export interface Kitchen {
  name: string;
  flag: string;
}

export const kitchens: Kitchen[] = [
  { name: "Amerikaans", flag: "🇺🇸" },
  { name: "Brits", flag: "🇬🇧" },
  { name: "Caribisch", flag: "🇯🇲" },
  { name: "Chinees", flag: "🇨🇳" },
  { name: "Nederlands", flag: "🇳🇱" },
  { name: "Egyptisch", flag: "🇪🇬" },
  { name: "Ethiopisch", flag: "🇪🇹" },
  { name: "Frans", flag: "🇫🇷" },
  { name: "Duits", flag: "🇩🇪" },
  { name: "Grieks", flag: "🇬🇷" },
  { name: "Indiaas", flag: "🇮🇳" },
  { name: "Indonesisch", flag: "🇮🇩" },
  { name: "Italiaans", flag: "🇮🇹" },
  { name: "Japans", flag: "🇯🇵" },
  { name: "Koreaans", flag: "🇰🇷" },
  { name: "Libanees", flag: "🇱🇧" },
  { name: "Maleisisch", flag: "🇲🇾" },
  { name: "Mexicaans", flag: "🇲🇽" },
  { name: "Marokkaans", flag: "🇲🇦" },
  { name: "Pools", flag: "🇵🇱" },
  { name: "Portugees", flag: "🇵🇹" },
  { name: "Spaans", flag: "🇪🇸" },
  { name: "Thais", flag: "🇹🇭" },
  { name: "Turks", flag: "🇹🇷" },
  { name: "Vietnamees", flag: "🇻🇳" },
];

export const kitchensByFlag: Record<string, string> = Object.fromEntries(
  kitchens.map((k) => [k.flag, k.name]),
);

export const kitchensByName: Record<string, Kitchen> = Object.fromEntries(
  kitchens.map((k) => [k.name.toLowerCase(), k]),
);

export function findKitchen(name: string): Kitchen | undefined {
  return kitchensByName[name.toLowerCase().trim()];
}

export function getFlag(name: string): string {
  return findKitchen(name)?.flag ?? "";
}
