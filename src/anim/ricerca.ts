import { EASING, type VoceEase } from './catalogo';

/**
 * La ricerca dell'indice.
 *
 * Sottostringa, non fuzzy. Su una quarantina di nomi tecnici quasi identici
 * fra loro ("inOutQuart" contro "outInQuart") il fuzzy produce più rumore che
 * aiuto, e soprattutto non è verificabile: non sapresti dire se un risultato
 * strano è un bug o il punteggio che fa il suo mestiere.
 */

/** Accenti via, minuscolo. Serve davvero: le descrizioni sono piene di "metà", "già", "più". */
export const normalizza = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** "inOutCubic" → "in out cubic", così "out cubic" trova la voce senza fuzzy. */
export const spezzaCamel = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2');

type Indicizzata = {
  voce: VoceEase;
  posizione: number;
  nomeNorm: string;
  spezzatoNorm: string;
  aliasNorm: string;
  descrNorm: string;
};

const INDICE: Indicizzata[] = EASING.map((voce, posizione) => ({
  voce,
  posizione,
  nomeNorm: normalizza(voce.nome),
  spezzatoNorm: normalizza(spezzaCamel(voce.nome)),
  aliasNorm: normalizza(voce.alias.join(' ')),
  descrNorm: normalizza(`${voce.cosaFa} ${voce.quando} ${voce.famiglia}`),
}));

/**
 * Punteggio di un singolo token. Più basso = più pertinente.
 * Restituisce null se il token non trova niente: serve per l'AND fra token.
 */
function rango(i: Indicizzata, t: string): number | null {
  if (i.nomeNorm === t) return 0;
  if (i.nomeNorm.startsWith(t)) return 1;
  // Confine di parola nel nome spezzato: "out" trova "inOutCubic" ma dopo
  // chi ce l'ha in testa.
  if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(i.spezzatoNorm)) return 2;
  if (i.nomeNorm.includes(t)) return 3;
  if (i.aliasNorm.includes(t)) return 4;
  if (i.descrNorm.includes(t)) return 5;
  return null;
}

export type Risultato = { voce: VoceEase; rango: number };

/**
 * Filtra e ordina.
 *
 * Tutti i token devono trovare qualcosa (AND), ma ognuno può trovarlo in un
 * campo diverso: "molla rimbalzo" non deve dare risultati, "out molla" sì.
 *
 * A parità di rango l'ordine è quello del catalogo, non alfabetico: le
 * famiglie restano in ordine di durezza crescente, che è l'ordine in cui si
 * imparano. Ed è stabile, quindi verificabile.
 */
export function cerca(query: string): Risultato[] {
  const token = normalizza(query).split(/\s+/).filter(Boolean);
  if (token.length === 0) return INDICE.map((i) => ({ voce: i.voce, rango: 0 }));

  const trovati: Array<{ i: Indicizzata; r: number }> = [];
  for (const i of INDICE) {
    let peggiore = 0;
    let tutti = true;
    for (const t of token) {
      const r = rango(i, t);
      if (r === null) {
        tutti = false;
        break;
      }
      peggiore = Math.max(peggiore, r);
    }
    if (tutti) trovati.push({ i, r: peggiore });
  }

  trovati.sort((a, b) => a.r - b.r || a.i.posizione - b.i.posizione);
  return trovati.map(({ i, r }) => ({ voce: i.voce, rango: r }));
}

/**
 * I tratti da evidenziare in un testo.
 *
 * Gli indici sono calcolati sul testo ORIGINALE, non sul normalizzato: gli
 * accenti hanno lunghezze diverse nelle due forme e l'evidenziazione
 * scivolerebbe di un carattere su ogni "à" che incontra.
 */
export function tratti(testo: string, query: string): Array<[number, number]> {
  const token = normalizza(query).split(/\s+/).filter(Boolean);
  if (token.length === 0) return [];

  // NFD può espandere un carattere in due: costruisco la mappa posizione
  // normalizzata → posizione originale invece di assumere che coincidano.
  const mappa: number[] = [];
  let norm = '';
  for (let k = 0; k < testo.length; k++) {
    const pezzo = normalizza(testo[k]);
    for (let j = 0; j < pezzo.length; j++) mappa.push(k);
    norm += pezzo;
  }

  const trovati: Array<[number, number]> = [];
  for (const t of token) {
    let da = 0;
    for (;;) {
      const p = norm.indexOf(t, da);
      if (p === -1) break;
      const inizio = mappa[p];
      const fine = (mappa[p + t.length - 1] ?? mappa[mappa.length - 1]) + 1;
      trovati.push([inizio, fine]);
      da = p + t.length;
    }
  }

  // Fusione dei tratti sovrapposti, altrimenti due token vicini produrrebbero
  // <mark> annidati.
  trovati.sort((a, b) => a[0] - b[0]);
  const uniti: Array<[number, number]> = [];
  for (const [a, b] of trovati) {
    const ultimo = uniti[uniti.length - 1];
    if (ultimo && a <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], b);
    else uniti.push([a, b]);
  }
  return uniti;
}
