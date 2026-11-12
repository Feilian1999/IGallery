import * as React from "react";
import {useTranslation} from "react-i18next";
import {api} from "../api";
import {formatDate} from "../i18n";
import {useSession} from "../session";

const ROLES = ["admin", "artist", "member"];

// Admin: member accounts. Members can't reset forgotten passwords themselves, so it happens here.
const UsersPage = () => {
  const {t} = useTranslation("studio");
  const {session} = useSession();
  const [users, setUsers] = React.useState(null);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const load = React.useCallback(() => api("/admin/users").then((data) => setUsers(data.users)).catch((failure) => setError(failure.message)), []);
  React.useEffect(() => {
    load();
  }, [load]);

  const run = async (action, message) => {
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      await load();
    } catch (failure) {
      setError(failure.message);
    }
  };

  const setRole = (user, role) => run(() => api(`/admin/users/${user.id}`, {method: "PATCH", body: {role}}), t("users.roleChanged", {name: user.displayName, role: t(`common:roles.${role}`)}));
  const resetPassword = (user) => {
    const password = window.prompt(t("users.passwordPrompt", {name: user.displayName}));
    if (password) run(() => api(`/admin/users/${user.id}/password`, {method: "POST", body: {password}}), t("users.passwordReset", {name: user.displayName}));
  };
  const remove = (user) => {
    if (window.confirm(t("users.confirmDelete", {name: user.displayName, count: user.works}))) {
      run(() => api(`/admin/users/${user.id}`, {method: "DELETE"}), t("users.deleted", {name: user.displayName}));
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Accounts</div>
          <h1 className="admin-title">{t("users.title")}</h1>
        </div>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {notice && <div className="admin-success">{notice}</div>}
      {users === null ? <div className="admin-spinner" /> : (
        <table className="admin-table">
          <thead>
            <tr><th>{t("users.user")}</th><th>{t("users.role")}</th><th>{t("users.works")}</th><th>{t("users.joined")}</th><th /></tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const self = user.id === session.user.id;
              return (
                <tr key={user.id}>
                  <td><strong>{user.displayName}</strong><div className="admin-muted">@{user.username}</div></td>
                  <td>
                    <select value={user.role} disabled={self} onChange={(event) => setRole(user, event.target.value)}>
                      {ROLES.map((id) => <option key={id} value={id}>{t(`common:roles.${id}`)}</option>)}
                    </select>
                  </td>
                  <td>{user.works}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="admin-table__actions">
                      <button className="admin-button" onClick={() => resetPassword(user)}>{t("users.resetPassword")}</button>
                      <button className="admin-button admin-button--danger" disabled={self} onClick={() => remove(user)}>{t("delete")}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="admin-muted">{t("users.guestNote")}</p>
    </div>
  );
};

export default UsersPage;
