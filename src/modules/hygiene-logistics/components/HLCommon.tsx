import { ReactNode, useMemo, useState } from "react";
import { Info, ArrowUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STATUS_META, type OperationalStatus } from "../utils/logisticsFormulas";
import { HGNI } from "../data/mockData";

export function HLPageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          CCIH / SCIH · {HGNI}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help align-middle text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

export function StatusBadge({ status }: { status: OperationalStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium", meta.className)}>
      {meta.dot} {meta.label}
    </Badge>
  );
}

export function KpiCard({
  label, value, hint, tone = "default", icon,
}: {
  label: string; value: ReactNode; hint?: string;
  tone?: "default" | "danger" | "warning" | "success" | "info"; icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "border-border",
    danger: "border-destructive/40 bg-destructive/5",
    warning: "border-orange-500/40 bg-orange-500/5",
    success: "border-emerald-500/40 bg-emerald-500/5",
    info: "border-blue-500/40 bg-blue-500/5",
  };
  const valueTone: Record<string, string> = {
    default: "text-foreground",
    danger: "text-destructive",
    warning: "text-orange-600",
    success: "text-emerald-600",
    info: "text-blue-600",
  };
  return (
    <Card className={cn(tones[tone])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {icon}
        </div>
        <p className={cn("mt-1 text-2xl font-bold", valueTone[tone])}>{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T>({
  rows, columns, searchable = true, searchKeys, pageSize = 15, rowClassName, emptyMessage = "Nenhum registro encontrado.",
}: {
  rows: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (row: T) => string;
  pageSize?: number;
  rowClassName?: (row: T) => string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let out = rows;
    if (query && searchKeys) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchKeys(r).toLowerCase().includes(q));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
          return String(va).localeCompare(String(vb), "pt-BR") * sort.dir;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="space-y-3">
      {searchable && searchKeys && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Buscar..."
            className="pl-8 h-9"
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("px-2 py-2 text-left font-semibold whitespace-nowrap", c.className)}>
                  {c.sortValue ? (
                    <button
                      className="inline-flex items-center gap-1 hover:text-primary"
                      onClick={() =>
                        setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))
                      }
                    >
                      {c.header}
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {slice.map((row, i) => (
              <tr key={i} className={cn("border-t hover:bg-muted/40", rowClassName?.(row))}>
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-2 py-1.5 align-middle", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} registro(s)</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</Button>
            <span>Página {current + 1} de {pages}</span>
            <Button size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SectionCard({ title, description, actions, children }: {
  title: string; description?: string; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
