import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Sparkles, Bot } from "lucide-react";
import { toast } from "sonner";
import {
  AI_AGENTS,
  canAccessAgent,
  getUserPlan,
  setUserPlan,
  PLAN_LABELS,
  PLAN_COLORS,
  CATEGORY_LABELS,
  type AgentPlan,
} from "@/lib/agent-service";

export default function AgentLibrary() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<AgentPlan>(getUserPlan());
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const handlePlanChange = (value: AgentPlan) => {
    setUserPlan(value);
    setPlan(value);
    toast.success(`Plano alterado para ${PLAN_LABELS[value]}`);
  };

  const handleAgentClick = (agent: typeof AI_AGENTS[0]) => {
    if (!canAccessAgent(agent)) {
      toast.error(`Este agente requer o plano ${PLAN_LABELS[agent.requiredPlan]}.`, {
        description: "Faça upgrade para acessar.",
      });
      return;
    }
    navigate(`/chat/${agent.id}`);
  };

  const filtered = filterCategory === "all"
    ? AI_AGENTS
    : AI_AGENTS.filter((a) => a.category === filterCategory);

  const categories = [...new Set(AI_AGENTS.map((a) => a.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Biblioteca de Agentes IA</h1>
            <p className="text-sm text-muted-foreground">
              Escolha um agente para análise inteligente dos seus dados
            </p>
          </div>
        </div>

        {/* Plan selector (mock) */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Plano:</span>
          <Select value={plan} onValueChange={(v) => handlePlanChange(v as AgentPlan)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Gratuito</SelectItem>
              <SelectItem value="pro">Profissional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterCategory("all")}
        >
          Todos
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={filterCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((agent) => {
          const hasAccess = canAccessAgent(agent);
          return (
            <Card
              key={agent.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                hasAccess
                  ? "hover:border-primary/50"
                  : "opacity-70 hover:border-muted-foreground/30"
              }`}
              onClick={() => handleAgentClick(agent)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{agent.icon}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[10px] ${PLAN_COLORS[agent.requiredPlan]}`} variant="secondary">
                      {PLAN_LABELS[agent.requiredPlan]}
                    </Badge>
                    {!hasAccess && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </div>
                <CardTitle className="text-sm mt-2">{agent.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {agent.description}
                </p>
                <div className="mt-3">
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_LABELS[agent.category]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum agente encontrado nesta categoria.</p>
        </div>
      )}
    </div>
  );
}
