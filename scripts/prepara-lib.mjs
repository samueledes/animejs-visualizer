import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/**
 * Copia in public/lib le librerie che devono girare DENTRO l'iframe
 * dell'anteprima e finire nello ZIP esportato.
 *
 * Perché una copia e non un import: l'anteprima è un documento a sé, e i suoi
 * moduli si risolvono nel suo contesto, non nel bundle dell'app. Servono URL
 * stabili e uguali in dev e in build — public/ è esattamente questo, Vite lo
 * copia verbatim senza toccare i percorsi relativi interni.
 *
 * Perché l'albero MODULARE di anime.js e non il bundle: il bundle NON contiene
 * l'adapter Three (verificato: zero occorrenze di `threeAdapter` in
 * anime.esm.min.js). Caricare bundle e adapter insieme creerebbe due registry
 * disgiunti e l'animazione 3D fallirebbe in silenzio — HANDOFF §8.
 *
 * public/lib è in .gitignore: è output di dipendenze, si rigenera da qui.
 */

/**
 * La disposizione RISPECCHIA quella di three/examples/jsm, e non per ordine:
 * GLTFLoader importa '../utils/BufferGeometryUtils.js'. Messo in lib/ quel
 * percorso cadrebbe in lib/../utils, cioè fuori. Deve stare in lib/loaders/.
 */
const copie = [
  { da: 'node_modules/animejs/dist/modules', a: 'public/lib/animejs' },
  // Il bundle serve all'export 2D, che non ha bisogno dell'adapter ed è più
  // leggero. Convive nella cartella ma i due non vengono MAI caricati insieme:
  // sceglie l'exporter, in base alla presenza di modelli.
  { da: 'node_modules/animejs/dist/bundles/anime.esm.min.js', a: 'public/lib/anime.esm.min.js' },
  { da: 'node_modules/three/build/three.module.js', a: 'public/lib/three.module.js' },
  // three.module.js fa `import from './three.core.js'`: dalla r165 il grosso
  // della libreria sta lì, e senza questo file l'import fallisce.
  { da: 'node_modules/three/build/three.core.js', a: 'public/lib/three.core.js' },
  { da: 'node_modules/three/examples/jsm/loaders/GLTFLoader.js', a: 'public/lib/loaders/GLTFLoader.js' },
  { da: 'node_modules/three/examples/jsm/utils/BufferGeometryUtils.js', a: 'public/lib/utils/BufferGeometryUtils.js' },
  { da: 'node_modules/three/examples/jsm/utils/SkeletonUtils.js', a: 'public/lib/utils/SkeletonUtils.js' },
];

await rm('public/lib', { recursive: true, force: true });
await mkdir('public/lib', { recursive: true });

for (const { da, a } of copie) {
  if (!existsSync(da)) {
    console.error(`prepara-lib: manca ${da}. Hai lanciato npm install?`);
    process.exit(1);
  }
  await mkdir(a.split('/').slice(0, -1).join('/'), { recursive: true });
  await cp(da, a, { recursive: true });
  console.log(`prepara-lib: ${da} -> ${a}`);
}

/**
 * Manifesto dei file copiati.
 *
 * L'exporter gira nel browser e non può leggere il disco: per mettere queste
 * librerie nello ZIP deve sapere quali sono e poterle scaricare da /lib. Senza
 * elenco dovrebbe indovinare i ~70 file dell'albero modulare di anime.js.
 */
async function elenca(dir, prefisso = '') {
  const voci = await readdir(dir, { withFileTypes: true });
  const file = [];
  for (const v of voci) {
    const rel = prefisso ? `${prefisso}/${v.name}` : v.name;
    if (v.isDirectory()) file.push(...(await elenca(`${dir}/${v.name}`, rel)));
    // Solo .js: i .cjs e i .d.ts non servono a un browser e peserebbero e basta.
    else if (v.name.endsWith('.js')) file.push(rel);
  }
  return file;
}

const manifesto = await elenca('public/lib');
await writeFile('public/lib/manifesto.json', JSON.stringify(manifesto, null, 2));
console.log(`prepara-lib: manifesto.json con ${manifesto.length} file`);
