import { useEditor } from '../store/project';
import { PreviewFrame } from '../preview/PreviewFrame';

/**
 * Anteprima.
 *
 * Il contenuto è l'artefatto esportato caricato in un iframe (vedi
 * PreviewFrame): l'editor non disegna una propria versione della scena, così
 * non può mostrare qualcosa di diverso da ciò che esporterà.
 *
 * Costo dichiarato: dentro l'iframe non c'è selezione diretta. I piani si
 * selezionano dall'elenco a sinistra o dalle lastre del misuratore di
 * profondità.
 */
export function Viewport() {
  const state = useEditor((s) => s.project);

  return (
    <main className="tavola">
      <div className="tavola__foglio">
        {state.layers.length === 0 ? (
          <p className="tavola__vuota">L'anteprima si popola man mano che aggiungi piani.</p>
        ) : (
          <PreviewFrame state={state} />
        )}
      </div>
    </main>
  );
}
