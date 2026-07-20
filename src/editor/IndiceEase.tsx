import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QUANTI_EASE, stranezzaEase, voceEase } from '../anim/catalogo';
import { cerca, tratti } from '../anim/ricerca';
import { useEditor } from '../store/project';
import { CurvaEase } from './CurvaEase';

/**
 * Indice delle easing: si apre, si scrive, si sceglie.
 *
 * Sostituisce un <select> di 45 voci con nomi come "outInQuint", che dicono
 * tutto a chi già le conosce e niente a tutti gli altri. Qui ogni voce porta
 * la sua curva vera e due righe che dicono cosa fa e quando serve.
 *
 * Il focus resta SEMPRE nel campo di ricerca: la voce attiva si segnala con
 * aria-activedescendant, non spostando il focus. Muovere il focus sulle voci
 * romperebbe la digitazione e su NVDA farebbe sparire l'eco del testo.
 */
export function IndiceEase({
  id,
  valore,
  onChange,
  etichetta = 'Easing',
}: {
  id: string;
  valore: string;
  onChange: (nome: string) => void;
  etichetta?: string;
}) {
  const idIstanza = useId();
  const indiceAperto = useEditor((s) => s.indiceAperto);
  const apriIndice = useEditor((s) => s.apriIndice);
  const aperto = indiceAperto === id;

  const [query, setQuery] = useState('');
  const [attivo, setAttivo] = useState(valore);
  const [posizione, setPosizione] = useState<{ top: number; left: number } | null>(null);

  const trigger = useRef<HTMLButtonElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const pannello = useRef<HTMLDivElement>(null);
  /** Ultima posizione nota del puntatore: serve a non far rubare la voce
   *  attiva dall'hover mentre la lista scorre sotto un cursore fermo. */
  const puntatore = useRef({ x: -1, y: -1 });

  const risultati = useMemo(() => cerca(query), [query]);
  const nomi = useMemo(() => risultati.map((r) => r.voce.nome), [risultati]);

  const idVoce = (nome: string) => `${idIstanza}-opt-${nome}`;

  // L'attivo deve esistere nella lista corrente. Quando i risultati si
  // accorciano, un attivo stantio non dà errori: lo screen reader smette
  // semplicemente di annunciare, e non capiresti perché.
  const attivoValido = nomi.includes(attivo) ? attivo : (nomi[0] ?? '');

  const LARGHEZZA = 340;

  /**
   * Il pannello vive in un portale su document.body, non dentro la guida.
   *
   * La guida ha overflow-y:auto, che crea un contesto di ritaglio: un figlio
   * in posizione assoluta non ne può uscire e il pannello veniva tagliato a
   * metà. Il portale lo tira fuori, e la posizione la calcoliamo dal trigger.
   *
   * Si apre verso SINISTRA perché la colonna è larga 244px e il pannello 340:
   * allineandolo a destra del trigger uscirebbe dallo schermo.
   */
  function calcolaPosizione() {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    // Il limite va calcolato sull'altezza che il pannello può davvero
    // raggiungere (la stessa max-height del CSS), non su una costante:
    // con un numero fisso il pannello sfora sotto appena la finestra cambia.
    const altezzaMax = Math.round(window.innerHeight * 0.62);
    setPosizione({
      top: Math.max(8, Math.min(r.top, window.innerHeight - altezzaMax - 8)),
      left: Math.max(8, r.right - LARGHEZZA),
    });
  }

  function apri() {
    setQuery('');
    setAttivo(valore);
    calcolaPosizione();
    apriIndice(id);
  }

  function chiudi(applica?: string) {
    if (applica) onChange(applica);
    apriIndice(null);
    trigger.current?.focus();
  }

  // Focus al campo e voce corrente in vista, prima del primo paint: farlo in
  // useEffect produce un salto visibile a ogni apertura.
  useLayoutEffect(() => {
    if (!aperto) return;
    campo.current?.focus();
    const el = lista.current?.querySelector(`#${CSS.escape(idVoce(valore))}`);
    el?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto]);

  // Chiusura cliccando fuori. pointerdown e non click: con click, un mousedown
  // dentro e un mouseup fuori — cioè chi seleziona la query trascinando —
  // chiuderebbe il pannello a metà selezione.
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: PointerEvent) => {
      const percorso = e.composedPath();
      if (percorso.includes(pannello.current!) || percorso.includes(trigger.current!)) return;
      apriIndice(null);
    };
    document.addEventListener('pointerdown', fuori);
    return () => document.removeEventListener('pointerdown', fuori);
  }, [aperto, apriIndice]);

  function muovi(delta: number, assoluto?: 'primo' | 'ultimo') {
    if (nomi.length === 0) return;
    let i = nomi.indexOf(attivoValido);
    if (assoluto === 'primo') i = 0;
    else if (assoluto === 'ultimo') i = nomi.length - 1;
    else {
      i += delta;
      // Con le frecce si gira; con PagSu/PagGiù ci si ferma ai bordi, perché
      // lì si sta spazzando l'elenco, non girandoci dentro.
      if (Math.abs(delta) === 1) i = (i + nomi.length) % nomi.length;
      else i = Math.max(0, Math.min(nomi.length - 1, i));
    }
    const nuovo = nomi[i];
    setAttivo(nuovo);
    lista.current
      ?.querySelector(`#${CSS.escape(idVoce(nuovo))}`)
      ?.scrollIntoView({ block: 'nearest' });
  }

  function tasti(e: React.KeyboardEvent<HTMLInputElement>) {
    // Sulla tastiera italiana gli accenti passano per la composizione:
    // confermare qui applicherebbe mentre l'utente sta ancora componendo.
    if (e.nativeEvent.isComposing) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        muovi(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        muovi(-1);
        break;
      case 'PageDown':
        e.preventDefault();
        muovi(10);
        break;
      case 'PageUp':
        e.preventDefault();
        muovi(-10);
        break;
      case 'Home':
        // A campo pieno Home muove il caret: è l'unico modo di correggere la
        // query dall'inizio, non glielo togliamo.
        if (query === '' || e.ctrlKey) {
          e.preventDefault();
          muovi(0, 'primo');
        }
        break;
      case 'End':
        if (query === '' || e.ctrlKey) {
          e.preventDefault();
          muovi(0, 'ultimo');
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (attivoValido) chiudi(attivoValido);
        break;
      case 'Tab':
        // Tab conferma e prosegue: dentro il pannello il campo è l'unico
        // elemento focalizzabile, quindi non c'è ambiguità.
        if (attivoValido) onChange(attivoValido);
        apriIndice(null);
        break;
      case 'Escape':
        e.preventDefault();
        // Due stadi: prima svuota, poi chiude. Chiudere subito farebbe
        // perdere il pannello a chi voleva solo cancellare la ricerca.
        if (query !== '') {
          setQuery('');
          setAttivo(valore);
        } else {
          chiudi();
        }
        break;
    }
  }

  const voce = voceEase(valore);

  return (
    <div className="indice">
      <button
        ref={trigger}
        type="button"
        className="indice__trigger"
        aria-haspopup="dialog"
        aria-expanded={aperto}
        onClick={() => (aperto ? chiudi() : apri())}
        onKeyDown={(e) => {
          // Typeahead: il <select> nativo lo dava gratis, toglierlo sarebbe
          // una perdita secca.
          if (!aperto && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            apri();
            setQuery(e.key);
            e.preventDefault();
          }
        }}
      >
        <span className="indice__et">{etichetta}</span>
        <span className="indice__valore">{valore}</span>
        <CurvaEase nome={valore} larghezza={40} altezza={22} />
      </button>

      {!aperto && voce && <p className="indice__sommario">{voce.cosaFa}</p>}

      {aperto && posizione && createPortal(
        <div
          className="pannello"
          ref={pannello}
          role="dialog"
          aria-modal="false"
          aria-label={`Cerca ${etichetta}`}
          style={{ top: posizione.top, left: posizione.left, width: LARGHEZZA }}
        >
          <input
            ref={campo}
            type="text"
            role="combobox"
            className="pannello__campo"
            placeholder="cerca: rimbalzo, molla, scatto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={tasti}
            aria-expanded={nomi.length > 0}
            aria-controls={`${idIstanza}-lista`}
            aria-autocomplete="list"
            aria-activedescendant={attivoValido ? idVoce(attivoValido) : undefined}
            autoComplete="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
          />

          <p className="pannello__conteggio" role="status">
            {nomi.length === 0
              ? `Nessuna easing per «${query}»`
              : query === ''
                ? `${QUANTI_EASE} easing`
                : `${nomi.length} su ${QUANTI_EASE}`}
          </p>

          {nomi.length > 0 ? (
            <ul
              ref={lista}
              id={`${idIstanza}-lista`}
              role="listbox"
              className="pannello__lista"
              aria-label="Risultati"
            >
              {risultati.map(({ voce: v }) => {
                const att = v.nome === attivoValido;
                const stranezza = stranezzaEase(v.nome);
                return (
                  <li
                    key={v.nome}
                    id={idVoce(v.nome)}
                    role="option"
                    aria-selected={att}
                    className={`voce${att ? ' voce--attiva' : ''}${v.nome === valore ? ' voce--corrente' : ''}`}
                    // Il mousedown non deve togliere il focus al campo prima
                    // che il click confermi.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => chiudi(v.nome)}
                    onMouseMove={(e) => {
                      if (e.clientX === puntatore.current.x && e.clientY === puntatore.current.y) return;
                      puntatore.current = { x: e.clientX, y: e.clientY };
                      setAttivo(v.nome);
                    }}
                  >
                    <CurvaEase nome={v.nome} larghezza={44} altezza={28} attiva={att} />
                    <span className="voce__testi">
                      <span className="voce__riga">
                        <span className="voce__nome">{evidenzia(v.nome, query)}</span>
                        <span className="voce__famiglia">{v.famiglia}</span>
                        {stranezza && <span className="voce__badge">{stranezza}</span>}
                        {v.nome === valore && <span className="solo-sr"> (attuale)</span>}
                      </span>
                      <span className="voce__cosa">{evidenzia(v.cosaFa, query)}</span>
                      {att && <span className="voce__quando">{v.quando}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pannello__vuoto">
              Resta applicata <strong>{valore}</strong>. Esc per svuotare la ricerca.
            </p>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Evidenzia i tratti trovati, con gli indici calcolati sul testo originale. */
function evidenzia(testo: string, query: string) {
  const parti = tratti(testo, query);
  if (parti.length === 0) return testo;
  const pezzi: Array<string | React.ReactElement> = [];
  let cursore = 0;
  parti.forEach(([a, b], k) => {
    if (a > cursore) pezzi.push(testo.slice(cursore, a));
    pezzi.push(<mark key={k}>{testo.slice(a, b)}</mark>);
    cursore = b;
  });
  if (cursore < testo.length) pezzi.push(testo.slice(cursore));
  return pezzi;
}
