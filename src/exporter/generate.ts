import {
  CLASSE_CORSA,
  SOGLIA_ENTRATA,
  SOGLIA_USCITA,
  corsaVh,
  soglia,
  spostamentoVh,
  syncSource,
  tracce,
} from '../anim/plan';
import type { Layer, ProjectState, TextLayer } from '../schema/types';

/**
 * Da stato a codice.
 *
 * Queste funzioni sono pure e non toccano il DOM: si possono eseguire, testare
 * e confrontare senza un browser. L'impacchettamento nello ZIP sta altrove.
 *
 * Il codice emesso è parte del prodotto (HANDOFF §9.7): chi apre animation.js
 * deve capirlo e poterlo modificare. Per questo ci sono i commenti e i nomi
 * dei piani, e per questo non si minimizza niente.
 */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function nomeFile(state: ProjectState): string {
  void state;
  return 'parallax';
}

function pianiMarkup(state: ProjectState): string {
  return tracce(state)
    .map(({ layer, domId }) => {
      const corpo = layer.type === 'text' ? esc((layer as TextLayer).content) : '';
      return `      <div class="piano" id="${domId}" data-nome="${esc(layer.name)}">\n` +
        `        <span class="piano__corpo">${corpo}</span>\n` +
        `      </div>`;
    })
    .join('\n');
}

export function stateToHtml(state: ProjectState): string {
  const piani = pianiMarkup(state);

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(nomeFile(state))}</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <!-- .corsa è alta più della finestra: è lo spazio da scorrere.
         .scena resta appiccicata in cima e mostra sempre la stessa finestra. -->
    <div class="corsa">
      <div class="scena">
${piani}
      </div>
    </div>
    <script type="module" src="./animation.js"></script>
  </body>
</html>
`;
}

export function stateToCss(state: ProjectState): string {
  const regole = tracce(state)
    .map(({ layer, domId }) => {
      const t = layer.transform ?? {};
      const righe: string[] = [`  z-index: ${layer.z};`];
      if (t.x || t.y) {
        righe.push(`  margin-left: ${t.x ?? 0}px;`);
        righe.push(`  margin-top: ${t.y ?? 0}px;`);
      }
      if (layer.type === 'text') {
        const s = (layer as TextLayer).style;
        righe.push(`  font-size: ${s.fontSize}px;`);
        righe.push(`  font-weight: ${s.fontWeight};`);
        righe.push(`  color: ${s.color};`);
      }
      return `/* ${layer.name} */\n#${domId} {\n${righe.join('\n')}\n}`;
    })
    .join('\n\n');

  return `/* Generato dall'editor parallax. Modificabile a mano. */

* { box-sizing: border-box; }

body {
  margin: 0;
  background: ${state.canvas.background};
  font-family: system-ui, sans-serif;
}

/* L'altezza della corsa decide quanto si scorre.
   Con ${state.scroll.height}vh totali e 100vh visibili, se ne scorrono ${corsaVh(state)}. */
.corsa {
  height: ${state.scroll.height}vh;
}

.scena {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.piano {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  will-change: transform;
}

.piano__corpo {
  position: relative;
}

@media (prefers-reduced-motion: reduce) {
  .piano { will-change: auto; }
}

${regole}
`;
}

export function stateToJs(state: ProjectState): string {
  const vh = corsaVh(state);
  const sync = syncSource(state.scroll.sync);

  const blocchi = tracce(state)
    .map(({ layer, domId, drift, ease }) => {
      const arrivo = spostamentoVh(drift, vh);
      const commento =
        drift === 0
          ? `resta fermo sullo schermo`
          : drift === 1
            ? `si sposta quanto lo scroll: sembra incollato alla pagina`
            : drift < 0
              ? `va in senso opposto allo scroll`
              : `percorre il ${(drift * 100).toFixed(0)}% della corsa`;

      const parallax = `// ${layer.name} — velocità ${drift}× (${commento})
animate('#${domId}', {
  translateY: [0, '${arrivo}'],
  ease: '${ease}',
  autoplay: onScroll({
    target: corsa,
    enter: '${SOGLIA_ENTRATA}',
    leave: '${SOGLIA_USCITA}',
    sync: ${sync},
  }),
});`;

      const a = layer.scrollAnim;
      const voci = a ? Object.entries(a.props) : [];
      if (!a || voci.length === 0) return parallax;

      const righeProps = voci
        .map(([k, v]) => `  ${k}: [${v[0]}, ${v[1]}],`)
        .join('\n');

      // Animazione separata dal parallax: usa una finestra di scroll più
      // stretta, quindi non può stare nella stessa chiamata. Le proprietà non
      // si sovrappongono (translateY è solo del parallax), perciò anime.js le
      // compone senza conflitti.
      const anim = `// ${layer.name} — animazione fra il ${(a.inizio * 100).toFixed(0)}% e il ${(a.fine * 100).toFixed(0)}% della corsa
animate('#${domId}', {
${righeProps}
  ease: '${a.ease}',
  autoplay: onScroll({
    target: corsa,
    enter: '${soglia(a.inizio, state.scroll.height)}',
    leave: '${soglia(a.fine, state.scroll.height)}',
    sync: ${sync},
  }),
});`;

      return `${parallax}\n\n${anim}`;
    })
    .join('\n\n');

  return `import { animate, onScroll } from './lib/anime.esm.min.js';

/**
 * Animazione parallax generata dall'editor.
 *
 * Ogni piano percorre una frazione della corsa di scroll pari alla sua
 * velocità. La corsa qui è ${vh}vh (pagina ${state.scroll.height}vh meno la
 * finestra), quindi un piano a velocità 0.5 si sposta di ${(vh / 2).toFixed(0)}vh.
 *
 * \`sync: ${sync}\` decide come l'animazione insegue lo scroll. Va sempre
 * indicato: senza, anime.js usa il suo default 'play pause', che NON è
 * scrubbing e farebbe partire l'animazione a tempo.
 *
 * Tutti i piani condividono lo stesso bersaglio e le stesse soglie. È
 * necessario: senza, ogni animazione riceverebbe una finestra di scroll
 * calcolata sul proprio elemento, e piani con offset diversi si muoverebbero
 * a fasi diverse invece che insieme.
 */

const corsa = document.querySelector('.${CLASSE_CORSA}');

${blocchi}
`;
}

/**
 * Lo stesso documento, ma in un file solo e con anime.js importato da un URL
 * arbitrario. Serve all'anteprima: l'iframe dell'editor carica ESATTAMENTE
 * questo, cioè l'artefatto esportato, invece di una simulazione parallela.
 *
 * È il motivo per cui "come lo vedi qui" e "come sarà nell'export" non possono
 * divergere: sono lo stesso documento, con la sola differenza di dove sta il
 * bundle di anime.js.
 */
export function stateToDocumentoUnico(state: ProjectState, urlAnime: string): string {
  const js = stateToJs(state).replace('./lib/anime.esm.min.js', urlAnime);
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <style>
${stateToCss(state)}
    </style>
  </head>
  <body>
    <div class="corsa">
      <div class="scena">
${pianiMarkup(state)}
      </div>
    </div>
    <script type="module">
${js}
    </script>
  </body>
</html>`;
}

/** Tutte le sorgenti generate, per chi vuole ispezionarle senza aprire lo ZIP. */
export function stateToSources(state: ProjectState) {
  return {
    'index.html': stateToHtml(state),
    'style.css': stateToCss(state),
    'animation.js': stateToJs(state),
  } satisfies Record<string, string>;
}

export type Sorgenti = ReturnType<typeof stateToSources>;

/** Segnaposto: i layer non ancora supportati dall'export non devono passare in silenzio. */
export function layerNonSupportati(state: ProjectState): Layer[] {
  return state.layers.filter((l) => l.type !== 'text');
}
