import type { ApiClient, HealthStatus, LimitMeter, Mode, Position, Proposal } from "./client";

/* Live client: fetch() against the FastAPI backend (VITE_API_MODE=live).
   Dev server proxies /api -> http://localhost:8000 (vite.config.ts). */

const TOKEN_KEY = "monolith_token";

function headers(auth = true): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) h["Authorization"] = `Bearer ${t}`;
  }
  return h;
}

async function req<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const r = await fetch(path, { ...init, headers: { ...headers(auth), ...init?.headers } });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || `Request failed (${r.status}).`);
  }
  return r.json() as Promise<T>;
}

export const isLive = () => import.meta.env.VITE_API_MODE === "live";

export const liveApi: ApiClient = {
  async login(user, password, totp) {
    const r = await req<{ token: string }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ user, password, totp }) },
      false
    );
    return r;
  },
  async getMode() {
    const r = await req<{ mode: Mode }>("/api/mode");
    return r.mode;
  },
  async getHealth() {
    const r = await req<HealthStatus & { mode: Mode }>("/api/health", undefined, false);
    return { broker: r.broker, feed: r.feed, llm: r.llm, whatsapp: r.whatsapp };
  },
  async getDayPnl() {
    return req("/api/pnl");
  },
  async getLimits() {
    const r = await req<{ limits: LimitMeter[] }>("/api/limits");
    return r.limits;
  },
  async getPositions() {
    const r = await req<{ positions: Position[] }>("/api/positions");
    return r.positions;
  },
  async getProposals() {
    const r = await req<{ proposals: Proposal[] }>("/api/proposals");
    return r.proposals;
  },
  async kill(reason, phrase) {
    await req("/api/kill", { method: "POST", body: JSON.stringify({ reason, phrase }) });
  },
  async requestPasswordReset(email) {
    await req("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) }, false);
  },
  async sendTestEmail(cfg) {
    if (!cfg.host) throw new Error("SMTP host is required.");
    if (!cfg.to || !/.+@.+\..+/.test(cfg.to)) throw new Error("Enter the account email first.");
    // Real send-test lands with the notifier; until then the server validates.
  },
  async setupStatus() {
    const r = await req<{ done: boolean }>("/api/setup/status", undefined, false);
    return r;
  },
  async createFirstUser(data) {
    const r = await req<{ totp_secret: string; otpauth_uri: string }>(
      "/api/setup",
      {
        method: "POST",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          smtp_host: data.smtp.host,
          smtp_port: data.smtp.port,
          smtp_user: data.smtp.user,
          smtp_from: data.smtp.from,
        }),
      },
      false
    );
    return { totpSecret: r.totp_secret };
  },
};
