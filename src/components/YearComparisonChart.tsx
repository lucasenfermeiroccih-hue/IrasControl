import { useRef, useState, useMemo } from "react";
import { TrendingUp, CalendarRange } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import ChartActions from "./ChartActions";

const COLORS = [
  "hsl(168 66% 34%)", "hsl(217 91% 60%)", "hsl(0 72% 51%)",
  "hsl(38 92% 50%)", "hsl(262 83% 58%)", "hsl(330 81% 60%)",
];

interface Props {
  title: string;
  unit?: string;
  years: string[];
  /** mes -> { [year]: value } already prepared */
  data: Array<Record<string, any>>;
  metaValue?: number;
  onMetaChange: (v: number | undefined) => void;
}

export default function YearComparisonChart({ title, unit = "", years, data, metaValue, onMetaChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedYears, setSelectedYears] = useState<string[]>(years);
  const [popOpen, setPopOpen] = useState(false);

  // keep selection in sync if available years change
  const visibleYears = useMemo(
    () => selectedYears.filter(y => years.includes(y)),
    [selectedYears, years]
  );
  const yearsToShow = visibleYears.length > 0 ? visibleYears : years;

  const toggleYear = (y: string) => {
    setSelectedYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y]);
  };

  const fullTitle = `Comparativo Anual — ${title}${unit ? ` (${unit})` : ""}`;

  return (
    <Card ref={ref}>
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {fullTitle}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Popover open={popOpen} onOpenChange={setPopOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Definir anos comparativos">
                <CalendarRange className={`h-3.5 w-3.5 ${visibleYears.length > 0 && visibleYears.length < years.length ? "text-primary" : "text-muted-foreground"}`} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Anos para comparar</p>
                <div className="max-h-64 overflow-auto space-y-1.5">
                  {years.map(y => (
                    <div key={y} className="flex items-center gap-2">
                      <Checkbox
                        id={`yr-${title}-${y}`}
                        checked={selectedYears.includes(y)}
                        onCheckedChange={() => toggleYear(y)}
                      />
                      <Label htmlFor={`yr-${title}-${y}`} className="text-xs font-normal cursor-pointer">{y}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedYears(years)}>Todos</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedYears([])}>Limpar</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <ChartActions
            chartRef={ref}
            chartTitle={fullTitle}
            metaValue={metaValue}
            onMetaChange={onMetaChange}
            metaUnit={unit}
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {yearsToShow.map((y, i) => (
              <Line
                key={y}
                type="monotone"
                dataKey={y}
                name={y}
                stroke={COLORS[years.indexOf(y) % COLORS.length] || COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
            {metaValue !== undefined && (
              <ReferenceLine
                y={metaValue}
                stroke="hsl(168 66% 34%)"
                strokeDasharray="6 3"
                strokeWidth={2}
                label={{ value: `Meta: ${metaValue}${unit}`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
