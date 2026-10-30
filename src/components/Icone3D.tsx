import type { ElementType } from "react";

/** Ícone do menu com volume 3D; `matiz` é o tom (0–360) da seção. */
export function Icone3D({ icon: Icone, matiz = 160, ativo = false, className = "" }: {
  icon: ElementType;
  matiz?: number;
  ativo?: boolean;
  className?: string;
}) {
  return (
    <span className={`icone-3d ${ativo ? "ativo" : ""} ${className}`} style={{ ["--i-h" as string]: matiz }} aria-hidden>
      <Icone />
    </span>
  );
}
