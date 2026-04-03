import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface DashboardAIInsightsProps {
  generateInsights: () => string[];
}

export default function DashboardAIInsights({ generateInsights }: DashboardAIInsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const result = generateInsights();
      setInsights(result);
      setVisible(true);
      setLoading(false);
      toast.success("Insights gerados com sucesso!");
    }, 1200);
  };

  return (
    <>
      <Button variant="outline" onClick={handleGenerate} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Insights IA
      </Button>

      {visible && insights.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Insights Inteligentes
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVisible(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              {insights.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
