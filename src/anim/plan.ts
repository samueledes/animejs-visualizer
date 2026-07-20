import type { Layer, ProjectState, ScrollSync } from '../schema/types';

/**
 * Il piano di animazione: la traduzione dello stato in termini che anime.js
 * capisce, PRIMA di decidere se finirà in un'animazione viva o in una stringa
 * di codice.
 *
 * Esiste per un motivo solo: l'anteprima e l'export devono produrre lo stesso
 * movimento. Se ognuno si ricavasse le animazioni per conto suo, prima o poi
 * divergerebbero e il preview smetterebbe di dire la verità sull'esportato.
 * Qui la derivazione avviene una volta; preview ed exporter sono due modi di
 * leggere lo stesso piano.
 */

/** L'id DOM di un piano. Condiviso: stesso id nell'editor e nell'export. */
export function domId(layer: Layer): string {
  return `piano-${layer.id}`;
}

/**
 * Corsa scrollabile, in vh.
 *
 * Una pagina alta 300vh ne mostra 100 alla volta, quindi se ne scorrono 200.
 * È questa la distanza su cui si distribuisce il movimento, non l'altezza
 * totale — sbagliare qui fa muovere tutto del 50% in più.
 */
export function corsaVh(state: ProjectState): number {
  return Math.max(0, state.scroll.height - 100);
}

/**
 * Il valore da passare a `sync`, come valore vivo (per l'anteprima).
 * Vedi ScrollSync in schema/types.ts per il perché delle quattro forme.
 */
export function syncValue(sync: ScrollSync): true | number | string {
  switch (sync.mode) {
    case 'sync':
      // `true` e `1` sono equivalenti: passando 1, l'osservatore memorizza
      // `sync: true`. Usiamo `true` perché è la forma con cui i docs mostrano
      // lo scrubbing.
      return true;
    case 'smooth':
      return sync.amount;
    case 'eased':
      return sync.ease;
  }
}

/** Lo stesso valore, ma come sorgente JavaScript leggibile (per l'export). */
export function syncSource(sync: ScrollSync): string {
  switch (sync.mode) {
    case 'sync':
      return 'true';
    case 'smooth':
      return String(sync.amount);
    case 'eased':
      return `'${sync.ease}'`;
  }
}

/**
 * Soglie condivise da TUTTI i piani.
 *
 * Sono obbligatorie, non un rifinimento. Senza `target` ed `enter`/`leave`
 * espliciti, anime.js calcola per ogni animazione una finestra di trigger
 * basata sulla posizione del SUO elemento: piani con offset verticali diversi
 * riceverebbero finestre diverse e si muoverebbero a fasi diverse a parità di
 * scroll. Il parallax richiede l'opposto — un'unica corsa condivisa.
 *
 * Il bersaglio è l'elemento .corsa (l'intera altezza scrollabile):
 *   'top top'       → progresso 0 quando la corsa comincia
 *   'bottom bottom' → progresso 1 quando la corsa finisce
 */
export const SOGLIA_ENTRATA = 'top top';
export const SOGLIA_USCITA = 'bottom bottom';
/** La classe dell'elemento che fa da bersaglio comune, uguale in editor ed export. */
export const CLASSE_CORSA = 'corsa';

export type Traccia = {
  layer: Layer;
  domId: string;
  /**
   * Frazione della corsa percorsa dal piano: è speedY.
   * 1 = si sposta quanto lo scroll (sembra incollato al documento),
   * 0 = non si sposta (sembra incollato allo schermo).
   */
  drift: number;
  ease: string;
};

export function tracce(state: ProjectState): Traccia[] {
  return [...state.layers]
    .sort((a, b) => a.z - b.z)
    .map((layer) => ({
      layer,
      domId: domId(layer),
      drift: layer.parallax.speedY,
      ease: layer.scrollAnim?.ease ?? 'linear',
    }));
}

/**
 * Spostamento a fine corsa.
 *
 * L'unità cambia fra i due consumatori e non è un dettaglio: l'anteprima vive
 * in un riquadro che NON è alto quanto la finestra, quindi lì "vh" mentirebbe
 * e va usato il pixel misurato sul contenitore. L'export vive nella finestra e
 * usa vh, che regge il ridimensionamento senza ricalcoli.
 */
export function spostamentoPx(drift: number, corsaPx: number): number {
  return -drift * corsaPx;
}

export function spostamentoVh(drift: number, vh: number): string {
  return `${(-drift * vh).toFixed(2)}vh`;
}
