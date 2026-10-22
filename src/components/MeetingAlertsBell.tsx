import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, Clock, MapPin, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { civilDate, normalizeUrl, upcomingMeetings } from "@/modules/meeting-minutes/meetingSchedule";
import type { MeetingStatus } from "@/modules/meeting-minutes/types";

interface UpcomingMeeting {
  id: string;
  title: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  online_link: string | null;
  status: MeetingStatus;
}

const DAYS_AHEAD = 7;
const br = (d: string) => d.split("-").reverse().join("/");

/** Sino do topo: reuniões agendadas do hospital nos próximos 7 dias (alerta para todos). */
export function MeetingAlertsBell() {
  const navigate = useNavigate();
  const { hospitalId } = useHospitalContext();
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    const today = new Date();
    const until = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DAYS_AHEAD);
    const { data } = await supabase
      .from("meetings")
      .select("id, title, scheduled_date, start_time, end_time, location, online_link, status")
      .eq("hospital_id", hospitalId)
      .gte("scheduled_date", civilDate(today))
      .lte("scheduled_date", civilDate(until));
    const list = upcomingMeetings((data || []) as UpcomingMeeting[], today, DAYS_AHEAD);
    setMeetings(list);

    // Aviso na tela para reuniões de hoje: uma vez por reunião, por dia, neste navegador.
    const todayKey = civilDate(today);
    list.filter((m) => m.scheduled_date === todayKey).forEach((m) => {
      const key = `iras-meeting-alert-${m.id}-${todayKey}`;
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
      } catch { /* sem armazenamento: avisa mesmo assim */ }
      toast.info(`Reunião hoje${m.start_time ? ` às ${m.start_time}` : ""}: ${m.title}`, {
        description: m.location || undefined,
        duration: 10000,
        action: m.online_link
          ? { label: "Entrar na sala", onClick: () => window.open(normalizeUrl(m.online_link), "_blank", "noopener") }
          : { label: "Ver", onClick: () => navigate("/reunioes-atas") },
      });
    });
  }, [hospitalId, navigate]);

  useEffect(() => {
    load();
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [load]);

  const count = meetings.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={count ? `${count} reunião(ões) agendada(s)` : "Sem reuniões agendadas"}>
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center px-1">
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Reuniões nos próximos {DAYS_AHEAD} dias</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Nenhuma reunião agendada.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="px-2 py-2 rounded-sm hover:bg-accent cursor-pointer space-y-1"
                onClick={() => navigate("/reunioes-atas")}
              >
                <p className="text-sm font-medium leading-snug">{m.title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{br(m.scheduled_date)}</span>
                  {m.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.start_time}</span>}
                  {m.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>}
                </div>
                {m.online_link && (
                  <a
                    href={normalizeUrl(m.online_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded bg-[#1a73e8] px-2 py-0.5 text-xs font-semibold text-white"
                  >
                    <Video className="h-3 w-3" /> Entrar na sala
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <DropdownMenuSeparator />
        <button className="w-full px-2 py-1.5 text-left text-xs text-primary hover:underline" onClick={() => navigate("/reunioes-atas")}>
          Abrir Reuniões e Atas
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
