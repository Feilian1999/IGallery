import * as React from "react";
import {api} from "../api";
import {useSession} from "../session";

const TABS = [
  {id: "login", name: "登入"},
  {id: "register", name: "註冊"},
];

// Sign in, create an account, or look around as a guest.
const LoginPage = () => {
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
        <h1 className="admin-login__title">{tab === "login" ? "歡迎回來" : "加入 IGallery"}</h1>
        <div className="admin-segmented admin-login__tabs">
          {TABS.map((item) => (
            <button type="button" key={item.id} className={tab === item.id ? "admin-segmented--active" : ""} onClick={() => {
              setTab(item.id);
              setError("");
            }}>{item.name}</button>
          ))}
        </div>
        <label className="admin-field">
          <span>帳號</span>
          <input autoComplete="username" value={form.username} onChange={set("username")} autoFocus required />
        </label>
        {tab === "register" && (
          <label className="admin-field">
            <span>顯示名稱<em>其他人會看到的名字，可以之後再改</em></span>
            <input value={form.displayName} onChange={set("displayName")} maxLength={40} />
          </label>
        )}
        <label className="admin-field">
          <span>密碼{tab === "register" && <em>至少 8 個字元</em>}</span>
          <input type="password" autoComplete={tab === "login" ? "current-password" : "new-password"} value={form.password} onChange={set("password")} required />
        </label>
        {error && <div className="admin-error">{error}</div>}
        <button className="admin-button admin-button--primary admin-login__submit" disabled={busy}>
          {busy ? "請稍候…" : tab === "login" ? "登入" : "建立帳號"}
        </button>
        <div className="admin-login__or"><span>或</span></div>
        <button type="button" className="admin-button admin-login__submit" disabled={busy} onClick={() => run(() => api("/auth/guest", {method: "POST"}))}>
          以訪客身分進入
        </button>
        <p className="admin-muted admin-login__hint">訪客可以先逛逛工作室，要上傳作品或按讚時再註冊即可，不會遺失帳號。</p>
        <a className="admin-link admin-login__back" href="#">← 回到網站</a>
      </form>
    </div>
  );
};

export default LoginPage;
