import { useState, useEffect, useMemo, useCallback } from "react";
import { History, Trash2, Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Record {
  id: string;
  setor: string;
  mes: string;
  ano: string;
  responsavel: string;
  total_formularios: number;
  instancias_com_higienizacao: number;
  instancias_sem_higienizacao: number;
  consumo_alcool_ml: number;
  consumo_sabonete_ml: number;
  paciente_dia: number;
  created_at: string;
}

export default function HygieneConsumptionHistory() {
  const { hospitalId } = useHospitalContext();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [mesFiltro, setMesFiltro] = useState<string[]>([]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([]);
  const [setorFiltro, setSetorFiltro] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("hygiene_consumption_records")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });
    if (!error && data) setRecords(data as any);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => { if (open) fetchRecords(); }, [open, fetchRecords]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("hygiene_consumption_records").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else {
      toast.success("Registro excluído.");
      setRecords(prev => prev.filter(r => r.id !== deleteId));
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const anosDisponiveis = useMemo(
    () => Array.from(new Set(records.map(r => r.ano).filter(Boolean))).sort().reverse(),
    [records]
  );
  const setoresDisponiveis = useMemo(
    () => Array.from(new Set(records.map(r => r.setor).filter(Boolean))).sort(),
    [records]
  );

  const filtered = useMemo(() => records.filter(r => {
    if (anoFiltro.length > 0 && !anoFiltro.includes(r.ano)) return false;
    if (mesFiltro.length > 0 && !mesFiltro.includes(r.mes)) return false;
    if (setorFiltro.length > 0 && !setorFiltro.includes(r.setor)) return false;
    return true;
  }), [records, mesFiltro, anoFiltro, setorFiltro]);

  const clear = () => { setMesFiltro([]); setAnoFiltro([]); setSetorFiltro([]); };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <History className="h-4 w-4" /> Histórico
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico — Consumo de Higiene das Mãos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mês</label>
                <MultiSelectFilter label="Mês" selected={mesFiltro} onChange={setMesFiltro}
                  options={meses.map(m => ({ value: m, label: m }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ano</label>
                <MultiSelectFilter label="Ano" selected={anoFiltro} onChange={setAnoFiltro}
                  options={anosDisponiveis.map(a => ({ value: a, label: a }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Setor</label>
                <MultiSelectFilter label="Setor" selected={setorFiltro} onChange={setSetorFiltro}
                  options={setoresDisponiveis.map(s => ({ value: s, label: s }))} />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <Filter className="h-3 w-3" />Filtrar
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clear}>
                <X className="h-3 w-3" />Limpar
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filtered.map(r => {
                  const total = r.instancias_com_higienizacao + r.instancias_sem_higienizacao;
                  const adesao = total > 0 ? (r.instancias_com_higienizacao / total) * 100 : null;
                  const consumoPD = r.paciente_dia > 0 ? (r.consumo_alcool_ml + r.consumo_sabonete_ml) / r.paciente_dia : null;
                  return (
                    <div key={r.id} className="border rounded-lg p-3 space-y-2 bg-background">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{r.mes}/{r.ano}</span>
                          <Badge variant="outline" className="text-[10px]">{r.setor}</Badge>
                          {adesao !== null && (
                            <Badge className={`text-[10px] ${
                              adesao >= 80 ? "bg-success text-success-foreground" :
                              adesao >= 50 ? "bg-warning text-warning-foreground" :
                              "bg-destructive text-destructive-foreground"
                            }`}>
                              Adesão: {adesao.toFixed(1)}%
                            </Badge>
                          )}
                          {consumoPD !== null && (
                            <Badge variant="outline" className="text-[10px]">
                              {consumoPD.toFixed(2)} ML/PD
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(r.id)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div>Formulários: <span className="text-foreground font-medium">{r.total_formularios}</span></div>
                        <div>Álcool: <span className="text-foreground font-medium">{r.consumo_alcool_ml.toLocaleString("pt-BR")} ml</span></div>
                        <div>Sabonete: <span className="text-foreground font-medium">{r.consumo_sabonete_ml.toLocaleString("pt-BR")} ml</span></div>
                        <div>Paciente-Dia: <span className="text-foreground font-medium">{r.paciente_dia}</span></div>
                      </div>
                      {r.responsavel && (
                        <p className="text-[11px] text-muted-foreground">Responsável: {r.responsavel}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de consumo? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
