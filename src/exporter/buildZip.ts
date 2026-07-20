import JSZip from 'jszip';
// Il bundle di anime.js viene incluso nello ZIP come testo, così l'esportato
// gira aprendo index.html senza rete e senza npm.
//
// ATTENZIONE per l'export 3D (Fase 2): questo bundle NON contiene l'adapter
// Three. Vedi HANDOFF §8 — lì servirà spedire l'albero modulare, mai i due
// insieme, altrimenti si creano due registry disgiunti.
import animeSource from '../../node_modules/animejs/dist/bundles/anime.esm.min.js?raw';
import { stateToSources } from './generate';
import { nomeInExport, type Asset } from '../assets-store/store';
import type { ProjectState } from '../schema/types';

/** Gli asset citati dai piani del progetto, senza quelli rimasti orfani. */
export function assetUsati(state: ProjectState, assets: Record<string, Asset>): Asset[] {
  const id = new Set(
    state.layers.flatMap((l) => (l.type === 'image' || l.type === 'model' ? [l.src] : [])),
  );
  return [...id].map((i) => assets[i]).filter((a): a is Asset => !!a);
}

export async function buildZip(state: ProjectState, assets: Record<string, Asset>): Promise<Blob> {
  const usati = assetUsati(state, assets);
  const percorsi = new Map(usati.map((a) => [a.id, `./assets/${nomeInExport(a)}`]));

  const zip = new JSZip();
  for (const [nome, contenuto] of Object.entries(
    stateToSources(state, (id) => percorsi.get(id) ?? null),
  )) {
    zip.file(nome, contenuto);
  }
  zip.folder('lib')!.file('anime.esm.min.js', animeSource);

  if (usati.length > 0) {
    const cartella = zip.folder('assets')!;
    for (const a of usati) cartella.file(nomeInExport(a), a.blob);
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function scaricaZip(
  state: ProjectState,
  assets: Record<string, Asset>,
  nome = 'parallax.zip',
) {
  const blob = await buildZip(state, assets);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export { animeSource };
