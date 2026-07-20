import { useEditor } from '../store/project';

/**
 * Cartiglio. Nel disegno tecnico è il riquadro che identifica la tavola:
 * cosa rappresenta, in che scala, a che revisione. È l'unico posto dove la
 * faccia condensata maiuscola compare — restrizione voluta.
 *
 * Ogni campo qui dentro riporta un valore vero. Un cartiglio con dati finti
 * è decorazione.
 */
export function TitleBlock() {
  const layers = useEditor((s) => s.project.layers);
  const scroll = useEditor((s) => s.project.scroll);

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
