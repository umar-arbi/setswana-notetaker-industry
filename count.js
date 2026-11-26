(() => {
  const SERVER_URL = "https://umar-arbi--setswana-notetaker-web.us-east.modal.run";
  if (navigator.doNotTrack === "1") return;

  const body = { path: location.pathname };
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem("kn_seen") !== today) {
      localStorage.setItem("kn_seen", today);
      body.new_today = true;
    }
  } catch (_) {
    // Storage is unavailable or blocked; do not send the flag.
  }

  fetch(`${SERVER_URL}/site/hit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
})();
