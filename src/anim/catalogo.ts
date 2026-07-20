/**
 * Cosa dell'API di anime.js l'editor mette in mano all'utente.
 *
 * Elenchi verificati contro `animejs@4.5.0` installato (`Object.keys(eases)`),
 * non ricordati: i nomi degli easing sono stringhe che finiscono nel codice
 * generato, e uno sbagliato fallisce a runtime nel file esportato, cioè dove è
 * più scomodo accorgersene.
 */

/** Proprietà che un piano può animare sulla finestra di scroll. */
export type ChiaveProp = 'opacity' | 'rotate' | 'scale' | 'translateX';

export type PropAnimabile = {
  chiave: ChiaveProp;
  etichetta: string;
  min: number;
  max: number;
  passo: number;
  unita: string;
  /** Coppia da→a proposta quando si attiva la proprietà. */
  predefinito: [number, number];
};

export const PROPRIETA_ANIMABILI: PropAnimabile[] = [
  { chiave: 'opacity', etichetta: 'Opacità', min: 0, max: 1, passo: 0.05, unita: '', predefinito: [0, 1] },
  { chiave: 'rotate', etichetta: 'Rotazione', min: -360, max: 360, passo: 1, unita: '°', predefinito: [0, 12] },
  { chiave: 'scale', etichetta: 'Scala', min: 0, max: 3, passo: 0.05, unita: '×', predefinito: [1, 1.15] },
  { chiave: 'translateX', etichetta: 'Scorrimento X', min: -600, max: 600, passo: 5, unita: 'px', predefinito: [0, 120] },
];

/**
 * Nota: `translateY` non è in elenco di proposito. È la proprietà che il
 * parallax usa già per ogni piano; lasciarla animare anche qui creerebbe due
 * animazioni in conflitto sullo stesso valore.
 */

export type GruppoEase = { gruppo: string; nomi: string[] };

/** I 46 easing della libreria, raggruppati per famiglia. */
export const EASINGS: GruppoEase[] = [
  { gruppo: 'Base', nomi: ['linear', 'in', 'out', 'inOut', 'outIn'] },
  { gruppo: 'Quad', nomi: ['inQuad', 'outQuad', 'inOutQuad', 'outInQuad'] },
  { gruppo: 'Cubic', nomi: ['inCubic', 'outCubic', 'inOutCubic', 'outInCubic'] },
  { gruppo: 'Quart', nomi: ['inQuart', 'outQuart', 'inOutQuart', 'outInQuart'] },
  { gruppo: 'Quint', nomi: ['inQuint', 'outQuint', 'inOutQuint', 'outInQuint'] },
  { gruppo: 'Sine', nomi: ['inSine', 'outSine', 'inOutSine', 'outInSine'] },
  { gruppo: 'Expo', nomi: ['inExpo', 'outExpo', 'inOutExpo', 'outInExpo'] },
  { gruppo: 'Circ', nomi: ['inCirc', 'outCirc', 'inOutCirc', 'outInCirc'] },
  { gruppo: 'Back', nomi: ['inBack', 'outBack', 'inOutBack', 'outInBack'] },
  { gruppo: 'Elastic', nomi: ['inElastic', 'outElastic', 'inOutElastic', 'outInElastic'] },
  { gruppo: 'Bounce', nomi: ['inBounce', 'outBounce', 'inOutBounce', 'outInBounce'] },
];

export const TUTTI_GLI_EASE = EASINGS.flatMap((g) => g.nomi);
