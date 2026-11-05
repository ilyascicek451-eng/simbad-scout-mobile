/** Turns what the user typed in the country box ("TR", "tr", "Türkiye", "Fransa", "Germany") into an ISO code. */
const NAMES: Record<string, string> = {
  turkiye: "TR", turkey: "TR", almanya: "DE", germany: "DE", fransa: "FR", france: "FR",
  ingiltere: "GB", "birlesik krallik": "GB", uk: "GB", "united kingdom": "GB", abd: "US", amerika: "US",
  "amerika birlesik devletleri": "US", usa: "US", "united states": "US", hollanda: "NL", netherlands: "NL",
  italya: "IT", italy: "IT", ispanya: "ES", spain: "ES", polonya: "PL", poland: "PL", isvec: "SE", sweden: "SE",
  avusturya: "AT", austria: "AT", belcika: "BE", belgium: "BE", isvicre: "CH", switzerland: "CH",
  portekiz: "PT", portugal: "PT", yunanistan: "GR", greece: "GR", japonya: "JP", japan: "JP",
  kanada: "CA", canada: "CA", avustralya: "AU", australia: "AU", brezilya: "BR", brazil: "BR",
  meksika: "MX", mexico: "MX", romanya: "RO", romania: "RO", macaristan: "HU", hungary: "HU",
  cekya: "CZ", czechia: "CZ", danimarka: "DK", denmark: "DK", norvec: "NO", norway: "NO",
  finlandiya: "FI", finland: "FI", irlanda: "IE", ireland: "IE", ukrayna: "UA", ukraine: "UA",
  "guney kore": "KR", "south korea": "KR", rusya: "RU", russia: "RU",
};

function fold(s: string): string {
  return s.trim().toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

export function toCountryCode(input: string): string | undefined {
  const raw = input.trim();
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return NAMES[fold(raw)];
}
