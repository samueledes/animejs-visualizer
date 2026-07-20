import { byDepth, useEditor } from '../store/project';
import type { Layer } from '../schema/types';

/**
 * Anteprima. Ogni piano si sposta di -(scroll × velocità × corsa):
 * velocità diverse a parità di scroll producono la profondità.
 *
 * NOTA: qui il movimento è calcolato a mano, non da anime.js. L'anteprima
 * vera guidata da anime.js + onScroll è la milestone §6.5 dell'HANDOFF —
 * quando arriverà, questo componente cambia motore ma non contratto: legge
 * sempre e solo lo store.
 */
export function Viewport() {
  const layers = useEditor((s) => s.project.layers);
  const canvas = useEditor((s) => s.project.canvas);
  const scrollPos = useEditor((s) => s.scrollPos);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);

  return (
    <main className="tavola">
      <div className="tavola__foglio" style={{ background: canvas.background }}>
        {byDepth(layers).map((l) => (
          <Piano
            key={l.id}
            layer={l}
            scrollPos={scrollPos}
            selezionato={l.id === selectedId}
            onSelect={() => select(l.id)}
          />
        ))}
        {layers.length === 0 && (
          <p className="tavola__vuota">L'anteprima si popola man mano che aggiungi piani.</p>
        )}
      </div>
    </main>
  );
}

function Piano({
  layer,
  scrollPos,
  selezionato,
  onSelect,
}: {
  layer: Layer;
  scrollPos: number;
  selezionato: boolean;
  onSelect: () => void;
}) {
  const corsa = 420; // px di escursione a scroll pieno, con velocità 1
  const riposo = layer.transform?.y ?? 0;
  const x = layer.transform?.x ?? 0;
  const y = riposo - scrollPos * layer.parallax.speedY * corsa;

  return (
    <div
      className={`piano-vp${selezionato ? ' piano-vp--sel' : ''}`}
      style={{
        transform: `translate(${x}px, ${y.toFixed(1)}px)`,
        zIndex: layer.z,
      }}
      onClick={onSelect}
    >
      {/* Il riquadro di selezione sta sul contenuto, non sul piano: il piano
          occupa tutto il foglio, quindi contornarlo direbbe che è selezionato
          l'intero foglio. */}
      {layer.type === 'text' && (
        <span
          className="piano-vp__corpo"
          style={{
            fontSize: layer.style.fontSize,
            fontWeight: layer.style.fontWeight,
            color: layer.style.color,
          }}
        >
          {layer.content}
        </span>
      )}
    </div>
  );
}
