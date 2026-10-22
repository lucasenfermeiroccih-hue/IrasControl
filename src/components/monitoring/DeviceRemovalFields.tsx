import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultRemoval, type OpenDevice } from "@/lib/deviceClosure";

interface Props {
  devices: OpenDevice[];
  removals: Record<string, string>;
  onChange: (removals: Record<string, string>) => void;
  dischargeDate: string;
}

const br = (s: string) => (s ? s.split("-").reverse().join("/") : "—");

/**
 * Na saída do paciente, pede a data REAL de retirada de cada dispositivo ainda
 * aberto (evita dispositivo-dia contado até a alta quando foi retirado antes).
 */
export function DeviceRemovalFields({ devices, removals, onChange, dischargeDate }: Props) {
  if (devices.length === 0) return null;

  const fillAll = () => {
    const next = { ...removals };
    devices.forEach((d) => { next[d.slot] = defaultRemoval(d.insercao, dischargeDate); });
    onChange(next);
  };

  return (
    <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50/60 p-3 dark:bg-amber-950/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">Dispositivos ainda em uso</p>
          <p className="text-[11px] text-muted-foreground">Informe a data em que cada um foi retirado. Ela define o dispositivo-dia.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 text-[11px]" onClick={fillAll} disabled={!dischargeDate}>
          Usar a data da saída
        </Button>
      </div>
      {devices.map((d) => (
        <div key={d.slot} className="grid grid-cols-[1fr_auto] items-center gap-2">
          <Label htmlFor={`retirada-${d.slot}`} className="text-xs">
            {d.label} <span className="text-muted-foreground font-normal">— inserido em {br(d.insercao)}</span>
          </Label>
          <Input
            id={`retirada-${d.slot}`}
            type="date"
            className="h-8 w-[150px]"
            value={removals[d.slot] || ""}
            min={d.insercao || undefined}
            max={defaultRemoval(d.insercao, dischargeDate) || undefined}
            onChange={(e) => onChange({ ...removals, [d.slot]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
