import { create } from 'zustand';

/**
 * Deposito degli asset: immagini e modelli.
 *
 * Sta FUORI da ProjectState di proposito. Un Blob non è serializzabile in JSON
 * e ProjectState è il contratto che va sul file salvato e nell'exporter: i
 * layer citano un asset per id, e chi deve disegnarlo chiede qui l'URL.
 *
 * Gli URL sono object URL creati una volta per asset e revocati solo quando
 * l'asset se ne va. Rigenerarli a ogni render farebbe ricaricare immagini e
 * modelli a ogni battuta di tastiera.
 */

export type TipoAsset = 'image' | 'model';

export type Asset = {
  id: string;
  nome: string;
  tipo: TipoAsset;
  mime: string;
  blob: Blob;
  /** Object URL vivo, per anteprima e viewport. Non finisce mai nel salvato. */
  url: string;
};

type AssetStore = {
  assets: Record<string, Asset>;
  aggiungi: (file: File, tipo: TipoAsset) => Promise<Asset>;
  aggiungiDaBlob: (id: string, nome: string, tipo: TipoAsset, mime: string, blob: Blob) => Asset;
  rimuovi: (id: string) => void;
  /** Svuota tutto e revoca gli URL. Usato quando si carica un altro progetto. */
  sostituisci: (nuovi: Asset[]) => void;
};

let seq = 0;
const nuovoId = (tipo: TipoAsset) => `${tipo}-${(++seq).toString().padStart(2, '0')}`;

function creaAsset(id: string, nome: string, tipo: TipoAsset, mime: string, blob: Blob): Asset {
  return { id, nome, tipo, mime, blob, url: URL.createObjectURL(blob) };
}

export const useAssets = create<AssetStore>((set, get) => ({
  assets: {},

  aggiungi: async (file, tipo) => {
    const asset = creaAsset(nuovoId(tipo), file.name, tipo, file.type || tipoMime(tipo), file);
    set((s) => ({ assets: { ...s.assets, [asset.id]: asset } }));
    return asset;
  },

  aggiungiDaBlob: (id, nome, tipo, mime, blob) => {
    const asset = creaAsset(id, nome, tipo, mime, blob);
    set((s) => ({ assets: { ...s.assets, [id]: asset } }));
    // Gli id caricati da file devono restare unici anche per gli asset creati
    // dopo, altrimenti un nuovo import sovrascriverebbe uno appena caricato.
    const n = Number(id.split('-').pop());
    if (Number.isFinite(n) && n > seq) seq = n;
    return asset;
  },

  rimuovi: (id) => {
    const a = get().assets[id];
    if (a) URL.revokeObjectURL(a.url);
    set((s) => {
      const assets = { ...s.assets };
      delete assets[id];
      return { assets };
    });
  },

  sostituisci: (nuovi) => {
    for (const a of Object.values(get().assets)) URL.revokeObjectURL(a.url);
    set({ assets: Object.fromEntries(nuovi.map((a) => [a.id, a])) });
  },
}));

function tipoMime(tipo: TipoAsset) {
  return tipo === 'image' ? 'image/png' : 'model/gltf-binary';
}

/** Nome del file dentro lo ZIP esportato. Deterministico: stesso id, stesso nome. */
export function nomeInExport(a: Asset): string {
  const estensione = a.nome.includes('.') ? a.nome.split('.').pop() : a.tipo === 'model' ? 'glb' : 'png';
  return `${a.id}.${estensione}`;
}
