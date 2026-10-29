import { useEffect, useState, type CSSProperties } from "react";

/**
 * Data e hora atualizadas a cada segundo. Fica num componente próprio para que
 * só ele seja redesenhado — e não a página inteira que o contém.
 */
export function RelogioAoVivo({ style, className }: { style?: CSSProperties; className?: string }) {
  const [agora, setAgora] = useState(() => new Date().toLocaleString("pt-BR"));
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date().toLocaleString("pt-BR")), 1000);
    return () => clearInterval(t);
  }, []);
  return <div style={style} className={className}>{agora}</div>;
}
