import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { erroGamificacao } from "@/hooks/useGamificacao";

/** Aviso de erro da gamificação, com o detalhe técnico para diagnóstico. */
export function AvisoErroGamificacao({ erro }: { erro: unknown }) {
  const { titulo, detalhe } = erroGamificacao(erro);
  return (
    <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-500/10">
      <CardContent className="flex gap-3 p-5 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 space-y-2">
          <p className="font-medium text-amber-900 dark:text-amber-200">{titulo}</p>
          {detalhe && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">Detalhe técnico (envie para o suporte)</summary>
              <code className="mt-1 block whitespace-pre-wrap break-all rounded-lg bg-muted px-2 py-1.5">{detalhe}</code>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
