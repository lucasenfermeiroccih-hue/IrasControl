import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, Send, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { MatrizRAM } from "@/components/MatrizRAM";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotifSchema {
  blocos: BlocoSchema[];
  indicadores: IndicadorDef[];
}

interface BlocoSchema {
  id: string;
  titulo: string;
  campos?: CampoSchema[];
  auto_preenche_do_hospital?: boolean;
  repeat_por?: string;
  seletor?: CampoSchema;
  bloco_repetivel?: {
    campos: CampoSchema[];
    validacoes?: ValidacaoSchema[];
  };
  validacoes?: ValidacaoSchema[];
}

interface CampoSchema {
  key: string;
  label: string;
  tipo: string;
  obrigatorio?: boolean;
  opcoes?: string[];
  opcoes_microrganismo?: string[];
  subcampos?: string[];
  mapeia?: string;
  origem?: string;
  preencher_de?: string;
  depende_de?: string;
  mascara?: string;
}

interface ValidacaoSchema {
  regra: string;
  msg: string;
}

interface IndicadorDef {
  key: string;
  label: string;
  formula: string;
  unidade: string;
  por_instancia?: boolean;
  alerta?: { regra: string; msg: string };
}

interface HospitalData {
  name: string;
  state: string;
  cnpj: string | null;
  cnes: string | null;
  type: string;
}

interface DynamicNotificationFormProps {
  schema: NotifSchema;
  hospitalData: HospitalData;
  hospitalId: string;
  initialValues?: Record<string, any>;
  initialBlockValues?: Record<string, Record<string, Record<string, any>>>;
  disabled?: boolean;
  saving?: boolean;
  finalizing?: boolean;
  onSave: (inputs: Record<string, any>, blockValues: BlockValues, calculated: Record<string, any>) => Promise<void>;
  onFinalize: (inputs: Record<string, any>, blockValues: BlockValues, calculated: Record<string, any>) => Promise<void>;
}

export type BlockValues = Record<string, Record<string, Record<string, any>>>;

// ─── Constants ───────────────────────────────────────────────────────────────

const UF_OPTIONS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const MES_OPTIONS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const currentYear = new Date().getFullYear();
const ANO_OPTIONS = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

// ─── Condition evaluator ─────────────────────────────────────────────────────

function evaluateCond(condition: string, topVals: Record<string, any>, blockVals?: Record<string, any>): boolean {
  const allVals = { ...topVals, ...(blockVals || {}) };

  const eqMatch = condition.match(/^(.+?)\s*==\s*(.+)$/);
  if (eqMatch) {
    const key = eqMatch[1].trim();
    const val = eqMatch[2].trim();
    return String(allVals[key] ?? "") === val;
  }

  const contMatch = condition.match(/^(.+?)\s+contém\s+(.+)$/);
  if (contMatch) {
    const key = contMatch[1].trim();
    const val = contMatch[2].trim();
    const fieldVal = allVals[key];
    if (Array.isArray(fieldVal)) return fieldVal.includes(val);
    return String(fieldVal ?? "") === val;
  }

  return true;
}

// ─── Indicator calculator ─────────────────────────────────────────────────────

function sumAcrossBlocks(blockVals: BlockValues, blocoId: string, fieldKey: string): number {
  const bloco = blockVals[blocoId] || {};
  return Object.values(bloco).reduce((acc, itemVals) => {
    return acc + (Number(itemVals[fieldKey]) || 0);
  }, 0);
}

function calculateIndicators(
  schema: NotifSchema,
  topVals: Record<string, any>,
  blockVals: BlockValues
): Record<string, any> {
  const calculated: Record<string, any> = {};

  for (const ind of schema.indicadores) {
    try {
      let formula = ind.formula;

      // Replace sum(field) references first
      formula = formula.replace(/sum\((\w+)\)/g, (_, field) => {
        // Find which block has this field
        let total = 0;
        for (const bloco of schema.blocos) {
          if (bloco.bloco_repetivel) {
            const hasField = bloco.bloco_repetivel.campos.some(c => c.key === field);
            if (hasField) {
              total += sumAcrossBlocks(blockVals, bloco.id, field);
            }
          }
        }
        // Also check top level
        if (topVals[field] !== undefined) total += Number(topVals[field]) || 0;
        return String(total);
      });

      // Replace remaining field references with top-level values
      for (const [key, val] of Object.entries(topVals)) {
        if (typeof val === "number" || typeof val === "string") {
          formula = formula.replace(new RegExp(`\\b${key}\\b`, "g"), String(Number(val) || 0));
        }
      }

      // Evaluate formula safely
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${formula})`)();
      calculated[ind.key] = isFinite(result) ? Number(result.toFixed(4)) : null;
    } catch {
      calculated[ind.key] = null;
    }
  }

  return calculated;
}

// ─── Prefill hook ─────────────────────────────────────────────────────────────

function usePrefillData(
  hospitalId: string,
  ano: number | null,
  mes: string | null,
  setor: string | null
) {
  const [prefill, setPrefill] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!hospitalId || !ano || !mes) return;

    const mesIndex = MES_OPTIONS.indexOf(mes);
    if (mesIndex < 0) return;

    const startDate = `${ano}-${String(mesIndex + 1).padStart(2, "0")}-01`;
    const endDate = new Date(ano, mesIndex + 1, 0);
    const endStr = format(endDate, "yyyy-MM-dd");

    async function loadPrefill() {
      try {
        // Count device days from patient_devices for this hospital/period
        const { data: devices } = await (supabase
          .from("patient_devices" as any)
          .select(`
            device_type, insertion_date, removal_date,
            patient:patients!inner(hospital_id, sector)
          `)
          .eq("patient.hospital_id", hospitalId)
          .lte("insertion_date", endStr)
          .or(`removal_date.is.null,removal_date.gte.${startDate}`) as any);

        if (!devices) return;

        const filtered = setor
          ? devices.filter((d: any) => d.patient?.sector === setor)
          : devices;

        const start = new Date(startDate);
        const end = endDate;

        let pacienteDia = 0;
        let cvcDia = 0;
        let cvdDia = 0;
        let vmDia = 0;
        const countedPatients = new Set<string>();

        for (const d of filtered) {
          const ins = new Date(d.insertion_date);
          const rem = d.removal_date ? new Date(d.removal_date) : end;
          const effectiveStart = ins < start ? start : ins;
          const effectiveEnd = rem > end ? end : rem;
          const days = Math.max(0, Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 86400000) + 1);

          if (days > 0) {
            if (!countedPatients.has(d.patient_id)) {
              countedPatients.add(d.patient_id);
              pacienteDia += days;
            }
            if (d.device_type === "cvc") cvcDia += days;
            if (d.device_type === "svu") cvdDia += days;
            if (d.device_type === "vm")  vmDia += days;
          }
        }

        setPrefill({ paciente_dia: pacienteDia, cvc_dia: cvcDia, cvd_dia: cvdDia, vm_dia: vmDia });
      } catch {
        // silently ignore, prefill is best-effort
      }
    }

    loadPrefill();
  }, [hospitalId, ano, mes, setor]);

  return prefill;
}

// ─── Field renderer ──────────────────────────────────────────────────────────

interface FieldRendererProps {
  campo: CampoSchema;
  value: any;
  onChange: (val: any) => void;
  disabled?: boolean;
  prefillValue?: number;
}

function FieldRenderer({ campo, value, onChange, disabled, prefillValue }: FieldRendererProps) {
  const { tipo, label, obrigatorio, opcoes, opcoes_microrganismo, subcampos } = campo;

  if (tipo === "matriz_ram") {
    return (
      <div className="col-span-full">
        <MatrizRAM
          label={label}
          opcoesMicrorganismo={opcoes_microrganismo || []}
          value={value || {}}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }

  if (tipo === "multiselect") {
    const selected: string[] = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-auto min-h-9 text-left font-normal" disabled={disabled}>
              <span className="flex flex-wrap gap-1 flex-1">
                {selected.length === 0 ? (
                  <span className="text-muted-foreground">Selecionar...</span>
                ) : (
                  selected.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)
                )}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="max-h-60 overflow-y-auto p-2">
              {(opcoes || []).map(opt => (
                <div key={opt} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                  onClick={() => {
                    if (disabled) return;
                    const next = selected.includes(opt)
                      ? selected.filter(x => x !== opt)
                      : [...selected, opt];
                    onChange(next);
                  }}>
                  <Checkbox checked={selected.includes(opt)} readOnly />
                  <span className="text-sm">{opt}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (tipo === "sim_nao") {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (tipo === "select" || tipo === "select_uf") {
    const opts = tipo === "select_uf" ? UF_OPTIONS : (opcoes || []);
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent className="max-h-60">
            {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (tipo === "select_mes") {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Selecionar mês..." /></SelectTrigger>
          <SelectContent>
            {MES_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (tipo === "select_ano") {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Select value={value ? String(value) : ""} onValueChange={v => onChange(Number(v))} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Selecionar ano..." /></SelectTrigger>
          <SelectContent>
            {ANO_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (tipo === "date") {
    const dateVal = value ? new Date(value) : undefined;
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateVal && "text-muted-foreground")} disabled={disabled}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateVal ? format(dateVal, "dd/MM/yyyy") : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateVal}
              onSelect={d => onChange(d ? format(d, "yyyy-MM-dd") : "")}
              locale={ptBR}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (tipo === "int") {
    const hasPrefill = prefillValue !== undefined && prefillValue > 0;
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
          {hasPrefill && value === undefined && (
            <Button type="button" variant="ghost" size="sm" className="h-5 text-xs text-primary px-1"
              onClick={() => onChange(prefillValue)}>
              Pré-carregar ({prefillValue})
            </Button>
          )}
        </Label>
        <Input
          type="number"
          min={0}
          step={1}
          value={value ?? ""}
          placeholder={hasPrefill ? `Sugerido: ${prefillValue}` : "0"}
          onChange={e => onChange(e.target.value === "" ? undefined : parseInt(e.target.value, 10) || 0)}
          disabled={disabled}
        />
      </div>
    );
  }

  // text / email / tel
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        type={tipo === "email" ? "email" : tipo === "tel" ? "tel" : "text"}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={campo.mascara || ""}
      />
    </div>
  );
}

// ─── Block section ──────────────────────────────────────────────────────────

interface BlockSectionProps {
  bloco: BlocoSchema;
  instanceKey: string;
  campos: CampoSchema[];
  values: Record<string, any>;
  onChange: (key: string, val: any) => void;
  validacoes?: ValidacaoSchema[];
  disabled?: boolean;
  prefillData: Record<string, number>;
  topVals: Record<string, any>;
}

function BlockSection({ bloco, instanceKey, campos, values, onChange, validacoes, disabled, prefillData, topVals }: BlockSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const errors: string[] = [];
  for (const v of validacoes || []) {
    try {
      let expr = v.regra;
      for (const [k, val] of Object.entries(values)) {
        if (typeof val === "number") {
          expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), String(val));
        }
      }
      // eslint-disable-next-line no-new-func
      const ok = Function(`"use strict"; return (${expr})`)();
      if (!ok) errors.push(v.msg);
    } catch {
      // ignore
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="text-sm font-semibold text-foreground">{instanceKey}</span>
        <div className="flex items-center gap-2">
          {errors.length > 0 && <Badge variant="destructive" className="text-xs">{errors.length} erro(s)</Badge>}
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4">
          {errors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((e, i) => <li key={i} className="text-xs">{e}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campos.filter(c => {
              if (!c.depende_de) return true;
              return evaluateCond(c.depende_de, topVals, values);
            }).map(campo => (
              <div key={campo.key} className={campo.tipo === "matriz_ram" ? "col-span-full" : ""}>
                <FieldRenderer
                  campo={campo}
                  value={values[campo.key]}
                  onChange={val => onChange(campo.key, val)}
                  disabled={disabled}
                  prefillValue={campo.preencher_de ? prefillData[campo.key] : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DynamicNotificationForm({
  schema,
  hospitalData,
  hospitalId,
  initialValues = {},
  initialBlockValues = {},
  disabled = false,
  saving = false,
  finalizing = false,
  onSave,
  onFinalize,
}: DynamicNotificationFormProps) {
  const [topVals, setTopVals] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = { ...initialValues };
    // Auto-fill hospital data for campos with origem
    for (const bloco of schema.blocos) {
      if (!bloco.auto_preenche_do_hospital) continue;
      for (const campo of bloco.campos || []) {
        if (!campo.origem || v[campo.key] !== undefined) continue;
        if (campo.origem === "hospital.state") v[campo.key] = hospitalData.state || "";
        else if (campo.origem === "hospital.cnpj") v[campo.key] = hospitalData.cnpj || "";
        else if (campo.origem === "hospital.cnes") v[campo.key] = hospitalData.cnes || "";
        else if (campo.origem === "hospital.name") v[campo.key] = hospitalData.name || "";
      }
    }
    return v;
  });

  const [blockVals, setBlockVals] = useState<BlockValues>(initialBlockValues);

  const currentAno = topVals["ano"] ? Number(topVals["ano"]) : null;
  const currentMes = topVals["mes"] || null;
  const currentSetor = topVals["setor"] || null;
  const prefillData = usePrefillData(hospitalId, currentAno, currentMes, currentSetor);

  const setTop = useCallback((key: string, val: any) => {
    setTopVals(prev => ({ ...prev, [key]: val }));
  }, []);

  const setBlock = useCallback((blocoId: string, item: string, key: string, val: any) => {
    setBlockVals(prev => ({
      ...prev,
      [blocoId]: {
        ...(prev[blocoId] || {}),
        [item]: {
          ...((prev[blocoId] || {})[item] || {}),
          [key]: val,
        },
      },
    }));
  }, []);

  function getRepeatItems(blocoId: string, repeatPor: string): string[] {
    // Check if it's controlled by a seletor in this bloco or a top-level multiselect
    const items = topVals[repeatPor];
    return Array.isArray(items) ? items : [];
  }

  function validateAll(): string[] {
    const errors: string[] = [];

    for (const bloco of schema.blocos) {
      const campos = bloco.campos || [];

      // Validate required top-level fields
      if (!bloco.repeat_por) {
        for (const campo of campos) {
          if (!campo.obrigatorio) continue;
          if (campo.depende_de && !evaluateCond(campo.depende_de, topVals)) continue;
          const val = topVals[campo.key];
          if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
            errors.push(`Campo obrigatório em "${bloco.titulo}": ${campo.label}`);
          }
        }
        // Validate bloco-level validacoes
        for (const v of bloco.validacoes || []) {
          try {
            let expr = v.regra;
            for (const [k, val] of Object.entries(topVals)) {
              if (typeof val === "number") {
                expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), String(val));
              }
            }
            // eslint-disable-next-line no-new-func
            const ok = Function(`"use strict"; return (${expr})`)();
            if (!ok) errors.push(v.msg);
          } catch {
            // ignore
          }
        }
      }

      // Validate repeated blocks
      if (bloco.repeat_por && bloco.bloco_repetivel) {
        const items = getRepeatItems(bloco.id, bloco.repeat_por);
        for (const item of items) {
          const itemVals = (blockVals[bloco.id] || {})[item] || {};
          for (const campo of bloco.bloco_repetivel.campos) {
            if (!campo.obrigatorio) continue;
            if (campo.depende_de && !evaluateCond(campo.depende_de, topVals, itemVals)) continue;
            const val = itemVals[campo.key];
            if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
              errors.push(`Campo obrigatório em "${bloco.titulo}" (${item}): ${campo.label}`);
            }
          }
          for (const v of bloco.bloco_repetivel.validacoes || []) {
            try {
              let expr = v.regra;
              for (const [k, val] of Object.entries(itemVals)) {
                if (typeof val === "number") {
                  expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), String(val));
                }
              }
              // eslint-disable-next-line no-new-func
              const ok = Function(`"use strict"; return (${expr})`)();
              if (!ok) errors.push(`${item} → ${v.msg}`);
            } catch {
              // ignore
            }
          }
        }
      }
    }

    return errors;
  }

  const calc = calculateIndicators(schema, topVals, blockVals);

  async function handleSave() {
    await onSave(topVals, blockVals, calc);
  }

  async function handleFinalize() {
    const errors = validateAll();
    if (errors.length > 0) {
      toast.error("Corrija os erros antes de finalizar:", { description: errors.slice(0, 3).join(" | ") });
      return;
    }
    await onFinalize(topVals, blockVals, calc);
  }

  const busy = saving || finalizing;

  return (
    <div className="space-y-6">
      {schema.blocos.map(bloco => {
        const hasRepeat = !!bloco.repeat_por && !!bloco.bloco_repetivel;
        const hasSeletor = !!bloco.seletor;

        return (
          <Card key={bloco.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{bloco.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seletor for repeat_por controlled inside this bloco */}
              {hasSeletor && bloco.seletor && (
                <FieldRenderer
                  campo={bloco.seletor}
                  value={topVals[bloco.seletor.key]}
                  onChange={val => setTop(bloco.seletor!.key, val)}
                  disabled={disabled}
                />
              )}

              {/* Regular top-level campos */}
              {!hasRepeat && (
                <>
                  {/* Block-level validations */}
                  {(bloco.validacoes || []).some(v => {
                    try {
                      let expr = v.regra;
                      for (const [k, val] of Object.entries(topVals)) {
                        if (typeof val === "number") expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), String(val));
                      }
                      // eslint-disable-next-line no-new-func
                      return !Function(`"use strict"; return (${expr})`)();
                    } catch { return false; }
                  }) && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {(bloco.validacoes || []).filter(v => {
                            try {
                              let expr = v.regra;
                              for (const [k, val] of Object.entries(topVals)) {
                                if (typeof val === "number") expr = expr.replace(new RegExp(`\\b${k}\\b`, "g"), String(val));
                              }
                              // eslint-disable-next-line no-new-func
                              return !Function(`"use strict"; return (${expr})`)();
                            } catch { return false; }
                          }).map((v, i) => (
                            <li key={i} className="text-xs">{v.msg}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(bloco.campos || []).filter(c => {
                      if (!c.depende_de) return true;
                      return evaluateCond(c.depende_de, topVals);
                    }).map(campo => (
                      <div key={campo.key} className={campo.tipo === "matriz_ram" ? "col-span-full" : ""}>
                        <FieldRenderer
                          campo={campo}
                          value={topVals[campo.key]}
                          onChange={val => setTop(campo.key, val)}
                          disabled={disabled || !!campo.origem}
                          prefillValue={campo.preencher_de ? prefillData[campo.key] : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Repeated blocks */}
              {hasRepeat && bloco.bloco_repetivel && (() => {
                const items = getRepeatItems(bloco.id, bloco.repeat_por!);
                if (items.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground italic">
                      Selecione os itens acima para exibir os campos por instância.
                    </p>
                  );
                }
                return (
                  <div className="space-y-3">
                    {items.map(item => (
                      <BlockSection
                        key={item}
                        bloco={bloco}
                        instanceKey={item}
                        campos={bloco.bloco_repetivel!.campos}
                        values={(blockVals[bloco.id] || {})[item] || {}}
                        onChange={(k, v) => setBlock(bloco.id, item, k, v)}
                        validacoes={bloco.bloco_repetivel!.validacoes}
                        disabled={disabled}
                        prefillData={prefillData}
                        topVals={topVals}
                      />
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );
      })}

      {/* Indicators preview */}
      {schema.indicadores.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-primary">Indicadores Calculados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schema.indicadores.map(ind => {
                const val = calc[ind.key];
                const display = val === null || val === undefined ? "—"
                  : Number.isFinite(val) ? `${val.toFixed(2)} ${ind.unidade}` : "—";
                const hasAlert = ind.alerta && val !== null && val !== undefined && Number.isFinite(val);
                const alertTriggered = hasAlert && (() => {
                  try {
                    const expr = `${val} ${ind.alerta!.regra}`;
                    // eslint-disable-next-line no-new-func
                    return Function(`"use strict"; return (${expr})`)();
                  } catch { return false; }
                })();
                return (
                  <div key={ind.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{ind.label}</Label>
                    <div className={cn(
                      "px-3 py-2 rounded border font-semibold text-sm",
                      alertTriggered ? "border-destructive bg-destructive/5 text-destructive" : "bg-muted"
                    )}>
                      {display}
                    </div>
                    {alertTriggered && (
                      <p className="text-xs text-destructive">{ind.alerta!.msg}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">{ind.formula}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={handleSave} disabled={busy}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : <><Save className="h-4 w-4 mr-2" />Salvar rascunho</>}
        </Button>
        <Button onClick={handleFinalize} disabled={busy}>
          {finalizing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Finalizando...</> : <><Send className="h-4 w-4 mr-2" />Finalizar</>}
        </Button>
      </div>
    </div>
  );
}
