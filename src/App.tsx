import { useEffect } from 'react';
import { TitleBlock } from './editor/TitleBlock';
import { LayersPanel } from './editor/LayersPanel';
import { Viewport } from './editor/Viewport';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { ScrollTrack } from './editor/ScrollTrack';
import { stateToSources } from './exporter/generate';
import { useEditor } from './store/project';
import './editor/editor.css';

export default function App() {
  // Aggancio di sola diagnostica: espone le sorgenti generate senza passare
  // dallo ZIP, così si può confrontare l'esportato con l'anteprima. Non esiste
  // nella build di produzione.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    Object.assign(window, {
      __sorgenti: () => stateToSources(useEditor.getState().project),
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
