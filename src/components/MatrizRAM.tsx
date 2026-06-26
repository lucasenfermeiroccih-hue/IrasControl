import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface RamEntry {
  isolados: number;
  testados: number;
  resistentes: number;
}

interface MatrizRAMProps {
  label: string;
  opcoesMicrorganismo: string[];
  value: Record<string, RamEntry>;
  onChange: (val: Record<string, RamEntry>) => void;
  disabled?: boolean;
}

export function MatrizRAM({ label, opcoesMicrorganismo, value, onChange, disabled }: MatrizRAMProps) {
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState<string[]>(
    Object.keys(value).filter(k => Object.keys(value[k] || {}).length > 0)
  );

  function toggleOrg(org: string) {
    if (disabled) return;
    if (selected.includes(org)) {
      setSelected(s => s.filter(x => x !== org));
      const next = { ...value };
      delete next[org];
      onChange(next);
    } else {
      setSelected(s => [...s, org]);
      if (!value[org]) {
        onChange({ ...value, [org]: { isolados: 0, testados: 0, resistentes: 0 } });
      }
    }
  }

  function handleChange(org: string, field: keyof RamEntry, raw: string) {
    const num = raw === "" ? 0 : Math.max(0, parseInt(raw, 10) || 0);
    onChange({ ...value, [org]: { ...(value[org] || { isolados: 0, testados: 0, resistentes: 0 }), [field]: num } });
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/40 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-sm font-medium">{label}</span>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Selector de microrganismos */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Selecione os microrganismos identificados:</p>
            <div className="flex flex-wrap gap-2">
              {opcoesMicrorganismo.map(org => (
                <Button
                  key={org}
                  type="button"
                  size="sm"
                  variant={selected.includes(org) ? "default" : "outline"}
                  className="text-xs h-7"
                  onClick={() => toggleOrg(org)}
                  disabled={disabled}
                >
                  {org}
                </Button>
              ))}
            </div>
          </div>

          {/* Tabela de subcampos */}
          {selected.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Microrganismo</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground w-28">Isolados</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground w-28">Testados</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground w-28">Resistentes</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground w-20">%</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map(org => {
                    const entry = value[org] || { isolados: 0, testados: 0, resistentes: 0 };
                    const pct = entry.testados > 0
                      ? ((entry.resistentes / entry.testados) * 100).toFixed(1) + "%"
                      : "—";
                    return (
                      <tr key={org} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <span className="text-xs">{org}</span>
                        </td>
                        {(["isolados", "testados", "resistentes"] as const).map(field => (
                          <td key={field} className="py-2 px-2">
                            <Input
                              type="number"
                              min={0}
                              value={entry[field] || 0}
                              onChange={e => handleChange(org, field, e.target.value)}
                              disabled={disabled}
                              className="h-7 text-center text-xs w-full"
                            />
                          </td>
                        ))}
                        <td className="py-2 px-2 text-center">
                          <Badge variant={entry.resistentes > 0 ? "destructive" : "secondary"} className="text-xs">
                            {pct}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selected.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Nenhum microrganismo selecionado.</p>
          )}
        </div>
      )}
    </div>
  );
}
