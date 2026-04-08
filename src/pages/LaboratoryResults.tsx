import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { Search, Microscope, AlertTriangle, Clock, Eye, FlaskConical, Loader2, Download } from "lucide-react";

type SIR = "S" | "I" | "R";

const sirColor: Record<SIR, string> = {
  S: "bg-green-100 text-green-800 border-green-300",
  I: "bg-yellow-100 text-yellow-800 border-yellow-300",
  R: "bg-red-100 text-red-800 border-red-300",
};

const LaboratoryResults = () => {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    if (!hospitalId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("lab_results")
        .select("*, patient:patients(full_name, medical_record, sector), antibiogram_results(*)")
        .eq("hospital_id", hospitalId)
        .order("collection_date", { ascending: false });
      setResults(data || []);
      setLoading(false);
    };
    fetch();
  }, [hospitalId]);

  const filtered = results.filter(r => {
    const name = (r.patient as any)?.full_name || "";
    const record = (r.patient as any)?.medical_record || "";
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !record.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "todos" && r.status !== filterStatus) return false;
    return true;
  });

  const kpis = {
    total: results.length,
    pendentes: results.filter(r => r.status === "pending").length,
    completos: results.filter(r => r.status === "completed").length,
  };

  if (ctxLoading || loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Resultados Laboratoriais</h1><p className="text-muted-foreground">Culturas, antibiogramas e perfil de resistência</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><FlaskConical className="mx-auto h-8 w-8 text-primary mb-2" /><p className="text-2xl font-bold">{kpis.total}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Clock className="mx-auto h-8 w-8 text-warning mb-2" /><p className="text-2xl font-bold">{kpis.pendentes}</p><p className="text-sm text-muted-foreground">Pendentes</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Microscope className="mx-auto h-8 w-8 text-success mb-2" /><p className="text-2xl font-bold">{kpis.completos}</p><p className="text-sm text-muted-foreground">Completos</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente ou prontuário..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="completed">Completo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Resultados ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Microorganismo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Coleta</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum resultado laboratorial.</TableCell></TableRow>}
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium">{(r.patient as any)?.full_name || "—"}</div><div className="text-xs text-muted-foreground">{(r.patient as any)?.medical_record || ""}</div></TableCell>
                  <TableCell>{(r.patient as any)?.sector || "—"}</TableCell>
                  <TableCell className="text-sm">{r.sample_type || "—"}</TableCell>
                  <TableCell><span className="text-sm">{r.organism || "—"}</span></TableCell>
                  <TableCell><Badge variant={r.status === "pending" ? "outline" : "secondary"}>{r.status === "pending" ? "Pendente" : "Completo"}</Badge></TableCell>
                  <TableCell className="text-sm">{r.collection_date}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setDetail(r)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.organism || "Resultado Laboratorial"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Paciente:</span> {(detail.patient as any)?.full_name || "—"}</div>
                  <div><span className="text-muted-foreground">Prontuário:</span> {(detail.patient as any)?.medical_record || "—"}</div>
                  <div><span className="text-muted-foreground">Material:</span> {detail.sample_type || "—"}</div>
                  <div><span className="text-muted-foreground">Coleta:</span> {detail.collection_date}</div>
                </div>
                {detail.antibiogram_results?.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-2">Antibiograma</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {detail.antibiogram_results.map((ab: any) => (
                        <div key={ab.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                          <span className="truncate">{ab.antibiotic}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${sirColor[ab.sensitivity as SIR] || ""}`}>{ab.sensitivity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Antibiograma não disponível.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaboratoryResults;
