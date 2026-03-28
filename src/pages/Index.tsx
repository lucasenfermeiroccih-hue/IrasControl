import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Activity, BarChart3, Bell, FileText, Users,
  CheckCircle, ArrowRight, Microscope, ClipboardCheck,
  TrendingDown, Lock, Zap, Globe
} from "lucide-react";

const features = [
  { icon: Activity, title: "Monitoramento em Tempo Real", desc: "Acompanhe indicadores IRAS e taxas de infecção em dashboards interativos." },
  { icon: Bell, title: "Alertas Automáticos", desc: "Receba notificações instantâneas sobre surtos, culturas positivas e dispositivos vencidos." },
  { icon: ClipboardCheck, title: "Auditorias Digitais", desc: "Formulários inteligentes para bundles, higiene das mãos e vigilância de processos." },
  { icon: Microscope, title: "Perfil Microbiológico", desc: "Antibiogramas com interpretação SIR automática e rastreamento de multirresistentes." },
  { icon: BarChart3, title: "Relatórios e IA", desc: "Insights preditivos e relatórios automatizados para a CCIH e diretoria." },
  { icon: Shield, title: "Stewardship de Antimicrobianos", desc: "Monitore DDD, custos e adequação das prescrições em tempo real." },
];

const stats = [
  { value: "48%", label: "das IRAS são evitáveis com protocolos adequados" },
  { value: "3-10x", label: "aumento do custo por paciente com infecção" },
  { value: "13 dias", label: "de internação extra em média por IRAS" },
  { value: "25%", label: "dos hospitais ainda usam planilhas para controle" },
];

const plans = [
  {
    name: "Essencial",
    price: "R$ 1.490",
    beds: "Até 50 leitos",
    features: ["Auditorias de Bundles e Higiene", "Dashboard básico de conformidade", "Alertas por e-mail", "3 usuários inclusos", "Suporte por chat"],
    highlight: false,
  },
  {
    name: "Profissional",
    price: "R$ 3.290",
    beds: "Até 200 leitos",
    features: ["Tudo do Essencial +", "Vigilância de processos completa", "Monitoramento de antimicrobianos", "Relatórios com IA", "10 usuários inclusos", "Suporte prioritário"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    beds: "Rede hospitalar",
    features: ["Tudo do Profissional +", "Multi-unidade e multi-CNPJ", "API e integrações (n8n, LIS)", "Consultoria de implantação", "Usuários ilimitados", "SLA dedicado"],
    highlight: false,
  },
];

const logos = ["Hospital São Lucas", "Hospital Albert Sabin", "Santa Casa de Misericórdia", "Hospital Regional", "Clínica São José"];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">IRAS<span className="text-primary">Control</span></span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            <a href="#proof" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Resultados</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Fazer Login</Link></Button>
            <Button asChild><Link to="/register">Começar Agora</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-info/5" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Zap className="mr-1.5 h-3.5 w-3.5" /> Plataforma #1 em Controle de Infecção
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Reduza infecções hospitalares com{" "}
              <span className="text-primary">dados em tempo real</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Plataforma completa para CCIH: auditorias digitais, vigilância epidemiológica,
              stewardship de antimicrobianos e insights com inteligência artificial.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2 px-8 text-base" asChild>
                <Link to="/register">Começar Agora <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8 text-base" asChild>
                <a href="#features">Ver Funcionalidades</a>
              </Button>
            </div>
          </div>
          {/* Mockup */}
          <div className="mt-16 mx-auto max-w-5xl rounded-xl border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-success/60" />
              <span className="ml-3 text-xs text-muted-foreground">irascontrol.app/dashboard</span>
            </div>
            <div className="grid grid-cols-4 gap-4 p-6">
              {[
                { label: "Pacientes Monitorados", value: "284", color: "text-info" },
                { label: "Casos Suspeitos", value: "12", color: "text-warning" },
                { label: "IRAS Confirmadas", value: "3", color: "text-destructive" },
                { label: "Taxa de Conformidade", value: "94.2%", color: "text-success" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container">
          <h2 className="mb-2 text-center text-2xl font-bold">Por que a gestão convencional falha?</h2>
          <p className="mb-12 text-center text-muted-foreground">Dados que evidenciam a necessidade de digitalização do controle de infecção.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="text-center">
                <CardContent className="pt-6">
                  <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">Funcionalidades que transformam a CCIH</h2>
          <p className="mt-3 text-center text-muted-foreground">Tudo o que sua equipe precisa para monitorar, auditar e prevenir infecções.</p>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="group hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/20 py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">Planos e Preços</h2>
          <p className="mt-3 text-center text-muted-foreground">Escalável do hospital de pequeno porte à rede hospitalar.</p>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-lg shadow-primary/10 scale-105" : ""}`}>
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>
                )}
                <CardContent className="flex flex-1 flex-col pt-8">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.beds}</p>
                  <p className="mt-4 text-3xl font-extrabold">{plan.price}<span className="text-base font-normal text-muted-foreground">/mês</span></p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-8 w-full" variant={plan.highlight ? "default" : "outline"} asChild>
                    <Link to="/register">Escolher {plan.name}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section id="proof" className="py-16">
        <div className="container text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Instituições que confiam no IRASControl</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
            {logos.map((name) => (
              <div key={name} className="flex items-center gap-2 rounded-lg border bg-card px-6 py-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{name}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-6">
            <Badge variant="outline" className="gap-1.5 px-4 py-1.5"><Lock className="h-3.5 w-3.5" /> LGPD Compliant</Badge>
            <Badge variant="outline" className="gap-1.5 px-4 py-1.5"><Shield className="h-3.5 w-3.5" /> ANVISA</Badge>
            <Badge variant="outline" className="gap-1.5 px-4 py-1.5"><CheckCircle className="h-3.5 w-3.5" /> ISO 27001</Badge>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary py-20 text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold">Pronto para transformar o controle de infecção?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Comece gratuitamente e veja como o IRASControl pode reduzir IRAS na sua instituição.
          </p>
          <Button size="lg" variant="secondary" className="mt-8 gap-2 px-8 text-base" asChild>
            <Link to="/register">Criar Conta Gratuita <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">IRASControl</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 IRASControl. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
