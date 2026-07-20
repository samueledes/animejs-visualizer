# HANDOFF — Scroll Parallax Editor (anime.js v4 + Three.js)

> Documento di avvio progetto per Claude Code.
> Leggilo tutto prima di scrivere una riga di codice. Contiene decisioni architetturali già prese, vincoli tecnici verificati sulla documentazione ufficiale, e i punti dove è FACILE sbagliare.

---

## 0. PRIMA COSA DA FARE (obbligatoria)

**Prima di qualsiasi codice, scopri quali skill hai a disposizione e usa quelle pertinenti.**

Esegui la ricerca/discovery delle skill disponibili (skill find / elenco skill) e identifica quelle utili a questo progetto. In particolare cerca skill che riguardino:

- **frontend / design UI** (per l'aspetto e la struttura dell'editor — layout, componenti, design tokens). Se esiste una skill di frontend design, **consultala prima di costruire la UI dell'editor** e segui le sue convenzioni.
- **React / web app** (scaffolding, struttura progetto, best practice componenti).
- **build / packaging / tooling** (bundling, gestione asset, generazione di file).
- qualsiasi skill relativa a **3D / Three.js / WebGL**, se presente.

Regola: **non assumere che una skill non esista — cercala.** Se trovi una skill rilevante, aprila e applicala. Se non ne trovi, procedi con le convenzioni standard descritte qui sotto. Non saltare questo passo: le skill contengono vincoli specifici dell'ambiente che non sono in questo documento.

Dopo la discovery, riepiloga in una riga quali skill userai e per cosa, poi procedi.

---

## 1. COS'È IL PROGETTO (in una frase precisa)

Un **editor visuale che è, sotto il cofano, un generatore di codice.**

L'utente compone visivamente un'animazione **scroll parallax** (strati che si muovono a velocità diverse mentre si scrolla, più eventuale modello 3D), fa il preview dal vivo, e alla fine esporta uno **ZIP autocontenuto** con `index.html` + `style.css` + `animation.js` + le librerie + gli asset. Il file esportato gira aprendolo in un browser, senza dipendenze esterne obbligatorie.

**anime.js è il RUNTIME dell'output, non il motore grafico dell'editor.** L'editor non "anima con anime.js" internamente: l'editor mantiene uno stato, e al momento dell'export **traduce quello stato in chiamate anime.js** (`animate()`, `createTimeline()`, `onScroll()`). È un code generator. Questo è il concetto centrale — tienilo fermo.

### Cos'è il parallax (per evitare fraintendimenti)
Il parallax è **profondità finta**: strati 2D (testo, immagini, SVG) che scorrono a velocità diverse in funzione dello scroll; l'occhio percepisce la profondità. Questo si fa **con anime.js puro su DOM/CSS**, senza WebGL. È l'obiettivo primario del progetto e la base della v1.

Il **3D vero** (modello importato, vista esplosa, rotazione orbitale) è una feature separata: lì **Three.js renderizza** e **anime.js pilota i valori** tramite l'adapter (vedi §2). Non confondere i due piani.

---

## 2. FATTI TECNICI VERIFICATI (non negoziabili — evita di re-litigarli)

Questi punti sono stati verificati sulla documentazione ufficiale di anime.js. Alcuni contraddicono conoscenze diffuse su anime.js v3: **qui si usa la v4.**

1. **Versione: anime.js v4.** L'API v4 è diversa dalla v3 (funzioni come `createTimeline`, `createScope`, `onScroll`, `svg.morphTo`, `createDrawable`). Ignora tutorial/risposte basati sulla v3: hanno sintassi diversa.

2. **Esiste un adapter Three.js ufficiale e integrato.** Si attiva con:
   ```js
   import 'animejs/adapters/three';
   ```
   Permette di animare oggetti Three (mesh e non) con la **stessa API `animate()`/`createTimeline()`**. Copre: proprietà dell'oggetto (position/rotation/scale), transform estese, materiali e uniform, instanced/batched mesh. Pagine di riferimento:
   - `/documentation/adapters/threejs-adapter` (indice)
   - `.../threejs-object-property-adapter` (proprietà oggetto)
   - `.../threejs-transforms-adapter` (transform estese)
   - `.../materials-and-uniforms`
   - `.../threejs-instanced-and-batched-meshes`
   - `.../threejs-adapter-common-gotchas` ← **LEGGERE PRESTO**, l'adapter è marcato NEW e ha spigoli.

   ⚠️ **La sintassi esatta delle property-path (es. animare `mesh.position` come oggetto vs. usare le transform estese sul mesh) va confermata sulle due pagine "object-property adapter" e "extended transforms" prima di implementare.** Non inventare la sintassi: verificala.

3. **anime.js non renderizza niente in 3D.** Il rendering (caricare il `.glb`, disegnare i poligoni, luci, camera, WebGL) lo fa **sempre Three.js**. L'adapter fa una cosa sola: usare la sintassi di anime.js per cambiare i valori delle proprietà Three nel tempo/sullo scroll. Motto: **anime.js pilota, Three disegna.**

4. **Attenzione: "morph" esiste in DUE mondi diversi e non vanno confusi.**
   - `svg.morphTo(target, precision)` → morfa **forme SVG 2D** (l'attributo `d` di un path, o i `points` di poligoni/polyline). È **piatto**: non ha spessore, volume o illuminazione. Serve per loghi, icone, forme vettoriali. **Non c'entra col 3D.**
   - **Morph target / blend shape di Three.js** → deforma **geometria 3D**. Le due forme (A e B) devono essere **già create in Blender** dentro il modello; anime.js anima solo il **peso** (0→1) del morph. anime.js **non scolpisce** i vertici.

5. **Vista esplosa (exploded view) = movimento, non deformazione.** Ogni pezzo (mesh) viene spostato/ruotato rispetto al centro. Funziona con **qualsiasi `.glb`**, senza preparazione in Blender. È il caso d'uso più semplice e robusto → **è la base della parte 3D dell'MVP.** Il morph di forma richiede modelli con blend shape pronti → feature avanzata, non MVP.

6. **Scroll scrubbing.** Il pattern è: una timeline (o animazione) con `autoplay: onScroll({ sync: true })`. Il valore che guida è lo **scroll**, non il tempo: "l'animazione è al 40% quando lo scroll è al 40%". Il modulo scroll (`onScroll`, ScrollObserver) ha: `container`, `target`, `axis`, `repeat`, soglie (thresholds), e modalità di sincronizzazione (sync, smooth, eased). Riferimento: `/documentation/events/onscroll`.

7. **Moduli anime.js v4 disponibili** (per sapere cosa puoi generare): Timer, Animation, Timeline, Animatable, Draggable, Layout, Scope, Events/onScroll, SVG (`morphTo`, `createDrawable`, `createMotionPath`), Text (`splitText`, `scrambleText`), Utilities (stagger, lerp, mapRange, clamp, ecc.), Easings (incl. Spring), WAAPI, Engine, **Adapters (Three.js)**.

---

## 3. ARCHITETTURA

Tre blocchi, un'unica fonte di verità (lo stato JSON).

```
┌─────────────────────────────────────────────────────────┐
│  EDITOR (React + R3F + drei)                             │
│  - Viewport (canvas 3D/2D)                               │
│  - Pannello Layer (lista, add/remove/reorder)           │
│  - Pannello Proprietà (transform, parallax, animazione) │
│  - Track di scroll (timeline visuale)                   │
│                        │                                 │
│                        ▼                                 │
│  STATO (JSON)  ◄── unica fonte di verità                │
│  { version, canvas, scroll, layers[] }                  │
│                        │                                 │
│         ┌──────────────┴───────────────┐                │
│         ▼                              ▼                 │
│  PREVIEW (live)                 EXPORTER                 │
│  usa anime.js nell'editor       stato → codice          │
│  per mostrare il risultato      vanilla HTML/CSS/JS      │
│                                 + anime.js (+ three)     │
│                                 → ZIP                    │
└─────────────────────────────────────────────────────────┘
```

### Distinzione IMPORTANTE: editor vs export
- **L'EDITOR** usa **React + react-three-fiber (R3F) + drei** per il viewport 3D (comodo per autorare).
- **L'EXPORT** genera **Three.js vanilla + anime.js**, NON React/R3F. Motivo: lo ZIP deve essere leggero e autocontenuto; spedire tutto il runtime React+R3F sarebbe pesante e fuori scopo.
- Conseguenza pratica: l'exporter è un **template engine** che emette il bootstrap di una scena Three vanilla (loader glb, camera, luci, renderer, resize) + le chiamate anime.js. Questo è lavoro reale — vedi §8.
- **Per de-rischiare:** l'export 2D-parallax (solo DOM + anime.js, niente Three) è **banale** da generare ed è la prima cosa da far funzionare. L'export 3D (con bootstrap Three vanilla) è lo step successivo.

---

## 4. STACK TECNICO

| Ambito | Scelta | Perché |
|---|---|---|
| Build/dev | **Vite** | veloce, standard per React SPA |
| UI | **React** | già noto (esperienza Next.js); ecosistema R3F |
| Stato | **Zustand** | store semplice, poco boilerplate, ottimo per editor |
| Viewport 3D (editor) | **three + @react-three/fiber + @react-three/drei** | standard de facto 3D web; `useGLTF`, `<OrbitControls>`, `<Html>` da drei |
| Animazione | **animejs (v4) + animejs/adapters/three** | il cuore: runtime dell'output e preview |
| Export ZIP | **JSZip** (o fflate) | impacchettare i file generati lato browser |
| Stile editor | **Tailwind** (opzionale) | rapido; MA consulta prima la skill di frontend design se presente |

Nota: per l'export **non** usare storage del browser (localStorage/sessionStorage) negli artefatti generati. La persistenza del progetto nell'editor si fa con **salva/carica di un file JSON** (download/upload del `.parallax.json`), non con localStorage.

---

## 5. MODELLO DATI (lo stato — unica fonte di verità)

Schema di partenza (TypeScript-like). È il contratto tra editor, preview ed exporter. Progetta l'editor per **mutare solo questo**, e l'exporter per **leggere solo questo**.

```ts
type ProjectState = {
  version: 4;                    // versione schema
  canvas: {
    width: number;               // viewport logico
    height: number;
    background: string;          // css color
  };
  scroll: {
    height: number;              // altezza totale scrollabile (in vh o px)
    // ⚠️ CORRETTO (verificato sui docs v4, vedi §8). I tre nomi di modo erano giusti,
    // ma NON sono i valori letterali che anime.js accetta. Teniamo i modi nello stato
    // (l'editor espone tre scelte) e lasciamo all'exporter la traduzione al literal:
    sync:
      | { mode: 'sync' }                        // → onScroll({ sync: true })     scrub 1:1
      | { mode: 'smooth'; amount: number }      // → onScroll({ sync: .25 })      0..1, inseguimento
      | { mode: 'eased'; ease: string };        // → onScroll({ sync: 'inOutCirc' })
  };
  layers: Layer[];
};

type Layer =
  | TextLayer
  | ImageLayer
  | SvgLayer
  | ModelLayer;

type BaseLayer = {
  id: string;
  name: string;
  type: 'text' | 'image' | 'svg' | 'model';
  z: number;                     // ordine di stacking / profondità concettuale
  // Parallax: quanto si muove rispetto allo scroll (1 = segue lo scroll, 0 = fermo, >1 più veloce, <0 controparallasse)
  parallax: { speedY: number; speedX?: number };
  // Animazione legata allo scroll: da->a su una finestra di scroll [start,end] in 0..1
  scrollAnim?: {
    start: number;               // 0..1 posizione di scroll a cui inizia
    end: number;                 // 0..1 posizione a cui finisce
    props: Record<string, [number, number]>; // es. { translateY: [0, -200], opacity: [0, 1], rotate: [0, 15] }
    ease?: string;               // es. 'inOutExpo'
  };
  transform?: { x?: number; y?: number; rotate?: number; scale?: number };
};

type TextLayer  = BaseLayer & { type: 'text';  content: string; style: TextStyle };
type ImageLayer = BaseLayer & { type: 'image'; src: string /* asset id */ };
type SvgLayer   = BaseLayer & { type: 'svg';   markup: string /* inline svg */ };

// 3D
type ModelLayer = BaseLayer & {
  type: 'model';
  src: string;                   // asset id del .glb
  camera?: { fov: number; position: [number,number,number] };
  // Exploded view: offset per singolo mesh (per nome mesh)
  explode?: {
    // per ogni mesh, il vettore di spostamento a "esplosione piena"
    offsets: Record<string /*meshName*/, [number,number,number]>;
    // progresso guidato dallo scroll [start,end] in 0..1
    scrollRange: [number, number];
  };
  // rotazione dell'intero modello sullo scroll (opzionale)
  spin?: { axis: 'x'|'y'|'z'; from: number; to: number; scrollRange: [number,number] };
};
```

Gli asset (immagini, `.glb`) vanno tenuti in un **asset store** separato (mappa id→Blob/URL), referenziati per id nello stato. All'export vengono scritti come file dentro lo ZIP e i riferimenti riscritti a path relativi.

---

## 6. MVP — FASE 1 (obiettivo raggiungibile)

Finito e pulito batte ambizioso e abbandonato. Consegna questi punti, ognuno con il suo "done when".

1. **Shell dell'editor.** Layout a tre zone: viewport centrale, pannello layer a sinistra, pannello proprietà a destra, track di scroll in basso.
   *Done when:* la UI è navigabile, i pannelli sono collegati allo store Zustand.

2. **Layer 2D di testo e immagine.** Aggiungi/rimuovi/riordina layer; imposta contenuto, posizione, `z`.
   *Done when:* aggiungo un testo e un'immagine, li vedo nel viewport, li riordino.

3. **Parallax sullo scroll (2D).** Ogni layer ha `parallax.speedY`; scrollando, i layer si muovono a velocità diverse.
   *Done when:* con due layer a velocità diverse vedo l'effetto di profondità nel preview.

4. **Animazione scroll per layer (2D).** `scrollAnim` con from→to su una finestra di scroll (es. fade-in + translate).
   *Done when:* un layer appare/si muove nella finestra di scroll impostata.

5. **Preview live.** Il viewport riflette lo stato usando anime.js con `onScroll`.
   *Done when:* scrollando nel preview l'animazione gira come sarà nell'export.

6. **Export 2D → ZIP.** Genera `index.html` + `style.css` + `animation.js` + `anime.js` (o CDN) + immagini. Scaricabile come ZIP e funzionante offline.
   *Done when:* apro `index.html` esportato e vedo la STESSA animazione del preview.

7. **Salva/Carica progetto.** Download e upload del `.parallax.json` (lo stato).
   *Done when:* salvo, ricarico la pagina, riapro il file e ritrovo tutto.

**Modello 3D nell'MVP (minimo):** importa un `.glb`, renderizzalo nel viewport (R3F + `useGLTF`), e applica **una** cosa guidata dallo scroll — la **rotazione** (`spin`) o la **vista esplosa** (`explode`). L'export 3D può slittare a Fase 2 se serve tempo, ma il rendering 3D nell'editor rientra nell'MVP.

---

## 7. ROADMAP (dopo l'MVP)

**Fase 2 — 3D completo**
- Export 3D: generazione del bootstrap Three vanilla (§8) + chiamate all'adapter.
- Vista esplosa con offset per-mesh editabili nel viewport (gizmo per pezzo).
- Import del `.glb` con lista dei mesh selezionabili.

**Fase 3 — parallax e layer avanzati**
- Layer SVG con `morphTo` / `createDrawable` (linea che si disegna) / `createMotionPath`.
- Layer di testo animato (`splitText`, `scrambleText`).
- Preset di easing (editor di easing), stagger su gruppi di elementi.

**Fase 4 — morph 3D (avanzato)**
- Supporto ai **morph target** dei modelli che li contengono già (Blender): l'editor legge le blend shape e anima il peso sullo scroll via adapter.
- Ottimizzazione asset: compressione **Draco/meshopt**, fallback immagine per mobile.

---

## 8. LA PIPELINE DI EXPORT (in dettaglio)

L'export è la parte concettualmente più importante: **stato JSON → codice anime.js**.

### Struttura dello ZIP
```
export.zip
├── index.html          # elementi (layer) + <script src=anime.js> + <script src=animation.js>
├── style.css           # stili base, posizionamento layer, altezza scroll
├── animation.js        # le chiamate anime.js generate dallo stato
├── lib/
│   ├── anime.esm.min.js        # SOLO export 2D (il bundle non contiene l'adapter Three)
│   ├── animejs/                # SOLO export 3D: albero modulare, al posto del bundle
│   └── three.module.js         # solo se ci sono layer 3D
└── assets/
    ├── image-01.webp
    └── model-01.glb            # solo se ci sono layer 3D
```
> ⚠️ `lib/anime.esm.min.js` e `lib/animejs/` sono **alternativi, mai insieme**: caricarli entrambi crea due registry disgiunti e rompe l'adapter in silenzio. Vedi la nota verificata in fondo a questo paragrafo.

### Esempio: export 2D (banale, prima cosa da far funzionare)
Da uno stato con due layer parallax + un fade-in, `animation.js` generato è tipo:

```js
import { animate, onScroll, utils } from './lib/anime.esm.min.js';

// Layer parallax: si muovono a velocità diverse sullo scroll
animate('#layer-bg', {
  translateY: [0, -100],           // speedY basso
  ease: 'linear',
  autoplay: onScroll({ sync: true })
});

animate('#layer-fg', {
  translateY: [0, -400],           // speedY alto → sembra più vicino
  ease: 'linear',
  autoplay: onScroll({ sync: true })
});

// Layer con animazione su finestra di scroll (fade + slide)
animate('#layer-title', {
  opacity: [0, 1],
  translateY: [40, 0],
  ease: 'inOutExpo',
  autoplay: onScroll({
    target: '#layer-title',
    enter: '80% 20%',   // "soglia-container soglia-target"
    leave: 'top+=60 bottom',
    sync: .25,
    debug: true         // disegna i marker in pagina — toglilo nell'export
  })
});
```
> ✅ **VERIFICATO** (docs v4, `/documentation/events/onscroll/scrollobserver-thresholds/*`). Le soglie **non** sono un oggetto `thresholds`: sono le chiavi top-level `enter` e `leave` di `onScroll`. Ogni valore è una stringa a **due token** — `"<soglia-container> <soglia-target>"` — dove ogni token può essere:
> - una percentuale (`80%`), un numero in px (`50`, anche negativo: `-25`), o un'unità (`15rem`);
> - una keyword: `top`, `bottom`, `min`, `max` (es. `enter: 'max bottom'`, `leave: 'min top'`);
> - una keyword con offset: `bottom-=50`, `top+=60`.
>
> **`sync` ha quattro forme** — è la fonte di errore più probabile dell'exporter, perché sono tutte valide e fanno cose diverse:
>
> | Valore | Comportamento | Modo in `ProjectState` |
> |---|---|---|
> | `sync: true` | scrub 1:1, l'animazione segue lo scroll esattamente | `{ mode: 'sync' }` |
> | `sync: .25` (Number 0..1) | smooth: insegue lo scroll con ritardo; più vicino a 0 = più lento a recuperare | `{ mode: 'smooth', amount }` |
> | `sync: 'inOutCirc'` (nome di easing) | scrub con easing applicato al progresso | `{ mode: 'eased', ease }` |
> | `sync: 'play pause'` (nomi di metodo) | **NON è scrubbing**: fa partire/fermare l'animazione alle soglie. È il **default**. | — non usato per il parallax |
>
> ⚠️ L'ultima riga è la trappola: se l'exporter omette `sync`, anime.js usa `'play pause'` e l'animazione **parte a tempo** invece di essere guidata dallo scroll — il parallax sembrerà rotto. Per il parallax `sync` va **sempre** emesso esplicitamente.
>
> `debug: true` disegna i marker delle soglie in pagina: usalo nel **preview dell'editor**, escludilo dal codice esportato.

### Esempio: export 3D (Fase 2)
`animation.js` deve prima **bootstrap-are una scena Three vanilla**, poi usare l'adapter:

```js
import * as THREE from './lib/three.module.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { animate, createTimeline, onScroll } from './lib/anime.esm.min.js';
import 'animejs/adapters/three';   // registra l'adapter (verifica come va importato in build vanilla)

// --- scena Three vanilla (boilerplate generato) ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 1000);
camera.position.set(0, 0, 6);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
document.querySelector('#viewport-3d').appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(3,5,2); scene.add(key);

new GLTFLoader().load('./assets/model-01.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  // --- exploded view sullo scroll, pezzo per pezzo, via adapter ---
  const tl = createTimeline({ autoplay: onScroll({ sync: 1 }) });
  // per ogni mesh con offset definito nello stato:
  const part = model.getObjectByName('cover_top');
  // ✅ Con l'adapter si anima il MESH direttamente, con proprietà appiattite:
  tl.add(part, { x: 2.0, y: 1.0, z: 0.0, ease: 'inOutQuad' }, 0);
  // ...altri pezzi...
});

// anime.js pilota anche il render loop (coerente con §12)
createTimer({ onUpdate: () => renderer.render(scene, camera) });
addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
```
> ✅ **VERIFICATO (b)** — la sintassi delle property dell'adapter. L'adapter **appiattisce** le proprietà annidate e **converte le unità** in automatico. Si anima il mesh stesso, non i suoi sotto-oggetti:
> ```js
> animate(mesh, {
>   x: 100,           // → mesh.position.x
>   y: 50,            // → mesh.position.y
>   rotateX: 30,      // → mesh.rotation.x  ⚠️ in GRADI, non radianti
>   rotateY: 60,      // → mesh.rotation.y
>   opacity: 0.5,     // → mesh.material.opacity
>   uTint: '#0080ff', // → mesh.material.uniforms.uTint.value
> });
> ```
> ⚠️ **Attenzione:** la forma `tl.add(mesh.position, { x: 2 })` che gira negli esempi è quella documentata come *"animate Three.js objects **without** the adapter"* — richiede `utils.degToRad()` a mano per le rotazioni. Non confonderle: con l'adapter attivo, usa la forma appiattita (l'exporter la genera molto più facilmente — una chiamata per mesh invece di tre `.add()`).
>
> Extra disponibili sull'adapter: `scale`, `skewX`/`skewZ`, `transformOrigin` (es. `'-.5 -.5 .5'`), e proxy per-istanza su `InstancedMesh`/`BatchedMesh`.
>
> ✅ **VERIFICATO (a)** — ispezionando `animejs@4.5.0` in `node_modules`. La risposta cambia la struttura dello ZIP 3D, quindi leggila prima di scrivere l'exporter 3D:
>
> 1. Il package **esporta** `animejs/adapters/three` (in `package.json` → `exports`), quindi nell'**editor** basta `import 'animejs/adapters/three'` e Vite risolve. Nessun problema lato editor.
> 2. **I bundle prebuilt NON contengono l'adapter.** In `dist/bundles/anime.esm.min.js` (118 KB) le occorrenze di `threeAdapter` sono **zero**. L'adapter vive solo nell'albero modulare `dist/modules/adapters/three/`.
> 3. **Perché è una trappola e non un dettaglio:** l'adapter fa `import ... from '../registry.js'`, cioè si registra nel registry dell'**albero modulare**. Se lo ZIP caricasse il bundle `anime.esm.min.js` *più* l'adapter modulare, si avrebbero **due istanze disgiunte** del motore: l'adapter si registrerebbe in un registry che il bundle non consulta, e **l'animazione 3D fallirebbe in silenzio** — nessun errore, semplicemente il mesh non si muove. È esattamente lo "spigolo" di cui avverte §9.1.
> 4. L'adapter importa anche `three` come **bare specifier**, che un browser non risolve da solo.
>
> **Conseguenza per l'exporter:**
> - **export 2D** → `lib/anime.esm.min.js` (il bundle va benissimo, l'adapter non serve). Invariato.
> - **export 3D** → spedire l'**albero modulare** (`dist/modules/`, ~69 file .js) invece del bundle, importare da `./lib/animejs/index.js`, e aggiungere un **import map** in `index.html` per risolvere il bare specifier:
>   ```html
>   <script type="importmap">
>   { "imports": { "three": "./lib/three.module.js" } }
>   </script>
>   ```
>   Così lo ZIP resta autocontenuto e offline, con un solo registry.
>
> ⚠️ **Ancora da verificare: (c)** la pagina **Common gotchas** dell'adapter. Interroga context7 su `/websites/animejs` prima di implementare l'export 3D.

### Il generatore
- Un modulo `exporter/` con funzioni pure: `stateToHtml(state)`, `stateToCss(state)`, `stateToJs(state)`, `collectAssets(state)`.
- `stateToJs` itera `layers[]` e per ogni layer emette la chiamata anime.js corrispondente al suo tipo/animazione.
- Tieni i template come stringhe/AST semplici; niente magia. Deve essere leggibile il codice generato (è parte del valore: l'utente può aprirlo e capirlo).

---

## 9. INSIDIE NOTE / RISCHI (leggere)

1. **Adapter Three = NEW.** Pochi tutorial, possibili spigoli. Leggi `threejs-adapter-common-gotchas` presto. Non fidarti di esempi trovati in giro senza verificarli sui docs v4.
2. **v3 vs v4.** Gran parte del materiale online è v3 (API diversa). Verifica sempre contro i docs ufficiali v4.
3. **Serve un `.glb` reale per la demo.** Da CAD (Fusion/KiCad → STEP/STL) è convertibile ma è lavoro. **Per l'MVP parti da un modello stock** (es. un glb di esempio) e sostituiscilo dopo. La demo finale ideale è **hardware reale dell'autore** (una board ESP32 / un pezzo del casco) — vale molto di più come portfolio.
4. **Performance mobile del 3D.** WebGL su mobile è delicato: prevedi da subito compressione **Draco/meshopt** sul modello e valuta un fallback a immagine. Non è MVP ma progettalo.
5. **Editor R3F vs export vanilla Three.** Non fonderli. L'editor autora con R3F; l'export emette Three vanilla. Sono due target diversi.
6. **Niente `<form>` e niente storage del browser negli artefatti** generati. Persistenza progetto = file JSON salva/carica.
7. **Il codice generato deve essere leggibile.** È parte del prodotto: un dev deve poter aprire `animation.js` e capirlo/modificarlo.

---

## 10. SETUP INIZIALE (comandi)

```bash
npm create vite@latest parallax-editor -- --template react-ts
cd parallax-editor
npm i animejs three @react-three/fiber @react-three/drei zustand jszip
# opzionale UI:
npm i -D tailwindcss postcss autoprefixer && npx tailwindcss init -p
npm run dev
```

Struttura cartelle proposta:
```
src/
├── store/            # Zustand: ProjectState + azioni (add/update/remove layer, ecc.)
├── editor/
│   ├── Viewport.tsx      # canvas: 2D layers + <Canvas> R3F per i model
│   ├── LayersPanel.tsx
│   ├── PropertiesPanel.tsx
│   └── ScrollTrack.tsx
├── preview/          # runtime di preview (anime.js + onScroll sullo stato)
├── exporter/         # stateToHtml/Css/Js, collectAssets, buildZip
├── schema/           # tipi ProjectState/Layer + validazione
├── assets-store/     # mappa id→Blob/URL per immagini e glb
└── App.tsx
```

Prima milestone di codice suggerita (in ordine): store + schema → shell UI → layer testo/immagine → parallax → preview → **export 2D** (chiudi il ciclo end-to-end sul 2D prima di toccare il 3D).

---

## 11. RIFERIMENTI (docs ufficiali v4 usati)

- Adapters (indice): `https://animejs.com/documentation/adapters`
- Three.js adapter: `https://animejs.com/documentation/adapters/threejs-adapter`
  - object properties, extended transforms, materials & uniforms, instanced meshes, **common gotchas**
- Scroll / onScroll: `https://animejs.com/documentation/events/onscroll`
  - settings, thresholds, synchronisation modes, callbacks
- SVG: `https://animejs.com/documentation/svg` → `morphTo`, `createDrawable`, `createMotionPath`
- Timeline: `https://animejs.com/documentation/timeline`
- Utilities: `https://animejs.com/documentation/utilities` (stagger, lerp, mapRange, clamp…)

---

## 12. NOTA DI CONTESTO (per orientare le scelte)

Progetto **portfolio + strumento di lavoro** per uno sviluppatore **firmware + software** (embedded/IoT, con esperienza web React/Next.js). Il valore differenziante emerge se la **demo finale usa hardware reale dell'autore** (dispositivo ESP32, casco): trasforma il progetto da esercizio a pezzo autentico che racconta il profilo "dal firmware al web". Tienilo a mente quando scegli l'esempio di modello 3D per la vetrina.

Il messaggio da preservare in tutto il progetto: **anime.js al centro dell'animazione** (anche del 3D, via adapter), **Three solo come motore di rendering**. Non ribaltare questa impostazione.
