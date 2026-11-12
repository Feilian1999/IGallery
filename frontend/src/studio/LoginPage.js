import * as React from "react";
import {useTranslation} from "react-i18next";
import {api} from "../api";
import {useSession} from "../session";

const TABS = ["login", "register"];

// Sign in, create an account, or look around as a guest.
const LoginPage = () => {
  const {t} = useTranslation("studio");
  const {refresh} = useSession();
  const [tab, setTab] = React.useState("login");
  const [form, setForm] = React.useState({username: "", password: "", displayName: ""});
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const set = (key) => (event) => setForm((current) => ({...current, [key]: event.target.value}));

  const run = async (request) => {
    setBusy(true);
    setError("");
    try {
      await request();
      await refresh();
      window.location.hash = "#me";
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    run(() => api(`/auth/${tab}`, {method: "POST", body: tab === "login" ? {username: form.username, password: form.password} : form}));
  };

  return (
    <div className="admin--center">
      <form className="admin-login" onSubmit={submit}>
        <div className="admin-eyebrow">IGallery</div>
        <h1 className="admin-login__title">{tab === "login" ? t("login.welcomeBack") : t("login.join")}</h1>
        <div className="admin-segmented admin-login__tabs">
          {TABS.map((id) => (
            <button type="button" key={id} className={tab === id ? "admin-segmented--active" : ""} onClick={() => {
              setTab(id);
              setError("");
            }}>{t(`login.${id}`)}</button>
          ))}
        </div>
        <label className="admin-field">
          <span>{t("username")}</span>
          <input autoComplete="username" value={form.username} onChange={set("username")} autoFocus required />
        </label>
        {tab === "register" && (
          <label className="admin-field">
            <span>{t("displayName")}<em>{t("login.displayNameHint")}</em></span>
            <input value={form.displayName} onChange={set("displayName")} maxLength={40} />
          </label>
        )}
        <label className="admin-field">
          <span>{t("password")}{tab === "register" && <em>{t("minPassword")}</em>}</span>
          <input type="password" autoComplete={tab === "login" ? "current-password" : "new-password"} value={form.password} onChange={set("password")} required />
        </label>
        {error && <div className="admin-error">{error}</div>}
        <button className="admin-button admin-button--primary admin-login__submit" disabled={busy}>
          {busy ? t("login.wait") : tab === "login" ? t("login.login") : t("login.createAccount")}
        </button>
        <div className="admin-login__or"><span>{t("login.or")}</span></div>
        <button type="button" className="admin-button admin-login__submit" disabled={busy} onClick={() => run(() => api("/auth/guest", {method: "POST"}))}>
          {t("login.guest")}
        </button>
        <p className="admin-muted admin-login__hint">{t("login.guestHint")}</p>
        <a className="admin-link admin-login__back" href="#">{t("login.back")}</a>
      </form>
    </div>
  );
};

export default LoginPage;
