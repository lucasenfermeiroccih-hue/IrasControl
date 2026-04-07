import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Loader2, Trash2, Copy, Bot, User } from "lucide-react";
import { toast } from "sonner";
import {
  AI_AGENTS,
  canAccessAgent,
  getOrCreateSession,
  addMessage,
  getSessionMessages,
  clearSession,
  sendToAgent,
  PLAN_LABELS,
  PLAN_COLORS,
  type ChatMessage,
} from "@/lib/agent-service";

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const agent = AI_AGENTS.find((a) => a.id === agentId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!agent) {
      navigate("/agentes", { replace: true });
      return;
    }
    if (!canAccessAgent(agent)) {
      toast.error(`Acesso negado. Requer plano ${PLAN_LABELS[agent.requiredPlan]}.`);
      navigate("/agentes", { replace: true });
      return;
    }
    const session = getOrCreateSession(agent.id);
    setSessionId(session.id);
    setMessages(session.messages);
  }, [agent, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!agent) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = addMessage(sessionId, "user", trimmed);
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const output = await sendToAgent(agent.id, sessionId, trimmed);
      const assistantMsg = addMessage(sessionId, "assistant", output);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearSession(agent.id);
    const session = getOrCreateSession(agent.id);
    setSessionId(session.id);
    setMessages([]);
    toast.success("Conversa limpa.");
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copiado!");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/agentes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-2xl">{agent.icon}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">{agent.name}</h1>
          <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
        </div>
        <Badge className={`text-[10px] ${PLAN_COLORS[agent.requiredPlan]}`} variant="secondary">
          {PLAN_LABELS[agent.requiredPlan]}
        </Badge>
        <Button variant="ghost" size="icon" onClick={handleClear} title="Limpar conversa">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bot className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1">Envie uma pergunta para o agente {agent.name}</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <Card
                className={`max-w-[80%] p-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.role === "assistant" ? (
                    <SimpleMarkdown content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-6 text-[10px] opacity-60 hover:opacity-100"
                    onClick={() => handleCopy(msg.content)}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                )}
              </Card>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <Card className="p-3 bg-muted">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando dados...
                </div>
              </Card>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t pt-4 mt-2">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Envie sua pergunta para ${agent.name}...`}
            className="resize-none min-h-[60px] max-h-[120px]"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="self-end h-[60px] px-6"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Gerar
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Em produção, as respostas serão processadas por IA via n8n. Atualmente usando respostas simuladas.
        </p>
      </div>
    </div>
  );
}

// Simple markdown renderer (no dependency needed)
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="font-bold text-base mt-2">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="font-semibold text-sm mt-1.5">{line.slice(4)}</h4>;
        if (line.startsWith("- ")) return <li key={i} className="ml-4 list-disc text-sm">{renderInline(line.slice(2))}</li>;
        if (line.startsWith("| ")) return <p key={i} className="font-mono text-xs">{line}</p>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}
