const IGNORED_WORDS = new Set([
  "bv",
  "nv",
  "vof",
  "cv",
  "ltd",
  "limited",
  "gmbh",
  "sarl",
  "inc",
  "llc",
  "and",
  "the",
  "van",
  "der",
  "den",
  "het",
  "inz",
  "inzake",
  "stichting",
  "nederland",
  "netherlands",
  "europe",
  "international",
  "internationaal",
  "holding",
  "group",
  "services",
  "payments",
  "payment",
  "bank",
  "store",
  "shop",
  "online",
]);
const LEGAL_FORMS = new Set(["bv", "nv", "vof", "cv"]);

function words(name: string) {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word && !LEGAL_FORMS.has(word) && !/^\d+$/.test(word));
}

export function payeeName(name: string) {
  const plain = name.trim().replace(/\s+/g, " ").toLowerCase();
  const payee = plain.split(/\s(?:via|by)\s/)[0];
  const result = words(payee).join(" ");
  return result || plain;
}

function signature(payee: string) {
  return {
    compact: payee.replace(/\s/g, ""),
    words: new Set(payee.split(" ").filter((word) => word.length >= 3 && !IGNORED_WORDS.has(word))),
  };
}

function samePayee(a: ReturnType<typeof signature>, b: ReturnType<typeof signature>) {
  if (a.compact === b.compact) return true;
  for (const word of a.words) if (b.words.has(word)) return true;
  return false;
}

export function payeeClusters(payees: string[]) {
  const unique = [...new Set(payees)];
  const signatures = unique.map(signature);
  const parent = unique.map((_, index) => index);
  const root = (index: number): number => {
    if (parent[index] !== index) parent[index] = root(parent[index]);
    return parent[index];
  };
  for (let a = 0; a < unique.length; a++)
    for (let b = a + 1; b < unique.length; b++) if (samePayee(signatures[a], signatures[b])) parent[root(b)] = root(a);
  return new Map(unique.map((payee, index) => [payee, unique[root(index)]]));
}
