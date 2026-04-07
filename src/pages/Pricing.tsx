import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, Shield, ArrowLeft, Sparkles, Tag, Building2, Crown } from "lucide-react";
import { toast } from "sonner";

const plans = [
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

export default function Pricing() {
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  const handleApplyCoupon = () => {
    if (!coupon.trim()) {
      toast.error("Digite um cupom válido.");
      return;
    }
    if (coupon.trim().toUpperCase() === "IRAS2025") {
      setCouponApplied(true);
      toast.success("Cupom aplicado! Desconto de 15% ativado.");
    } else {
      setCouponApplied(false);
      toast.error("Cupom inválido ou expirado.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
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

      <div className="container py-16">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">Planos e Preços</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Escolha o plano ideal para o porte da sua instituição. Comece com um teste gratuito de 30 dias.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col transition-shadow ${
                  plan.highlight
                    ? "border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]"
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

                  <p className="mt-4 text-3xl font-extrabold">
                    {plan.price}
                    {plan.period && (
                      <span className="text-base font-normal text-muted-foreground">{plan.period}</span>
                    )}
                  </p>

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
                    asChild
                  >
                    <Link to="/register">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Coupon */}
        <div className="mx-auto mt-16 max-w-md text-center">
          <h2 className="text-lg font-semibold">Possui cupom de desconto?</h2>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Digite seu cupom"
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value);
                if (couponApplied) setCouponApplied(false);
              }}
              className={couponApplied ? "border-primary" : ""}
            />
            <Button onClick={handleApplyCoupon} variant="outline" className="shrink-0 gap-1.5">
              <Tag className="h-4 w-4" /> Aplicar
            </Button>
          </div>
          {couponApplied && (
            <p className="mt-2 text-sm font-medium text-primary">
              ✓ Cupom IRAS2025 aplicado — 15% de desconto
            </p>
          )}
        </div>

        {/* Comparison summary */}
        <div className="mx-auto mt-20 max-w-3xl">
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
                  <tr key={i} className="hover:bg-muted/30">
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
    </div>
  );
}
