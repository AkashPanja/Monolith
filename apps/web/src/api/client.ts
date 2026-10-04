/* Contracts mirror the future FastAPI surface. Mock implements them until the backend lands. */

export type Mode = "OFF" | "PAPER" | "LIVE_CONFIRM" | "LIVE_AUTO";
export type Health = "ok" | "warn" | "down";

export interface HealthStatus {
  broker: Health;
  feed: Health;
  llm: Health;
  whatsapp: Health;
}

export interface LimitMeter {
  name: string;
  usedPct: number; // 0-100
}

export interface Position {
  symbol: string;
  qty: number;
  avgPrice: number;
  ltp: number;
  pnl: number;
}

export interface Proposal {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  target: number;
  confidence: number;
  reason: string;
}

export interface ApiClient {
  login(user: string, password: string, totp: string): Promise<{ token: string }>;
  getMode(): Promise<Mode>;
  getHealth(): Promise<HealthStatus>;
  getDayPnl(): Promise<{ gross: number; charges: number; net: number }>;
  getLimits(): Promise<LimitMeter[]>;
  getPositions(): Promise<Position[]>;
  getProposals(): Promise<Proposal[]>;
  kill(reason: string): Promise<void>;
}
