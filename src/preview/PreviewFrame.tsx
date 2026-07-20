import { useEffect, useMemo, useRef } from 'react';
// URL reale servito dall'app, non un blob: un iframe `srcdoc` non riesce a
// importare un blob creato dalla pagina madre (ERR_FILE_NOT_FOUND), mentre un
// URL di pari origine sì. Vite lo emette come asset sia in dev sia in build.
import urlAnimeAsset from '../../node_modules/animejs/dist/bundles/anime.esm.min.js?url';
import { stateToDocumentoUnico } from '../exporter/generate';
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

  // Assoluto: dentro l'iframe un percorso relativo si risolverebbe rispetto al
  // documento srcdoc, che non ha una base utile.
  const urlAnime = useMemo(() => new URL(urlAnimeAsset, location.origin).href, []);

  const documento = useMemo(() => stateToDocumentoUnico(state, urlAnime), [state, urlAnime]);

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
