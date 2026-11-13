(() => {
  const SERVER_URL = "https://umar-arbi--setswana-notetaker-web.us-east.modal.run";
  const form = document.getElementById("contact-form");
  const status = document.getElementById("status");
  const button = form.querySelector('button[type="submit"]');
  const failureMessage = "Could not send. Email us at kwalanotes@gmail.com.";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (button.disabled) return;

    button.disabled = true;
    status.textContent = "Sending…";
    try {
      const response = await fetch(`${SERVER_URL}/site/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          name: document.getElementById("name").value,
          email: document.getElementById("email").value,
          message: document.getElementById("message").value,
          website: document.getElementById("website").value,
        }),
      });
      if (response.status === 204) {
        status.textContent = "Thanks — we'll reply by email.";
        form.reset();
      } else if (response.status === 400 || response.status === 429) {
        const data = await response.json();
        status.textContent = typeof data.detail === "string" ? data.detail : failureMessage;
      } else {
        status.textContent = failureMessage;
      }
    } catch {
      status.textContent = failureMessage;
    } finally {
      button.disabled = false;
    }
  });
})();
