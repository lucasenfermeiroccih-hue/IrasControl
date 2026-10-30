import { useEffect } from "react";
import { graficos3dAtivos } from "@/lib/graficos3d";

/**
 * Filtros SVG que dão volume aos gráficos (Recharts) de toda a plataforma, sem
 * alterar os dados: as regras de index.css (html.graficos-3d) aplicam estes
 * filtros às barras, fatias, linhas, áreas e radares.
 *  - bloco: lateral e base escurecidas (extrusão para a direita/baixo, sem
 *    aumentar a altura da barra), brilho especular no topo e sombra suave;
 *  - fatia: relevo com luz e sombra projetada;
 *  - linha: sombra macia sob a curva (efeito de fita elevada).
 * Montado uma vez na raiz do app.
 */
export function Graficos3D() {
  useEffect(() => {
    document.documentElement.classList.toggle("graficos-3d", graficos3dAtivos());
  }, []);

  return (
    <svg aria-hidden focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <filter id="ic-3d-bloco" x="-50%" y="-20%" width="200%" height="150%" colorInterpolationFilters="sRGB">
          {/* Faces laterais: cópia escurecida deslocada (profundidade) */}
          <feColorMatrix in="SourceGraphic" type="matrix"
            values="0.55 0 0 0 0  0 0.55 0 0 0  0 0 0.55 0 0  0 0 0 1 0" result="escuro" />
          <feOffset in="escuro" dx="3" dy="2" result="lateral" />
          {/* Brilho de luz vindo de cima à esquerda */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="relevo" />
          <feSpecularLighting in="relevo" surfaceScale="3" specularConstant="0.5" specularExponent="22"
            lightingColor="#ffffff" result="brilho">
            <feDistantLight azimuth="235" elevation="55" />
          </feSpecularLighting>
          <feComposite in="brilho" in2="SourceAlpha" operator="in" result="brilhoDentro" />
          <feComposite in="SourceGraphic" in2="brilhoDentro" operator="arithmetic" k1="0" k2="1" k3="0.4" k4="0" result="frente" />
          {/* Sombra no chão */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="sombraBlur" />
          <feOffset in="sombraBlur" dx="3" dy="4" result="sombraDesloc" />
          <feComponentTransfer in="sombraDesloc" result="sombra">
            <feFuncA type="linear" slope="0.28" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="sombra" />
            <feMergeNode in="lateral" />
            <feMergeNode in="frente" />
          </feMerge>
        </filter>

        <filter id="ic-3d-fatia" x="-20%" y="-20%" width="140%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="relevo" />
          <feSpecularLighting in="relevo" surfaceScale="4" specularConstant="0.5" specularExponent="24"
            lightingColor="#ffffff" result="brilho">
            <feDistantLight azimuth="235" elevation="50" />
          </feSpecularLighting>
          <feComposite in="brilho" in2="SourceAlpha" operator="in" result="brilhoDentro" />
          <feComposite in="SourceGraphic" in2="brilhoDentro" operator="arithmetic" k1="0" k2="1" k3="0.4" k4="0" result="frente" />
          <feColorMatrix in="SourceGraphic" type="matrix"
            values="0.5 0 0 0 0  0 0.5 0 0 0  0 0 0.5 0 0  0 0 0 1 0" result="escuro" />
          <feOffset in="escuro" dx="0" dy="5" result="espessura" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="sombraBlur" />
          <feOffset in="sombraBlur" dx="0" dy="9" result="sombraDesloc" />
          <feComponentTransfer in="sombraDesloc" result="sombra">
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="sombra" />
            <feMergeNode in="espessura" />
            <feMergeNode in="frente" />
          </feMerge>
        </filter>

        <filter id="ic-3d-linha" x="-5%" y="-20%" width="110%" height="160%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="sombraBlur" />
          <feOffset in="sombraBlur" dx="0" dy="5" result="sombraDesloc" />
          <feComponentTransfer in="sombraDesloc" result="sombra">
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="sombra" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
