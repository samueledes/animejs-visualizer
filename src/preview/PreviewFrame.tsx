import { useEffect, useMemo, useRef } from 'react';
import { stateToDocumentoUnico } from '../exporter/generate';
import { useAssets } from '../assets-store/store';
import { useEditor } from '../store/project';
import type { ProjectState } from '../schema/types';

/**
 * L'anteprima è l'artefatto esportato, dentro un iframe.
 *
 * Perché così e non animando direttamente nell'editor: anime.js pilotato con
 * `onScroll({ container })` su un div scrollabile non aggancia le animazioni,
 * mentre sullo scroll della finestra funziona. Invece di mantenere due strade
 * diverse — una per l'anteprima e una per l'export — l'anteprima carica il
 * documento generato e scrolla la finestra dell'iframe, che è la stessa strada
 * dell'export.
 *
 * Effetto collaterale utile: ogni modifica riesercita il generatore, quindi un
 * export rotto si vede subito invece che al momento del download.
 */
export function PreviewFrame({ state }: { state: ProjectState }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const setScroller = useEditor((s) => s.setScroller);
  const setScrollPos = useEditor((s) => s.setScrollPos);

  // Nell'anteprima un asset si raggiunge col suo object URL; nello ZIP con un
  // percorso relativo. È l'unica differenza fra i due documenti generati,
  // insieme a dove stanno le librerie (/lib qui, ./lib nello ZIP).
  const assets = useAssets((s) => s.assets);
  const documento = useMemo(
    () => stateToDocumentoUnico(state, (id) => assets[id]?.url ?? null),
    [state, assets],
  );

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const alCarico = () => {
      const w = el.contentWindow;
      const d = el.contentDocument;
      if (!w || !d) return;
      setScroller(d.scrollingElement as HTMLElement);
      w.addEventListener('scroll', () => {
        const de = d.scrollingElement;
        if (!de) return;
        const max = de.scrollHeight - de.clientHeight;
        setScrollPos(max > 0 ? de.scrollTop / max : 0);
      });
    };
    el.addEventListener('load', alCarico);
    return () => el.removeEventListener('load', alCarico);
  }, [setScroller, setScrollPos]);

  return (
    <iframe
      ref={frame}
      className="tavola__frame"
      title="Anteprima dell'animazione"
      srcDoc={documento}
    />
  );
}
