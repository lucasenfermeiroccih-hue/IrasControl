import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportPdfOptions {
  type: string;
  hospitalId: string;
  data: Record<string, unknown>;
  filenamePrefix?: string;
}

export async function exportPdf({ type, hospitalId, data, filenamePrefix }: ExportPdfOptions) {
  toast.info("Gerando PDF...");
  try {
    const { data: result, error } = await supabase.functions.invoke("generate-pdf", {
      body: { type, hospitalId, data },
    });

    if (error) throw error;
    if (!result?.pdf) throw new Error("PDF vazio");

    const byteArray = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const prefix = filenamePrefix || type;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}-${new Date().toISOString().split("T")[0]}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("PDF exportado com sucesso!");
  } catch (err: any) {
    console.error("Erro ao gerar PDF:", err);
    toast.error("Erro ao gerar PDF. Tente novamente.");
  }
}
