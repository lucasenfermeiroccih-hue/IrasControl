import { useSyncExternalStore } from "react";
import {
  CLEANING_AUDITS, CLEANING_SCHEDULE, EQUIPMENT, EQUIPMENT_ITEMS, NONCONFORMITIES,
  PARAM_LOGS, PRODUCTS, SECTOR_OUTPUTS, SETORES, STOCK_ENTRIES, FORNECEDORES,
  type AuditRecordHL, type CleaningTask, type EquipmentItem, type EquipmentSectorRow,
  type HLProduct, type NonConformity, type ParamLog, type SectorOutput, type StockEntry,
} from "./data/mockData";
import { DEFAULT_PARAMS, type LogisticsParams } from "./utils/logisticsFormulas";

export interface HLState {
  params: LogisticsParams;
  products: HLProduct[];
  outputs: SectorOutput[];
  entries: StockEntry[];
  equipment: EquipmentSectorRow[];
  equipmentItems: EquipmentItem[];
  schedule: CleaningTask[];
  audits: AuditRecordHL[];
  nonconformities: NonConformity[];
  paramLogs: ParamLog[];
  sectors: string[];
  suppliers: string[];
}

let state: HLState = {
  params: { ...DEFAULT_PARAMS },
  products: PRODUCTS,
  outputs: SECTOR_OUTPUTS,
  entries: STOCK_ENTRIES,
  equipment: EQUIPMENT,
  equipmentItems: EQUIPMENT_ITEMS,
  schedule: CLEANING_SCHEDULE,
  audits: CLEANING_AUDITS,
  nonconformities: NONCONFORMITIES,
  paramLogs: PARAM_LOGS,
  sectors: SETORES,
  suppliers: FORNECEDORES,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setHLState(patch: Partial<HLState> | ((s: HLState) => Partial<HLState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  emit();
}

export function getHLState() {
  return state;
}

export function useHL(): HLState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
