import { useState } from 'react';
import { useEditor } from '../store/project';
import { scaricaZip } from '../exporter/buildZip';
import { layerNonSupportati } from '../exporter/generate';

/**
 * Cartiglio. Nel disegno tecnico è il riquadro che identifica la tavola:
 * cosa rappresenta, in che scala, a che revisione. È l'unico posto dove la
 * faccia condensata maiuscola compare — restrizione voluta.
 *
 * Ogni campo qui dentro riporta un valore vero. Un cartiglio con dati finti
 * è decorazione.
 */
export function TitleBlock() {
  const state = useEditor((s) => s.project);
  const layers = state.layers;
  const scroll = state.scroll;
  const [esito, setEsito] = useState<string | null>(null);

  const esclusi = layerNonSupportati(state);

  async function esporta() {
    setEsito('Preparo…');
    try {
      await scaricaZip(state);
      setEsito(
        esclusi.length > 0
          ? `Esportato senza ${esclusi.length} piano/i non ancora supportati`
          : 'Esportato',
      );
    } catch (e) {
      setEsito(`Export non riuscito: ${e instanceof Error ? e.message : 'errore'}`);
    }
  }

  const sync =
    scroll.sync.mode === 'smooth'
      ? `smooth ${scroll.sync.amount.toFixed(2)}`
      : scroll.sync.mode === 'eased'
        ? scroll.sync.ease
        : 'sync';

  return (
    <header className="cartiglio">
      <div className="cartiglio__nome">Editor parallax</div>
      <dl className="cartiglio__campi">
        <Campo etichetta="Piani" valore={String(layers.length)} />
        <Campo etichetta="Corsa" valore={`${scroll.height}vh`} />
        <Campo etichetta="Aggancio" valore={sync} />
      </dl>
      <div className="cartiglio__azioni">
        {esito && <span className="cartiglio__esito">{esito}</span>}
        <button type="button" className="azione" onClick={esporta} disabled={layers.length === 0}>
          Esporta ZIP
        </button>
      </div>
    </header>
  );
}

function Campo({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="campo">
      <dt className="campo__et">{etichetta}</dt>
      <dd className="campo__val">{valore}</dd>
    </div>
  );
}
