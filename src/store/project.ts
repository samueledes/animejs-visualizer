import { create } from 'zustand';
import {
  createEmptyProject,
  type ImageLayer,
  type Layer,
  type ModelLayer,
  type ProjectState,
  type ScrollAnim,
  type ScrollSync,
  type TextLayer,
} from '../schema/types';
import type { ChiaveProp } from '../anim/catalogo';

/**
 * Lo store tiene DUE cose separate, e la separazione è deliberata:
 *
 *   project  → ProjectState. È l'unica cosa che si salva nel .parallax.json
 *              e l'unica che l'exporter legge.
 *   ui       → stato dell'editor. Quale layer è selezionato, dove sta il
 *              cursore di scroll. Non si salva e non si esporta.
 *
 * Se un campo finisce nel posto sbagliato, il file salvato si sporca di stato
 * di interfaccia e l'export inizia a dipendere da cosa avevi selezionato.
 */

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${(++seq).toString().padStart(2, '0')}`;

type SeedText = {
  name: string;
  content: string;
  z: number;
  speedY: number;
  y: number;
  fontSize: number;
  color: string;
};

function makeTextLayer(seed: SeedText): TextLayer {
  return {
    id: nextId('text'),
    name: seed.name,
    type: 'text',
    z: seed.z,
    parallax: { speedY: seed.speedY },
    content: seed.content,
    style: {
      fontFamily: 'var(--face-draw)',
      fontSize: seed.fontSize,
      fontWeight: 600,
      color: seed.color,
    },
    transform: { x: 0, y: seed.y },
  };
}

/**
 * Scena di partenza: tre piani a velocità diverse, il minimo per vedere la
 * profondità.
 *
 * Partono a quote verticali distinte apposta. Impilati nello stesso punto si
 * sovrapporrebbero e il parallax non si leggerebbe: piani distanti rendono
 * visibile che si muovono a velocità diverse.
 *
 * Gli scarti di partenza sono scelti in rapporto alle velocità, non a occhio.
 * A fine corsa ogni piano si è spostato di speedY × 420 px (63 / 189 / 336):
 * se le distanze iniziali fossero più strette di quegli scarti, i piani si
 * raggiungerebbero e finirebbero sovrapposti proprio a fine corsa.
 */
function starterProject(): ProjectState {
  const p = createEmptyProject();
  p.layers = [
    makeTextLayer({
      name: 'Sfondo',
      content: 'ESP32',
      z: 0,
      speedY: 0.15,
      y: -240,
      fontSize: 92,
      color: '#39424a',
    }),
    makeTextLayer({
      name: 'Mediano',
      content: 'dal firmware',
      z: 1,
      speedY: 0.45,
      y: 20,
      fontSize: 52,
      color: '#8b98a2',
    }),
    makeTextLayer({
      name: 'Primo piano',
      content: 'al web',
      z: 2,
      speedY: 0.8,
      y: 290,
      fontSize: 68,
      color: '#e8eef2',
    }),
  ];
  return p;
}

type EditorStore = {
  project: ProjectState;
  selectedId: string | null;
  /** Posizione del cursore di scroll, 0..1. Stato di interfaccia, non di progetto. */
  scrollPos: number;
  /**
   * Il contenitore scrollabile dell'anteprima. Serve al cursore della fascia
   * inferiore per pilotarne lo scroll. È un nodo DOM: sta qui perché è stato
   * di interfaccia, e per questo non finisce mai nel file salvato.
   */
  scroller: HTMLElement | null;

  select: (id: string | null) => void;
  setScrollPos: (v: number) => void;
  setScroller: (el: HTMLElement | null) => void;

  addText: () => void;
  /** Crea un piano immagine che cita un asset già presente nel deposito. */
  addImage: (assetId: string, nome: string) => void;
  /** Crea un piano modello che cita un .glb già presente nel deposito. */
  addModel: (assetId: string, nome: string) => void;
  /** Sostituisce l'intero progetto. Gli asset li rimpiazza il deposito. */
  caricaProgetto: (progetto: ProjectState) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  /** Sposta un layer di un gradino in profondità. Cambia z, non l'ordine in lista. */
  nudgeDepth: (id: string, delta: 1 | -1) => void;

  /** Accende o spegne l'animazione sullo scroll di un piano. */
  toggleScrollAnim: (id: string) => void;
  aggiornaScrollAnim: (id: string, patch: Partial<ScrollAnim>) => void;
  /** Accende, spegne o modifica una singola proprietà animata. */
  setProp: (id: string, chiave: ChiaveProp, coppia: [number, number] | null) => void;

  /** Modifica la rotazione sullo scroll di un piano modello. */
  aggiornaSpin: (id: string, patch: Partial<NonNullable<ModelLayer['spin']>>) => void;

  setAltezzaCorsa: (vh: number) => void;
  setSync: (sync: ScrollSync) => void;
  setSfondo: (colore: string) => void;
};

const ANIM_PREDEFINITA: ScrollAnim = {
  inizio: 0.1,
  fine: 0.6,
  props: { opacity: [0, 1] },
  ease: 'outExpo',
};

export const useEditor = create<EditorStore>((set) => ({
  project: starterProject(),
  selectedId: null,
  scrollPos: 0,
  scroller: null,

  select: (id) => set({ selectedId: id }),
  setScrollPos: (v) => set({ scrollPos: Math.min(1, Math.max(0, v)) }),
  setScroller: (el) => set({ scroller: el }),

  addImage: (assetId, nome) =>
    set((s) => {
      const z = s.project.layers.reduce((max, l) => Math.max(max, l.z), -1) + 1;
      const layer: ImageLayer = {
        id: nextId('img'),
        name: nome,
        type: 'image',
        z,
        parallax: { speedY: 0.4 },
        src: assetId,
        transform: { x: 0, y: 0 },
      };
      return {
        project: { ...s.project, layers: [...s.project.layers, layer] },
        selectedId: layer.id,
      };
    }),

  addModel: (assetId, nome) =>
    set((s) => {
      const z = s.project.layers.reduce((max, l) => Math.max(max, l.z), -1) + 1;
      const layer: ModelLayer = {
        id: nextId('mdl'),
        name: nome,
        type: 'model',
        z,
        // Un modello 3D non fa parallax come un piano piatto: la scena resta
        // ferma e a muoversi sono camera e pezzi. Parte a zero.
        parallax: { speedY: 0 },
        src: assetId,
        camera: { fov: 45, position: [0, 0, 6] },
        // Un giro completo sull'asse Y lungo tutta la corsa: è la cosa più
        // semplice guidata dallo scroll (§6) e fa sì che un modello appena
        // importato mostri subito di essere agganciato allo scroll.
        spin: { axis: 'y', from: 0, to: 360, inizio: 0, fine: 1, ease: 'linear' },
      };
      return {
        project: { ...s.project, layers: [...s.project.layers, layer] },
        selectedId: layer.id,
      };
    }),

  caricaProgetto: (progetto) => set({ project: progetto, selectedId: null, scrollPos: 0 }),

  addText: () =>
    set((s) => {
      const z = s.project.layers.reduce((max, l) => Math.max(max, l.z), -1) + 1;
      const layer = makeTextLayer({
        name: `Piano ${z}`,
        content: 'Testo',
        z,
        speedY: 0.4,
        y: 0,
        fontSize: 56,
        color: '#e8eef2',
      });
      return {
        project: { ...s.project, layers: [...s.project.layers, layer] },
        selectedId: layer.id,
      };
    }),

  removeLayer: (id) =>
    set((s) => ({
      project: { ...s.project, layers: s.project.layers.filter((l) => l.id !== id) },
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  updateLayer: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
      },
    })),

  toggleScrollAnim: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) =>
          l.id === id
            ? { ...l, scrollAnim: l.scrollAnim ? undefined : { ...ANIM_PREDEFINITA } }
            : l,
        ),
      },
    })),

  aggiornaScrollAnim: (id, patch) => set((s) => conAnim(s, id, (a) => ({ ...a, ...patch }))),

  setProp: (id, chiave, coppia) =>
    set((s) =>
      conAnim(s, id, (a) => {
        const props = { ...a.props };
        if (coppia === null) delete props[chiave];
        else props[chiave] = coppia;
        return { ...a, props };
      }),
    ),

  aggiornaSpin: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) =>
          l.id === id && l.type === 'model' && l.spin
            ? { ...l, spin: { ...l.spin, ...patch } }
            : l,
        ),
      },
    })),

  setAltezzaCorsa: (vh) =>
    set((s) => ({
      // Sotto 101vh non resterebbe niente da scorrere e ogni animazione
      // sarebbe già finita al caricamento.
      project: { ...s.project, scroll: { ...s.project.scroll, height: Math.max(101, vh) } },
    })),

  setSync: (sync) =>
    set((s) => ({ project: { ...s.project, scroll: { ...s.project.scroll, sync } } })),

  setSfondo: (colore) =>
    set((s) => ({ project: { ...s.project, canvas: { ...s.project.canvas, background: colore } } })),

  nudgeDepth: (id, delta) =>
    set((s) => {
      const layers = s.project.layers;
      const layer = layers.find((l) => l.id === id);
      if (!layer) return s;
      const target = layer.z + delta;
      if (target < 0 || target > layers.length - 1) return s;
      // Scambio di quota con il piano che occupa già quella profondità.
      return {
        project: {
          ...s.project,
          layers: layers.map((l) => {
            if (l.id === id) return { ...l, z: target };
            if (l.z === target) return { ...l, z: layer.z };
            return l;
          }),
        },
      };
    }),
}));

/** Applica una modifica al solo scrollAnim di un piano, se ce l'ha. */
function conAnim(
  s: { project: ProjectState },
  id: string,
  f: (a: ScrollAnim) => ScrollAnim,
): { project: ProjectState } {
  return {
    project: {
      ...s.project,
      layers: s.project.layers.map((l) =>
        l.id === id && l.scrollAnim ? { ...l, scrollAnim: f(l.scrollAnim) } : l,
      ),
    },
  };
}

/** I layer ordinati dal piano più lontano al più vicino. */
export const byDepth = (layers: Layer[]) => [...layers].sort((a, b) => a.z - b.z);
