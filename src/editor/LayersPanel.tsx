import { byDepth, useEditor } from '../store/project';

/**
 * Elenco dei piani, dal più vicino al più lontano (come li vedi guardando
 * la scena di fronte).
 *
 * Il numero nel ballon è la QUOTA z, non la posizione in lista: è un dato,
 * non un contatore. Sposta un piano in profondità e il numero cambia, perché
 * è cambiata la profondità.
 */
export function LayersPanel() {
  const layers = useEditor((s) => s.project.layers);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const addText = useEditor((s) => s.addText);

  const dallAltoAlBasso = byDepth(layers).reverse();

  return (
    <aside className="rail rail--sx">
      <h2 className="rail__titolo">Piani</h2>

      {layers.length === 0 ? (
        <p className="vuoto">
          Nessun piano sulla tavola. Aggiungine uno per iniziare a comporre la profondità.
        </p>
      ) : (
        <ul className="piani">
          {dallAltoAlBasso.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className={`piano${l.id === selectedId ? ' piano--attivo' : ''}`}
                onClick={() => select(l.id)}
                aria-pressed={l.id === selectedId}
              >
                <span className="piano__ballon" aria-label={`quota ${l.z}`}>
                  {l.z}
                </span>
                <span className="piano__nome">{l.name}</span>
                <span className="piano__vel">
                  {l.parallax.speedY.toFixed(2)}
                  <span className="unita">×</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="azione" onClick={addText}>
        Aggiungi testo
      </button>
    </aside>
  );
}
