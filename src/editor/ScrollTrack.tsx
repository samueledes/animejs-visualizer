import { byDepth, useEditor } from '../store/project';
import { DepthGauge } from './DepthGauge';

/**
 * Fascia inferiore: il misuratore di profondità a sinistra, il cursore di
 * scroll a destra.
 *
 * L'asse orizzontale è la posizione di scroll 0..1 — non il tempo. È la
 * distinzione che regge tutto il progetto: qui non si autora "a 2 secondi",
 * si autora "al 40% della corsa".
 */
export function ScrollTrack() {
  const layers = useEditor((s) => s.project.layers);
  const scrollPos = useEditor((s) => s.scrollPos);
  const setScrollPos = useEditor((s) => s.setScrollPos);
  const scroller = useEditor((s) => s.scroller);
  const selectedId = useEditor((s) => s.selectedId);

  const piani = byDepth(layers);
  const vMax = Math.max(1, ...piani.map((p) => Math.abs(p.parallax.speedY)));

  return (
    <section className="fascia">
      <DepthGauge />

      <div className="corsa">
        <div className="corsa__testa">
          <h2 className="rail__titolo rail__titolo--inline">Corsa di scroll</h2>
          <output className="corsa__lettura">
            {(scrollPos * 100).toFixed(0)}
            <span className="unita">%</span>
          </output>
        </div>

        <div className="corsa__grafico">
          {/* Tracciati: quanto ogni piano si è spostato alla posizione corrente. */}
          {/* Il tracciato di un piano parte fermo a sinistra e sale verso destra:
              la sua PENDENZA è la velocità. Piani a velocità diversa divergono,
              ed è quella divergenza che l'occhio legge come profondità. */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="corsa__svg" aria-hidden>
            {[0, 25, 50, 75, 100].map((x) => (
              <line key={x} x1={x} y1={0} x2={x} y2={100} className="riferimento" />
            ))}
            {piani.map((p) => {
              const pendenza = (p.parallax.speedY / vMax) * 84;
              return (
                <line
                  key={p.id}
                  x1={0}
                  y1={94}
                  x2={100}
                  y2={94 - pendenza}
                  className={p.id === selectedId ? 'tracciato tracciato--attivo' : 'tracciato'}
                />
              );
            })}
            <line
              x1={scrollPos * 100}
              y1={0}
              x2={scrollPos * 100}
              y2={100}
              className="cursore-linea"
            />
          </svg>
        </div>

        {/* Il cursore non tiene una posizione propria: muove lo scroll vero
            dell'anteprima, e da lì anime.js fa il resto. Un secondo stato di
            posizione accanto a quello del contenitore si disallineerebbe. */}
        <input
          className="cursore cursore--corsa"
          type="range"
          min={0}
          max={1}
          step={0.002}
          value={scrollPos}
          onChange={(e) => {
            const v = +e.target.value;
            if (scroller) {
              const max = scroller.scrollHeight - scroller.clientHeight;
              scroller.scrollTop = v * max;
            } else {
              setScrollPos(v);
            }
          }}
          aria-label="Posizione di scroll"
        />
        <div className="corsa__scala">
          <span>0</span>
          <span>fine corsa</span>
        </div>
      </div>
    </section>
  );
}
