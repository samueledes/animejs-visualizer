import { useRef, useState } from 'react';
import { useEditor } from '../store/project';
import { useAssets } from '../assets-store/store';
import { scaricaZip } from '../exporter/buildZip';
import { layerNonSupportati } from '../exporter/generate';
import { deserializza, scarica, serializza } from '../progetto/salvaCarica';

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
  const caricaProgetto = useEditor((s) => s.caricaProgetto);
  const addImage = useEditor((s) => s.addImage);
  const assets = useAssets((s) => s.assets);
  const aggiungiAsset = useAssets((s) => s.aggiungi);
  const sostituisciAssets = useAssets((s) => s.aggiungiDaBlob);
  const svuotaAssets = useAssets((s) => s.sostituisci);

  const [esito, setEsito] = useState<string | null>(null);
  const inputProgetto = useRef<HTMLInputElement>(null);
  const inputImmagine = useRef<HTMLInputElement>(null);

  const esclusi = layerNonSupportati(state);

  async function esporta() {
    setEsito('Preparo lo ZIP…');
    try {
      await scaricaZip(state, assets);
      setEsito(
        esclusi.length > 0
          ? `Esportato, ma ${esclusi.length} piano/i non sono ancora supportati dall'export`
          : 'Esportato',
      );
    } catch (e) {
      setEsito(`Export non riuscito: ${messaggio(e)}`);
    }
  }

  async function salva() {
    setEsito('Salvo…');
    try {
      const testo = await serializza(state, Object.values(assets));
      scarica(testo);
      setEsito('Salvato');
    } catch (e) {
      setEsito(`Salvataggio non riuscito: ${messaggio(e)}`);
    }
  }

  async function apri(file: File) {
    const esitoLettura = deserializza(await file.text());
    if (!esitoLettura.ok) {
      setEsito(esitoLettura.errore);
      return;
    }
    // Prima gli asset, poi il progetto: se arrivasse prima il progetto, un
    // render intermedio cercherebbe asset non ancora nel deposito e i piani
    // immagine lampeggerebbero come "mancanti".
    svuotaAssets([]);
    for (const a of esitoLettura.assets) {
      sostituisciAssets(a.id, a.nome, a.tipo, a.mime, a.blob);
    }
    caricaProgetto(esitoLettura.progetto);
    setEsito(`Aperto: ${esitoLettura.progetto.layers.length} piani`);
  }

  async function importaImmagine(file: File) {
    const asset = await aggiungiAsset(file, 'image');
    addImage(asset.id, file.name.replace(/\.[^.]+$/, ''));
    setEsito(`Immagine aggiunta: ${file.name}`);
  }

  const sync =
    state.scroll.sync.mode === 'smooth'
      ? `smooth ${state.scroll.sync.amount.toFixed(2)}`
      : state.scroll.sync.mode === 'eased'
        ? state.scroll.sync.ease
        : 'sync';

  return (
    <header className="cartiglio">
      <div className="cartiglio__nome">Editor parallax</div>
      <dl className="cartiglio__campi">
        <Campo etichetta="Piani" valore={String(state.layers.length)} />
        <Campo etichetta="Corsa" valore={`${state.scroll.height}vh`} />
        <Campo etichetta="Aggancio" valore={sync} />
      </dl>

      <div className="cartiglio__azioni">
        {esito && <span className="cartiglio__esito">{esito}</span>}

        <button type="button" className="azione" onClick={() => inputImmagine.current?.click()}>
          Immagine
        </button>
        <button type="button" className="azione" onClick={() => inputProgetto.current?.click()}>
          Apri
        </button>
        <button type="button" className="azione" onClick={salva}>
          Salva
        </button>
        <button
          type="button"
          className="azione"
          onClick={esporta}
          disabled={state.layers.length === 0}
        >
          Esporta ZIP
        </button>
      </div>

      {/* Fuori dal flusso: l'aspetto dei file input non è governabile, quindi
          li pilotano i pulsanti qui sopra. Nessun <form>, come da HANDOFF §9.6. */}
      <input
        ref={inputProgetto}
        className="nascosto"
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void apri(f);
          e.target.value = '';
        }}
      />
      <input
        ref={inputImmagine}
        className="nascosto"
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importaImmagine(f);
          e.target.value = '';
        }}
      />
    </header>
  );
}

function messaggio(e: unknown) {
  return e instanceof Error ? e.message : 'errore sconosciuto';
}

function Campo({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="campo">
      <dt className="campo__et">{etichetta}</dt>
      <dd className="campo__val">{valore}</dd>
    </div>
  );
}
