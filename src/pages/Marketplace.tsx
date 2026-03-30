import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Search, Star, Download, CheckCircle, Puzzle, BarChart3, FileText, Shield, Microscope, Pill, Bell } from "lucide-react";
import { toast } from "sonner";

interface Extension {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  downloads: number;
  price: string;
  icon: React.ElementType;
  installed: boolean;
  author: string;
  version: string;
  features: string[];
}

const mockExtensions: Extension[] = [
  { id: "1", name: "Módulo ANVISA Reporter", description: "Geração automática de relatórios no formato ANVISA para notificação de IRAS e surtos.", category: "Relatórios", rating: 4.8, downloads: 1250, price: "R$ 299/mês", icon: FileText, installed: true, author: "IRASControl Labs", version: "2.3.1", features: ["Relatórios mensais automáticos", "Formato SINAIS/ANVISA", "Exportação PDF e XML", "Histórico de envios"] },
  { id: "2", name: "Painel de Resistência Antimicrobiana", description: "Dashboard avançado para monitoramento de perfis de resistência com mapas de calor.", category: "Analytics", rating: 4.6, downloads: 890, price: "R$ 199/mês", icon: Microscope, installed: true, author: "BioData Analytics", version: "1.8.0", features: ["Mapa de calor por microorganismo", "Tendências temporais", "Alertas de surto", "Integração com LIS"] },
  { id: "3", name: "Preditor de Surto IA", description: "Inteligência artificial para detecção precoce de surtos hospitalares com base em dados epidemiológicos.", category: "IA", rating: 4.9, downloads: 650, price: "R$ 499/mês", icon: BarChart3, installed: false, author: "IRASControl Labs", version: "3.0.0", features: ["Detecção precoce de clusters", "Score de probabilidade", "Alertas preditivos", "Modelo treinado com dados brasileiros"] },
  { id: "4", name: "Checklist Digital Interativo", description: "Checklists customizáveis para bundles e processos com validação em tempo real.", category: "Operacional", rating: 4.5, downloads: 2100, price: "Grátis", icon: CheckCircle, installed: false, author: "HealthTech Solutions", version: "4.1.2", features: ["Templates customizáveis", "Validação em tempo real", "Foto e assinatura digital", "Offline mode"] },
  { id: "5", name: "Integração LIS/LIMS", description: "Conector para sistemas laboratoriais com importação automática de resultados de culturas.", category: "Integração", rating: 4.3, downloads: 420, price: "R$ 399/mês", icon: Puzzle, installed: false, author: "LabConnect", version: "1.2.0", features: ["Import automático de culturas", "Antibiograma digital", "Compatível com HL7/FHIR", "Suporte multi-LIS"] },
  { id: "6", name: "Módulo de Precaução por Contato", description: "Gestão automatizada de precauções por contato com sinalização visual e alertas por setor.", category: "Operacional", rating: 4.7, downloads: 780, price: "R$ 149/mês", icon: Shield, installed: false, author: "SafeWard Tech", version: "2.0.5", features: ["Sinalização automática", "Alertas por setor", "Controle de EPIs", "Relatório de conformidade"] },
  { id: "7", name: "Farmacovigilância CCIH", description: "Monitoramento de uso de antimicrobianos com DDD e alertas de consumo.", category: "Analytics", rating: 4.4, downloads: 560, price: "R$ 249/mês", icon: Pill, installed: false, author: "PharmWatch", version: "1.5.3", features: ["DDD por setor", "Alertas de consumo", "Ranking de antimicrobianos", "Custo por paciente-dia"] },
  { id: "8", name: "Central de Notificações Avançada", description: "Sistema avançado de notificações com escalonamento, plantão e integração WhatsApp.", category: "Comunicação", rating: 4.6, downloads: 930, price: "R$ 179/mês", icon: Bell, installed: false, author: "NotifyHealth", version: "3.2.1", features: ["Escalonamento automático", "Integração WhatsApp", "Plantão rotativo", "Logs de leitura"] },
];

const categories = ["Todos", "Relatórios", "Analytics", "IA", "Operacional", "Integração", "Comunicação"];

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [selectedExt, setSelectedExt] = useState<Extension | null>(null);
  const [tab, setTab] = useState("all");

  const filtered = mockExtensions.filter((e) => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "Todos" || e.category === categoryFilter;
    const matchTab = tab === "all" || (tab === "installed" && e.installed);
    return matchSearch && matchCategory && matchTab;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Extensões e módulos para potencializar o IRASControl</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Puzzle className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total Disponíveis</p><p className="text-2xl font-bold">{mockExtensions.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-500" /></div><div><p className="text-xs text-muted-foreground">Instalados</p><p className="text-2xl font-bold">{mockExtensions.filter((e) => e.installed).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-yellow-500/10"><Star className="h-5 w-5 text-yellow-500" /></div><div><p className="text-xs text-muted-foreground">Melhor Avaliação</p><p className="text-2xl font-bold">4.9</p></div></CardContent></Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar extensões..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="installed">Instalados</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ext) => {
              const Icon = ext.icon;
              return (
                <Card key={ext.id} className="flex flex-col cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedExt(ext)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
                      {ext.installed && <Badge className="bg-emerald-500 text-white">Instalado</Badge>}
                    </div>
                    <CardTitle className="text-base mt-2">{ext.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{ext.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 pb-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{ext.rating}</span>
                      <span className="flex items-center gap-1"><Download className="h-3 w-3" />{ext.downloads}</span>
                      <Badge variant="outline" className="text-xs">{ext.category}</Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-between items-center border-t">
                    <span className="text-sm font-semibold">{ext.price}</span>
                    <Button size="sm" variant={ext.installed ? "outline" : "default"} onClick={(e) => { e.stopPropagation(); toast.success(ext.installed ? "Extensão atualizada" : "Extensão instalada"); }}>
                      {ext.installed ? "Atualizar" : "Instalar"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">Nenhuma extensão encontrada</p>}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedExt} onOpenChange={(o) => !o && setSelectedExt(null)}>
        <DialogContent className="max-w-lg">
          {selectedExt && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><selectedExt.icon className="h-6 w-6 text-primary" /></div>
                  <div>
                    <DialogTitle>{selectedExt.name}</DialogTitle>
                    <DialogDescription>{selectedExt.author} · v{selectedExt.version}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <p className="text-sm">{selectedExt.description}</p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Funcionalidades:</p>
                <ul className="space-y-1">
                  {selectedExt.features.map((f) => (
                    <li key={f} className="text-sm flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" />{f}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />{selectedExt.rating}</span>
                <span className="flex items-center gap-1"><Download className="h-4 w-4" />{selectedExt.downloads} downloads</span>
                <span className="font-semibold">{selectedExt.price}</span>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedExt(null)}>Fechar</Button>
                <Button onClick={() => { setSelectedExt(null); toast.success(selectedExt.installed ? "Extensão atualizada" : "Extensão instalada com sucesso"); }}>
                  {selectedExt.installed ? "Atualizar" : "Instalar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
