import { formaCurva } from './curve';

/**
 * Cosa dell'API di anime.js l'editor mette in mano all'utente.
 *
 * Elenchi verificati contro `animejs@4.5.0` installato, leggendo
 * `Object.keys(eases)`, non ricordati: i nomi delle easing sono stringhe che
 * finiscono nel codice generato, e una sbagliata fallisce a runtime nel file
 * esportato, cioè dove è più scomodo accorgersene.
 */

/** Proprietà che un piano può animare sulla finestra di scroll. */
export type ChiaveProp = 'opacity' | 'rotate' | 'scale' | 'translateX';

export type PropAnimabile = {
  chiave: ChiaveProp;
  etichetta: string;
  min: number;
  max: number;
  passo: number;
  unita: string;
  /** Coppia da→a proposta quando si attiva la proprietà. */
  predefinito: [number, number];
};

export const PROPRIETA_ANIMABILI: PropAnimabile[] = [
  { chiave: 'opacity', etichetta: 'Opacità', min: 0, max: 1, passo: 0.05, unita: '', predefinito: [0, 1] },
  { chiave: 'rotate', etichetta: 'Rotazione', min: -360, max: 360, passo: 1, unita: '°', predefinito: [0, 12] },
  { chiave: 'scale', etichetta: 'Scala', min: 0, max: 3, passo: 0.05, unita: '×', predefinito: [1, 1.15] },
  { chiave: 'translateX', etichetta: 'Scorrimento X', min: -600, max: 600, passo: 5, unita: 'px', predefinito: [0, 120] },
];

/**
 * Nota: `translateY` non è in elenco di proposito. È la proprietà che il
 * parallax usa già per ogni piano; lasciarla animare anche qui creerebbe due
 * animazioni in conflitto sullo stesso valore.
 */

export type VoceEase = {
  nome: string;
  famiglia: string;
  /** La forma del movimento, descritta sui campioni veri della curva. */
  cosaFa: string;
  /** In che caso sceglierla. */
  quando: string;
  /** Parole italiane per cercare l'effetto senza conoscere il nome. */
  alias: string[];
};

/**
 * Le easing della libreria, con cosa fanno.
 *
 * Le descrizioni sono state scritte leggendo i campioni delle curve reali, non
 * i nomi: `outExpo` sembra appiattirsi subito ma supera il 97% solo dopo il 60%
 * del tempo, e chi lo scrive a memoria sbaglia. Le varianti `outIn` sono le più
 * insidiose — rallentano a METÀ percorso, non agli estremi, che è l'opposto di
 * quello che il nome lascia pensare.
 *
 * Il conteggio si deriva dall'array: scriverlo a mano in un commento è come si
 * finisce a stampare a schermo un numero sbagliato.
 */
export const EASING: VoceEase[] = [
  // --- Base ---
  { nome: "linear", famiglia: "Base", cosaFa: "avanza a passi identici dall'inizio alla fine, nessuna accelerazione: 0,1 ogni decimo", quando: "quando il movimento deve seguire lo scroll uno a uno, tipo parallasse o barre di avanzamento", alias: ["costante", "uniforme", "semplice"] },
  { nome: "in", famiglia: "Base", cosaFa: "parte quasi ferma, a metà corsa è solo al 31%, poi scatta: l'ultimo decimo vale 16%", quando: "per elementi trattenuti che devono scattare via nell'ultimo tratto di scroll", alias: ["costante", "uniforme", "semplice"] },
  { nome: "out", famiglia: "Base", cosaFa: "parte sparata, primo decimo già al 16%, poi frena: l'ultimo decimo aggiunge solo 2%", quando: "per far comparire subito un elemento appena entra in viewport e farlo posare piano", alias: ["costante", "uniforme", "semplice"] },
  { nome: "inOut", famiglia: "Base", cosaFa: "lenta ai due estremi, tutta la corsa sta al centro: dal 34% al 66% in due soli decimi", quando: "per passare tra due stati fermi, come una sezione che si aggancia e si sgancia", alias: ["costante", "uniforme", "semplice"] },
  { nome: "outIn", famiglia: "Base", cosaFa: "scatta subito, quasi si ferma a metà corsa (dal 47% al 53%), poi riaccelera fino in fondo", quando: "quando servono due gesti separati da una pausa a metà scroll, tipo cambio di scena", alias: ["costante", "uniforme", "semplice"] },
  // --- Quad ---
  { nome: "inQuad", famiglia: "Quad", cosaFa: "accelera con dolcezza costante: a metà corsa copre un quarto, il resto lo prende in fondo", quando: "per partenze morbide dove lo stacco iniziale non si deve notare", alias: ["leggero", "sobrio"] },
  { nome: "outQuad", famiglia: "Quad", cosaFa: "scatta subito e frena: a metà ha già fatto tre quarti, l'ultimo tratto è in appoggio", quando: "per elementi che entrano decisi e si posano piano sul punto di arrivo", alias: ["leggero", "sobrio"] },
  { nome: "inOutQuad", famiglia: "Quad", cosaFa: "accelera fino a metà e frena dopo: a tre decimi copre il 18%, curva simmetrica e discreta", quando: "per spostamenti lunghi da bordo a bordo, la versione più sobria della famiglia inOut", alias: ["leggero", "sobrio"] },
  { nome: "outInQuad", famiglia: "Quad", cosaFa: "sale al 42% in tre decimi, striscia tra 0,48 e 0,52 al centro, poi chiude simmetrica", quando: "per legare due sezioni con una pausa centrale appena accennata, la più blanda degli outIn", alias: ["leggero", "sobrio"] },
  // --- Cubic ---
  { nome: "inCubic", famiglia: "Cubic", cosaFa: "resta indietro più a lungo di inQuad, a metà è al 12%, poi chiude con una spinta netta", quando: "quando l'elemento deve sembrare in ritardo e recuperare tutto a fine scroll", alias: ["medio", "classico"] },
  { nome: "outCubic", famiglia: "Cubic", cosaFa: "parte forte, a metà è già all'87% e l'ultimo tratto striscia lento fino al bersaglio", quando: "per reazioni immediate allo scroll che poi si assestano senza fermarsi di colpo", alias: ["medio", "classico"] },
  { nome: "inOutCubic", famiglia: "Cubic", cosaFa: "estremi più pigri di inOutQuad e centro più rapido, il grosso succede a metà scroll", quando: "quando vuoi concentrare il movimento nella parte centrale della sezione", alias: ["medio", "classico"] },
  { nome: "outInCubic", famiglia: "Cubic", cosaFa: "corre al 24% subito, poi striscia tra 0,47 e 0,53 dal 30 al 70%, meno rigida di outInQuart", quando: "per una pausa centrale evidente ma non congelata, tra due movimenti decisi", alias: ["medio", "classico"] },
  // --- Quart ---
  { nome: "inQuart", famiglia: "Quart", cosaFa: "quasi immobile per metà corsa (al 50% è solo al 6%), poi una frustata copre tutto", quando: "per far scattare qualcosa solo in fondo allo scroll, dopo una lunga attesa", alias: ["forte", "deciso"] },
  { nome: "outQuart", famiglia: "Quart", cosaFa: "esplode all'inizio, arriva quasi a destinazione al 90% e lì resta fermo", quando: "quando l'elemento deve arrivare subito e restare stabile per il resto dello scroll", alias: ["forte", "deciso"] },
  { nome: "inOutQuart", famiglia: "Quart", cosaFa: "code appiattite e centro ripido: la prima parte striscia, poi il salto grosso al 50%", quando: "per stacchi netti a metà sezione, con partenza e arrivo quasi immobili", alias: ["forte", "deciso"] },
  { nome: "outInQuart", famiglia: "Quart", cosaFa: "sprint iniziale, poi stallo largo attorno al 50% (dal 30 al 70% quasi fermo), poi sprint", quando: "quando due elementi si scambiano il posto proprio in mezzo allo scroll", alias: ["forte", "deciso"] },
  // --- Quint ---
  { nome: "inQuint", famiglia: "Quint", cosaFa: "immobile per più di metà corsa, poi l'ultimo decimo copre il 41% del tragitto", quando: "per il colpo di scena finale: niente si muove finché non arrivi in fondo", alias: ["estremo", "secco"] },
  { nome: "outQuint", famiglia: "Quint", cosaFa: "il primo decimo di scroll fa già il 41%, e dall'80% in poi è fermo sul bersaglio", quando: "quando vuoi risposta istantanea al primo pixel di scroll e poi immobilità", alias: ["estremo", "secco"] },
  { nome: "inOutQuint", famiglia: "Quint", cosaFa: "resta sotto il 4% fino a tre decimi, poi salta da 0,16 a 0,84 in due soli passi", quando: "per far avvenire quasi tutto nel centro esatto della sezione, tipo un cambio scena secco", alias: ["estremo", "secco"] },
  { nome: "outInQuint", famiglia: "Quint", cosaFa: "parte sparata, si blocca al 50% per quasi mezza corsa, poi riparte sparata", quando: "per un fermo immagine lungo a metà scroll, tra due movimenti rapidi", alias: ["estremo", "secco"] },
  // --- Sine ---
  { nome: "inSine", famiglia: "Sine", cosaFa: "parte piano e accelera senza strappi: a metà tempo copre il 29%, poco meno di in", quando: "per avvii dolci ma un filo più trattenuti di in, senza scatti percepibili", alias: ["morbido", "dolce", "gentile"] },
  { nome: "outSine", famiglia: "Sine", cosaFa: "scatta al 16% nel primo decimo e a metà è già al 71%, con coda finale più piatta di out", quando: "per ingressi reattivi che si posano con la frenata più regolare del set", alias: ["morbido", "dolce", "gentile"] },
  { nome: "inOutSine", famiglia: "Sine", cosaFa: "accelera fino a metà e frena dopo, ma sempre piano: al centro va solo 1,5 volte il lineare", quando: "per movimenti lunghi che devono aprire e chiudere puliti senza farsi notare al centro", alias: ["morbido", "dolce", "gentile"] },
  { nome: "outInSine", famiglia: "Sine", cosaFa: "parte al 15%, rallenta tra 0,48 e 0,52 al centro, poi riaccelera fino in fondo", quando: "per marcare il punto medio con la sosta più breve del gruppo outIn, quasi un respiro", alias: ["morbido", "dolce", "gentile"] },
  // --- Expo ---
  { nome: "inExpo", famiglia: "Expo", cosaFa: "sta quasi ferma per mezzo tragitto e poi esplode: metà movimento nell'ultimo 10% del tempo", quando: "quando vuoi una lunga attesa e poi una comparsa fulminea a fine sezione", alias: ["frustata", "scoppio", "esplode", "fulmineo"] },
  { nome: "outExpo", famiglia: "Expo", cosaFa: "brucia metà distanza nel primo decimo, ma supera il 97% solo dopo il 60% del tempo", quando: "per reazioni istantanee allo scroll che poi restano quasi immobili, tipo un HUD che aggancia", alias: ["frustata", "scoppio", "esplode", "fulmineo"] },
  { nome: "inOutExpo", famiglia: "Expo", cosaFa: "quasi ferma ai due estremi, tutto lo scatto sta al centro: dal 12% all'88% in due passi", quando: "per un salto secco a metà scroll con code lente e lunghe su entrambi i lati", alias: ["frustata", "scoppio", "esplode", "fulmineo"] },
  { nome: "outInExpo", famiglia: "Expo", cosaFa: "sprinta al 37% subito, poi si blocca sul 50% per mezzo tragitto e riparte solo alla fine", quando: "per congelare un elemento a metà schermo mentre lo scroll prosegue, e liberarlo in fondo", alias: ["frustata", "scoppio", "esplode", "fulmineo"] },
  // --- Circ ---
  { nome: "inCirc", famiglia: "Circ", cosaFa: "sale piatta e poi impenna: l'ultimo decimo di tempo si mangia il 44% della distanza", quando: "per un ingresso che resta nascosto a lungo e poi arriva addosso in fondo alla sezione", alias: ["impennata", "muro"] },
  { nome: "outCirc", famiglia: "Circ", cosaFa: "strappa al 44% nel primo decimo ma poi continua a muoversi visibile: a metà è all'87%", quando: "per un'entrata reattiva che conserva deriva leggibile, meno secca di outExpo", alias: ["impennata", "muro"] },
  { nome: "inOutCirc", famiglia: "Circ", cosaFa: "striscia agli estremi e attraversa il centro di corsa: dal 20% all'80% in due soli passi", quando: "per uno scatto centrale più morbido di inOutExpo ma comunque netto e visibile", alias: ["impennata", "muro"] },
  { nome: "outInCirc", famiglia: "Circ", cosaFa: "parte al 30% di colpo, si ferma quasi del tutto sul 50%, poi riparte e chiude con un muro", quando: "per due movimenti decisi separati da una sosta a metà scroll, con arrivo brusco", alias: ["impennata", "muro"] },
  // --- Back ---
  { nome: "inBack", famiglia: "Back", cosaFa: "arretra sotto zero fino a -0,1, resta indietro per mezza corsa, poi scatta e recupera tutto", quando: "per far caricare un elemento all'indietro prima di lanciarlo: energia tutta in fondo", alias: ["scatto", "sorpasso", "oltre", "rinculo", "sfora"] },
  { nome: "outBack", famiglia: "Back", cosaFa: "parte sparata, sfora fino a 1,1 poco dopo metà e poi rientra piano sul bersaglio", quando: "per far atterrare qualcosa con un rinculo: la spinta sta tutta nelle prime battute", alias: ["scatto", "sorpasso", "oltre", "rinculo", "sfora"] },
  { nome: "inOutBack", famiglia: "Back", cosaFa: "arretra a -0,05 in avvio, corre nel mezzo, sfora a 1,05 e rientra: sborda a entrambi i capi", quando: "per passaggi tra due stati fermi che devono strappare sia in uscita sia in arrivo", alias: ["scatto", "sorpasso", "oltre", "rinculo", "sfora"] },
  { nome: "outInBack", famiglia: "Back", cosaFa: "parte veloce, supera metà a 0,55, torna indietro a 0,45 e riparte: si inverte al centro", quando: "quando lo scroll deve stallare e ondeggiare a metà percorso, non agli estremi", alias: ["scatto", "sorpasso", "oltre", "rinculo", "sfora"] },
  // --- Elastic ---
  { nome: "inElastic", famiglia: "Elastic", cosaFa: "vibra da ferma con oscillazioni crescenti, sprofonda a -0,25, poi frusta su 1 di colpo", quando: "per un elemento che trema prima di sparire via: la frustata è tutta sull'ultimo tratto", alias: ["molla", "elastico", "oscilla", "vibra"] },
  { nome: "outElastic", famiglia: "Elastic", cosaFa: "sbatte subito a 1,25, poi oscilla attorno al bersaglio con scarti sempre più piccoli", quando: "per un arrivo elastico che si assesta: tutto lo strappo è nei primi pixel di scroll", alias: ["molla", "elastico", "oscilla", "vibra"] },
  { nome: "inOutElastic", famiglia: "Elastic", cosaFa: "cresce di tremito verso il centro, scende a -0,06, sfora a 1,06 e si posa in fretta", quando: "per un salto al centro con la vibrazione tutta lì, mentre gli estremi restano quasi fermi", alias: ["molla", "elastico", "oscilla", "vibra"] },
  { nome: "outInElastic", famiglia: "Elastic", cosaFa: "scatta a 0,56, poi resta a vibrare attorno a metà quasi tutta la corsa e chiude su 1", quando: "per tenere l'elemento in stallo tremolante a metà scroll e liberarlo solo alla fine", alias: ["molla", "elastico", "oscilla", "vibra"] },
  // --- Bounce ---
  { nome: "inBounce", famiglia: "Bounce", cosaFa: "sobbalza da ferma con salti corti e via via più ampi, poi sale pulita fino a 1", quando: "per un ingresso nervoso: i sussulti stanno in partenza, l'arrivo è liscio", alias: ["rimbalzo", "palla", "rimbalza"] },
  { nome: "outBounce", famiglia: "Bounce", cosaFa: "sale spedita e poi picchietta sotto il bersaglio con rimbalzi che si spengono, mai oltre 1", quando: "per far cadere un elemento e farlo assestare come una palla sul pavimento", alias: ["rimbalzo", "palla", "rimbalza"] },
  { nome: "inOutBounce", famiglia: "Bounce", cosaFa: "sobbalza in partenza, attraversa il centro veloce, picchietta in arrivo: urti ai due capi", quando: "per transizioni tra due posizioni fisse che devono sembrare urtate a entrambi i capi", alias: ["rimbalzo", "palla", "rimbalza"] },
  { nome: "outInBounce", famiglia: "Bounce", cosaFa: "rimbalza salendo, si ferma a metà a 0,5, poi rimbalza ancora verso 1: urti tutti al centro", quando: "quando il movimento deve sballottare e rallentare a metà corsa anziché agli estremi", alias: ["rimbalzo", "palla", "rimbalza"] },
];

export const TUTTI_GLI_EASE = EASING.map((e) => e.nome);
export const QUANTI_EASE = EASING.length;

const perNome = new Map(EASING.map((e) => [e.nome, e]));
export const voceEase = (nome: string) => perNome.get(nome) ?? null;

/** Le famiglie nell'ordine del catalogo, che è l'ordine di durezza crescente. */
export function famiglieEase(): Array<{ famiglia: string; voci: VoceEase[] }> {
  const gruppi: Array<{ famiglia: string; voci: VoceEase[] }> = [];
  for (const v of EASING) {
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.famiglia === v.famiglia) ultimo.voci.push(v);
    else gruppi.push({ famiglia: v.famiglia, voci: [v] });
  }
  return gruppi;
}

/** Etichetta breve del comportamento anomalo, se c'è. Serve da badge. */
export function stranezzaEase(nome: string): string | null {
  const f = formaCurva(nome);
  if (!f) return null;
  if (f.sfora && f.sottoZero) return 'sfora e arretra';
  if (f.sfora) return 'supera il bersaglio';
  if (f.sottoZero) return 'arretra prima';
  return null;
}
