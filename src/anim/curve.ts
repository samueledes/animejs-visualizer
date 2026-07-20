import { eases } from 'animejs';

/**
 * Campiona una easing per disegnarne la curva.
 *
 * I valori li calcola anime.js, non li approssima l'editor: quella che vedi è
 * la curva che userà l'animazione. Un disegno "artistico" della curva sarebbe
 * peggio di niente — mostrerebbe con sicurezza una forma che potrebbe non
 * corrispondere.
 *
 * Nella libreria convivono due forme (verificato su animejs@4.5.0):
 *  - 34 curve DIRETTE: eases.outQuad(0.5) → 0.75
 *  - 12 FABBRICHE parametriche: eases.outBack(1.7) → (t) => number
 * Per le fabbriche si chiede la curva coi parametri di default.
 */
export function campionaEase(nome: string, punti = 32): number[] | null {
  const grezza = (eases as Record<string, unknown>)[nome];
  if (typeof grezza !== 'function') return null;

  let f: (t: number) => number;
  try {
    const prova = (grezza as (t: number) => unknown)(0.5);
    f =
      typeof prova === 'function'
        ? ((grezza as () => (t: number) => number)() as (t: number) => number)
        : (grezza as (t: number) => number);
  } catch {
    return null;
  }

  const valori: number[] = [];
  for (let i = 0; i <= punti; i++) {
    const v = f(i / punti);
    if (!Number.isFinite(v)) return null;
    valori.push(v);
  }
  return valori;
}

export type FormaCurva = {
  valori: number[];
  /** Supera il valore d'arrivo e torna indietro. */
  sfora: boolean;
  /** Indietreggia prima di partire. */
  sottoZero: boolean;
};

export function formaCurva(nome: string): FormaCurva | null {
  const valori = campionaEase(nome);
  if (!valori) return null;
  return {
    valori,
    sfora: Math.max(...valori) > 1.001,
    sottoZero: Math.min(...valori) < -0.001,
  };
}

/**
 * Il path SVG della curva, in un riquadro larghezza × altezza.
 *
 * Il dominio verticale si adatta a quanto la curva sfora: senza, `outElastic`
 * verrebbe tagliata e sembrerebbe identica a `outExpo` proprio nel punto che
 * la distingue.
 */
export function pathCurva(valori: number[], larghezza: number, altezza: number, margine = 3): string {
  const min = Math.min(0, ...valori);
  const max = Math.max(1, ...valori);
  const span = max - min || 1;
  const h = altezza - margine * 2;

  return valori
    .map((v, i) => {
      const x = (i / (valori.length - 1)) * larghezza;
      const y = margine + h - ((v - min) / span) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/** La retta di riferimento (movimento costante), per leggere la curva a colpo d'occhio. */
export function pathRiferimento(valori: number[], larghezza: number, altezza: number, margine = 3): string {
  const min = Math.min(0, ...valori);
  const max = Math.max(1, ...valori);
  const span = max - min || 1;
  const h = altezza - margine * 2;
  const y = (v: number) => margine + h - ((v - min) / span) * h;
  return `M0,${y(0).toFixed(2)} L${larghezza},${y(1).toFixed(2)}`;
}
