/**
 * ProjectState — l'unica fonte di verità.
 *
 * L'editor muta SOLO questo. L'exporter legge SOLO questo.
 * Ogni campo qui dentro deve essere serializzabile in JSON: è anche il formato
 * del file .parallax.json (salva/carica). Niente Blob, niente funzioni, niente
 * riferimenti a nodi DOM — gli asset stanno nell'asset-store e qui si citano per id.
 */

export const SCHEMA_VERSION = 4 as const;

/**
 * Modo di sincronizzazione con lo scroll.
 *
 * anime.js accetta quattro forme diverse sulla stessa chiave `sync`, che fanno
 * cose molto diverse. Le teniamo come unione discriminata e lasciamo la
 * traduzione al literal all'exporter (vedi exporter/emitScroll.ts):
 *
 *   { mode: 'sync' }                 → sync: true          scrub 1:1
 *   { mode: 'smooth', amount: .25 }  → sync: 0.25          insegue con ritardo
 *   { mode: 'eased', ease: 'inOutCirc' } → sync: 'inOutCirc'   scrub con easing
 *
 * Il quarto valore che anime.js accetta — una stringa di nomi di metodo tipo
 * 'play pause' — NON è scrubbing: fa partire e fermare l'animazione alle soglie.
 * È anche il DEFAULT di anime.js, quindi `sync` va sempre emesso esplicitamente:
 * ometterlo fa partire l'animazione a tempo e il parallax sembra rotto.
 */
export type ScrollSync =
  | { mode: 'sync' }
  | { mode: 'smooth'; amount: number } // 0..1
  | { mode: 'eased'; ease: string };

export type ProjectState = {
  version: typeof SCHEMA_VERSION;
  canvas: {
    width: number;
    height: number;
    background: string; // css color
  };
  scroll: {
    height: number; // altezza totale scrollabile, in vh
    sync: ScrollSync;
  };
  layers: Layer[];
};

export type LayerType = 'text' | 'image' | 'svg' | 'model';

/**
 * Soglia di scroll di anime.js: stringa a due token,
 * "<soglia-container> <soglia-target>".
 * Ogni token: percentuale ('80%'), px ('50', '-25'), unità ('15rem'),
 * keyword ('top' | 'bottom' | 'min' | 'max'), o keyword con offset ('top+=60').
 */
export type ScrollThreshold = string;

export type BaseLayer = {
  id: string;
  name: string;
  type: LayerType;
  /** Ordine di stacking e profondità concettuale. Più alto = più vicino. */
  z: number;
  /**
   * Quanto il layer si muove rispetto allo scroll.
   * 1 = segue lo scroll, 0 = fermo, >1 più veloce (sembra vicino),
   * <0 controparallasse (si muove in direzione opposta).
   */
  parallax: { speedY: number; speedX?: number };
  /** Animazione from→to su una finestra di scroll. */
  scrollAnim?: ScrollAnim;
  transform?: { x?: number; y?: number; rotate?: number; scale?: number };
};

export type ScrollAnim = {
  enter: ScrollThreshold;
  leave: ScrollThreshold;
  /** es. { translateY: [0, -200], opacity: [0, 1] } */
  props: Record<string, [number, number]>;
  ease?: string;
};

export type TextLayer = BaseLayer & {
  type: 'text';
  content: string;
  style: TextStyle;
};

export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  letterSpacing?: number;
  lineHeight?: number;
};

export type ImageLayer = BaseLayer & {
  type: 'image';
  /** id nell'asset-store, non un URL. L'export lo riscrive a path relativo. */
  src: string;
};

export type SvgLayer = BaseLayer & {
  type: 'svg';
  markup: string;
};

export type ModelLayer = BaseLayer & {
  type: 'model';
  /** id nell'asset-store del .glb */
  src: string;
  camera?: { fov: number; position: [number, number, number] };
  /**
   * Vista esplosa: offset per mesh a "esplosione piena".
   * Movimento, non deformazione — funziona con qualsiasi .glb.
   */
  explode?: {
    offsets: Record<string, [number, number, number]>; // meshName → offset
    enter: ScrollThreshold;
    leave: ScrollThreshold;
  };
  spin?: {
    axis: 'x' | 'y' | 'z';
    /** In GRADI: l'adapter Three di anime.js converte lui in radianti. */
    from: number;
    to: number;
    enter: ScrollThreshold;
    leave: ScrollThreshold;
  };
};

export type Layer = TextLayer | ImageLayer | SvgLayer | ModelLayer;

export function createEmptyProject(): ProjectState {
  return {
    version: SCHEMA_VERSION,
    canvas: { width: 1440, height: 900, background: '#0b0b0f' },
    scroll: { height: 300, sync: { mode: 'sync' } },
    layers: [],
  };
}
