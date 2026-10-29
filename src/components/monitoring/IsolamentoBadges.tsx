import { Biohazard } from "lucide-react";
import { MDR_META, PRECAUCAO_META, TIPOS_PRECAUCAO, type SituacaoIsolamento } from "@/lib/precautionStatus";

const fmt = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "");

/** Selos de precaução (coloridos por tipo) e de MDR, ao lado do nome do paciente. */
export function IsolamentoBadges({ s, compacto = false }: { s: SituacaoIsolamento; compacto?: boolean }) {
  if (!s.mdr && s.precaucoes.length === 0) return null;
  const detalhe = [
    s.organismos.length ? `Microrganismo(s): ${s.organismos.join(", ")}` : "",
    s.desde ? `Desde ${fmt(s.desde)}` : "",
    s.noMapa ? "Cadastrado no Mapeamento de Precaução" : "",
  ].filter(Boolean).join("\n");

  return (
    <span className="inline-flex flex-wrap items-center gap-1" title={detalhe || undefined}>
      {s.mdr && (
        <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-bold tracking-wide ${MDR_META.chip}`}>
          <Biohazard className="h-3 w-3" /> MDR
        </span>
      )}
      {s.precaucoes.map((t) => {
        const m = PRECAUCAO_META[t];
        return (
          <span key={t} className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-semibold ${m.chip}`}>
            <span aria-hidden>{m.icon}</span>{compacto ? "" : ` ${m.label}`}
            {compacto && <span className="sr-only">{m.label}</span>}
          </span>
        );
      })}
    </span>
  );
}

/** Legenda das cores. */
export function IsolamentoLegenda({ totalMdr, totalPrecaucao }: { totalMdr: number; totalPrecaucao: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 text-[10px] font-bold ${MDR_META.chip}`}>
        <Biohazard className="h-3 w-3" /> MDR
      </span>
      <span>bactéria multirresistente</span>
      {TIPOS_PRECAUCAO.slice().reverse().map((t) => (
        <span key={t} className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 text-[10px] font-semibold ${PRECAUCAO_META[t].chip}`}>
          {PRECAUCAO_META[t].icon} {t}
        </span>
      ))}
      <span className="ml-auto font-medium text-foreground">
        {totalPrecaucao} internado(s) em precaução · {totalMdr} com MDR
      </span>
    </div>
  );
}
