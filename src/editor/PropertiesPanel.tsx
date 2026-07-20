import { EASINGS, PROPRIETA_ANIMABILI, type PropAnimabile } from '../anim/catalogo';
import { useEditor } from '../store/project';
import type { ScrollSync } from '../schema/types';

/**
 * Proprietà.
 *
 * Con un piano selezionato mostra le sue; senza selezione mostra quelle del
 * progetto, invece di restare vuoto. Le impostazioni di corsa e aggancio
 * riguardano tutta la tavola, quindi è lì che stanno.
 */
export function PropertiesPanel() {
  const selectedId = useEditor((s) => s.selectedId);
  return (
    <aside className="rail rail--dx">
      {selectedId ? <ProprietaPiano id={selectedId} /> : <ProprietaProgetto />}
    </aside>
  );
}

/* ---------------------------------------------------------------- progetto */

function ProprietaProgetto() {
  const scroll = useEditor((s) => s.project.scroll);
  const sfondo = useEditor((s) => s.project.canvas.background);
  const setAltezzaCorsa = useEditor((s) => s.setAltezzaCorsa);
  const setSync = useEditor((s) => s.setSync);
  const setSfondo = useEditor((s) => s.setSfondo);

  return (
    <>
      <h2 className="rail__titolo">Progetto</h2>

      <Quota etichetta="Corsa" valore={`${scroll.height}`} unita="vh" />
      <input
        className="cursore"
        type="range"
        min={150}
        max={600}
        step={10}
        value={scroll.height}
        onChange={(e) => setAltezzaCorsa(+e.target.value)}
        aria-label="Altezza della corsa"
      />
      <p className="nota">
        Quanto è alta la pagina. Con {scroll.height}vh se ne scorrono{' '}
        {scroll.height - 100}: l'ultima schermata è già in vista quando lo scroll finisce.
      </p>

      <div className="quota-riga">
        <label className="quota-riga__et" htmlFor="agg">
          Aggancio
        </label>
      </div>
      <select
        id="agg"
        className="campo-testo"
        value={scroll.sync.mode}
        onChange={(e) => setSync(sincronizzazione(e.target.value as ScrollSync['mode'], scroll.sync))}
      >
        <option value="sync">Rigido — segue lo scroll esattamente</option>
        <option value="smooth">Morbido — insegue con ritardo</option>
        <option value="eased">Con easing — scrub addolcito</option>
      </select>

      {scroll.sync.mode === 'smooth' && (
        <>
          <Quota etichetta="Inseguimento" valore={scroll.sync.amount.toFixed(2)} />
          <input
            className="cursore"
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={scroll.sync.amount}
            onChange={(e) => setSync({ mode: 'smooth', amount: +e.target.value })}
            aria-label="Quanto insegue lo scroll"
          />
          <p className="nota">Più vicino a 0, più tardi l'animazione raggiunge lo scroll.</p>
        </>
      )}

      {scroll.sync.mode === 'eased' && (
        <SceltaEase
          id="ease-sync"
          valore={scroll.sync.ease}
          onChange={(ease) => setSync({ mode: 'eased', ease })}
        />
      )}

      <div className="quota-riga">
        <label className="quota-riga__et" htmlFor="sfondo">
          Sfondo
        </label>
        <span className="quota-riga__val">{sfondo}</span>
      </div>
      <input
        id="sfondo"
        className="campo-colore"
        type="color"
        value={sfondo}
        onChange={(e) => setSfondo(e.target.value)}
      />

      <p className="nota">Seleziona un piano per quotarlo.</p>
    </>
  );
}

function sincronizzazione(mode: ScrollSync['mode'], attuale: ScrollSync): ScrollSync {
  if (mode === 'smooth') return { mode: 'smooth', amount: attuale.mode === 'smooth' ? attuale.amount : 0.25 };
  if (mode === 'eased') return { mode: 'eased', ease: attuale.mode === 'eased' ? attuale.ease : 'inOutCirc' };
  return { mode: 'sync' };
}

/* ------------------------------------------------------------------- piano */

function ProprietaPiano({ id }: { id: string }) {
  const layer = useEditor((s) => s.project.layers.find((l) => l.id === id));
  const updateLayer = useEditor((s) => s.updateLayer);
  const nudgeDepth = useEditor((s) => s.nudgeDepth);
  const removeLayer = useEditor((s) => s.removeLayer);
  const toggleScrollAnim = useEditor((s) => s.toggleScrollAnim);

  if (!layer) return <p className="vuoto">Questo piano non c'è più.</p>;

  return (
    <>
      <h2 className="rail__titolo">{layer.name}</h2>

      <Quota etichetta="Velocità" valore={layer.parallax.speedY.toFixed(2)} unita="×" />
      <input
        className="cursore"
        type="range"
        min={-0.5}
        max={2}
        step={0.05}
        value={layer.parallax.speedY}
        onChange={(e) =>
          updateLayer(layer.id, { parallax: { ...layer.parallax, speedY: +e.target.value } })
        }
        aria-label="Velocità di parallax"
      />
      <p className="nota">
        1× segue lo scroll. Sotto 1 resta indietro e sembra lontano, sopra 1 corre e sembra
        vicino. Sotto zero va in senso opposto.
      </p>

      <Quota etichetta="Quota z" valore={String(layer.z)} />
      <div className="coppia">
        <button type="button" className="azione" onClick={() => nudgeDepth(layer.id, -1)}>
          Allontana
        </button>
        <button type="button" className="azione" onClick={() => nudgeDepth(layer.id, 1)}>
          Avvicina
        </button>
      </div>

      <label className="quota-riga__et" htmlFor="nome">
        Nome
      </label>
      <input
        id="nome"
        className="campo-testo"
        value={layer.name}
        onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
      />

      {layer.type === 'text' && (
        <>
          <label className="quota-riga__et" htmlFor="testo">
            Testo
          </label>
          <input
            id="testo"
            className="campo-testo"
            value={layer.content}
            onChange={(e) => updateLayer(layer.id, { content: e.target.value })}
          />
        </>
      )}

      {layer.type === 'model' && <EditorRotazione id={layer.id} />}

      <hr className="separatore" />

      <button
        type="button"
        className={`azione${layer.scrollAnim ? ' azione--attiva' : ''}`}
        onClick={() => toggleScrollAnim(layer.id)}
        aria-pressed={!!layer.scrollAnim}
      >
        {layer.scrollAnim ? 'Togli animazione' : 'Aggiungi animazione'}
      </button>

      {layer.scrollAnim && <EditorAnimazione id={layer.id} />}

      <hr className="separatore" />
      <button type="button" className="azione azione--togli" onClick={() => removeLayer(layer.id)}>
        Togli dalla tavola
      </button>
    </>
  );
}

/* ---------------------------------------------------------------- rotazione */

/**
 * Rotazione sullo scroll di un modello.
 *
 * I gradi restano gradi: l'adapter Three di anime.js converte lui in radianti.
 * Mostrarli in radianti qui sarebbe far trapelare un dettaglio della libreria.
 */
function EditorRotazione({ id }: { id: string }) {
  const layer = useEditor((s) => s.project.layers.find((l) => l.id === id));
  const aggiornaSpin = useEditor((s) => s.aggiornaSpin);
  const spin = layer?.type === 'model' ? layer.spin : undefined;
  if (!spin) return null;

  return (
    <div className="animazione">
      <Quota etichetta="Rotazione" valore={`${spin.to - spin.from}`} unita="°" />
      <input
        className="cursore"
        type="range"
        min={-720}
        max={720}
        step={15}
        value={spin.to}
        onChange={(e) => aggiornaSpin(id, { to: +e.target.value })}
        aria-label="Gradi di rotazione sulla corsa"
      />

      <div className="quota-riga">
        <label className="quota-riga__et" htmlFor={`asse-${id}`}>
          Asse
        </label>
      </div>
      <select
        id={`asse-${id}`}
        className="campo-testo"
        value={spin.axis}
        onChange={(e) => aggiornaSpin(id, { axis: e.target.value as 'x' | 'y' | 'z' })}
      >
        <option value="y">Y — gira come una trottola</option>
        <option value="x">X — si ribalta in avanti</option>
        <option value="z">Z — rolla di lato</option>
      </select>

      <SceltaEase
        id={`ease-spin-${id}`}
        valore={spin.ease}
        onChange={(ease) => aggiornaSpin(id, { ease })}
      />
      <p className="nota">
        Il modello non compare nel modo autore: lì si compone il pezzo. Per vederlo ruotare
        torna all'anteprima e scorri.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- animazione */

function EditorAnimazione({ id }: { id: string }) {
  const anim = useEditor((s) => s.project.layers.find((l) => l.id === id)?.scrollAnim);
  const aggiorna = useEditor((s) => s.aggiornaScrollAnim);
  const setProp = useEditor((s) => s.setProp);
  if (!anim) return null;

  return (
    <div className="animazione">
      <Quota
        etichetta="Finestra"
        valore={`${(anim.inizio * 100).toFixed(0)}–${(anim.fine * 100).toFixed(0)}`}
        unita="%"
      />
      <input
        className="cursore"
        type="range"
        min={0}
        max={0.95}
        step={0.01}
        value={anim.inizio}
        onChange={(e) => aggiorna(id, { inizio: Math.min(+e.target.value, anim.fine - 0.05) })}
        aria-label="Inizio della finestra"
      />
      <input
        className="cursore"
        type="range"
        min={0.05}
        max={1}
        step={0.01}
        value={anim.fine}
        onChange={(e) => aggiorna(id, { fine: Math.max(+e.target.value, anim.inizio + 0.05) })}
        aria-label="Fine della finestra"
      />
      <p className="nota">In quale tratto della corsa avviene l'animazione.</p>

      <SceltaEase id={`ease-${id}`} valore={anim.ease} onChange={(ease) => aggiorna(id, { ease })} />

      <p className="nota">Proprietà animate</p>
      {PROPRIETA_ANIMABILI.map((p) => (
        <RigaProprieta
          key={p.chiave}
          prop={p}
          coppia={anim.props[p.chiave]}
          onToggle={(attiva) => setProp(id, p.chiave, attiva ? [...p.predefinito] : null)}
          onChange={(coppia) => setProp(id, p.chiave, coppia)}
        />
      ))}
    </div>
  );
}

function RigaProprieta({
  prop,
  coppia,
  onToggle,
  onChange,
}: {
  prop: PropAnimabile;
  coppia: [number, number] | undefined;
  onToggle: (attiva: boolean) => void;
  onChange: (coppia: [number, number]) => void;
}) {
  const attiva = !!coppia;
  return (
    <div className={`prop${attiva ? ' prop--attiva' : ''}`}>
      <label className="prop__testa">
        <input type="checkbox" checked={attiva} onChange={(e) => onToggle(e.target.checked)} />
        <span className="prop__nome">{prop.etichetta}</span>
      </label>
      {coppia && (
        <div className="prop__valori">
          <ValoreProp
            etichetta="da"
            prop={prop}
            valore={coppia[0]}
            onChange={(v) => onChange([v, coppia[1]])}
          />
          <ValoreProp
            etichetta="a"
            prop={prop}
            valore={coppia[1]}
            onChange={(v) => onChange([coppia[0], v])}
          />
        </div>
      )}
    </div>
  );
}

function ValoreProp({
  etichetta,
  prop,
  valore,
  onChange,
}: {
  etichetta: string;
  prop: PropAnimabile;
  valore: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="valore">
      <span className="valore__et">{etichetta}</span>
      <input
        className="valore__campo"
        type="number"
        min={prop.min}
        max={prop.max}
        step={prop.passo}
        value={valore}
        onChange={(e) => onChange(+e.target.value)}
      />
      {prop.unita && <span className="unita">{prop.unita}</span>}
    </label>
  );
}

function SceltaEase({
  id,
  valore,
  onChange,
}: {
  id: string;
  valore: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <label className="quota-riga__et" htmlFor={id}>
        Easing
      </label>
      <select
        id={id}
        className="campo-testo"
        value={valore}
        onChange={(e) => onChange(e.target.value)}
      >
        {EASINGS.map((g) => (
          <optgroup key={g.gruppo} label={g.gruppo}>
            {g.nomi.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </>
  );
}

function Quota({ etichetta, valore, unita }: { etichetta: string; valore: string; unita?: string }) {
  return (
    <div className="quota-riga">
      <span className="quota-riga__et">{etichetta}</span>
      <span className="quota-riga__val">
        {valore}
        {unita && <span className="unita">{unita}</span>}
      </span>
    </div>
  );
}
