import { describe, expect, it } from "vitest";
import type { MeetingStatus } from "./types";
import {
  isDriveLink, isMeetLink, isOnlineMeeting, locationOption, meetingsByDay, monthGrid,
  normalizeUrl, ONLINE_LOCATION, OTHER_LOCATION, upcomingMeetings,
} from "./meetingSchedule";

describe("links", () => {
  it("valida sala do Google Meet, aceitando link sem https://", () => {
    expect(isMeetLink("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(isMeetLink("meet.google.com/abc-defg-hij")).toBe(true);
    expect(isMeetLink("https://meet.google.com/")).toBe(false);
    expect(isMeetLink("https://zoom.us/j/123")).toBe(false);
    expect(isMeetLink("https://meet.google.com.golpe.com/abc")).toBe(false);
  });

  it("valida gravação no Google Drive", () => {
    expect(isDriveLink("https://drive.google.com/file/d/123/view")).toBe(true);
    expect(isDriveLink("docs.google.com/document/d/1")).toBe(true);
    expect(isDriveLink("https://dropbox.com/x")).toBe(false);
    expect(isDriveLink("")).toBe(false);
  });

  it("normaliza o link", () => {
    expect(normalizeUrl(" meet.google.com/x ")).toBe("https://meet.google.com/x");
    expect(normalizeUrl("")).toBe("");
  });
});

describe("local", () => {
  it("local salvo fora da lista aparece como Outro", () => {
    expect(locationOption("Auditório")).toBe("Auditório");
    expect(locationOption("Sala 12 do anexo")).toBe(OTHER_LOCATION);
    expect(locationOption("")).toBe("");
  });

  it("reunião online pelo local ou pelo link", () => {
    expect(isOnlineMeeting({ location: ONLINE_LOCATION, online_link: null })).toBe(true);
    expect(isOnlineMeeting({ location: "Auditório", online_link: "https://meet.google.com/a" })).toBe(true);
    expect(isOnlineMeeting({ location: "Auditório", online_link: "" })).toBe(false);
  });
});

describe("agenda", () => {
  const today = new Date(2026, 9, 22); // 22/10/2026
  const m = (scheduled_date: string, start_time: string, status: MeetingStatus = "scheduled") => ({ scheduled_date, start_time, status });

  it("próximas reuniões: de hoje até 7 dias, sem canceladas nem realizadas, em ordem", () => {
    const list = [
      m("2026-10-21", "09:00"),               // ontem
      m("2026-10-25", "08:00"),
      m("2026-10-22", "14:00"),
      m("2026-10-22", "09:00"),
      m("2026-10-29", "10:00"),               // limite (22 + 7)
      m("2026-10-30", "10:00"),               // fora
      m("2026-10-23", "10:00", "cancelled"),
      m("2026-10-23", "10:00", "approved"),
      m("2026-10-24", "10:00", "draft"),
    ];
    expect(upcomingMeetings(list, today).map(x => `${x.scheduled_date} ${x.start_time}`)).toEqual([
      "2026-10-22 09:00", "2026-10-22 14:00", "2026-10-24 10:00", "2026-10-25 08:00", "2026-10-29 10:00",
    ]);
  });

  it("agrupa por dia e ignora canceladas", () => {
    const g = meetingsByDay([m("2026-10-22", "14:00"), m("2026-10-22", "09:00"), m("2026-10-23", "", "cancelled")]);
    expect(Object.keys(g)).toEqual(["2026-10-22"]);
    expect(g["2026-10-22"].map(x => x.start_time)).toEqual(["09:00", "14:00"]);
  });

  it("calendário de outubro/2026 começa na quinta e tem 5 semanas", () => {
    const weeks = monthGrid(2026, 9);
    expect(weeks).toHaveLength(5);
    expect(weeks[0].slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]); // quinta
    expect(weeks[4].filter(Boolean).pop()).toBe("2026-10-31");
  });
});
