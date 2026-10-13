export type UpdatePhase =
  | "starting"
  | "repositories"
  | "resolving"
  | "downloading"
  | "installing"
  | "cleanup"
  | "verifying"
  | "complete"
  | "nothing"
  | "error";

export interface SystemUpdateState {
  status: "idle" | "running" | "success" | "failed";
  phase: UpdatePhase | null;
  progress: { current: number; total: number } | null;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  log: string[];
  error: string | null;
}

export interface ParseResult {
  phase: UpdatePhase;
  progress: { current: number; total: number } | null;
}

export interface UpdateProcess {
  stdout: ReadableStream<Uint8Array> | null;
  stderr: ReadableStream<Uint8Array> | null;
  exited: Promise<number>;
}

export type UpdateSpawn = () => UpdateProcess;

export class UpdateAlreadyRunningError extends Error {
  constructor() {
    super("already_running");
  }
}

const LOG_LIMIT = 200;
const ANSI_PATTERN = /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07]*\x07/g;
const SUDO_HINT =
  "Passwordless sudo for dnf is required. Add to sudoers: <user> ALL=(root) NOPASSWD: /usr/bin/dnf, /usr/bin/systemctl reboot";

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

export function splitOutputLines(text: string): string[] {
  return stripAnsi(text)
    .split(/[\r\n]+/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim().length > 0);
}

const INSTALL_VERBS = /^(Upgrading|Installing|Reinstalling|Downgrading|Obsoleting|Running scriptlet|Preparing|Prepare transaction|Replacing|Updating)\b/i;
const CLEANUP_VERBS = /^(Cleanup|Cleaning|Erasing|Removing|Remove)\b/i;
const VERIFY_VERBS = /^(Verifying|Verify package files)\b/i;

function progressOf(current: string, total: string): { current: number; total: number } {
  return { current: Number(current), total: Number(total) };
}

function classifyVerb(text: string): UpdatePhase | null {
  if (VERIFY_VERBS.test(text)) return "verifying";
  if (CLEANUP_VERBS.test(text)) return "cleanup";
  if (INSTALL_VERBS.test(text)) return "installing";
  return null;
}

export function parseDnfLine(rawLine: string, prev: ParseResult): ParseResult {
  const line = stripAnsi(rawLine).trim();
  if (!line) return prev;

  if (/^Complete!/i.test(line)) return { phase: "complete", progress: prev.progress };
  if (/^Nothing to do/i.test(line)) return { phase: "nothing", progress: null };

  if (/^Updating and loading repositories/i.test(line) || /^Last metadata expiration check/i.test(line) || /^Repositories loaded/i.test(line)) {
    return { phase: "repositories", progress: null };
  }

  if (/^(Transaction Summary|Total size of inbound packages|Dependencies resolved|Total download size)/i.test(line)) {
    return { phase: "resolving", progress: null };
  }

  if (/^Downloading Packages/i.test(line)) return { phase: "downloading", progress: null };

  if (/^Running (transaction|scriptlet)/i.test(line) && !/\d+\/\d+\s*$/.test(line)) {
    if (/^Running transaction/i.test(line)) return { phase: "installing", progress: null };
  }

  const dnf4Download = line.match(/^\((\d+)\/(\d+)\):\s+\S+/);
  if (dnf4Download) return { phase: "downloading", progress: progressOf(dnf4Download[1], dnf4Download[2]) };

  const dnf4Action = line.match(/^([A-Za-z][A-Za-z ]*?)\s*:\s+.*?(\d+)\/(\d+)\s*$/);
  if (dnf4Action) {
    const phase = classifyVerb(dnf4Action[1].trim());
    if (phase) return { phase, progress: progressOf(dnf4Action[2], dnf4Action[3]) };
  }

  const dnf5 = line.match(/^\[\s*(\d+)\s*\/\s*(\d+)\s*\]\s+(.*)$/);
  if (dnf5) {
    const progress = progressOf(dnf5[1], dnf5[2]);
    const rest = dnf5[3];
    const phase = classifyVerb(rest);
    if (phase) return { phase, progress };
    if (prev.phase === "installing" || prev.phase === "cleanup" || prev.phase === "verifying") {
      return { phase: prev.phase, progress };
    }
    return { phase: "downloading", progress };
  }

  return prev;
}

const defaultSpawn: UpdateSpawn = () =>
  Bun.spawn(["sudo", "-n", "dnf", "update", "-y"], {
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: { ...process.env, LC_ALL: "C", TERM: "dumb" },
  }) as unknown as UpdateProcess;

export class SystemUpdateService {
  private spawnFn: UpdateSpawn;
  private state: SystemUpdateState = SystemUpdateService.idleState();
  private stderrLines: string[] = [];

  constructor(spawnFn: UpdateSpawn = defaultSpawn) {
    this.spawnFn = spawnFn;
  }

  private static idleState(): SystemUpdateState {
    return {
      status: "idle",
      phase: null,
      progress: null,
      startedAt: null,
      finishedAt: null,
      exitCode: null,
      log: [],
      error: null,
    };
  }

  isRunning(): boolean {
    return this.state.status === "running";
  }

  getState(): SystemUpdateState {
    return { ...this.state, progress: this.state.progress ? { ...this.state.progress } : null, log: [...this.state.log] };
  }

  start(): SystemUpdateState {
    if (this.isRunning()) throw new UpdateAlreadyRunningError();

    this.stderrLines = [];
    this.state = {
      ...SystemUpdateService.idleState(),
      status: "running",
      phase: "starting",
      startedAt: new Date().toISOString(),
    };

    let proc: UpdateProcess;
    try {
      proc = this.spawnFn();
    } catch (err) {
      this.state.status = "failed";
      this.state.phase = "error";
      this.state.finishedAt = new Date().toISOString();
      this.state.error = err instanceof Error ? err.message : String(err);
      return this.getState();
    }

    void this.run(proc);
    return this.getState();
  }

  private pushLine(line: string, isStderr: boolean) {
    this.state.log.push(line);
    if (this.state.log.length > LOG_LIMIT) this.state.log.splice(0, this.state.log.length - LOG_LIMIT);
    if (isStderr) this.stderrLines.push(line);
    const next = parseDnfLine(line, { phase: this.state.phase ?? "starting", progress: this.state.progress });
    this.state.phase = next.phase;
    this.state.progress = next.progress;
  }

  private async consume(stream: ReadableStream<Uint8Array> | null, isStderr: boolean) {
    if (!stream) return;
    const decoder = new TextDecoder();
    let carry = "";
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        const cut = Math.max(carry.lastIndexOf("\n"), carry.lastIndexOf("\r"));
        if (cut === -1) continue;
        const chunk = carry.slice(0, cut + 1);
        carry = carry.slice(cut + 1);
        for (const line of splitOutputLines(chunk)) this.pushLine(line, isStderr);
      }
      carry += decoder.decode();
      for (const line of splitOutputLines(carry)) this.pushLine(line, isStderr);
    } catch (err) {
      this.pushLine(`stream error: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  }

  private async run(proc: UpdateProcess) {
    const sawNothing = () => this.state.phase === "nothing";
    let exitCode = -1;
    try {
      const [code] = await Promise.all([proc.exited, this.consume(proc.stdout, false), this.consume(proc.stderr, true)]);
      exitCode = code;
    } catch (err) {
      this.stderrLines.push(err instanceof Error ? err.message : String(err));
    }

    this.state.exitCode = exitCode;
    this.state.finishedAt = new Date().toISOString();

    if (exitCode === 0) {
      this.state.status = "success";
      this.state.phase = sawNothing() ? "nothing" : "complete";
      this.state.progress = null;
      return;
    }

    this.state.status = "failed";
    this.state.phase = "error";
    const stderrText = this.stderrLines.join("\n");
    if (/a password is required|sudo:|no tty present|not in the sudoers/i.test(stderrText)) {
      this.state.error = SUDO_HINT;
    } else {
      const last = this.stderrLines[this.stderrLines.length - 1];
      this.state.error = last ? `dnf exited with code ${exitCode}: ${last}` : `dnf exited with code ${exitCode}`;
    }
  }
}
