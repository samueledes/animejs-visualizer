import { useCallback, useState } from 'react';
import { useEditor } from '../store/project';
import { PreviewFrame } from '../preview/PreviewFrame';
import { ModelStage } from '../autore3d/ModelStage';
import type { ModelLayer } from '../schema/types';

/**
 * Il riquadro centrale ha due ruoli, e sono dichiarati.
 *
 * ANTEPRIMA: l'artefatto esportato in un iframe. È l'unica cosa che dice come
 * si muoverà davvero, perché è letteralmente ciò che esporterai.
 *
 * MODO AUTORE: si apre selezionando un piano modello. Serve a girare intorno
 * al pezzo e comporlo; non racconta il movimento sullo scroll.
 *
 * La striscia in alto dice sempre in quale dei due sei. Senza, sarebbero due
 * rendering che sembrano la stessa cosa — esattamente il problema che
 * l'anteprima in iframe è servita a togliere.
 */
export function Viewport() {
  const state = useEditor((s) => s.project);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const [meshes, setMeshes] = useState<string[]>([]);

  const selezionato = state.layers.find((l) => l.id === selectedId);
  const modello = selezionato?.type === 'model' ? (selezionato as ModelLayer) : null;

  const onMeshes = useCallback((nomi: string[]) => setMeshes(nomi), []);

  return (
    <main className="tavola">
      <div className="tavola__foglio">
        {modello ? (
          <>
            <div className="modo modo--autore">
              <span className="modo__nome">Modo autore — {modello.name}</span>
              <span className="modo__nota">
                {meshes.length === 0
                  ? 'carico il modello…'
                  : meshes.length === 1
                    ? '1 pezzo'
                    : `${meshes.length} pezzi`}
              </span>
              <button type="button" className="modo__esci" onClick={() => select(null)}>
                Torna all'anteprima
              </button>
            </div>
            <ModelStage layer={modello} onMeshes={onMeshes} />
          </>
        ) : state.layers.length === 0 ? (
          <p className="tavola__vuota">L'anteprima si popola man mano che aggiungi piani.</p>
        ) : (
          <PreviewFrame state={state} />
        )}
      </div>
    </main>
  );
}
