import { useState, useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Shield, ArrowLeft, Sparkles, Tag, Building2, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  name: string;
  subtitle: string;
  price: string;
  period: string;
  icon: React.ElementType;
  beds: string;
  features: string[];
  cta: string;
  highlight: boolean;
  enterprise: boolean;
}

const plans: Plan[] = [
  {
    name: "Teste Gratuito",
    subtitle: "30 dias",
    price: "Grátis",
    period: "",
    icon: Sparkles,
    beds: "Acesso completo",
    features: [
      "Acesso completo a todas as funcionalidades",
      "Sem necessidade de cartão de crédito",
    ],
    cta: "Começar teste grátis",
    highlight: false,
    enterprise: false,
  },
  {
    name: "Essencial",
    subtitle: "",
    price: "R$ 1.490",
    period: "/mês",
    icon: Shield,
    beds: "Até 50 leitos",
    features: [
      "Auditoria de bundles e higiene",
      "Dashboard básico de conformidade",
      "Alertas por e-mail",
      "Até 8 usuários inclusos",
      "Suporte via chat",
      "Agentes de IA disponíveis",
    ],
    cta: "Assinar Essencial",
    highlight: false,
    enterprise: false,
  },
  {
    name: "Profissional",
    subtitle: "",
    price: "R$ 3.290",
    period: "/mês",
    icon: Crown,
    beds: "Até 200 leitos",
    features: [
      "Tudo do Essencial +",
      "Vigilância de processos",
      "Indicadores avançados",
      "Monitoramento de antimicrobianos",
      "Relatórios com apoio de agentes de IA",
      "Até 15 usuários",
      "Suporte prioritário",
    ],
    cta: "Assinar Profissional",
    highlight: true,
    enterprise: false,
  },
  {
    name: "Enterprise",
    subtitle: "",
    price: "Sob consulta",
    period: "",
    icon: Building2,
    beds: "Rede hospitalar",
    features: [
      "Tudo do Profissional +",
      "Multi-unidade e multi-CNPJ",
      "API e integrações (n8n, LIS)",
      "Consultoria de implementação",
      "Usuários ilimitados",
      "SLA dedicado",
    ],
    cta: "Falar com vendas",
    highlight: false,
    enterprise: true,
  },
];

const VALID_COUPONS: Record<string, number> = {
  DESCONTO10: 10,
  IRAS2025: 15,
};

export default function Pricing() {
  const navigate = useNavigate();
  const couponInputId = useId();
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleApplyCoupon = async () => {
    setCouponError("");
    if (!coupon.trim()) {
      setCouponError("Digite um cupom.");
      return;
    }
    setCouponLoading(true);
    await delay(1200);
    const discount = VALID_COUPONS[coupon.trim().toUpperCase()];
    if (discount) {
      setCouponApplied(true);
      setDiscountPercent(discount);
      setCouponError("");
      toast.success(`Cupom aplicado com sucesso (-${discount}%)`);
    } else {
      setCouponApplied(false);
      setDiscountPercent(0);
      setCouponError("Cupom inválido.");
      toast.error("Cupom inválido ou expirado.");
    }
    setCouponLoading(false);
  };

  const handlePlanClick = async (plan: Plan) => {
    setLoadingPlan(plan.name);
    await delay(1500);
    setLoadingPlan(null);

    if (plan.name === "Teste Gratuito") {
      toast.info("Você está iniciando seu teste gratuito de 30 dias.");
      navigate("/register");
      return;
    }
    if (plan.enterprise) {
      navigate("/register", { state: { message: "Interesse no plano Enterprise" } });
      return;
    }
    setSelectedPlan(plan);
  };

  const handleConfirmPlan = async () => {
    if (!selectedPlan) return;
    setConfirmLoading(true);
    await delay(1500);
    setConfirmLoading(false);
    toast.success(`Plano ${selectedPlan.name} selecionado com sucesso!`);
    setSelectedPlan(null);
    navigate("/register", { state: { plan: selectedPlan.name } });
  };

  const formatDisplayPrice = (price: string) => {
    if (!couponApplied || !price.startsWith("R$")) return price;
    const numeric = parseInt(price.replace(/\D/g, ""), 10);
    const discounted = Math.round(numeric * (1 - discountPercent / 100));
    return `R$ ${discounted.toLocaleString("pt-BR")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">
              IRAS<span className="text-primary">Control</span>
            </span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>
      </nav>

      <div className="container py-10 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Planos e Preços</h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Escolha o plano ideal para o porte da sua instituição. Comece com um teste gratuito de 30 dias.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const hasDiscount = couponApplied && plan.price.startsWith("R$");
            const isLoading = loadingPlan === plan.name;
            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col transition-all duration-200 hover:shadow-md ${
                  plan.highlight
                    ? "border-primary shadow-lg ring-2 ring-primary/20 sm:scale-[1.02]"
                    : plan.enterprise
                    ? "border-dashed border-muted-foreground/30"
                    : ""
                }`}
              >
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                    <Crown className="h-3 w-3" /> Mais Popular
                  </Badge>
                )}
                <CardContent className="flex flex-1 flex-col pt-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{plan.name}</h3>
                      {plan.subtitle && (
                        <span className="text-xs text-muted-foreground">{plan.subtitle}</span>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">{plan.beds}</p>

                  <div className="mt-4">
                    {hasDiscount && (
                      <p className="text-sm text-muted-foreground line-through">{plan.price}</p>
                    )}
                    <p className="text-3xl font-extrabold">
                      {formatDisplayPrice(plan.price)}
                      {plan.period && (
                        <span className="text-base font-normal text-muted-foreground">{plan.period}</span>
                      )}
                    </p>
                    {hasDiscount && (
                      <Badge variant="secondary" className="mt-1 text-xs">-{discountPercent}%</Badge>
                    )}
                  </div>

                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-8 w-full"
                    variant={plan.highlight ? "default" : plan.enterprise ? "outline" : "secondary"}
                    disabled={isLoading}
                    aria-label={plan.cta}
                    onClick={() => handlePlanClick(plan)}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Coupon */}
        <div className="mx-auto mt-12 max-w-md text-center sm:mt-16">
          <Label htmlFor={couponInputId} className="text-lg font-semibold">
            Possui cupom de desconto?
          </Label>
          <div className="mt-3 flex gap-2">
            <Input
              id={couponInputId}
              placeholder="Digite seu cupom"
              value={coupon}
              aria-label="Cupom de desconto"
              onChange={(e) => {
                setCoupon(e.target.value);
                if (couponApplied) {
                  setCouponApplied(false);
                  setDiscountPercent(0);
                }
                if (couponError) setCouponError("");
              }}
              className={`transition-colors ${
                couponApplied
                  ? "border-primary focus-visible:ring-primary"
                  : couponError
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
            />
            <Button
              onClick={handleApplyCoupon}
              variant="outline"
              className="shrink-0 gap-1.5"
              disabled={couponLoading}
              aria-label="Aplicar cupom de desconto"
            >
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
              Aplicar
            </Button>
          </div>
          {couponApplied && (
            <p className="mt-2 text-sm font-medium text-primary">
              ✓ Cupom aplicado com sucesso (-{discountPercent}%)
            </p>
          )}
          {couponError && (
            <p className="mt-2 text-sm font-medium text-destructive">{couponError}</p>
          )}
        </div>

        {/* Comparison summary */}
        <div className="mx-auto mt-16 max-w-3xl sm:mt-20">
          <h2 className="text-center text-2xl font-bold">Comparação Rápida</h2>
          <div className="mt-6 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">Recurso</th>
                  <th className="px-4 py-3 text-center font-semibold">Trial</th>
                  <th className="px-4 py-3 text-center font-semibold">Essencial</th>
                  <th className="px-4 py-3 text-center font-semibold">Profissional</th>
                  <th className="px-4 py-3 text-center font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["Auditorias de bundles e higiene", true, true, true, true],
                  ["Dashboard de conformidade", true, true, true, true],
                  ["Alertas por e-mail", true, true, true, true],
                  ["Agentes de IA", true, true, true, true],
                  ["Indicadores avançados", true, false, true, true],
                  ["Monitoramento de antimicrobianos", true, false, true, true],
                  ["Multi-unidade / Multi-CNPJ", true, false, false, true],
                  ["API e integrações (n8n, LIS)", true, false, false, true],
                  ["SLA dedicado", false, false, false, true],
                  ["Usuários", "Ilimitado", "8", "15", "Ilimitado"],
                ].map(([feature, ...values], i) => (
                  <tr key={i} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{feature as string}</td>
                    {(values as (boolean | string)[]).map((v, j) => (
                      <td key={j} className="px-4 py-2.5 text-center">
                        {typeof v === "boolean" ? (
                          v ? (
                            <CheckCircle className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="font-medium">{v}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent aria-describedby="plan-modal-desc">
          <DialogHeader>
            <DialogTitle>Confirmar assinatura — {selectedPlan?.name}</DialogTitle>
            <DialogDescription id="plan-modal-desc">
              Revise os benefícios do plano antes de continuar.
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-2 py-2">
              <p className="text-xl md:text-2xl font-bold">
                {formatDisplayPrice(selectedPlan.price)}
                <span className="text-base font-normal text-muted-foreground">{selectedPlan.period}</span>
              </p>
              <ul className="space-y-2">
                {selectedPlan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedPlan(null)} disabled={confirmLoading} aria-label="Cancelar seleção de plano">
              Cancelar
            </Button>
            <Button onClick={handleConfirmPlan} disabled={confirmLoading} aria-label="Confirmar assinatura do plano">
              {confirmLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
