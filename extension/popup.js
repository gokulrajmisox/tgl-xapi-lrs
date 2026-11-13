const $ = (id) => document.getElementById(id);
const status = (text) => { $("status").textContent = text; };

async function render() {
  const state = await chrome.storage.local.get(["appOrigin", "token", "consent", "paused", "domains"]);
  $("setup").hidden = Boolean(state.token);
  $("connected").hidden = !state.token;
  if (state.token) {
    const count = state.domains?.length ?? 0;
    $("connectedText").textContent = state.paused ? "Tracking is paused." : `Connected. ${count} approved domain${count === 1 ? "" : "s"} currently enabled.`;
    $("pause").textContent = state.paused ? "Resume tracking" : "Pause tracking";
    $("origin").value = state.appOrigin ?? $("origin").value;
  }
}

$("connect").addEventListener("click", async () => {
  const originValue = $("origin").value.trim().replace(/\/$/, "");
  if (!$("consent").checked) return status("Consent is required before connecting.");
  if (!$("code").value.trim()) return status("Generate a one-time code from your TGL dashboard first.");
  let origin;
  try { origin = new URL(originValue); } catch { return status("Enter a valid TGL site URL."); }
  if (!(origin.protocol === "https:" || origin.hostname === "localhost")) return status("Use HTTPS for your TGL site.");
  const originPattern = `${origin.origin}/*`;
  const hasPermission = await chrome.permissions.request({ origins: [originPattern] });
  if (!hasPermission) return status("Site access permission was not granted.");
  status("Connecting securely…");
  try {
    const response = await fetch(`${origin.origin}/api/extension/pair`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: $("code").value.trim(), deviceName: $("device").value.trim() || "Browser", consent: true }),
    });
    const result = await response.json();
    if (!response.ok) return status(result.error ?? "Pairing failed. Generate a new code.");
    const feed = await fetch(`${origin.origin}/api/learning/approved-domains`, { cache: "no-store" });
    const domainResult = feed.ok ? await feed.json() : { domains: [] };
    await chrome.storage.local.set({ appOrigin: origin.origin, token: result.token, deviceId: result.deviceId, consent: true, paused: false, domains: (domainResult.domains ?? []).map((entry) => entry.domain), domainsUpdatedAt: Date.now(), activeSegment: null });
    await render();
    status("Connected. Your consent can be paused or withdrawn here anytime.");
  } catch {
    status("Could not connect. Check the TGL site URL and try again.");
  }
});

$("pause").addEventListener("click", async () => {
  const { paused } = await chrome.storage.local.get("paused");
  await chrome.storage.local.set({ paused: !paused, activeSegment: null });
  await render();
  status(paused ? "Tracking resumed." : "Tracking paused.");
});

$("disconnect").addEventListener("click", async () => {
  const state = await chrome.storage.local.get(["appOrigin", "token"]);
  let revoked = false;
  if (state.appOrigin && state.token) {
    try {
      const response = await fetch(`${state.appOrigin}/api/extension/device`, { method: "DELETE", headers: { "Authorization": `Bearer ${state.token}` } });
      revoked = response.ok;
    } catch { revoked = false; }
  }
  await chrome.storage.local.clear();
  await render();
  status(revoked ? "Disconnected and revoked on TGL." : "Local token deleted. If offline, revoke this browser from your TGL dashboard.");
});

void render();
