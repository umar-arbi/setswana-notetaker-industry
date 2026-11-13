(() => {
  const storeLink = document.getElementById("store-link");
  const storeUrl = (storeLink?.dataset.storeUrl || "").trim();

  if (storeLink && storeUrl.startsWith("https://")) {
    storeLink.href = storeUrl;
    storeLink.removeAttribute("hidden");
  }
})();
