import { SCHEMA_VERSION, type ProjectState } from '../schema/types';
import type { Asset, TipoAsset } from '../assets-store/store';

/**
 * Salvataggio e caricamento del progetto.
 *
 * Un file solo, `.parallax.json`, con dentro anche gli asset in base64. È una
 * scelta, non una scorciatoia: il "done when" del §6.7 è «salvo, ricarico la
 * pagina, riapro il file e ritrovo tutto». Con gli asset fuori dal file,
 * riaprire un progetto con un'immagine darebbe un progetto rotto.
 *
 * Il costo è la dimensione: base64 pesa circa un terzo in più del binario, e
 * un .glb da 8 MB diventa un JSON da ~11. Se diventasse un problema, la strada
 * è un contenitore ZIP al posto del JSON, non asset scollegati.
 *
 * Nessun uso di localStorage: la persistenza è un file che l'utente controlla.
 */

export const FORMATO = 'parallax-editor';

type AssetSalvato = {
  id: string;
  nome: string;
  tipo: TipoAsset;
  mime: string;
  /** Contenuto in base64, senza il prefisso data: */
  dati: string;
};

export type FileProgetto = {
  formato: typeof FORMATO;
  versione: number;
  progetto: ProjectState;
  assets: AssetSalvato[];
};

async function blobInBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binario = '';
  // A blocchi: String.fromCharCode con centinaia di migliaia di argomenti
  // supera il limite di stack e fa fallire il salvataggio su file grandi.
  const passo = 0x8000;
  for (let i = 0; i < buf.length; i += passo) {
    binario += String.fromCharCode(...buf.subarray(i, i + passo));
  }
  return btoa(binario);
}

function base64InBlob(dati: string, mime: string): Blob {
  const binario = atob(dati);
  const buf = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) buf[i] = binario.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export async function serializza(progetto: ProjectState, assets: Asset[]): Promise<string> {
  const file: FileProgetto = {
    formato: FORMATO,
    versione: SCHEMA_VERSION,
    progetto,
    assets: await Promise.all(
      assets.map(async (a) => ({
        id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        mime: a.mime,
        dati: await blobInBase64(a.blob),
      })),
    ),
  };
  return JSON.stringify(file, null, 2);
}

export type EsitoCaricamento =
  | { ok: true; progetto: ProjectState; assets: Array<Omit<AssetSalvato, 'dati'> & { blob: Blob }> }
  | { ok: false; errore: string };

/**
 * Legge un file di progetto.
 *
 * Gli errori dicono cosa è successo e cosa fare, non «file non valido»: chi
 * apre il file sbagliato deve capirlo dal messaggio.
 */
export function deserializza(testo: string): EsitoCaricamento {
  let dati: unknown;
  try {
    dati = JSON.parse(testo);
  } catch {
    return { ok: false, errore: 'Il file non è JSON leggibile. Serve un .parallax.json salvato da questo editor.' };
  }

  const f = dati as Partial<FileProgetto>;

  if (f?.formato !== FORMATO) {
    return {
      ok: false,
      errore: `Questo non è un progetto dell'editor parallax${f?.formato ? ` (dice di essere "${f.formato}")` : ''}.`,
    };
  }

  if (typeof f.versione !== 'number') {
    return { ok: false, errore: 'Al file manca il numero di versione: potrebbe essere troncato.' };
  }

  if (f.versione > SCHEMA_VERSION) {
    return {
      ok: false,
      errore: `Il file è in versione ${f.versione}, questo editor arriva alla ${SCHEMA_VERSION}. Aggiorna l'editor per aprirlo.`,
    };
  }

  if (!f.progetto || !Array.isArray(f.progetto.layers)) {
    return { ok: false, errore: 'Il file non contiene un progetto con dei piani.' };
  }

  try {
    const assets = (f.assets ?? []).map((a) => ({
      id: a.id,
      nome: a.nome,
      tipo: a.tipo,
      mime: a.mime,
      blob: base64InBlob(a.dati, a.mime),
    }));
    return { ok: true, progetto: f.progetto, assets };
  } catch {
    return { ok: false, errore: 'Gli asset dentro il file sono corrotti e non si possono ricostruire.' };
  }
}

export function scarica(testo: string, nome = 'progetto.parallax.json') {
  const url = URL.createObjectURL(new Blob([testo], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
