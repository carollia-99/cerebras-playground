// Minimal end-to-end probe: create a session + first turn, print events.
// Usage: node --env-file=.env scripts/probe-agent.mjs "your prompt"
import { Client } from "eve/client";

const prompt = process.argv.slice(2).join(" ")
  || "Open https://en.wikipedia.org/wiki/Diet_Coke, call snapshot, and quote the exact first sentence of the lead paragraph verbatim. Do not paraphrase. Do not answer from memory.";
const host = process.env.BELL_HOST ?? "http://127.0.0.1:4320";
const provider = process.env.BELL_PROVIDER ?? "cerebras";

const client = new Client({
  host,
  headers: { "x-bell-provider": provider },
});

console.error(`[probe] host=${host} provider=${provider}`);
console.error(`[probe] prompt=${prompt}`);

const { response, session } = await client.sessions.create({ message: prompt });
console.error(`[probe] session=${session.state.sessionId}`);
console.error(`[probe] watch live: ${host}/api/live-view/${session.state.sessionId}`);

for await (const event of response) {
  const type = event.type;
  const parts = event.data?.parts ?? [];
  if (type === "message.appended" || type === "message.completed") {
    for (const part of parts) {
      if (part.type === "text") process.stdout.write(part.text);
      else if (part.type === "dynamic-tool") process.stderr.write(`\n[tool-call] ${part.toolName}\n`);
      else if (part.type === "reasoning") process.stderr.write(`\n[reasoning] ${(part.text ?? "").slice(0,120)}…\n`);
    }
  } else if (type === "turn.failed" || type === "turn.cancelled") {
    console.error(`\n[probe] ${type}:`, JSON.stringify(event.data).slice(0, 500));
    break;
  } else if (type === "turn.completed") {
    console.error(`\n[probe] turn.completed`);
    break;
  }
}
