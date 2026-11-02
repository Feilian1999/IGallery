import * as React from "react";
import PropTypes from "prop-types";
import {api} from "./api";

const LoginPage = ({onLogin}) => {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/login", {method: "POST", body: {username, password}});
      await onLogin();
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <div className="admin admin--center">
      <form className="admin-login" onSubmit={submit}>
        <div className="admin-eyebrow">Studio</div>
        <h1 className="admin-login__title">IGallery 管理</h1>
        <label className="admin-field">
          <span>帳號</span>
          <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} autoFocus required />
        </label>
        <label className="admin-field">
          <span>密碼</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <div className="admin-error">{error}</div>}
        <button className="admin-button admin-button--primary admin-login__submit" disabled={busy}>{busy ? "登入中…" : "登入"}</button>
        <a className="admin-link admin-login__back" href="#">← 回到網站</a>
      </form>
    </div>
  );
};

LoginPage.propTypes = {onLogin: PropTypes.func.isRequired};

export default LoginPage;
