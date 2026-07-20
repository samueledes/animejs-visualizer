import JSZip from 'jszip';
// Il bundle di anime.js viene incluso nello ZIP come testo, così l'esportato
// gira aprendo index.html senza rete e senza npm.
//
// ATTENZIONE per l'export 3D (Fase 2): questo bundle NON contiene l'adapter
// Three. Vedi HANDOFF §8 — lì servirà spedire l'albero modulare, mai i due
// insieme, altrimenti si creano due registry disgiunti.
import animeSource from '../../node_modules/animejs/dist/bundles/anime.esm.min.js?raw';
import { stateToSources } from './generate';
import type { ProjectState } from '../schema/types';

export async function buildZip(state: ProjectState): Promise<Blob> {
  const zip = new JSZip();
  for (const [nome, contenuto] of Object.entries(stateToSources(state))) {
    zip.file(nome, contenuto);
  }
  zip.folder('lib')!.file('anime.esm.min.js', animeSource);
  return zip.generateAsync({ type: 'blob' });
}

export async function scaricaZip(state: ProjectState, nome = 'parallax.zip') {
  const blob = await buildZip(state);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export { animeSource };
