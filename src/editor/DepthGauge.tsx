import { byDepth, useEditor } from '../store/project';

/**
 * Misuratore di profondità — l'elemento che rende questa tavola riconoscibile.
 *
 * I piani sono disegnati in assonometria, impilati per quota. La distanza
 * verticale fra due piani adiacenti NON è arbitraria: è proporzionale allo
 * SCARTO di velocità fra i due, ed è quotata come una misura vera.
 *
 * È la tesi del parallax messa in disegno: la profondità che percepisci non
 * viene dalla posizione dei piani, viene da quanto le loro velocità
 * differiscono. Due piani a velocità uguale sono complanari, per quanto
 * lontani li metti in z — e qui si vede, perché la quota va a zero.
 */

const W = 250;
const H = 150;
const PIANO_W = 108;
const PIANO_D = 26; // profondità apparente dell'assonometria
const SHEAR = 30;
/** Il bordo sinistro del piano più basso è X - SHEAR: la colonna delle quote
 *  vive a sinistra di quello, quindi X deve lasciarle spazio dentro il viewBox. */
const X = 82;
const MARGINE = 22;
const X_QUOTA = X - SHEAR - 12;

export function DepthGauge() {
  const layers = useEditor((s) => s.project.layers);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);

  const piani = byDepth(layers);

  if (piani.length === 0) {
    return (
      <figure className="calibro">
        <figcaption className="calibro__et">Profondità</figcaption>
        <p className="vuoto vuoto--stretto">Nessun piano da quotare.</p>
      </figure>
    );
  }

  // Scarti di velocità fra piani adiacenti: sono le quote da disegnare.
  const scarti = piani.slice(1).map((p, i) => Math.abs(p.parallax.speedY - piani[i].parallax.speedY));
  const totale = scarti.reduce((a, b) => a + b, 0);
  const utile = H - MARGINE * 2 - PIANO_D;

  // Se tutti i piani hanno la stessa velocità lo scarto totale è zero: sono
  // complanari. Li impiliamo serrati per mostrarlo invece di dividere per zero.
  const passo = totale > 0.001 ? utile / totale : 0;
  const serrati = totale <= 0.001;

  let y = MARGINE;
  const posY = piani.map((_, i) => {
    if (i > 0) y += serrati ? 7 : scarti[i - 1] * passo;
    return y;
  });

  return (
    <figure className="calibro">
      <figcaption className="calibro__et">Profondità</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="calibro__svg" role="img"
           aria-label={`${piani.length} piani, scarto di velocità totale ${totale.toFixed(2)}`}>
        {/* Piani dal più lontano al più vicino: chi è sotto si disegna prima. */}
        {piani.map((p, i) => {
          const top = posY[i];
          const attivo = p.id === selectedId;
          const pts = [
            `${X},${top}`,
            `${X + PIANO_W},${top}`,
            `${X + PIANO_W - SHEAR},${top + PIANO_D}`,
            `${X - SHEAR},${top + PIANO_D}`,
          ].join(' ');
          return (
            <g key={p.id} onClick={() => select(p.id)} className="calibro__piano">
              <polygon
                points={pts}
                className={attivo ? 'lastra lastra--attiva' : 'lastra'}
              />
              <text x={X + PIANO_W + 6} y={top + PIANO_D - 8} className="calibro__ballon">
                {p.z}
              </text>
            </g>
          );
        })}

        {/* Linea di quota: misura lo scarto fra piani adiacenti. */}
        {piani.slice(1).map((p, i) => {
          const a = posY[i] + PIANO_D / 2;
          const b = posY[i + 1] + PIANO_D / 2;
          const xq = X_QUOTA;
          const mid = (a + b) / 2;
          const scarto = scarti[i];
          return (
            <g key={`q-${p.id}`} className="calibro__quota">
              <line x1={xq} y1={a} x2={xq} y2={b} className="quota-linea" />
              <line x1={xq - 3} y1={a} x2={xq + 3} y2={a} className="quota-linea" />
              <line x1={xq - 3} y1={b} x2={xq + 3} y2={b} className="quota-linea" />
              <text x={xq - 6} y={mid + 3} className="quota-testo" textAnchor="end">
                {scarto.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
      {serrati && (
        <p className="nota nota--calibro">
          Tutti i piani hanno la stessa velocità: sono complanari e non produrranno profondità.
        </p>
      )}
    </figure>
  );
}
