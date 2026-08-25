import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag, Search, Star, Download, CheckCircle, Puzzle,
  BarChart3, FileText, Shield, Microscope, Pill, Bell,
  ClipboardList, Package, ExternalLink, Loader2, Trash2, Truck
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface MarketplaceTool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  route: string;
  version: string;
  author: string;
  price: string;
  is_free: boolean;
  features: string[];
  downloads: number;
  rating: number;
}

interface Installation {
  tool_id: string;
  installed_at: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  ClipboardList, Shield, FileText, Microscope, Pill, Bell,
  BarChart3, Puzzle, CheckCircle, Package, Truck,
};

const CATEGORIES = ["Todos", "Auditorias", "Monitoramento", "Relatórios", "Analytics", "IA", "Operacional", "Integração", "Comunicação"];

export default function Marketplace() {
  const navigate = useNavigate();
  const { hospitalId, userId } = useHospitalContext();
  const { isAdmin } = useIsAdmin();

  const [tools, setTools] = useState<MarketplaceTool[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<MarketplaceTool | null>(null);

  useEffect(() => {
    fetchTools();
  }, []);

  useEffect(() => {
    if (hospitalId) fetchInstallations();
  }, [hospitalId]);

  async function fetchTools() {
    const { data } = await supabase.from("marketplace_tools").select("*").order("name");
    if (data) setTools(data as MarketplaceTool[]);
    setLoading(false);
  }

  async function fetchInstallations() {
    if (!hospitalId) return;
    const { data } = await supabase
      .from("hospital_tool_installations")
      .select("tool_id, installed_at")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true);
    if (data) setInstallations(data as Installation[]);
  }

  const isInstalled = (toolId: string) => installations.some(i => i.tool_id === toolId);

  async function handleInstall(tool: MarketplaceTool) {
    if (!hospitalId) { toast.error("Nenhum hospital selecionado."); return; }
    if (!isAdmin) { toast.error("Apenas administradores podem instalar ferramentas."); return; }
    setActing(tool.id);
    const { error } = await supabase.from("hospital_tool_installations").insert({
      hospital_id: hospitalId,
      tool_id: tool.id,
      installed_by: userId ?? undefined,
      is_active: true,
    });
    if (error) {
      toast.error("Erro ao instalar: " + error.message);
    } else {
      await fetchInstallations();
      toast.success(`✅ ${tool.name} instalado com sucesso!`);
    }
    setActing(null);
    setSelected(null);
  }

  async function handleUninstall(tool: MarketplaceTool) {
    if (!hospitalId || !isAdmin) return;
    setActing(tool.id);
    const { error } = await supabase
      .from("hospital_tool_installations")
      .update({ is_active: false })
      .eq("hospital_id", hospitalId)
      .eq("tool_id", tool.id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      await fetchInstallations();
      toast.success(`${tool.name} removido.`);
    }
    setActing(null);
    setSelected(null);
  }

  const filtered = tools.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || t.category === category;
    const matchTab = tab === "all" || (tab === "installed" && isInstalled(t.id));
    return matchSearch && matchCat && matchTab;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Módulos e ferramentas para o IRASControl</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Puzzle className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Disponíveis</p><p className="text-xl font-bold">{tools.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>
          <div><p className="text-xs text-muted-foreground">Instalados</p><p className="text-xl font-bold">{installations.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><Star className="h-5 w-5 text-yellow-500" /></div>
          <div><p className="text-xs text-muted-foreground">Avaliação média</p><p className="text-xl font-bold">{tools.length ? (tools.reduce((s, t) => s + t.rating, 0) / tools.length).toFixed(1) : "—"}</p></div>
        </CardContent></Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar módulos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Todos ({tools.length})</TabsTrigger>
          <TabsTrigger value="installed">Instalados ({installations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Carregando módulos…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(tool => {
                const Icon = ICON_MAP[tool.icon_name] ?? Package;
                const installed = isInstalled(tool.id);
                const isActing = acting === tool.id;
                return (
                  <Card key={tool.id} className="flex flex-col cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(tool)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
                        <div className="flex gap-1">
                          {installed && <Badge className="bg-emerald-500 text-white text-xs">Instalado</Badge>}
                          {tool.is_free && <Badge variant="outline" className="text-xs">Grátis</Badge>}
                        </div>
                      </div>
                      <CardTitle className="text-base mt-2">{tool.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pb-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{tool.rating}</span>
                        <span className="flex items-center gap-1"><Download className="h-3 w-3" />{tool.downloads}</span>
                        <Badge variant="outline" className="text-xs">{tool.category}</Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 flex justify-between items-center border-t">
                      <span className="text-sm font-semibold">{tool.price}</span>
                      <div className="flex gap-2">
                        {installed && (
                          <Button size="sm" variant="ghost" className="text-xs" onClick={e => { e.stopPropagation(); navigate(tool.route); }}>
                            <ExternalLink className="h-3 w-3 mr-1" />Abrir
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant={installed ? "outline" : "default"} disabled={isActing}
                            onClick={e => { e.stopPropagation(); installed ? handleUninstall(tool) : handleInstall(tool); }}>
                            {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : installed ? <><Trash2 className="h-3 w-3 mr-1" />Remover</> : "Instalar"}
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">Nenhum módulo encontrado.</p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (() => {
            const Icon = ICON_MAP[selected.icon_name] ?? Package;
            const installed = isInstalled(selected.id);
            const isActing = acting === selected.id;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
                    <div>
                      <DialogTitle>{selected.name}</DialogTitle>
                      <DialogDescription>{selected.author} · v{selected.version}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <p className="text-sm">{selected.description}</p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Funcionalidades:</p>
                  <ul className="space-y-1">
                    {(selected.features as string[]).map(f => (
                      <li key={f} className="text-sm flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />{f}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />{selected.rating}</span>
                  <span className="flex items-center gap-1"><Download className="h-4 w-4" />{selected.downloads} downloads</span>
                  <span className="font-semibold">{selected.price}</span>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
                  {installed && (
                    <Button variant="ghost" onClick={() => { setSelected(null); navigate(selected.route); }}>
                      <ExternalLink className="h-4 w-4 mr-1" />Abrir módulo
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant={installed ? "destructive" : "default"} disabled={isActing}
                      onClick={() => installed ? handleUninstall(selected) : handleInstall(selected)}>
                      {isActing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      {installed ? "Remover" : "Instalar"}
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
