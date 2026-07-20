import { useEditor } from '../store/project';

/**
 * Proprietà del piano selezionato.
 *
 * I valori numerici sono in IBM Plex Mono e allineati a destra: sono quote,
 * si leggono in colonna. L'unità sta accanto al numero in corpo minore,
 * come nelle annotazioni di una tavola.
 */
export function PropertiesPanel() {
  const layers = useEditor((s) => s.project.layers);
  const selectedId = useEditor((s) => s.selectedId);
  const updateLayer = useEditor((s) => s.updateLayer);
  const nudgeDepth = useEditor((s) => s.nudgeDepth);
  const removeLayer = useEditor((s) => s.removeLayer);

  const layer = layers.find((l) => l.id === selectedId) ?? null;

  if (!layer) {
    return (
      <aside className="rail rail--dx">
        <h2 className="rail__titolo">Proprietà</h2>
        <p className="vuoto">Seleziona un piano per quotarlo.</p>
      </aside>
    );
  }

  return (
    <aside className="rail rail--dx">
      <h2 className="rail__titolo">Proprietà</h2>

      <div className="quota-riga">
        <label className="quota-riga__et" htmlFor="vel">
          Velocità
        </label>
        <output className="quota-riga__val" htmlFor="vel">
          {layer.parallax.speedY.toFixed(2)}
          <span className="unita">×</span>
        </output>
      </div>
      <input
        id="vel"
        className="cursore"
        type="range"
        min={-0.5}
        max={2}
        step={0.05}
        value={layer.parallax.speedY}
        onChange={(e) =>
          updateLayer(layer.id, { parallax: { ...layer.parallax, speedY: +e.target.value } })
        }
      />
      <p className="nota">
        1× segue lo scroll. Sotto 1 resta indietro e sembra lontano, sopra 1 corre e sembra
        vicino. Sotto zero va in senso opposto.
      </p>

      <div className="quota-riga">
        <span className="quota-riga__et">Quota z</span>
        <span className="quota-riga__val">{layer.z}</span>
      </div>
      <div className="coppia">
        <button type="button" className="azione" onClick={() => nudgeDepth(layer.id, -1)}>
          Allontana
        </button>
        <button type="button" className="azione" onClick={() => nudgeDepth(layer.id, 1)}>
          Avvicina
        </button>
      </div>

      <div className="quota-riga">
        <label className="quota-riga__et" htmlFor="nome">
          Nome
        </label>
      </div>
      <input
        id="nome"
        className="campo-testo"
        value={layer.name}
        onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
      />

      {layer.type === 'text' && (
        <>
          <div className="quota-riga">
            <label className="quota-riga__et" htmlFor="testo">
              Testo
            </label>
          </div>
          <input
            id="testo"
            className="campo-testo"
            value={layer.content}
            onChange={(e) => updateLayer(layer.id, { content: e.target.value })}
          />
        </>
      )}

      <button type="button" className="azione azione--togli" onClick={() => removeLayer(layer.id)}>
        Togli dalla tavola
      </button>
    </aside>
  );
}
