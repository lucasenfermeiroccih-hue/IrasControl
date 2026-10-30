import { useEffect } from "react";
import { graficos3dAtivos } from "@/lib/graficos3d";

/**
 * Filtros SVG que dão volume aos gráficos (Recharts) de toda a plataforma, sem
 * alterar os dados. As regras de index.css (html.graficos-3d) aplicam estes
 * filtros a cada SÉRIE (grupo de barras, pizza inteira, linha, área) — e não a
 * cada barra —, então o custo não cresce com o número de barras.
 *
 * Só operações leves (deslocamento, matriz de cor, um desfoque pequeno):
 *  - bloco: lateral e base escurecidas (extrusão para a direita/baixo, sem
 *    aumentar a altura da barra), borda clara no topo e sombra suave;
 *  - fatia: espessura sob a pizza/rosca e sombra;
 *  - linha: sombra macia sob a curva.
 * Montado uma vez na raiz do app.
 */
export function Graficos3D() {
  useEffect(() => {
    document.documentElement.classList.toggle("graficos-3d", graficos3dAtivos());
  }, []);

  return (
    <svg aria-hidden focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <filter id="ic-3d-bloco" x="-5%" y="-5%" width="115%" height="115%" colorInterpolationFilters="sRGB">
          {/* Faces laterais: cópia escurecida deslocada (profundidade) */}
          <feColorMatrix in="SourceGraphic" type="matrix"
            values="0.6 0 0 0 0  0 0.6 0 0 0  0 0 0.6 0 0  0 0 0 1 0" result="escuro" />
          <feOffset in="escuro" dx="4" dy="3" result="lateral" />
          {/* Borda clara no topo: a própria forma clareada, recortada 2px abaixo */}
          <feColorMatrix in="SourceGraphic" type="matrix"
            values="1 0 0 0 0.35  0 1 0 0 0.35  0 0 1 0 0.35  0 0 0 1 0" result="claro" />
          <feOffset in="SourceAlpha" dx="0" dy="2" result="baixo" />
          <feComposite in="claro" in2="baixo" operator="out" result="topo" />
          {/* Sombra no chão (um único desfoque por série) */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="sombraBlur" />
          <feOffset in="sombraBlur" dx="4" dy="6" result="sombraDesloc" />
          <feComponentTransfer in="sombraDesloc" result="sombra">
            <feFuncA type="linear" slope="0.22" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="sombra" />
            <feMergeNode in="lateral" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="topo" />
          </feMerge>
        </filter>

        <filter id="ic-3d-fatia" x="-10%" y="-10%" width="120%" height="130%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix"
            values="0.55 0 0 0 0  0 0.55 0 0 0  0 0 0.55 0 0  0 0 0 1 0" result="escuro" />
          <feOffset in="escuro" dx="0" dy="6" result="espessura" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="sombraBlur" />
          <feOffset in="sombraBlur" dx="0" dy="11" result="sombraDesloc" />
          <feComponentTransfer in="sombraDesloc" result="sombra">
            <feFuncA type="linear" slope="0.25" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="sombra" />
            <feMergeNode in="espessura" />
            <feMergeNode in="SourceGraphic" />
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
