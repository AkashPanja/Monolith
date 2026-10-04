/* First-run setup state (mock persistence until services/api lands).
   WordPress-style: runs once before first login, fully skippable. */

const DONE_KEY = "monolith_setup_done";
const SKIP_KEY = "monolith_setup_skipped";

export interface SetupData {
  username: string;
  email: string;
  smtp: { host: string; port: number; user: string; from: string };
}

export function isSetupDone(): boolean {
  return localStorage.getItem(DONE_KEY) === "1";
}

export function isSetupSkipped(): boolean {
  return sessionStorage.getItem(SKIP_KEY) === "1";
}

/** True when the wizard should intercept (first run, not skipped). */
export function needsSetup(): boolean {
  return !isSetupDone() && !isSetupSkipped();
}

export function skipSetup(): void {
  sessionStorage.setItem(SKIP_KEY, "1");
}

export function completeSetup(data: SetupData): void {
  localStorage.setItem(DONE_KEY, "1");
  localStorage.setItem("monolith_setup_data", JSON.stringify({ ...data, smtp: { ...data.smtp, pass: undefined } }));
}
