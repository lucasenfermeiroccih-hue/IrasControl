import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Microscope, AlertTriangle, Clock, FileUp, Eye, FlaskConical } from "lucide-react";

type SIR = "S" | "I" | "R";

interface Antibiotic {
  nome: string;
  resultado: SIR;
}

interface LabResult {
  id: string;
  prontuario: string;
  paciente: string;
  setor: string;
  material: string;
  microorganismo: string;
  dataColeta: string;
  dataResultado?: string;
  status: "pendente" | "liberado";
  antibiograma: Antibiotic[];
  resistenciaCritica: boolean;
}

const sirColor: Record<SIR, string> = {
  S: "bg-green-100 text-green-800 border-green-300",
  I: "bg-yellow-100 text-yellow-800 border-yellow-300",
  R: "bg-red-100 text-red-800 border-red-300",
};

const antibioticosComuns = ["Amicacina", "Ampicilina", "Cefepime", "Ceftriaxona", "Ciprofloxacino", "Ertapenem", "Gentamicina", "Imipenem", "Meropenem", "Piperacilina/Tazo", "Polimixina B", "Tigeciclina", "Vancomicina", "Linezolida", "Sulfametoxazol/Trim"];

const generateAntibiogram = (type: string): Antibiotic[] => {
  const profiles: Record<string, () => Antibiotic[]> = {
    KPC: () => antibioticosComuns.map((a) => ({ nome: a, resultado: ["Polimixina B", "Tigeciclina", "Amicacina"].includes(a) ? "S" as SIR : "R" as SIR })),
    MRSA: () => antibioticosComuns.map((a) => ({ nome: a, resultado: ["Vancomicina", "Linezolida", "Sulfametoxazol/Trim"].includes(a) ? "S" as SIR : ["Tigeciclina"].includes(a) ? "I" as SIR : "R" as SIR })),
    ESBL: () => antibioticosComuns.map((a) => ({ nome: a, resultado: ["Imipenem", "Meropenem", "Ertapenem", "Amicacina", "Piperacilina/Tazo"].includes(a) ? "S" as SIR : ["Ciprofloxacino"].includes(a) ? "I" as SIR : "R" as SIR })),
    default: () => antibioticosComuns.map((a) => ({ nome: a, resultado: (Math.random() > 0.3 ? "S" : Math.random() > 0.5 ? "I" : "R") as SIR })),
  };
  return (profiles[type] || profiles.default)();
};

const initialResults: LabResult[] = [
  { id: "LAB-001", prontuario: "P-10234", paciente: "Maria S. Lima", setor: "UTI Adulto", material: "Hemocultura", microorganismo: "Klebsiella pneumoniae (KPC)", dataColeta: "2026-03-25", dataResultado: "2026-03-27", status: "liberado", antibiograma: generateAntibiogram("KPC"), resistenciaCritica: true },
  { id: "LAB-002", prontuario: "P-10890", paciente: "João P. Santos", setor: "UTI Neonatal", material: "Secreção Traqueal", microorganismo: "Pseudomonas aeruginosa", dataColeta: "2026-03-24", dataResultado: "2026-03-26", status: "liberado", antibiograma: generateAntibiogram("default"), resistenciaCritica: false },
  { id: "LAB-003", prontuario: "P-11023", paciente: "Ana C. Ferreira", setor: "CC", material: "Secreção de Ferida", microorganismo: "Staphylococcus aureus (MRSA)", dataColeta: "2026-03-26", dataResultado: "2026-03-28", status: "liberado", antibiograma: generateAntibiogram("MRSA"), resistenciaCritica: true },
  { id: "LAB-004", prontuario: "P-09876", paciente: "Carlos R. Oliveira", setor: "Enfermaria A", material: "Urinocultura", microorganismo: "E. coli (ESBL)", dataColeta: "2026-03-22", dataResultado: "2026-03-24", status: "liberado", antibiograma: generateAntibiogram("ESBL"), resistenciaCritica: true },
  { id: "LAB-005", prontuario: "P-11200", paciente: "Fernanda M. Costa", setor: "UTI Adulto", material: "Ponta de CVC", microorganismo: "Candida auris (suspeita)", dataColeta: "2026-03-26", status: "pendente", antibiograma: [], resistenciaCritica: true },
  { id: "LAB-006", prontuario: "P-10567", paciente: "Ricardo A. Mendes", setor: "UTI Pediátrica", material: "Hemocultura", microorganismo: "Staphylococcus epidermidis", dataColeta: "2026-03-23", dataResultado: "2026-03-25", status: "liberado", antibiograma: generateAntibiogram("default"), resistenciaCritica: false },
  { id: "LAB-007", prontuario: "P-11345", paciente: "Lucia B. Alves", setor: "Pronto Socorro", material: "Swab Nasal", microorganismo: "MRSA", dataColeta: "2026-03-26", dataResultado: "2026-03-27", status: "liberado", antibiograma: generateAntibiogram("MRSA"), resistenciaCritica: true },
  { id: "LAB-008", prontuario: "P-10999", paciente: "Pedro H. Rocha", setor: "UTI Adulto", material: "Hemocultura", microorganismo: "Acinetobacter baumannii MR", dataColeta: "2026-03-25", dataResultado: "2026-03-27", status: "liberado", antibiograma: generateAntibiogram("KPC"), resistenciaCritica: true },
  { id: "LAB-009", prontuario: "P-11100", paciente: "Mariana F. Dias", setor: "UTI Adulto", material: "Aspirado Traqueal", microorganismo: "Pseudomonas aeruginosa", dataColeta: "2026-03-27", status: "pendente", antibiograma: [], resistenciaCritica: false },
  { id: "LAB-010", prontuario: "P-10450", paciente: "Roberto G. Nunes", setor: "Enfermaria B", material: "Urinocultura", microorganismo: "Proteus mirabilis", dataColeta: "2026-03-21", dataResultado: "2026-03-23", status: "liberado", antibiograma: generateAntibiogram("default"), resistenciaCritica: false },
  { id: "LAB-011", prontuario: "P-11400", paciente: "Teresa M. Silva", setor: "UTI Adulto", material: "Hemocultura", microorganismo: "Enterococcus faecium (VRE)", dataColeta: "2026-03-26", dataResultado: "2026-03-28", status: "liberado", antibiograma: generateAntibiogram("MRSA"), resistenciaCritica: true },
  { id: "LAB-012", prontuario: "P-11450", paciente: "André L. Pereira", setor: "UTI Neonatal", material: "Hemocultura", microorganismo: "Klebsiella pneumoniae", dataColeta: "2026-03-27", status: "pendente", antibiograma: [], resistenciaCritica: false },
  { id: "LAB-013", prontuario: "P-11500", paciente: "Juliana R. Campos", setor: "CC", material: "Fragmento Ósseo", microorganismo: "Staphylococcus aureus", dataColeta: "2026-03-24", dataResultado: "2026-03-26", status: "liberado", antibiograma: generateAntibiogram("default"), resistenciaCritica: false },
  { id: "LAB-014", prontuario: "P-11550", paciente: "Paulo F. Martins", setor: "Enfermaria A", material: "Líquor", microorganismo: "Streptococcus pneumoniae", dataColeta: "2026-03-25", dataResultado: "2026-03-27", status: "liberado", antibiograma: generateAntibiogram("default"), resistenciaCritica: false },
  { id: "LAB-015", prontuario: "P-11600", paciente: "Claudia A. Barbosa", setor: "UTI Adulto", material: "Hemocultura", microorganismo: "Enterobacter cloacae (KPC)", dataColeta: "2026-03-27", status: "pendente", antibiograma: [], resistenciaCritica: true },
  { id: "LAB-016", prontuario: "P-11650", paciente: "Marcos V. Souza", setor: "UTI Pediátrica", material: "Urinocultura", microorganismo: "E. coli", dataColeta: "2026-03-23", dataResultado: "2026-03-25", status: "liberado", antibiograma: generateAntibiogram("default"), resistenciaCritica: false },
  { id: "LAB-017", prontuario: "P-11700", paciente: "Sandra P. Oliveira", setor: "Pronto Socorro", material: "Secreção", microorganismo: "Streptococcus pyogenes", dataColeta: "2026-03-26", dataResultado: "2026-03-27", status: "liberado", antibiograma: generateAntibiogram("default"), resistenciaCritica: false },
  { id: "LAB-018", prontuario: "P-11750", paciente: "Eduardo C. Rodrigues", setor: "UTI Adulto", material: "Hemocultura", microorganismo: "Acinetobacter baumannii MR", dataColeta: "2026-03-27", status: "pendente", antibiograma: [], resistenciaCritica: true },
  { id: "LAB-019", prontuario: "P-11800", paciente: "Beatriz S. Araújo", setor: "Enfermaria B", material: "Swab Retal", microorganismo: "KPC (colonização)", dataColeta: "2026-03-25", dataResultado: "2026-03-27", status: "liberado", antibiograma: generateAntibiogram("KPC"), resistenciaCritica: true },
  { id: "LAB-020", prontuario: "P-11850", paciente: "Gabriel H. Mendonça", setor: "UTI Neonatal", material: "Hemocultura", microorganismo: "Candida parapsilosis", dataColeta: "2026-03-26", dataResultado: "2026-03-28", status: "liberado", antibiograma: generateAntibiogram("default"), resistenciaCritica: false },
];

const LaboratoryResults = () => {
  const [results] = useState<LabResult[]>(initialResults);
  const [search, setSearch] = useState("");
  const [filterMicro, setFilterMicro] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [detail, setDetail] = useState<LabResult | null>(null);

  const microorganismos = [...new Set(results.map((r) => r.microorganismo))];

  const filtered = results.filter((r) => {
    if (search && !r.prontuario.toLowerCase().includes(search.toLowerCase()) && !r.paciente.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMicro !== "todos" && r.microorganismo !== filterMicro) return false;
    if (filterStatus !== "todos" && r.status !== filterStatus) return false;
    return true;
  });

  const kpis = {
    total: results.length,
    pendentes: results.filter((r) => r.status === "pendente").length,
    resistenciaCritica: results.filter((r) => r.resistenciaCritica).length,
    liberadosHoje: results.filter((r) => r.dataResultado === "2026-03-28").length,
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resultados Laboratoriais</h1>
          <p className="text-muted-foreground">Culturas, antibiogramas e perfil de resistência</p>
        </div>
        <Button variant="outline" onClick={() => toast.info("Importação de dados simulada com sucesso.")}><FileUp className="mr-2 h-4 w-4" />Importar Dados</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><FlaskConical className="mx-auto h-8 w-8 text-primary mb-2" /><p className="text-2xl font-bold">{kpis.total}</p><p className="text-sm text-muted-foreground">Total Exames</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Clock className="mx-auto h-8 w-8 text-yellow-600 mb-2" /><p className="text-2xl font-bold">{kpis.pendentes}</p><p className="text-sm text-muted-foreground">Pendentes</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" /><p className="text-2xl font-bold">{kpis.resistenciaCritica}</p><p className="text-sm text-muted-foreground">Resistência Crítica</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Microscope className="mx-auto h-8 w-8 text-green-600 mb-2" /><p className="text-2xl font-bold">{kpis.liberadosHoje}</p><p className="text-sm text-muted-foreground">Liberados Hoje</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente ou prontuário..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterMicro} onValueChange={setFilterMicro}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Microorganismos</SelectItem>
            {microorganismos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="liberado">Liberado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Resultados ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
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
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell><div className="font-medium">{r.paciente}</div><div className="text-xs text-muted-foreground">{r.prontuario}</div></TableCell>
                  <TableCell>{r.setor}</TableCell>
                  <TableCell className="text-sm">{r.material}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{r.microorganismo}</span>
                      {r.resistenciaCritica && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "pendente" ? "outline" : "secondary"}>{r.status === "pendente" ? "Pendente" : "Liberado"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.dataColeta}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setDetail(r)} disabled={r.status === "pendente" && r.antibiograma.length === 0}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Antibiogram Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.microorganismo}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Paciente:</span> {detail.paciente}</div>
                  <div><span className="text-muted-foreground">Prontuário:</span> {detail.prontuario}</div>
                  <div><span className="text-muted-foreground">Setor:</span> {detail.setor}</div>
                  <div><span className="text-muted-foreground">Material:</span> {detail.material}</div>
                  <div><span className="text-muted-foreground">Coleta:</span> {detail.dataColeta}</div>
                  <div><span className="text-muted-foreground">Resultado:</span> {detail.dataResultado || "Pendente"}</div>
                </div>

                {detail.resistenciaCritica && (
                  <div className="flex items-center gap-2 bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Resistência crítica identificada</span>
                  </div>
                )}

                {detail.antibiograma.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-2">Antibiograma</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {detail.antibiograma.map((ab) => (
                        <div key={ab.nome} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                          <span className="truncate">{ab.nome}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${sirColor[ab.resultado]}`}>{ab.resultado}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> S = Sensível</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> I = Intermediário</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> R = Resistente</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Antibiograma pendente de liberação.</p>
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
