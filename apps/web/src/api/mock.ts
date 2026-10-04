import type { ApiClient } from "./client";

/* Fixture-backed client. Replace with fetch() calls when services/api lands. */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockApi: ApiClient = {
  async login(user, password, totp) {
    await wait(450);
    if (!user || !password || !totp) throw new Error("Enter user, password and TOTP code.");
    if (password.length < 4) throw new Error("Invalid credentials.");
    return { token: "mock-jwt" };
  },
  async getMode() {
    return "PAPER";
  },
  async getHealth() {
    return { broker: "ok", feed: "ok", llm: "warn", whatsapp: "down" };
  },
  async getDayPnl() {
    return { gross: 12480, charges: 1312, net: 11168 };
  },
  async getLimits() {
    return [
      { name: "Daily loss", usedPct: 22 },
      { name: "Positions", usedPct: 40 },
      { name: "Orders / day", usedPct: 13 },
      { name: "Symbol exposure", usedPct: 61 },
    ];
  },
  async getPositions() {
    return [
      { symbol: "RELIANCE", qty: 40, avgPrice: 2984.2, ltp: 2997.5, pnl: 532 },
      { symbol: "HDFCBANK", qty: 60, avgPrice: 1642.0, ltp: 1638.1, pnl: -234 },
    ];
  },
  async getProposals() {
    return [
      {
        id: "p-101",
        symbol: "INFY",
        side: "BUY",
        entry: 1872.4,
        stopLoss: 1858.0,
        target: 1901.0,
        confidence: 0.72,
        reason: "ORB expansion + volume pace, spread 2 ticks.",
      },
    ];
  },
  async kill(reason) {
    await wait(300);
    if (!reason) throw new Error("Reason required.");
  },
};

export const api: ApiClient =
  import.meta.env.VITE_API_MODE === "live" ? ({} as ApiClient) : mockApi; // live client lands with services/api
