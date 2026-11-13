const ALARM = "tgl-active-learning-check";
const load = () => chrome.storage.local.get(["appOrigin", "token", "consent", "paused", "domains", "activeSegment"]);
const save = (values) => chrome.storage.local.set(values);

chrome.runtime.onInstalled.addListener(() => chrome.alarms.create(ALARM, { periodInMinutes: 1 }));
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) void tick(); });
chrome.tabs.onActivated.addListener(() => void tick());
chrome.windows.onFocusChanged.addListener(() => void tick());
chrome.idle.onStateChanged.addListener(() => void tick());

function approved(hostname, domains) {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

async function tick() {
  const state = await load();
  if (!state.consent || state.paused || !state.token || !state.appOrigin) return;
  if (Date.now() - (state.domainsUpdatedAt ?? 0) > 300_000) {
    try {
      const response = await fetch(`${state.appOrigin}/api/learning/approved-domains`, { cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        state.domains = (result.domains ?? []).map((entry) => entry.domain);
        state.domainsUpdatedAt = Date.now();
        await save({ domains: state.domains, domainsUpdatedAt: state.domainsUpdatedAt });
      }
    } catch {}
  }
  if (!Array.isArray(state.domains) || state.domains.length === 0) return;
  const [idleState, windowInfo, tabs] = await Promise.all([
    chrome.idle.queryState(60),
    chrome.windows.getLastFocused(),
    chrome.tabs.query({ active: true, lastFocusedWindow: true }),
  ]);
  const tab = tabs[0];
  let parsed;
  try { parsed = new URL(tab?.url ?? ""); } catch { return; }
  const isEligible = idleState === "active" && windowInfo.focused && parsed.protocol === "https:" && approved(parsed.hostname.toLowerCase(), state.domains);
  const safeUrl = `${parsed.origin}${parsed.pathname}`;
  const now = Date.now();
  const current = state.activeSegment;

  if (!isEligible) {
    if (current) await save({ activeSegment: null });
    return;
  }
  if (!current || current.resourceUrl !== safeUrl) {
    await save({ activeSegment: { resourceUrl: safeUrl, startedAt: now } });
    return;
  }
  const elapsed = Math.floor((now - current.startedAt) / 1000);
  if (elapsed < 55) return;
  const capped = Math.min(elapsed, 60);
  const eventId = crypto.randomUUID();
  const response = await fetch(`${state.appOrigin}/api/extension/events`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${state.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, resourceUrl: current.resourceUrl, startedAt: new Date(current.startedAt).toISOString(), endedAt: new Date(now).toISOString(), activeSeconds: capped }),
  }).catch(() => null);
  if (response?.ok) await save({ activeSegment: { resourceUrl: safeUrl, startedAt: now } });
}
