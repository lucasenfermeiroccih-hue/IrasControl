import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useRegrasAlertas, useSalvarRegrasAlertas } from "@/hooks/useRegrasAlertas";
import { DEVICE_LABELS } from "@/lib/deviceClosure";
import { REGRAS_PADRAO, TIPOS_ALERTA, type RegrasAlertas, type TipoAlerta } from "@/lib/alertasClinicos";

/** Prazo ligado a cada tipo de alerta (os demais só ligam/desligam). */
const PRAZO_DO_TIPO: Partial<Record<TipoAlerta, { campo: "antimicrobiano" | "internacao" | "mdrRecente" | "precaucaoLonga"; texto: string; min: number }>> = {
  mdr_recente: { campo: "mdrRecente", texto: "Exame MDR conta como novo por até", min: 0 },
  antimicrobiano: { campo: "antimicrobiano", texto: "Alertar antimicrobiano sem data de término a partir de (o dobro vira crítico)", min: 1 },
  internacao: { campo: "internacao", texto: "Alertar internação a partir de", min: 1 },
  precaucao_longa: { campo: "precaucaoLonga", texto: "Sugerir reavaliação da precaução a partir de", min: 1 },
};

const ORDEM_TIPOS: TipoAlerta[] = [
  "mdr_sem_precaucao", "mdr_recente", "aerossois", "goticulas", "dispositivo",
  "antimicrobiano", "internacao", "saida_pendente", "precaucao_longa", "sem_leito",
];

function Dias({ valor, onChange, min = 1, max = 365, rotulo }: { valor: number; onChange: (n: number) => void; min?: number; max?: number; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Input type="number" min={min} max={max} value={valor} aria-label={rotulo} className="h-8 w-16 text-right"
        onChange={(e) => onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value) || min))))} />
      <span className="text-xs text-muted-foreground">dia(s)</span>
    </span>
  );
}

/**
 * Prazos e tipos da Central de alertas do hospital (somente administradores;
 * o banco também exige). Valem para todos os usuários assim que salvos.
 */
export function ConfigAlertas({ hospitalId, onSalvo }: { hospitalId: string; onSalvo?: () => void }) {
  const { regras: salvas, disponivel } = useRegrasAlertas(hospitalId);
  const salvar = useSalvarRegrasAlertas(hospitalId);
  const [r, setR] = useState<RegrasAlertas>(salvas);
  const [sujo, setSujo] = useState(false);

  useEffect(() => { if (!sujo) setR(salvas); }, [salvas, sujo]);

  const muda = (f: (x: RegrasAlertas) => RegrasAlertas) => { setR(f); setSujo(true); };
  const ativo = (t: TipoAlerta) => !r.desativados.includes(t);

  const enviar = async () => {
    try {
      await salvar.mutateAsync(r);
      setSujo(false);
      toast.success("Prazos dos alertas salvos. Já valem para toda a equipe.");
      onSalvo?.();
    } catch (e) {
      toast.error("Não foi possível salvar", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      {!disponivel && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          A tabela de regras ainda não existe no banco (migração 20261030160000). Os alertas usam os prazos padrão.
        </p>
      )}

      <section className="space-y-2">
        <p className="text-sm font-semibold">🩺 Dispositivos invasivos</p>
        <p className="text-xs text-muted-foreground">Alerta a partir do prazo; com o dobro do prazo o alerta vira crítico.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.keys(REGRAS_PADRAO.dispositivo).map((k) => (
            <label key={k} className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
              <span className="text-sm font-medium">{DEVICE_LABELS[k] ?? k.toUpperCase()}</span>
              <Dias valor={r.dispositivo[k]} rotulo={`Prazo ${DEVICE_LABELS[k] ?? k}`}
                onChange={(n) => muda((x) => ({ ...x, dispositivo: { ...x.dispositivo, [k]: n } }))} />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold">Tipos de alerta</p>
        <p className="text-xs text-muted-foreground">Desligue os que não fazem parte do protocolo. "Some por" é quanto tempo o alerta fica fora da lista depois de resolvido.</p>
        <div className="space-y-2">
          {ORDEM_TIPOS.map((t) => {
            const prazo = PRAZO_DO_TIPO[t];
            return (
              <div key={t} className={`rounded-xl border px-3 py-2 ${ativo(t) ? "border-border/70 bg-background/60" : "border-dashed opacity-60"}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Switch checked={ativo(t)} aria-label={`Alerta ${TIPOS_ALERTA[t].rotulo} ligado`}
                    onCheckedChange={(v) => muda((x) => ({ ...x, desativados: v ? x.desativados.filter((d) => d !== t) : [...x.desativados, t] }))} />
                  <span className="min-w-0 flex-1 text-sm font-medium">{TIPOS_ALERTA[t].icone} {TIPOS_ALERTA[t].rotulo}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    Some por
                    <Dias valor={r.ocultar[t]} max={30} rotulo={`Dias oculto após resolver: ${TIPOS_ALERTA[t].rotulo}`}
                      onChange={(n) => muda((x) => ({ ...x, ocultar: { ...x.ocultar, [t]: n } }))} />
                  </span>
                </div>
                {prazo && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-dashed pt-2 text-xs text-muted-foreground sm:pl-14">
                    {prazo.texto}
                    <Dias valor={r[prazo.campo]} min={prazo.min} rotulo={prazo.texto}
                      onChange={(n) => muda((x) => ({ ...x, [prazo.campo]: n }))} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="sticky -bottom-6 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-2 border-t bg-background px-6 py-3">
        {sujo && <span className="mr-auto text-sm text-amber-600 dark:text-amber-400">Alterações não salvas</span>}
        <Button variant="ghost" onClick={() => muda(() => REGRAS_PADRAO)}><RotateCcw /> Restaurar padrões</Button>
        <Button onClick={enviar} disabled={!sujo || salvar.isPending || !disponivel}><Save /> {salvar.isPending ? "Salvando…" : "Salvar prazos"}</Button>
      </div>
    </div>
  );
}
