// Rep join / sign-in page and rep earnings page (ticket 1309b).
// Text is only ever written with textContent. No inline handlers, no HTML strings.
(() => {
  const SERVER_URL = "https://umar-arbi--setswana-notetaker-web.us-east.modal.run";
  const TERMS_VERSION = "2026-11-26";
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
  // Reps use their KwalaNotes account (email + password). A new account gets a one-time email code.
  const joinForm = $("rep-form");
  if (joinForm) {
    const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
    const forms = { join: joinForm, signin: $("rep-signin-form"), forgot: $("rep-forgot-form") };
    const tabs = { join: $("tab-join"), signin: $("tab-signin") };
    const show = (name) => {
      Object.keys(forms).forEach((key) => { if (forms[key]) forms[key].hidden = key !== name; });
      Object.keys(tabs).forEach((key) => {
        if (!tabs[key]) return;
        tabs[key].setAttribute("aria-selected", key === name || (name === "forgot" && key === "signin") ? "true" : "false");
        tabs[key].tabIndex = key === name ? 0 : -1;
      });
      if (forms[name]) { const first = forms[name].querySelector("input:not([type=checkbox])"); if (first) first.focus(); }
    };
    if (tabs.join) tabs.join.addEventListener("click", () => show("join"));
    if (tabs.signin) tabs.signin.addEventListener("click", () => show("signin"));
    const toForgot = $("rep-to-forgot");
    if (toForgot) toForgot.addEventListener("click", () => {
      $("forgot-email").value = $("signin-email").value.trim();
      show("forgot");
    });
    const backSignin = $("forgot-back");
    if (backSignin) backSignin.addEventListener("click", () => show("signin"));
    const hash = (window.location.hash || "").replace("#", "");
    if (hash === "signin" || hash === "forgot") show(hash === "forgot" ? "forgot" : "signin");

    const goEarnings = (result) => {
      saveToken(result.body.token);
      window.location.assign("/rep-earnings.html");
    };
    const detailOf = (result) => (typeof result.body.detail === "string" ? result.body.detail : "");
    const common = (result, node) => {
      if (result.status === 429) { say(node, "Too many tries. Please try again later."); return true; }
      if (result.status === 0 || result.status >= 500) { say(node, "Something went wrong. Please try again."); return true; }
      return false;
    };

    // --- Become a rep ---
    const email = $("rep-email");
    const pw = $("rep-password");
    const pw2 = $("rep-password2");
    const accept = $("rep-accept");
    const send = $("rep-send");
    const verify = $("rep-verify");
    const resend = $("rep-resend");
    const code = $("rep-code");
    const status = $("rep-status");
    const step2 = $("rep-step-code");
    const fieldsets = $("rep-step-account");
    let codeStep = false;

    const joinBody = () => ({
      email: email.value.trim(), password: pw.value, accept_terms: accept.checked, terms_version: TERMS_VERSION,
    });
    const openCodeStep = (message) => {
      codeStep = true;
      if (fieldsets) fieldsets.hidden = true;
      send.hidden = true;
      send.type = "button";
      if (step2) step2.hidden = false;
      say(status, message);
      if (code) code.focus();
    };
    const joinError = (result) => {
      if (common(result, status)) return;
      const detail = detailOf(result);
      if (detail === "wrong_credentials") say(status, "That email already has a KwalaNotes account, but the password does not match. Use your KwalaNotes password, or reset it on the Sign in tab.");
      else if (detail === "terms_required") say(status, "Please accept the rep terms to continue.");
      else if (detail === "rep_other_account") say(status, "A rep page for this email is linked to a different account. Please email kwalanotes@gmail.com.");
      else say(status, "Something went wrong. Please try again.");
    };

    async function startJoin() {
      const body = joinBody();
      if (!validEmail(body.email)) { say(status, "Enter a valid email address."); return; }
      if (body.password.length < 8) { say(status, "Your password must be at least 8 characters."); return; }
      if (body.password.length > 128) { say(status, "That password is too long (128 characters at most)."); return; }
      if (body.password !== pw2.value) { say(status, "The two passwords are not the same."); return; }
      if (!body.accept_terms) { say(status, "Please accept the rep terms to continue."); return; }
      setBusy([send], true);
      say(status, "");
      const created = await api("/rep/api/signup", { email: body.email, password: body.password });
      if (created.status === 202) {
        setBusy([send], false);
        openCodeStep("We sent a 6-digit code to " + body.email + ". It only needs to be entered once.");
        return;
      }
      if (created.status === 409) {
        // The email already has a KwalaNotes account: sign in with its password and join.
        const joined = await api("/rep/api/join", body);
        setBusy([send], false);
        if (joined.status === 200 && typeof joined.body.token === "string" && joined.body.token) { goEarnings(joined); return; }
        if (joined.status === 403 && detailOf(joined) === "email_not_verified") { openCodeStep("Please confirm your email first. We sent a 6-digit code to " + body.email + "."); return; }
        joinError(joined);
        return;
      }
      setBusy([send], false);
      if (common(created, status)) return;
      const detail = detailOf(created);
      if (detail === "invalid_email") say(status, "Enter a valid email address.");
      else if (detail === "password_invalid") say(status, "Your password must be 8 to 128 characters.");
      else say(status, "Something went wrong. Please try again.");
    }

    async function verifyCode() {
      const digits = code.value.trim();
      if (!/^[0-9]{6}$/.test(digits)) { say(status, "Enter the 6-digit code from your email."); return; }
      const body = joinBody();
      setBusy([verify, resend], true);
      say(status, "");
      const checked = await api("/rep/api/verify", { email: body.email, code: digits });
      if (checked.status !== 200) {
        setBusy([verify, resend], false);
        if (common(checked, status)) return;
        say(status, "That code is not right or has expired. Check it, or ask for a new one.");
        return;
      }
      const joined = await api("/rep/api/join", body);
      if (joined.status === 200 && typeof joined.body.token === "string" && joined.body.token) { goEarnings(joined); return; }
      setBusy([verify, resend], false);
      joinError(joined);
    }

    joinForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (send.disabled && verify.disabled) return;
      if (codeStep) void verifyCode();
      else void startJoin();
    });
    if (resend) resend.addEventListener("click", async () => {
      setBusy([verify, resend], true);
      const result = await api("/rep/api/join", joinBody());
      setBusy([verify, resend], false);
      if (result.status === 403) say(status, "We sent a new 6-digit code to your email.");
      else if (result.status === 200 && typeof result.body.token === "string") goEarnings(result);
      else joinError(result);
    });

    // --- Sign in ---
    const signinForm = forms.signin;
    if (signinForm) {
      const sEmail = $("signin-email");
      const sPw = $("signin-password");
      const sBtn = $("signin-submit");
      const sStatus = $("signin-status");
      const joinBox = $("signin-join");
      const joinBtn = $("signin-join-btn");
      if (joinBtn) joinBtn.addEventListener("click", async () => {
        if (!$("signin-accept").checked) { say(sStatus, "Please accept the rep terms to continue."); return; }
        setBusy([sBtn, joinBtn], true);
        const result = await api("/rep/api/join", {
          email: sEmail.value.trim(), password: sPw.value, accept_terms: true, terms_version: TERMS_VERSION,
        });
        if (result.status === 200 && typeof result.body.token === "string" && result.body.token) { goEarnings(result); return; }
        setBusy([sBtn, joinBtn], false);
        if (common(result, sStatus)) return;
        const detail = detailOf(result);
        if (detail === "rep_other_account") say(sStatus, "A rep page for this email is linked to a different account. Please email kwalanotes@gmail.com.");
        else say(sStatus, "Wrong email or password.");
      });
      signinForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (sBtn.disabled) return;
        const address = sEmail.value.trim();
        if (!validEmail(address)) { say(sStatus, "Enter a valid email address."); return; }
        if (!sPw.value) { say(sStatus, "Enter your password."); return; }
        setBusy([sBtn], true);
        say(sStatus, "");
        const result = await api("/rep/api/login", { email: address, password: sPw.value });
        if (result.status === 200 && typeof result.body.token === "string" && result.body.token) { goEarnings(result); return; }
        setBusy([sBtn], false);
        if (common(result, sStatus)) return;
        const detail = detailOf(result);
        if (detail === "not_a_rep") {
          say(sStatus, "This KwalaNotes account is not a rep yet. Accept the rep terms to join with it.");
          if (joinBox) joinBox.hidden = false;
        }
        else if (detail === "rep_other_account") say(sStatus, "A rep page for this email is linked to a different account. Please email kwalanotes@gmail.com.");
        else if (detail === "email_not_verified") say(sStatus, "Please confirm your email first. We sent you a 6-digit code: enter it on the Become a rep tab.");
        else if (detail === "wrong_credentials") say(sStatus, "Wrong email or password.");
        else say(sStatus, "Something went wrong. Please try again.");
      });
    }

    // --- Forgot password ---
    const forgotForm = forms.forgot;
    if (forgotForm) {
      const fEmail = $("forgot-email");
      const fCodeStep = $("forgot-step-code");
      const fCode = $("forgot-code");
      const fPw = $("forgot-password");
      const fBtn = $("forgot-submit");
      const fStatus = $("forgot-status");
      let sent = false;
      forgotForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (fBtn.disabled) return;
        const address = fEmail.value.trim();
        if (!validEmail(address)) { say(fStatus, "Enter a valid email address."); return; }
        if (!sent) {
          setBusy([fBtn], true);
          const result = await api("/rep/api/forgot", { email: address });
          setBusy([fBtn], false);
          if (common(result, fStatus)) return;
          sent = true;
          if (fCodeStep) fCodeStep.hidden = false;
          fBtn.textContent = "Set new password";
          say(fStatus, "If that email has a KwalaNotes account, we sent a 6-digit code. It lasts 15 minutes.");
          if (fCode) fCode.focus();
          return;
        }
        const digits = fCode.value.trim();
        if (!/^[0-9]{6}$/.test(digits)) { say(fStatus, "Enter the 6-digit code from your email."); return; }
        if (fPw.value.length < 8 || fPw.value.length > 128) { say(fStatus, "Your new password must be 8 to 128 characters."); return; }
        setBusy([fBtn], true);
        const result = await api("/rep/api/reset", { email: address, code: digits, password: fPw.value });
        setBusy([fBtn], false);
        if (result.status === 200) {
          $("signin-email").value = address;
          $("signin-password").value = "";
          say($("signin-status"), "Your password is changed. Sign in with the new one.");
          fPw.value = ""; fCode.value = ""; sent = false;
          if (fCodeStep) fCodeStep.hidden = true;
          fBtn.textContent = "Send me a code";
          say(fStatus, "");
          show("signin");
          return;
        }
        if (common(result, fStatus)) return;
        const detail = detailOf(result);
        if (detail === "password_invalid") say(fStatus, "Your new password must be 8 to 128 characters.");
        else say(fStatus, "That code is not right or has expired.");
      });
    }
  }

  // ---- Earnings page ----
  const payoutForm = $("payout-form");
  if (payoutForm) {
    const payoutStatus = $("payout-status");
    const masked = $("payout-masked");
    const token = readToken();
    const leave = () => { clearToken(); window.location.replace("/rep.html#signin"); };
    if (!token) { leave(); return; }

    const showPayout = (payout) => {
      const set = payout && payout.set === true && typeof payout.masked === "string" && payout.masked !== "";
      say(masked, set ? "Saved: " + String(payout.masked) : "No payout details saved yet.");
    };

    (async () => {
      const result = await api("/rep/api/me", undefined, token, "GET");
      if (result.status === 401) { leave(); return; }
      if (result.status !== 200) {
        ["rep-code-value", "rep-customers", "rep-pending", "rep-ready", "rep-paid", "payout-masked"].forEach((id) => say($(id), "—"));
        say(payoutStatus, "Could not load your details. Please refresh the page.");
        return;
      }
      const me = result.body;
      say($("rep-code-value"), typeof me.code === "string" ? me.code : "");
      say($("rep-customers"), String(Number.isFinite(Number(me.customers)) ? Number(me.customers) : 0));
      say($("rep-pending"), pula(me.pending_pula));
      say($("rep-ready"), pula(me.ready_pula));
      say($("rep-paid"), pula(me.paid_pula));
      showPayout(me.payout || me.bank);
    })();

    // Botswana mobile: +267 7x xxx xxx, 267..., 00267... or 7xxxxxxx (spaces, dashes, dots, brackets allowed).
    const cleanMobile = (value) => {
      let digits = value.replace(/[\s\-.()]/g, "");
      if (digits.startsWith("+")) { digits = digits.slice(1); if (!digits.startsWith("267")) return ""; }
      else if (digits.startsWith("00267")) digits = digits.slice(2);
      if (digits.startsWith("267") && digits.length === 11) digits = digits.slice(3);
      return /^7[0-9]{7}$/.test(digits) ? "+267" + digits : "";
    };

    payoutForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const save = $("payout-save");
      const mobileInput = $("payout-mobile");
      const checked = payoutForm.querySelector('input[name="method"]:checked');
      const method = checked ? checked.value : "";
      const name = $("payout-name").value.trim();
      const mobile = cleanMobile(mobileInput.value.trim());
      let problem = "";
      if (method !== "pay2cell" && method !== "ewallet") problem = "Choose Pay2Cell or e-Wallet.";
      else if (name.length < 2 || name.length > 80) problem = "Enter your full name (2 to 80 characters).";
      else if (!mobile) problem = "Enter a Botswana mobile number, for example 71 234 567.";
      if (problem) { say(payoutStatus, problem); return; }
      setBusy([save], true);
      say(payoutStatus, "");
      const result = await api("/rep/api/payout", { method, name, mobile }, token);
      setBusy([save], false);
      if (result.status === 401) { leave(); return; }
      if (result.status === 200 && result.body.ok === true) {
        mobileInput.value = "";
        showPayout(result.body.payout || result.body.bank);
        say(payoutStatus, "Payout details saved.");
      } else if (result.status === 400 || String(result.body.detail) === "payout_invalid") {
        say(payoutStatus, "Please check your payout details and try again.");
      } else {
        say(payoutStatus, "Something went wrong. Please try again.");
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
