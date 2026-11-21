(() => {
  const SERVER_URL = "https://umar-arbi--setswana-notetaker-web.us-east.modal.run";
  const form = document.getElementById("feedback-form");
  const status = document.getElementById("status");
  const button = form.querySelector('button[type="submit"]');
  const failureMessage = "Could not send. Please try again later.";
  const questions = [
    ["app_version", "Q1 App version"],
    ["meeting_types", "Q2 Meeting types", true],
    ["meeting_count", "Q3 Meetings recorded", true],
    ["overall", "Q4 Overall quality", true],
    ["transcript", "Q5 Notes accuracy (mixed Setswana and English)", true],
    ["notes", "Q6 Notes usefulness", true],
    ["speakers", "Q7 Speakers labelled correctly"],
    ["ease", "Q8 Ease of use", true],
    ["problems", "Q9 What went wrong or was confusing"],
    ["missing", "Q10 What is missing"],
    ["recommend", "Q11 Likelihood of recommending"],
    ["anything_else", "Q12 Anything else"],
  ];

  function buildMessage(data) {
    const answers = questions.map(([name]) => data.getAll(name)
      .map(value => value.trim()).filter(Boolean).join(", "));
    // Keep each answer on its question's line, even when pasted text has newlines.
    const lineAnswer = value => value.replace(/[\r\n]+/g, " ") || "-";
    const render = () => questions.map(([, label], index) =>
      `${label}: ${lineAnswer(answers[index])}`).join("\n");
    let message = render();
    if (message.length > 2000) {
      const freeText = [0, 8, 9, 11];
      const total = freeText.reduce((sum, index) => sum + answers[index].length, 0);
      const budget = Math.max(0, total - (message.length - 2000) - freeText.length);
      for (const index of freeText) {
        answers[index] = answers[index].slice(0, total ? Math.floor(answers[index].length * budget / total) : 0);
      }
      message = render();
    }
    return message.slice(0, 2000);
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (button.disabled) return;
    const data = new FormData(form);
    const missing = questions.filter(([name, , required]) =>
      required && !data.getAll(name).some(value => value.trim()));
    if (missing.length) {
      status.textContent = `Please answer the required questions: ${missing.map(([, label]) => label).join("; ")}.`;
      form.elements.namedItem(missing[0][0])[0].focus();
      return;
    }

    button.disabled = true;
    status.textContent = "Sending…";
    try {
      const response = await fetch(`${SERVER_URL}/site/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          name: "Tester feedback (anonymous)",
          email: "noreply@kwalanotes.com",
          message: buildMessage(data),
          website: data.get("website"),
        }),
      });
      if (response.status === 204) {
        status.textContent = "Thank you — your feedback was sent anonymously.";
        form.reset();
      } else if (response.status === 400 || response.status === 429) {
        const result = await response.json();
        status.textContent = typeof result?.detail === "string" ? result.detail : failureMessage;
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
