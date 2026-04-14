const STORAGE_KEY = "indicadores-isc-registros";

export interface ISCRegistro {
  id: string;
  nomeProfissional: string;
  dataVigilancia: string;
  mes: string;
  ano: string;
  indicadores: Record<string, {
    totalCirurgias: number;
    contatosAtendidos: number;
    reinternacoes: number;
    iscConfirmada: number;
    sitio: string;
  }>;
  criadoEm: string;
  atualizadoEm: string;
}

export function getISCRegistros(): ISCRegistro[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveISCRegistro(registro: ISCRegistro): void {
  const registros = getISCRegistros();
  const idx = registros.findIndex((r) => r.id === registro.id);
  registro.atualizadoEm = new Date().toISOString();
  if (idx >= 0) {
    registros[idx] = registro;
  } else {
    registros.push(registro);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

export function getLastISCRegistro(): ISCRegistro | null {
  const registros = getISCRegistros();
  return registros.length > 0 ? registros[registros.length - 1] : null;
}

export function deleteISCRegistro(id: string): void {
  const registros = getISCRegistros().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

export function generateISCId(): string {
  return `isc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
