import { TitleBlock } from './editor/TitleBlock';
import { LayersPanel } from './editor/LayersPanel';
import { Viewport } from './editor/Viewport';
import { PropertiesPanel } from './editor/PropertiesPanel';
import { ScrollTrack } from './editor/ScrollTrack';
import './editor/editor.css';

export default function App() {
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
