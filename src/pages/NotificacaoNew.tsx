import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bell, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { DynamicNotificationForm, type NotifSchema, type BlockValues } from "@/components/DynamicNotificationForm";

interface NotifType {
  id: string;
  nome: string;
  fonte: string;
  anvisa_id: string | null;
  paradigma: string;
  prefixo: string;
  schema: NotifSchema;
}

interface HospitalData {
  name: string;
  state: string;
  cnpj: string | null;
  cnes: string | null;
  type: string;
}

export default function NotificacaoNew() {
  const { typeId, id } = useParams<{ typeId?: string; id?: string }>();
  const navigate = useNavigate();
  const { hospitalId, userId } = useHospitalContext();

  const [notifType, setNotifType] = useState<NotifType | null>(null);
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const [initialBlockValues, setInitialBlockValues] = useState<Record<string, Record<string, Record<string, any>>>>({});
  const [notifId, setNotifId] = useState<string | null>(id || null);
  const [currentStatus, setCurrentStatus] = useState("rascunho");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    loadData();
  }, [hospitalId, typeId, id]);

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: hosp }] = await Promise.all([
        (supabase.from("hospitals" as any)
          .select("name, state, cnpj, cnes, type")
          .eq("id", hospitalId)
          .single() as any),
      ]);
      if (hosp) setHospital(hosp as HospitalData);

      if (id) {
        // Edit existing
        const { data: notif } = await (supabase.from("notifications" as any)
          .select("*, notification_types(*)")
          .eq("id", id)
          .single() as any);
        if (notif) {
          setNotifType((notif as any).notification_types as NotifType);
          setNotifId(notif.id);
          setCurrentStatus(notif.status);
          const inputs = notif.inputs || {};
          setInitialValues(inputs._top || inputs);
          setInitialBlockValues(inputs._blocks || {});
        }
      } else if (typeId) {
        const { data: nt } = await (supabase.from("notification_types" as any)
          .select("*")
          .eq("id", typeId)
          .single() as any);
        if (nt) setNotifType(nt as NotifType);
      }
    } catch (e: any) {
      toast.error("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function buildInputs(topVals: Record<string, any>, blockVals: BlockValues) {
    return { _top: topVals, _blocks: blockVals };
  }

  async function handleSave(topVals: Record<string, any>, blockVals: BlockValues, calculated: Record<string, any>) {
    if (!hospitalId || !userId || !notifType) return;
    setSaving(true);
    try {
      const payload: any = {
        hospital_id: hospitalId,
        user_id: userId,
        type_id: notifType.id,
        inputs: buildInputs(topVals, blockVals),
        calculated,
        mes_vigilancia: topVals.mes || null,
        ano_vigilancia: topVals.ano ? Number(topVals.ano) : new Date().getFullYear(),
        setor: topVals.setor || topVals.unidade_internacao || null,
        paciente_nome: topVals.paciente_nome || null,
        microrganismo: topVals.microrganismo || null,
        status: "rascunho",
      };

      if (notifId) {
        const { error } = await (supabase.from("notifications" as any).update(payload).eq("id", notifId) as any);
        if (error) throw error;
        // History
        await (supabase.from("notification_history" as any).insert({
          notification_id: notifId,
          action: "atualizado",
          changed_by: userId,
          snapshot: payload,
        }) as any);
        toast.success("Rascunho atualizado!");
      } else {
        const { data, error } = await (supabase.from("notifications" as any).insert(payload).select().single() as any);
        if (error) throw error;
        setNotifId(data.id);
        await (supabase.from("notification_history" as any).insert({
          notification_id: data.id,
          action: "criado",
          changed_by: userId,
        }) as any);
        toast.success("Rascunho salvo!");
      }
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize(topVals: Record<string, any>, blockVals: BlockValues, calculated: Record<string, any>) {
    if (!hospitalId || !userId || !notifType) return;
    setFinalizing(true);
    try {
      const payload: any = {
        hospital_id: hospitalId,
        user_id: userId,
        type_id: notifType.id,
        inputs: buildInputs(topVals, blockVals),
        calculated,
        mes_vigilancia: topVals.mes || null,
        ano_vigilancia: topVals.ano ? Number(topVals.ano) : new Date().getFullYear(),
        setor: topVals.setor || topVals.unidade_internacao || null,
        paciente_nome: topVals.paciente_nome || null,
        microrganismo: topVals.microrganismo || null,
        status: "finalizada",
        finalized_at: new Date().toISOString(),
      };

      let finalId = notifId;
      if (notifId) {
        const { error } = await (supabase.from("notifications" as any).update(payload).eq("id", notifId) as any);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase.from("notifications" as any).insert(payload).select().single() as any);
        if (error) throw error;
        finalId = data.id;
        setNotifId(data.id);
      }

      if (finalId) {
        // Fetch numero assigned by trigger
        const { data: updated } = await (supabase.from("notifications" as any)
          .select("numero")
          .eq("id", finalId)
          .single() as any);

        await (supabase.from("notification_history" as any).insert({
          notification_id: finalId,
          action: "finalizado",
          changed_by: userId,
          snapshot: { calculated, numero: updated?.numero },
        }) as any);

        setCurrentStatus("finalizada");
        toast.success(`Notificação finalizada! Número: ${updated?.numero || "—"}`);
      }
    } catch (e: any) {
      toast.error("Erro ao finalizar: " + e.message);
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />Carregando formulário…
      </div>
    );
  }

  if (!notifType) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Modelo de notificação não encontrado.</p>
        <Button variant="link" onClick={() => navigate("/notificacoes")}>Voltar</Button>
      </div>
    );
  }

  const isFinalized = currentStatus === "finalizada";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/notificacoes")} className="mt-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-bold">{notifType.nome}</h1>
            <Badge variant="outline" className="text-xs">{notifType.prefixo}</Badge>
            <Badge variant={notifType.paradigma === "caso" ? "destructive" : "secondary"} className="text-xs">
              {notifType.paradigma}
            </Badge>
            {notifType.anvisa_id && (
              <Badge variant="outline" className="text-xs">#{notifType.anvisa_id}</Badge>
            )}
            {isFinalized && (
              <Badge className="bg-green-500 text-white text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />Finalizada
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notifType.fonte}</p>
        </div>
      </div>

      {isFinalized && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Esta notificação está finalizada. Alterações exigem retificação.
        </div>
      )}

      <DynamicNotificationForm
        schema={notifType.schema}
        hospitalData={hospital || { name: "", state: "", cnpj: null, cnes: null, type: "geral" }}
        hospitalId={hospitalId || ""}
        initialValues={initialValues}
        initialBlockValues={initialBlockValues}
        disabled={isFinalized}
        saving={saving}
        finalizing={finalizing}
        onSave={handleSave}
        onFinalize={handleFinalize}
      />
    </div>
  );
}
