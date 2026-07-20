import { useMemo } from 'react';
import { formaCurva, pathCurva, pathRiferimento } from '../anim/curve';

/**
 * L'anteprima di una easing: la sua curva, disegnata coi valori veri.
 *
 * La retta tratteggiata è il movimento costante. Serve da metro: quanto la
 * curva se ne discosta è esattamente quanto l'animazione accelera o rallenta.
 */
export function CurvaEase({
  nome,
  larghezza = 48,
  altezza = 30,
  attiva = false,
}: {
  nome: string;
  larghezza?: number;
  altezza?: number;
  attiva?: boolean;
}) {
  const forma = useMemo(() => formaCurva(nome), [nome]);
  if (!forma) return <span className="curva curva--assente" aria-hidden />;

  const d = pathCurva(forma.valori, larghezza, altezza);
  const rif = pathRiferimento(forma.valori, larghezza, altezza);

  return (
    <svg
      className={`curva${attiva ? ' curva--attiva' : ''}`}
      viewBox={`0 0 ${larghezza} ${altezza}`}
      width={larghezza}
      height={altezza}
      role="img"
      aria-label={
        forma.sfora
          ? `curva di ${nome}, supera il punto d'arrivo`
          : forma.sottoZero
            ? `curva di ${nome}, indietreggia prima di partire`
            : `curva di ${nome}`
      }
    >
      <path className="curva__riferimento" d={rif} />
      <path className="curva__tracciato" d={d} />
    </svg>
  );
}
