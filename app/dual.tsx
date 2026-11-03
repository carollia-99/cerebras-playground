"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEveAgent } from "eve/react";
import { Client } from "eve/client";
import { INBOX } from "./inbox-data";

// ─── preset prompts ──────────────────────────────────────────────────────────

const TRIAGE_PROMPT = `You are my executive assistant. I have ${INBOX.length} unread emails. Triage them.

For each email, output ONE row in a markdown table with these columns:
| # | Priority (P0/P1/P2/P3) | Category | 1-line summary | Suggested action | 1-sentence draft reply (or "—") |

Rules:
- P0 = must handle today (customer blocked, deadline today)
- P1 = this week
- P2 = can wait
- P3 = archive/ignore
- Keep each cell under 15 words
- Finish with a 2-sentence end-of-day summary: biggest fire + what to defer

Emails:
${JSON.stringify(INBOX, null, 2)}`;

const CALENDAR = {
  date: "Thursday, Nov 7",
  events: [
    { time: "9:00-9:15", title: "Standup", notes: "give blockers" },
    { time: "10:30-11:00", title: "1:1 with Sarah (manager)", notes: "I have no agenda prepared" },
    { time: "12:00-13:00", title: "Lunch (open)" },
    { time: "14:00-14:30", title: "Design review: new onboarding flow" },
    { time: "16:00-17:00", title: "Interview panel — backend candidate" },
  ],
  todos: [
    "Finish Q4 report draft (promised Sarah by Friday EOD)",
    "Review Alex's PR #342",
    "Prep interview questions for backend candidate (before 4pm)",
    "Postmortem write-up for Acme SSO incident",
    "Reply to Mom about Thanksgiving flight",
    "Read Jenn's Q1 PRD + leave comments (by Wed EOD)",
    "Expense last week's trip receipts",
  ],
  constraints: ["I'm useless at email before 10am", "No deep work after 4pm", "Need 30min lunch minimum"],
};

const PLAN_PROMPT = `Here is my Thursday. Build me a realistic schedule from 9am-6pm that fits the fixed meetings and the todo list below. Give me specific time blocks with what to work on in each gap. Explain any trade-offs or things you're deliberately not doing today. Be opinionated.

${JSON.stringify(CALENDAR, null, 2)}`;

const TOKYO_PROMPT = `Find me a round-trip flight from SFO (San Francisco) to Tokyo (HND or NRT). Departure window: Dec 20-28, 2026. Return window: Jan 2-7, 2027. Budget: under $1500 USD. Use the browser to search a flight comparison site (like Google Flights or Kayak). Take a screenshot after loading results. Compare 3 good options on price, airline, times, and stops, and give me your top pick with a one-sentence reason.`;

const CONTRACTOR = {
  quotePdf: {
    source: "Quote_Kitchen_Renovation_v1.pdf (attached in Marco's intro email)",
    receivedAt: "2026-09-15T10:00:00",
    content: `
QUOTE — Kitchen Renovation
Prepared by: Marco Rossi · Rossi Construction LLC
For: Homeowner
Date: Sept 15, 2026

Scope of work:
  - Demo existing cabinets + countertops
  - Install new shaker cabinets (white)
  - Install quartz countertops (standard color)
  - Install standard subway tile backsplash (6 linear ft)
  - New electrical for 2 pendant lights
  - New plumbing for sink

Labor:     $11,500
Materials:  $6,500
—————————————
TOTAL:     $18,000.00

Payment terms: 25% deposit on signing, 25% at mid-project, 50% on completion.
Timeline: 3 weeks from start.
    `.trim(),
  },
  emails: [
    {
      date: "2026-10-02T14:22:00",
      from: "marco@rossiconstruction.com",
      to: "you@email.com",
      subject: "Re: tile upgrade",
      body: "Thanks for picking those out — the Carrara-pattern marble tile you want for the backsplash is a nicer product but much more labor to cut and install than the subway tile I quoted. I'd need to add $1,500 to cover the material difference and extra install time. That brings the total to $19,500 if you want to proceed with the upgrade. Let me know, Marco.",
    },
    {
      date: "2026-10-05T09:14:00",
      from: "you@email.com",
      to: "marco@rossiconstruction.com",
      subject: "Re: tile upgrade",
      body: "Sounds good — let's do the Carrara. $19,500 is approved. Thanks.",
    },
  ],
  texts: [
    {
      date: "2026-10-18T11:47:00",
      from: "you",
      to: "Marco Rossi",
      body: "Hey Marco, after thinking about it we actually want to skip the backsplash entirely for now. We'll DIY it next spring. Can you take it out of the project?",
    },
    {
      date: "2026-10-18T13:02:00",
      from: "Marco Rossi",
      to: "you",
      body: "No problem, less work for us. I'll take $800 off the total — labor was more than materials since the Carrara is already paid for and I can use it on a sample board. New total $18,700. Does that work?",
    },
    {
      date: "2026-10-18T13:04:00",
      from: "you",
      to: "Marco Rossi",
      body: "Perfect, $18,700 works.",
    },
  ],
  forwardedInvoice: {
    source: "Deposit invoice PDF — Marco forwarded via email",
    receivedAt: "2026-09-18T16:00:00",
    content: `
INVOICE — Deposit
Rossi Construction LLC
Invoice #: 2026-091
Date: Sept 18, 2026

Initial deposit against kitchen renovation project.
Amount due: $5,000.00

Pay to: Rossi Construction LLC
    `.trim(),
  },
  paymentRecords: [
    {
      date: "2026-09-18",
      source: "Chase checking (statement export)",
      memo: "Zelle · M Rossi · 'kitchen deposit'",
      amount: -4000,
    },
  ],
};

const CONTRACTOR_PROMPT = `My contractor Marco is calling me in 5 minutes about the kitchen renovation. Before the call, I need you to answer three things:

1. What is the FINAL agreed price right now?
2. How much have I actually paid?
3. Is there anything we still disagree on?

Rules:
- Cite the exact source for every number (quote PDF, email date, text date, invoice, or payment record).
- Reconcile the sources — don't just pick the latest number without showing your work.
- If two sources contradict each other, FLAG the discrepancy rather than silently choosing one.
- Keep it short. I'm about to be on the phone.

Available context (JSON):
${JSON.stringify(CONTRACTOR, null, 2)}`;

type Preset = {
  key: string;
  label: string;
  stats: string;        // short descriptor shown in the chip
  prompt: string;       // the full text actually sent to the model
};

const PRESETS: Preset[] = [
  { key: "triage",     label: "📥 Inbox triage",    stats: `${INBOX.length} unread emails · ${(TRIAGE_PROMPT.length / 1000).toFixed(1)}k chars`, prompt: TRIAGE_PROMPT },
  { key: "plan",       label: "📅 Plan my day",     stats: `${CALENDAR.events.length} events · ${CALENDAR.todos.length} todos`,                   prompt: PLAN_PROMPT },
  { key: "contractor", label: "🔨 Contractor call", stats: `3 messages · 1 PDF · 1 invoice · 1 payment`,                                           prompt: CONTRACTOR_PROMPT },
  { key: "tokyo",      label: "✈️ Tokyo flight",    stats: `uses browser · may be slow`,                                                           prompt: TOKYO_PROMPT },
];

function matchPreset(text: string): Preset | undefined {
  return PRESETS.find((p) => p.prompt === text);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function extractScreenshot(output: unknown): string | undefined {
  if (!output || typeof output !== "object") return;
  const o = output as {
    result?: { screenshot?: unknown };
    workbench?: { screenshotDataUrl?: unknown };
    screenshot?: unknown;
  };
  const candidates = [o.workbench?.screenshotDataUrl, o.result?.screenshot, o.screenshot];
  return candidates.find((v): v is string => typeof v === "string" && v.startsWith("data:image/"));
}

function extractUrl(output: unknown): string | undefined {
  if (!output || typeof output !== "object") return;
  const o = output as { result?: { url?: unknown }; url?: unknown; workbench?: { browser?: { url?: unknown } } };
  const candidates = [o.result?.url, o.url, o.workbench?.browser?.url];
  return candidates.find((v): v is string => typeof v === "string");
}

// Walks the raw event stream to find how long each tool call took:
// time between its `actions.requested` and matching `action.result` event.
function computeToolDurations(events: readonly unknown[]): Map<string, number> {
  const starts = new Map<string, number>();
  const durations = new Map<string, number>();
  for (const raw of events) {
    const e = raw as {
      type?: string;
      data?: {
        actions?: Array<{ callId?: string }>;
        result?: { callId?: string };
      };
      meta?: { at?: string };
    };
    const atMs = e.meta?.at ? Date.parse(e.meta.at) : NaN;
    if (!Number.isFinite(atMs)) continue;
    if (e.type === "actions.requested") {
      for (const a of e.data?.actions ?? []) {
        if (a?.callId) starts.set(a.callId, atMs);
      }
    } else if (e.type === "action.result") {
      const callId = e.data?.result?.callId;
      const start = callId ? starts.get(callId) : undefined;
      if (callId && typeof start === "number") {
        durations.set(callId, atMs - start);
      }
    }
  }
  return durations;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`;
}

type MessageMetrics = { ttftMs?: number; totalMs?: number; chars: number };

// ─── one agent column ────────────────────────────────────────────────────────

function AgentColumn({
  label,
  brand,
  provider,
  prompt,
  onPromptChange,
}: {
  label: string;
  brand: string;
  provider: "cerebras" | "anthropic";
  prompt: string;
  onPromptChange: (v: string) => void;
}) {
  const headers = useMemo(() => ({ "x-bell-provider": provider }), [provider]);
  const agent = useEveAgent({ headers });
  const [error, setError] = useState("");
  const [retiring, setRetiring] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, MessageMetrics>>({});
  const [editingPreset, setEditingPreset] = useState(false);
  const sendStartRef = useRef<number | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const busy = agent.status === "submitted" || agent.status === "streaming";
  const waiting = busy || agent.status === "resuming" || retiring;
  const matchedPreset = matchPreset(prompt);
  const showChip = Boolean(matchedPreset) && !editingPreset;
  const toolDurations = useMemo(() => computeToolDurations(agent.events), [agent.events]);

  // Auto-scroll to bottom while streaming, but respect the user if they've
  // scrolled up to read.
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [agent.data.messages, busy]);

  useEffect(() => {
    const start = sendStartRef.current;
    if (!start) return;
    const assistants = agent.data.messages.filter((m) => m.role === "assistant");
    const latest = assistants[assistants.length - 1];
    if (!latest) return;
    const chars = latest.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .reduce((n, p) => n + p.text.length, 0);
    if (chars === 0) return;
    setMetrics((prev) => {
      const existing = prev[latest.id] ?? { chars: 0 };
      const next: MessageMetrics = {
        // Each one-shot once set, so re-runs don't re-call performance.now().
        ttftMs: existing.ttftMs ?? performance.now() - start,
        totalMs: existing.totalMs ?? (busy ? undefined : performance.now() - start),
        chars,
      };
      if (
        existing.ttftMs === next.ttftMs
        && existing.totalMs === next.totalMs
        && existing.chars === next.chars
      ) return prev;
      return { ...prev, [latest.id]: next };
    });
    if (!busy) sendStartRef.current = null;
  }, [agent.data.messages, agent.status, busy]);

  async function send() {
    const text = prompt.trim();
    if (!text || waiting) return;
    setError("");
    onPromptChange("");
    setEditingPreset(false);
    sendStartRef.current = performance.now();
    try {
      await agent.send(text);
    } catch {
      setError("Request failed. Check the server and retry.");
      sendStartRef.current = null;
    }
  }

  async function newConversation() {
    if (waiting) return;
    setRetiring(true);
    setError("");
    try {
      if (agent.session)
        await new Client({ host: "", headers }).sessions.attach(agent.session.sessionId).reset();
      agent.reset();
      setMetrics({});
    } catch {
      setError("Could not reset. Please retry.");
    } finally {
      setRetiring(false);
    }
  }

  return (
    <section className="col">
      <header className="col-head">
        <div>
          <strong>{label}</strong>
          <span className="brand">{brand}</span>
        </div>
        <button type="button" className="reset" disabled={waiting} onClick={() => void newConversation()}>
          {retiring ? "resetting…" : "reset"}
        </button>
      </header>
      <div className="messages" aria-live="polite" ref={messagesRef}>
        {agent.data.messages.length === 0 ? (
          <p className="placeholder">pick a preset above or type a prompt below.</p>
        ) : (
          agent.data.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((message) => {
              const m = metrics[message.id];
              return (
                <article key={message.id} className={message.role}>
                  <strong className="who">{message.role === "user" ? "you" : label}</strong>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      if (message.role === "user") {
                        const matched = matchPreset(part.text);
                        if (matched) {
                          return <PresetEcho key={index} preset={matched} fullText={part.text} />;
                        }
                      }
                      return <p key={index}>{part.text}</p>;
                    }
                    if (part.type === "dynamic-tool") {
                      const screenshot = part.state === "output-available" ? extractScreenshot(part.output) : undefined;
                      const url = part.state === "output-available" ? extractUrl(part.output) : undefined;
                      const errored = part.state === "output-error" || part.state === "output-denied";
                      const duration = toolDurations.get(part.toolCallId);
                      const settled = part.state === "output-available" || errored;
                      return (
                        <div key={index} className="tool-trace">
                          <small className={`tool-badge${errored ? " errored" : ""}`}>
                            {part.toolName}
                            {duration !== undefined && settled ? (
                              <span className="tool-duration"> · {formatDuration(duration)}</span>
                            ) : !settled ? (
                              <span className="tool-duration"> · running…</span>
                            ) : null}
                            {url ? <span className="tool-url"> · {url}</span> : null}
                            {errored ? " · failed" : null}
                          </small>
                          {screenshot && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={screenshot} alt={`${part.toolName} screenshot`} className="tool-screenshot" />
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                  {message.role === "assistant" && m?.ttftMs && (
                    <small className="hud">
                      ttft {Math.round(m.ttftMs)}ms
                      {m.totalMs ? ` · total ${(m.totalMs / 1000).toFixed(2)}s` : " · streaming…"}
                      {m.totalMs && m.chars ? ` · ~${Math.round((m.chars / 4) / (m.totalMs / 1000))} tok/s` : null}
                    </small>
                  )}
                </article>
              );
            })
        )}
      </div>
      {(error || agent.error) && (
        <p className="error" role="alert">{error || "agent error. try again."}</p>
      )}
      <form
        className="composer"
        onSubmit={(e) => { e.preventDefault(); void send(); }}
      >
        <div className="label">ask {label}</div>
        {showChip && matchedPreset ? (
          <div className="preset-chip">
            <div className="chip-main">
              <span className="chip-label">{matchedPreset.label}</span>
              <span className="chip-stats">{matchedPreset.stats}</span>
            </div>
            <div className="chip-actions">
              <button type="button" onClick={() => setEditingPreset(true)}>edit</button>
              <button type="button" onClick={() => { onPromptChange(""); setEditingPreset(false); }}>clear</button>
            </div>
          </div>
        ) : (
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="type a prompt or pick a preset above (⌘/ctrl+enter)"
            disabled={waiting}
          />
        )}
        <div className="footrow">
          <span className="model">{brand}</span>
          <div className="actions">
            {busy && (
              <button type="button" className="stop" onClick={() => void agent.cancel().catch(() => setError("Stop failed."))}>
                stop
              </button>
            )}
            <button type="submit" disabled={waiting || !prompt.trim()}>↑ send</button>
          </div>
        </div>
      </form>
    </section>
  );
}

function PresetEcho({ preset, fullText }: { preset: Preset; fullText: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="preset-echo">
      <div className="preset-echo-head">
        <span className="chip-label">{preset.label}</span>
        <span className="chip-stats">{preset.stats}</span>
        <button type="button" className="echo-toggle" onClick={() => setOpen((o) => !o)}>
          {open ? "hide full prompt" : "show full prompt"}
        </button>
      </div>
      {open && <pre className="preset-echo-body">{fullText}</pre>}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function Dual() {
  const [leftPrompt, setLeftPrompt] = useState("");
  const [rightPrompt, setRightPrompt] = useState("");

  function loadPreset(preset: (typeof PRESETS)[number]) {
    setLeftPrompt(preset.prompt);
    setRightPrompt(preset.prompt);
  }

  return (
    <main className="dual">
      <style jsx>{`
        .dual { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid var(--border); }
        .topbar .brand { color: var(--fg-strong); letter-spacing: 0.5px; font-style: italic; font-size: 15px; }
        .topbar .meta { display: flex; gap: 8px; align-items: center; color: var(--fg-dim); font-size: 12px; }
        .topbar .meta a { color: var(--fg-dim); text-decoration: none; border: 1px solid var(--border); padding: 2px 7px; }
        .topbar .meta a:hover { color: var(--fg); border-color: var(--border-strong); }
        .section-label { padding: 10px 18px; color: var(--fg-dim); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .presets { padding: 2px 0 10px; border-bottom: 1px solid var(--border); }
        .preset { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; background: none; border: 0; color: var(--fg); font: inherit; font-size: 13px; text-align: left; }
        .preset:hover:not(:disabled) { background: #f0ede6; color: var(--fg-strong); }
        .preset:disabled { opacity: 0.4; }
        .preset .arrow { color: var(--fg-dim); }
        .preset:hover:not(:disabled) .arrow { color: var(--fg-strong); }
        .grid { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 0; }
        @media (max-width: 900px) { .grid { grid-template-columns: minmax(0, 1fr); } .grid > :first-child { border-right: 0; border-bottom: 1px solid var(--border); } }
      `}</style>
      <style jsx global>{`
        .dual .col { display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--border); overflow: hidden; }
        .dual .col:last-child { border-right: 0; }
        .dual .col-head { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 18px; border-bottom: 1px solid var(--border); color: var(--fg-strong); font-size: 13px; }
        .dual .col-head strong { font-weight: 400; }
        .dual .col-head .brand { margin-left: 10px; color: var(--fg-dim); font-size: 11px; }
        .dual .col-head .reset { background: none; color: var(--fg-dim); border: 1px solid var(--border); padding: 2px 8px; font-size: 11px; }
        .dual .col-head .reset:hover:not(:disabled) { color: var(--fg); border-color: var(--border-strong); }
        .dual .messages { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 14px 18px 10px; min-width: 0; min-height: 0; }
        .dual .messages .placeholder { color: var(--fg-dimmer); font-size: 12px; }
        .dual .messages article { padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .dual .messages article:last-child { border-bottom: 0; }
        .dual .messages article.user { background: var(--user-bg); margin: 0 -18px; padding: 10px 18px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); color: #0a2540; }
        .dual .messages article .who { font-size: 10px; color: var(--fg-dim); display: block; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase; }
        .dual .messages article p { white-space: pre-wrap; line-height: 1.5; margin: 4px 0; overflow-wrap: anywhere; }
        .dual .tool-trace { margin: 8px 0; }
        .dual .tool-badge { display: inline-block; font-size: 10px; color: var(--fg-dim); border: 1px solid var(--border-strong); padding: 2px 8px; letter-spacing: 0.5px; }
        .dual .tool-badge.errored { color: var(--red); border-color: var(--red); }
        .dual .tool-duration { color: var(--fg-strong); font-weight: 500; }
        .dual .tool-url { color: var(--fg-dimmer); }
        .dual .tool-screenshot { display: block; margin: 8px 0 0; max-width: 100%; width: 100%; height: auto; border: 1px solid var(--border); cursor: zoom-in; }
        .dual .tool-screenshot:hover { opacity: 0.95; }
        .dual .hud { display: block; font-size: 10px; color: var(--fg-dim); margin-top: 6px; letter-spacing: 0.5px; }
        .dual .error { color: var(--red); font-size: 11px; margin: 6px 18px; }
        .dual .composer { padding: 10px 18px; border-top: 1px solid var(--border); }
        .dual .composer .label { font-size: 11px; color: var(--fg-dim); margin-bottom: 6px; }
        .dual .composer textarea { width: 100%; min-height: 50px; max-height: 180px; padding: 8px 10px; font: inherit; font-size: 12px; color: var(--fg); background: var(--panel); border: 1px solid var(--border); resize: vertical; }
        .dual .composer textarea:focus { outline: none; border-color: var(--border-strong); background: #ffffff; }
        .dual .preset-chip { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 10px; background: var(--panel); border: 1px solid var(--border); }
        .dual .preset-chip .chip-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .dual .preset-chip .chip-label { font-size: 12px; color: var(--fg-strong); }
        .dual .preset-chip .chip-stats { font-size: 10px; color: var(--fg-dim); }
        .dual .preset-chip .chip-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .dual .preset-chip .chip-actions button { font: inherit; font-size: 10px; padding: 2px 8px; color: var(--fg-dim); background: none; border: 1px solid var(--border); letter-spacing: 0.5px; cursor: pointer; }
        .dual .preset-chip .chip-actions button:hover { color: var(--fg-strong); border-color: var(--border-strong); background: #f0ede6; }
        .dual .preset-echo { background: var(--user-bg); border: 1px solid var(--border); padding: 8px 10px; margin: 0; color: #0a2540; }
        .dual .preset-echo-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .dual .preset-echo-head .chip-label { font-size: 12px; color: var(--fg-strong); }
        .dual .preset-echo-head .chip-stats { font-size: 10px; color: var(--fg-dim); }
        .dual .preset-echo .echo-toggle { font: inherit; font-size: 10px; padding: 2px 8px; color: var(--fg-dim); background: none; border: 1px solid var(--border); margin-left: auto; cursor: pointer; letter-spacing: 0.5px; }
        .dual .preset-echo .echo-toggle:hover { color: var(--fg-strong); border-color: var(--border-strong); }
        .dual .preset-echo-body { margin: 8px 0 0; padding: 8px; max-height: 300px; overflow: auto; background: #ffffff; border: 1px solid var(--border); font-size: 10px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
        .dual .composer textarea::placeholder { color: var(--fg-dimmer); }
        .dual .composer .footrow { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
        .dual .composer .model { font-size: 11px; color: var(--fg-dim); }
        .dual .composer .actions { display: flex; gap: 6px; }
        .dual .composer button { padding: 4px 10px; font-size: 11px; color: var(--fg); background: none; border: 1px solid var(--border); letter-spacing: 0.5px; }
        .dual .composer button:hover:not(:disabled) { color: var(--fg-strong); border-color: var(--border-strong); background: #f0ede6; }
        .dual .composer button:disabled { opacity: 0.4; }
        .dual .composer button.stop { color: var(--red); border-color: var(--red); }
      `}</style>
      <div className="topbar">
        <span className="brand"><i>bell</i></span>
        <div className="meta">
          <span>Qwen 3.8 27B on Cerebras vs. Claude Sonnet 5.5 on Anthropic&apos;s API</span>
          <a href="https://github.com/browserbase/bell-stack" target="_blank" rel="noreferrer">↗</a>
          <a href="#presets">?</a>
        </div>
      </div>
      <div className="section-label" id="presets">Presets</div>
      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" className="preset" onClick={() => loadPreset(p)}>
            <span>{p.label}</span>
            <span className="arrow">→</span>
          </button>
        ))}
      </div>
      <div className="grid">
        <AgentColumn
          label="cerebras"
          brand={process.env.NEXT_PUBLIC_CEREBRAS_MODEL ?? "qwen-3.8-27b"}
          provider="cerebras"
          prompt={leftPrompt}
          onPromptChange={setLeftPrompt}
        />
        <AgentColumn
          label="claude"
          brand={process.env.NEXT_PUBLIC_ANTHROPIC_MODEL ?? "claude-sonnet-5-5"}
          provider="anthropic"
          prompt={rightPrompt}
          onPromptChange={setRightPrompt}
        />
      </div>
    </main>
  );
}
