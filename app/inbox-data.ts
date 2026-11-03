// 100 unread emails for the inbox-triage preset.
// Mix of hand-crafted interesting items + procedural noise.

export type Email = {
  from: string;
  subject: string;
  body: string;
  received: string;
};

const t = (hoursAgo: number, minuteOffset = 0) => {
  const d = new Date(Date.UTC(2026, 10, 3, 9, 0, 0));
  d.setUTCHours(d.getUTCHours() - hoursAgo);
  d.setUTCMinutes(d.getUTCMinutes() - minuteOffset);
  return d.toISOString().slice(0, 16).replace("T", " ");
};

// ─── Hand-crafted "interesting" emails ──────────────────────────────────────

const CURATED: Email[] = [
  // P0 — must handle today
  { from: "priya.r@yourcompany.com", subject: "🚨 Acme SSO still down — $240k acct", received: t(1),
    body: "Acme's auth has been failing SAML assertions since 9am ET. Account manager (me) is on with their CTO at 11. If you can get me a ETA to share, that would help. If not I'll ask for a 24-hour grace." },
  { from: "sarah.chen@yourcompany.com", subject: "Q4 report draft by EOD Fri",
    received: t(3), body: "Board deck depends on the enterprise segment slide. Just need a first-pass; I'll clean it up over the weekend." },
  { from: "pagerduty@yourcompany.com", subject: "[P1→P0] api-latency-p99 breaching SLO for 20m",
    received: t(0, 25), body: "Error budget burn rate: 14x. Owner: platform-infra. You are on secondary call." },
  { from: "noreply@healthbenefits.com", subject: "Open enrollment closes TODAY 11:59pm PT",
    received: t(5), body: "You have not confirmed your 2027 plan selection. Default is to roll over current coverage with the 7% premium increase." },
  { from: "jenn.hong@yourcompany.com", subject: "Interview panel 4pm — questions ready?",
    received: t(2), body: "Candidate is strong on paper. I pushed system design to you. Let me know if you want to swap." },

  // P1 — this week
  { from: "mom@family.com", subject: "Thanksgiving?", received: t(6),
    body: "Just checking — are you flying in Wed or Thurs morning? Dad wants to pick you up. Also text me your flight #. Love, Mom" },
  { from: "alex.park@yourcompany.com", subject: "Can you review PR #342 when you get a chance?",
    received: t(4), body: "Rebased on main. The caching change is small — I'd love another set of eyes. EOD tomorrow is fine, no rush." },
  { from: "marco@rossiconstruction.com", subject: "Kitchen reno — final walkthrough Fri?",
    received: t(7), body: "Should wrap by Friday. Can you meet at the house at 3pm for the walkthrough? I'll have the final invoice." },
  { from: "jenn.hong@yourcompany.com", subject: "Q1 PRD — comments by Wed EOD",
    received: t(9), body: "Draft is in the shared drive. Specifically want your eyes on the migration story in section 4." },
  { from: "ops@yourcompany.com", subject: "Postmortem write-up for Acme SSO incident",
    received: t(10), body: "Draft due Monday. I started a doc; you had the IC role so needs your timeline review." },
  { from: "finance@yourcompany.com", subject: "Expense: 3 pending receipts from last week",
    received: t(11), body: "AMEX line items dated 10-28 → 10-31 are missing receipts. Expensify will auto-reject after 10 days." },
  { from: "jamie.r@scaleai.com", subject: "RE: coffee next week",
    received: t(12), body: "Thursday 2pm your side still work? I booked us at Verve on Cole. See you then." },
  { from: "landlord@email.com", subject: "Lease renewal — rate for 2027",
    received: t(14), body: "Attached is the renewal offer: 4.5% increase. Please return a signed copy by Nov 15 or we'll convert to month-to-month at market." },
  { from: "susan.k@your-college-alum.org", subject: "RE: speaking at the dec panel?",
    received: t(18), body: "We'd love to have you. 15-min talk, 30-min Q&A. Dec 11, 6pm, downtown. Honorarium is modest but there's wine." },
  { from: "docs-noreply@google.com", subject: "Jenn Hong shared Q1 roadmap v3.docx",
    received: t(20), body: "'See section 4 — want your take by Wed.'" },

  // P2 — can wait
  { from: "calendar@yourcompany.com", subject: "Invitation: Weekly 1:1 with Sarah — Thu 2pm",
    received: t(1, 15), body: "Recurring weekly, 30 min, Zoom. 'Please come with blockers and a 3-sentence status update.'" },
  { from: "noreply@linkedin.com", subject: "Jamie Rodriguez wants to connect",
    received: t(22), body: "Jamie: 'Hey, saw your work on inference infra — would love to chat about a Staff Eng role at Scale.'" },
  { from: "design@yourcompany.com", subject: "Design review feedback: onboarding v2",
    received: t(26), body: "3 small nits + 1 bigger thing about empty state. Nothing blocking." },
  { from: "friend@gmail.com", subject: "Lunch next week?",
    received: t(28), body: "Hey — Tuesday or Thursday? That new ramen spot on Divisadero. 12:30?" },
  { from: "noreply@figma.com", subject: "Mike invited you to Onboarding Flow v2.1",
    received: t(32), body: "You've been added as an editor." },

  // Narrative P3-ish — contractor/flights echoes for the "across-presets" vibe
  { from: "promotions@airline.com", subject: "✈️ 40% off flights to Tokyo this winter",
    received: t(30), body: "Limited time: SFO ⇄ HND, Dec–Feb. Book by Nov 15." },
  { from: "shipping@amazon.com", subject: "Your order #112-8842 has shipped",
    received: t(16), body: "USB-C Cable (3-pack). Arriving Tue, Nov 4." },
  { from: "receipt@uber.com", subject: "Your Thursday morning trip with Uber",
    received: t(27), body: "$18.40 charged to card ending 1234." },
  { from: "dependabot@github.com", subject: "[bell-stack] 1 vulnerability (moderate) in pg",
    received: t(29), body: "pg@8.23.1 → 8.24.0. Dependabot can open a PR." },
  { from: "no-reply@stripe.com", subject: "Invoice INV-20481 paid: $29.00",
    received: t(31), body: "Monthly subscription for Stripe Atlas." },
];

// ─── Procedural noise (templates) ───────────────────────────────────────────

const NOISE_RECIPES: Array<() => Email[]> = [
  // 10 newsletters/digests
  () => [
    ["The AI Pulse", "ainews.io", "This week: Cerebras raises funding, new open models from DeepSeek, Anthropic ships Opus 5."],
    ["TLDR Daily", "tldr.tech", "Top: Apple delays AR glasses · Figma acquires Dynaboard · GPT‑6 roadmap leaked."],
    ["Hacker Newsletter", "hackernewsletter.com", "Best of HN this week: 'Why your deploys are slow', 'A short tour of RISC‑V', 'Postgres 18 is wild'."],
    ["JavaScript Weekly", "javascriptweekly.com", "React 20 RC2 · Node 24.6 ships · Bun's incremental build patch."],
    ["Pragmatic Engineer", "pragmaticengineer.com", "Platform team archetypes · what to do when your CTO leaves · the IC‑to‑manager mistake."],
    ["Benedict Evans", "ben-evans.com", "The limits of model scaling · why Apple keeps winning · supply chain graphs."],
    ["Lenny's Newsletter", "lennysnewsletter.com", "The PM job is changing · 5 case studies on growth loops."],
    ["Platformer", "platformer.news", "Meta rolls out new creator tools · the FTC's AI probe · Elon vs Elon."],
    ["Stratechery", "stratechery.com", "This Week in Markets · Google's agent play · Cloudflare at the edge."],
    ["Not Boring", "notboring.co", "Thoughts on bitcoin treasury companies · the vertical SaaS playbook."],
  ].map(([name, domain, teaser], i) => ({
    from: `digest@${domain}`,
    subject: `${name} — Issue #${340 + i}`,
    body: teaser,
    received: t(13 + i * 3, 14),
  })),

  // 10 LinkedIn / social
  () => [
    "Marcus Bell", "Priya Shah", "Dan Levine", "Yuki Tanaka", "Ingrid Olsen",
    "Omar Hassan", "Lin Wei", "Alejandro Ruiz", "Nadia Petrov", "Chris Okonkwo",
  ].map((name, i) => ({
    from: "notifications@linkedin.com",
    subject: `${name} wants to connect`,
    body: `${name} and 3 mutual connections invited you to connect. "Hey, saw your talk at AI Infra Summit — would love to compare notes."`,
    received: t(15 + i * 2, 7 * i),
  })),

  // 8 shipping / transactional
  () => [
    ["Amazon", "Nike running socks (6-pack)"], ["REI", "Patagonia nano puff"],
    ["Target", "cleaning supplies refill"], ["Best Buy", "Anker 65W GaN charger"],
    ["Chewy", "cat food, salmon pâté x24"], ["Zappos", "Allbirds Tree Dasher"],
    ["IKEA", "KALLAX shelf + 2 inserts"], ["UPS", "package pickup confirmation"],
  ].map(([vendor, item], i) => ({
    from: `shipping@${(vendor as string).toLowerCase().replace(/\s+/g, "")}.com`,
    subject: `Your ${vendor} order has shipped`,
    body: `${item}. Expected delivery: Nov ${4 + (i % 4)}.`,
    received: t(21 + i * 2),
  })),

  // 12 GitHub notifications
  () => [
    ["bell-stack", "closed", "PR #341: cache stagehand sessions"],
    ["bell-stack", "mentioned you in", "issue #358: investigate CDP reconnect flakiness"],
    ["bell-stack", "review requested", "PR #359: add trace spans to tool loop"],
    ["bell-stack", "merged", "PR #357: upgrade ai@7.0.138"],
    ["eve", "subscribed", "issue #122 updated: dynamic model resolver gotchas"],
    ["eve", "released", "v0.80.0: breaking changes to channel API"],
    ["browserbase", "mentioned you in", "discussion #44: concurrent session limits"],
    ["your-side-project", "opened", "issue #12: dark mode regression on safari 18"],
    ["your-side-project", "closed", "PR #11: fix NPE in onboarding wizard"],
    ["ai-sdk", "subscribed", "issue #4028: cerebras provider options not forwarded"],
    ["bell-stack", "security alert", "pg@8.23.1 vulnerability (moderate)"],
    ["bell-stack", "ci failure", "workflow 'ci' failed on main (6cd13a)"],
  ].map(([repo, action, title], i) => ({
    from: "notifications@github.com",
    subject: `[${repo}] ${title}`,
    body: `${action} by @${["sarah", "alex", "jenn", "github-actions", "dependabot"][i % 5]}`,
    received: t(8 + i * 2, 5),
  })),

  // 8 calendar / meeting invites
  () => [
    ["Design critique — mobile onboarding", "35 min · Tue 11am"],
    ["Infra planning — Q1 OKRs", "60 min · Wed 9am"],
    ["Candidate debrief: Backend L5", "20 min · Thu 5pm"],
    ["AI/ML office hours", "30 min · Fri 2pm"],
    ["Monthly ops review", "45 min · next Mon 10am"],
    ["Vendor sync — Browserbase", "30 min · next Tue 3pm"],
    ["All-hands rehearsal", "25 min · next Wed 4pm"],
    ["Lunch & learn: cost of inference", "60 min · next Fri 12pm"],
  ].map(([title, when], i) => ({
    from: "calendar-noreply@yourcompany.com",
    subject: `Invitation: ${title}`,
    body: `${when}. Zoom link in event. Agenda in description.`,
    received: t(10 + i * 3),
  })),

  // 10 marketing / promo
  () => [
    ["sendgrid", "Hit your Nov sending limit? Upgrade to 500k emails."],
    ["notion", "Introducing Notion AI 3.0 — 10x faster blocks."],
    ["vercel", "AI Gateway Pro: 60% off through Nov 10."],
    ["replit", "Agents SDK v2 is here — build in minutes."],
    ["linear", "Linear for Startups: free until seed round."],
    ["segment", "Your free trial ends in 7 days."],
    ["clay", "New: unlimited waterfall enrichments in Growth tier."],
    ["posthog", "Session replay now 10x cheaper."],
    ["doordash", "$20 off your next order of $35+."],
    ["lyft", "Free month of Lyft Pink — ends today."],
  ].map(([brand, offer], i) => ({
    from: `promo@${brand}.com`,
    subject: offer as string,
    body: `From the ${brand} team. Unsubscribe at ${brand}.com/unsubscribe.`,
    received: t(17 + i * 2, 11),
  })),

  // 8 billing / receipts
  () => [
    ["Vercel", "$20.00 Pro"], ["Linear", "$10.00 Standard"],
    ["GitHub Copilot", "$10.00 individual"], ["Browserbase", "$39.00 Starter"],
    ["Cursor", "$20.00 Pro"], ["Figma", "$15.00 Professional"],
    ["Notion", "$8.00 Plus"], ["1Password", "$7.99 individual"],
  ].map(([service, line], i) => ({
    from: `receipts@${(service as string).toLowerCase().replace(/\s+/g, "")}.com`,
    subject: `Receipt from ${service}`,
    body: `Your card ending 1234 was charged. ${line}.`,
    received: t(23 + i * 2, 3),
  })),

  // 7 misc automated
  () => [
    { from: "security-noreply@google.com", subject: "New sign-in on Chrome · San Francisco, CA", body: "If this was you, no action needed." },
    { from: "noreply@grafana.com", subject: "[Alert resolved] error-rate · api-prod · duration 4m", body: "Metric back under threshold at 09:52 UTC." },
    { from: "automated@your-ci.com", subject: "Nightly deploy to staging: ✅ success", body: "28 commits, 4m 11s. See attached test report." },
    { from: "statuspage@stripe.com", subject: "Scheduled maintenance window — Nov 10 02:00 UTC", body: "Expected 30 min of degraded API latency." },
    { from: "no-reply@slack.com", subject: "Weekly summary: #eng-infra (12 new messages)", body: "Top thread: 'should we migrate off X?'" },
    { from: "noreply@zoom.us", subject: "Your cloud recording is ready: '1:1 w/ Sarah' (28m)", body: "Expires in 180 days." },
    { from: "donotreply@my-bank.com", subject: "Your statement is ready", body: "October statement available in online banking." },
  ].map((e, i) => ({ ...e, received: t(33 + i * 2, 2) })),

  // 2 random others to round to 100
  () => [
    { from: "nextdoor-noreply@nextdoor.com", subject: "What's happening in your neighborhood this week",
      body: "Lost cat, bake sale Saturday, new sushi place opening." },
    { from: "noreply@eventbrite.com", subject: "Reminder: AI Builders meetup tonight at 7pm",
      body: "The Mint, 1942 Market St. Doors at 6:30." },
  ].map((e, i) => ({ ...e, received: t(40 + i) })),
];

export const INBOX: Email[] = [
  ...CURATED,
  ...NOISE_RECIPES.flatMap((fn) => fn()),
].slice(0, 100);
