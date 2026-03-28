import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Shield, ArrowLeft } from "lucide-react";

const plans = [
  {
    name: "Essencial",
    monthlyPrice: 1490,
    beds: "Até 50 leitos",
    features: ["Auditorias de Bundles CVC/SVD", "Auditoria de Higiene das Mãos", "Dashboard de conformidade", "Alertas por e-mail", "3 usuários", "Suporte por chat"],
    highlight: false,
  },
  {
    name: "Profissional",
    monthlyPrice: 3290,
    beds: "Até 200 leitos",
    features: ["Tudo do Essencial +", "Vigilância de processos", "Monitoramento de antimicrobianos", "Relatórios com IA", "Antibiograma digital", "10 usuários", "Suporte prioritário"],
    highlight: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: 0,
    beds: "Rede hospitalar",
    features: ["Tudo do Profissional +", "Multi-unidade e multi-CNPJ", "API e integrações (n8n, LIS)", "Consultoria de implantação", "Usuários ilimitados", "SLA dedicado", "Treinamento presencial"],
    highlight: false,
  },
];

const addons = [
  { name: "Módulo de Integração LIS", price: "R$ 490/mês" },
  { name: "Analytics Avançado + IA", price: "R$ 690/mês" },
  { name: "Suporte Premium 24/7", price: "R$ 890/mês" },
  { name: "Consultoria Epidemiológica", price: "R$ 1.200/mês" },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const formatPrice = (monthly: number) => {
    if (monthly === 0) return "Sob consulta";
    const price = annual ? Math.round(monthly * 0.8) : monthly;
    return `R$ ${price.toLocaleString("pt-BR")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">IRAS<span className="text-primary">Control</span></span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
          </Button>
        </div>
      </nav>

      <div className="container py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Planos e Preços</h1>
          <p className="mt-3 text-muted-foreground">Escolha o plano ideal para o porte da sua instituição.</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Label className="text-sm">Mensal</Label>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <Label className="text-sm">Anual <Badge variant="secondary" className="ml-1">-20%</Badge></Label>
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-lg scale-105" : ""}`}>
              {plan.highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>}
              <CardContent className="flex flex-1 flex-col pt-8">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.beds}</p>
                <p className="mt-4 text-3xl font-extrabold">
                  {formatPrice(plan.monthlyPrice)}
                  {plan.monthlyPrice > 0 && <span className="text-base font-normal text-muted-foreground">/mês</span>}
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" variant={plan.highlight ? "default" : "outline"} asChild>
                  <Link to="/register">{plan.monthlyPrice === 0 ? "Falar com Vendas" : "Começar Agora"}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add-ons */}
        <div className="mt-20">
          <h2 className="text-center text-2xl font-bold">Módulos Adicionais</h2>
          <p className="mt-2 text-center text-muted-foreground">Expanda sua plataforma conforme a necessidade.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {addons.map((a) => (
              <Card key={a.name}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold">{a.name}</h3>
                  <p className="mt-1 text-lg font-bold text-primary">{a.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Implantação */}
        <Card className="mt-16">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center md:flex-row md:text-left">
            <div className="flex-1">
              <h3 className="text-lg font-bold">Taxa de Implantação</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Investimento único que inclui configuração do sistema, migração de dados, treinamento da equipe e acompanhamento nos primeiros 30 dias.
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">A partir de R$ 2.500</p>
              <Button className="mt-3" asChild><Link to="/register">Solicitar Proposta</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
