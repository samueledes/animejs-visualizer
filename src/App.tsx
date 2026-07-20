import { useEffect } from 'react';
import { TitleBlock } from './editor/TitleBlock';
import { LayersPanel } from './editor/LayersPanel';
import { Viewport } from './editor/Viewport';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { ScrollTrack } from './editor/ScrollTrack';
import { stateToSources } from './exporter/generate';
import { buildZip } from './exporter/buildZip';
import { useEditor } from './store/project';
import { useAssets } from './assets-store/store';
import './editor/editor.css';

export default function App() {
  // Aggancio di sola diagnostica: espone le sorgenti generate senza passare
  // dallo ZIP, così si può confrontare l'esportato con l'anteprima. Non esiste
  // nella build di produzione.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    Object.assign(window, {
      __sorgenti: () => {
        const assets = useAssets.getState().assets;
        return stateToSources(useEditor.getState().project, (id) => assets[id]?.url ?? null);
      },
      // Lo ZIP vero, in base64: serve a verificare l'archivio prodotto da
      // buildZip senza passare dal download del browser.
      __zip: async () => {
        const blob = await buildZip(useEditor.getState().project, useAssets.getState().assets);
        const buf = new Uint8Array(await blob.arrayBuffer());
        let bin = '';
        for (let i = 0; i < buf.length; i += 0x8000) {
          bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        }
        return btoa(bin);
      },
    });
  }, []);

  return (
    <div className="tavolo">
      <TitleBlock />
      <LayersPanel />
      <Viewport />
      <PropertiesPanel />
      <ScrollTrack />
    </div>
  );
}
