// Rep join / sign-in page and rep earnings page (ticket 1309b).
// Text is only ever written with textContent. No inline handlers, no HTML strings.
(() => {
  const SERVER_URL = "https://umar-arbi--setswana-notetaker-web.us-east.modal.run";
  const TERMS_VERSION = "2026-11-25";
  const TOKEN_KEY = "kn_rep_token";
  const $ = (id) => document.getElementById(id);

  const readToken = () => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  };
  const saveToken = (token) => {
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) { /* the page still works without storage */ }
  };
  const clearToken = () => {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  };

  // Returns { status, body } or { status: 0, body: {} } when the network fails.
  async function api(path, payload, token, method) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    try {
      const response = await fetch(SERVER_URL + path, {
        method: method || "POST",
        headers,
        credentials: "omit",
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
      let body = {};
      try { body = await response.json(); } catch (e) { body = {}; }
      return { status: response.status, body: body && typeof body === "object" ? body : {} };
    } catch (e) {
      return { status: 0, body: {} };
    }
  }

  const say = (node, text) => { if (node) node.textContent = text; };
  const setBusy = (nodes, busy) => nodes.forEach((n) => { if (n) n.disabled = busy; });
  const pula = (value) => {
    const n = Number(value);
    return "P" + (Number.isFinite(n) ? n : 0).toFixed(2);
  };

  // ---- Join / sign-in page ----
  const joinForm = $("rep-form");
  if (joinForm) {
    const email = $("rep-email");
    const code = $("rep-code");
    const accept = $("rep-accept");
    const send = $("rep-send");
    const verify = $("rep-verify");
    const resend = $("rep-resend");
    const status = $("rep-status");
    const step2 = $("rep-step-code");
    let codeStep = false;

    const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

    async function sendCode() {
      const address = email.value.trim();
      if (!validEmail(address)) { say(status, "Enter a valid email address."); return; }
      setBusy([send, verify, resend], true);
      say(status, "");
      const result = await api("/rep/api/start", { email: address });
      setBusy([send, verify, resend], false);
      if (result.status === 429) { say(status, "Too many tries. Please try again later."); return; }
      if (result.status === 0 || result.status >= 400) { say(status, "Something went wrong. Please try again."); return; }
      say(status, "If that email can be used, we have sent a 6-digit code. It lasts 15 minutes.");
      codeStep = true;
      send.hidden = true;
      send.type = "button";
      if (step2) step2.hidden = false;
      if (code) code.focus();
    }

    async function verifyCode() {
      const digits = code.value.trim();
      if (!/^[0-9]{6}$/.test(digits)) { say(status, "Enter the 6-digit code from your email."); return; }
      setBusy([send, verify, resend], true);
      say(status, "");
      const result = await api("/rep/api/verify", {
        email: email.value.trim(),
        code: digits,
        accept_terms: accept.checked,
        terms_version: TERMS_VERSION,
      });
      if (result.status === 200 && typeof result.body.token === "string" && result.body.token) {
        saveToken(result.body.token);
        window.location.assign("/rep-earnings.html");
        return;
      }
      setBusy([send, verify, resend], false);
      const detail = typeof result.body.detail === "string" ? result.body.detail : "";
      if (result.status === 429) say(status, "Too many tries. Please try again later.");
      else if (detail === "code_wrong") say(status, "That code is not right. Check it and try again.");
      else if (detail === "code_expired") say(status, "That code has expired. Ask for a new one.");
      else if (detail === "terms_required") say(status, "Please accept the rep terms to continue.");
      else say(status, "Something went wrong. Please try again.");
    }

    joinForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (send.disabled && verify.disabled) return;
      const by = event.submitter ? event.submitter.id : "";
      if (by === "rep-verify" || (by !== "rep-send" && codeStep)) void verifyCode();
      else void sendCode();
    });
    if (resend) resend.addEventListener("click", () => { void sendCode(); });
  }

  // ---- Earnings page ----
  const bankForm = $("bank-form");
  if (bankForm) {
    const bankStatus = $("bank-status");
    const masked = $("bank-masked");
    const token = readToken();
    const leave = () => { clearToken(); window.location.replace("/rep.html"); };
    if (!token) { leave(); return; }

    const showBank = (bank) => {
      const set = bank && bank.set === true && typeof bank.masked === "string";
      say(masked, set ? "Saved: " + String(bank.masked) : "No bank details saved yet.");
    };

    (async () => {
      const result = await api("/rep/api/me", undefined, token, "GET");
      if (result.status === 401) { leave(); return; }
      if (result.status !== 200) {
        ["rep-code-value", "rep-customers", "rep-pending", "rep-ready", "rep-paid", "bank-masked"].forEach((id) => say($(id), "—"));
        say(bankStatus, "Could not load your details. Please refresh the page.");
        return;
      }
      const me = result.body;
      say($("rep-code-value"), typeof me.code === "string" ? me.code : "");
      say($("rep-customers"), String(Number.isFinite(Number(me.customers)) ? Number(me.customers) : 0));
      say($("rep-pending"), pula(me.pending_pula));
      say($("rep-ready"), pula(me.ready_pula));
      say($("rep-paid"), pula(me.paid_pula));
      showBank(me.bank);
    })();

    bankForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const save = $("bank-save");
      const account = $("bank-account");
      const holder = $("bank-holder").value.trim();
      const bank = $("bank-name").value.trim();
      const digits = account.value.replace(/[\s-]/g, "");
      const branch = $("bank-branch").value.trim();
      let problem = "";
      if (holder.length < 2 || holder.length > 80) problem = "Enter the account holder name (2 to 80 characters).";
      else if (bank.length < 2 || bank.length > 60) problem = "Enter the bank name (2 to 60 characters).";
      else if (!/^[0-9]{5,20}$/.test(digits)) problem = "The account number must be 5 to 20 digits.";
      else if (branch !== "" && !/^[A-Za-z0-9]{1,20}$/.test(branch)) problem = "The branch code can only have letters and numbers (up to 20).";
      if (problem) { say(bankStatus, problem); return; }
      const payload = { holder, bank, account: digits };
      if (branch) payload.branch = branch;
      setBusy([save], true);
      say(bankStatus, "");
      const result = await api("/rep/api/bank", payload, token);
      setBusy([save], false);
      if (result.status === 401) { leave(); return; }
      if (result.status === 200 && result.body.ok === true) {
        account.value = "";
        showBank(result.body.bank);
        say(bankStatus, "Bank details saved.");
      } else if (result.status === 400 || String(result.body.detail) === "bank_invalid") {
        say(bankStatus, "Please check the bank details and try again.");
      } else {
        say(bankStatus, "Something went wrong. Please try again.");
      }
    });

    const signout = $("rep-signout");
    if (signout) {
      signout.addEventListener("click", async () => {
        setBusy([signout], true);
        await api("/rep/api/logout", undefined, token);
        leave();
      });
    }
  }
})();
