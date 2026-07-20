import { Suspense, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls, useGLTF } from '@react-three/drei';
import type { Object3D } from 'three';
import type { ModelLayer } from '../schema/types';
import { useAssets } from '../assets-store/store';

/**
 * Modo autore per i piani modello.
 *
 * Questa NON è l'anteprima: l'anteprima resta l'artefatto esportato in iframe,
 * e resta l'unica cosa che dice come si muoverà davvero. Qui si autora — si
 * gira intorno al modello, si guardano i pezzi, e in seguito si sposteranno
 * per la vista esplosa. Scrive solo nello stato.
 *
 * Tenere i due ruoli distinti è ciò che impedisce di ricadere nel problema che
 * l'iframe ha risolto: due rendering che raccontano cose diverse. Qui uno solo
 * dei due dichiara di essere l'anteprima.
 */
export function ModelStage({
  layer,
  onMeshes,
}: {
  layer: ModelLayer;
  onMeshes: (nomi: string[]) => void;
}) {
  const asset = useAssets((s) => s.assets[layer.src]);

  if (!asset) {
    return (
      <p className="tavola__vuota">
        Il file di questo modello non è nel progetto. Reimportalo per vederlo.
      </p>
    );
  }

  return (
    <Canvas
      className="scena3d"
      camera={{
        fov: layer.camera?.fov ?? 45,
        position: layer.camera?.position ?? [0, 0, 6],
      }}
    >
      <color attach="background" args={['#101315']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} />

      {/* Griglia nei colori della tavola: il piano di lavoro resta lo stesso
          anche quando si passa al 3D. */}
      <Grid
        infiniteGrid
        cellColor="#262d33"
        sectionColor="#6bb3d6"
        fadeDistance={26}
        position={[0, -1.5, 0]}
      />

      <Suspense fallback={null}>
        <Modello url={asset.url} onMeshes={onMeshes} />
      </Suspense>

      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}

function Modello({ url, onMeshes }: { url: string; onMeshes: (nomi: string[]) => void }) {
  const { scene } = useGLTF(url);

  // Una copia per istanza: useGLTF mette in cache la scena per URL, e montare
  // lo stesso modello due volte condividerebbe gli stessi oggetti.
  const copia = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const nomi: string[] = [];
    copia.traverse((o: Object3D) => {
      if ((o as { isMesh?: boolean }).isMesh) nomi.push(o.name || '(senza nome)');
    });
    onMeshes(nomi);
  }, [copia, onMeshes]);

  return <primitive object={copia} />;
}
