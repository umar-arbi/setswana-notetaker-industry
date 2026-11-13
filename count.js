(() => {
  const SERVER_URL = "https://umar-arbi--setswana-notetaker-web.us-east.modal.run";
  if (navigator.doNotTrack === "1") return;

  fetch(`${SERVER_URL}/site/hit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ path: location.pathname }),
    keepalive: true,
  }).catch(() => {});
})();
