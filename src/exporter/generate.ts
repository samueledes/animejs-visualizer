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
import type { Layer, ModelLayer, ProjectState, TextLayer } from '../schema/types';

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

/**
 * Traduce l'id di un asset nell'URL con cui raggiungerlo.
 *
 * Cambia fra i due consumatori ed è l'unica cosa che cambia: nello ZIP è un
 * percorso relativo a un file scritto accanto, nell'anteprima è un object URL
 * del blob in memoria. Il resto del documento generato è identico.
 */
export type RisolviAsset = (id: string) => string | null;

/**
 * I piani che il generatore sa emettere.
 *
 * I piani modello sono esclusi finché l'export 3D non esiste (HANDOFF §8), e
 * sono esclusi da ENTRAMBI i consumatori di proposito: mettere un segnaposto
 * nell'anteprima e niente nello ZIP le farebbe raccontare cose diverse. Che il
 * piano non sia ancora esportabile lo dice l'editor, non l'artefatto generato.
 */
function pianiEmettibili(state: ProjectState) {
  return tracce(state).filter((t) => t.layer.type !== 'model');
}

/** I piani modello: hanno un percorso di generazione tutto loro (scena Three). */
export function pianiModello(state: ProjectState): ModelLayer[] {
  return [...state.layers]
    .sort((a, b) => a.z - b.z)
    .filter((l): l is ModelLayer => l.type === 'model');
}

/**
 * Dove stanno le librerie rispetto al documento generato.
 *
 * Nello ZIP è './lib' (file scritti accanto a index.html), nell'anteprima è
 * '/lib' (serviti dall'app). È l'unica differenza fra i due documenti, insieme
 * a come si raggiunge un asset.
 */
export type BaseLib = './lib' | '/lib';

function pianiMarkup(state: ProjectState, risolvi: RisolviAsset): string {
  return pianiEmettibili(state)
    .map(({ layer, domId }) => {
      let corpo = '';
      if (layer.type === 'text') {
        corpo = `<span class="piano__corpo">${esc((layer as TextLayer).content)}</span>`;
      } else if (layer.type === 'image') {
        const url = risolvi(layer.src);
        corpo = url
          ? `<img class="piano__corpo" src="${esc(url)}" alt="${esc(layer.name)}" />`
          : `<span class="piano__corpo piano__mancante">Immagine mancante</span>`;
      }
      return `      <div class="piano" id="${domId}" data-nome="${esc(layer.name)}">\n` +
        `        ${corpo}\n` +
        `      </div>`;
    })
    .join('\n');
}

/**
 * L'import map serve a una cosa sola ma indispensabile: l'adapter Three di
 * anime.js e GLTFLoader importano `three` come specificatore nudo, che un
 * browser non sa risolvere da solo. Senza, il modulo non carica affatto.
 */
function importMap(state: ProjectState, base: BaseLib): string {
  if (pianiModello(state).length === 0) return '';
  return `    <script type="importmap">
      { "imports": { "three": "${base}/three.module.js" } }
    </script>
`;
}

/** Il contenitore del canvas, sotto ai piani 2D. */
function contenitore3d(state: ProjectState): string {
  return pianiModello(state).length > 0 ? '        <div class="scena3d"></div>\n' : '';
}

export function stateToHtml(state: ProjectState, risolvi: RisolviAsset, base: BaseLib): string {
  const piani = pianiMarkup(state, risolvi);

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(nomeFile(state))}</title>
    <link rel="stylesheet" href="./style.css" />
${importMap(state, base)}  </head>
  <body>
    <!-- .corsa è alta più della finestra: è lo spazio da scorrere.
         .scena resta appiccicata in cima e mostra sempre la stessa finestra. -->
    <div class="corsa">
      <div class="scena">
${contenitore3d(state)}${piani}
      </div>
    </div>
    <script type="module" src="./animation.js"></script>
  </body>
</html>
`;
}

export function stateToCss(state: ProjectState): string {
  const regole = pianiEmettibili(state)
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
  max-width: 70%;
  height: auto;
}

/* Il canvas 3D sta sotto ai piani 2D e non intercetta i click. */
.scena3d {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.scena3d canvas {
  display: block;
}

.piano__mancante {
  font-family: ui-monospace, monospace;
  font-size: 14px;
  color: #e2574c;
}

@media (prefers-reduced-motion: reduce) {
  .piano { will-change: auto; }
}

${regole}
`;
}

/**
 * La scena Three vanilla, generata solo se ci sono piani modello.
 *
 * anime.js pilota, Three disegna (HANDOFF §12). Anche il ciclo di rendering
 * passa da anime: `createTimer({ onUpdate })` invece di setAnimationLoop.
 *
 * L'import dell'adapter è quello che rende animabile un oggetto Three con la
 * stessa API di un elemento DOM. Va importato dall'ALBERO MODULARE: il bundle
 * di anime.js non lo contiene, e mescolarli creerebbe due registry disgiunti
 * con l'animazione che fallisce in silenzio (HANDOFF §8).
 */
function scenaTre(state: ProjectState, risolvi: RisolviAsset): string {
  const modelli = pianiModello(state);
  if (modelli.length === 0) return '';

  const sync = syncSource(state.scroll.sync);

  const carichi = modelli
    .map((m) => {
      const url = risolvi(m.src);
      if (!url) return `// ${m.name}: file del modello mancante, saltato.`;

      const s = m.spin;
      const rotazione = s
        ? `
    // ${m.name} — ruota di ${s.to - s.from}° sull'asse ${s.axis} fra il ${(s.inizio * 100).toFixed(0)}% e il ${(s.fine * 100).toFixed(0)}% della corsa.
    // I valori sono in GRADI: li converte l'adapter.
    animate(modello, {
      rotate${s.axis.toUpperCase()}: [${s.from}, ${s.to}],
      ease: '${s.ease}',
      autoplay: onScroll({
        target: corsa,
        enter: '${soglia(s.inizio, state.scroll.height)}',
        leave: '${soglia(s.fine, state.scroll.height)}',
        sync: ${sync},
      }),
    });`
        : `
    // ${m.name}: nessuna animazione impostata.`;

      return `
  loader.load('${url}', (gltf) => {
    const modello = gltf.scene;
    inquadra(modello);
    scene.add(modello);
${rotazione}
  });`;
    })
    .join('\n');

  const cam = modelli[0].camera ?? { fov: 45, position: [0, 0, 6] as [number, number, number] };

  return `
// ---------------------------------------------------------------- scena 3D
const contenitore3d = document.querySelector('.scena3d');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(${cam.fov}, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(${cam.position.join(', ')});

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
contenitore3d.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const luce = new THREE.DirectionalLight(0xffffff, 1.2);
luce.position.set(3, 5, 2);
scene.add(luce);

// Centra il modello nell'origine e lo porta a una dimensione prevedibile:
// i .glb arrivano con scale e centri qualsiasi, e senza questo un modello
// può nascere fuori inquadratura o grande come una stanza.
function inquadra(oggetto) {
  const scatola = new THREE.Box3().setFromObject(oggetto);
  const dimensione = scatola.getSize(new THREE.Vector3());
  const centro = scatola.getCenter(new THREE.Vector3());
  const lato = Math.max(dimensione.x, dimensione.y, dimensione.z) || 1;
  oggetto.scale.multiplyScalar(2 / lato);
  oggetto.position.sub(centro.multiplyScalar(2 / lato));
}

const loader = new GLTFLoader();
${carichi}

// anime.js guida anche il ciclo di rendering: coerente con "anime pilota,
// Three disegna". Un setAnimationLoop di Three girerebbe in parallelo.
createTimer({ onUpdate: () => renderer.render(scene, camera) });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
`;
}

export function stateToJs(state: ProjectState, base: BaseLib, risolvi: RisolviAsset): string {
  const vh = corsaVh(state);
  const sync = syncSource(state.scroll.sync);
  const tre = scenaTre(state, risolvi);

  const blocchi = pianiEmettibili(state)
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

  // Con dei modelli servono l'albero modulare di anime, l'adapter, Three e il
  // loader; senza, basta il bundle: più piccolo e con meno file nello ZIP.
  const testata = tre
    ? `import { animate, createTimer, onScroll } from '${base}/animejs/index.js';
import '${base}/animejs/adapters/three/index.js';
import * as THREE from 'three';
import { GLTFLoader } from '${base}/loaders/GLTFLoader.js';`
    : `import { animate, onScroll } from '${base}/anime.esm.min.js';`;

  return `${testata}

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
${tre}`;
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
export function stateToDocumentoUnico(state: ProjectState, risolvi: RisolviAsset): string {
  // Le librerie stanno in /lib, servite dall'app; nello ZIP staranno in ./lib,
  // accanto a index.html. È l'unica differenza, insieme agli URL degli asset.
  const base: BaseLib = '/lib';
  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
${importMap(state, base)}    <style>
${stateToCss(state)}
    </style>
  </head>
  <body>
    <div class="corsa">
      <div class="scena">
${contenitore3d(state)}${pianiMarkup(state, risolvi)}
      </div>
    </div>
    <script type="module">
${stateToJs(state, base, risolvi)}
    </script>
  </body>
</html>`;
}

/** Tutte le sorgenti generate, per chi vuole ispezionarle senza aprire lo ZIP. */
export function stateToSources(state: ProjectState, risolvi: RisolviAsset) {
  const base: BaseLib = './lib';
  return {
    'index.html': stateToHtml(state, risolvi, base),
    'style.css': stateToCss(state),
    'animation.js': stateToJs(state, base, risolvi),
  } satisfies Record<string, string>;
}

export type Sorgenti = ReturnType<typeof stateToSources>;

/** I layer che l'export non sa ancora emettere. Non devono passare in silenzio. */
export function layerNonSupportati(state: ProjectState): Layer[] {
  return state.layers.filter((l) => l.type !== 'text' && l.type !== 'image');
}
