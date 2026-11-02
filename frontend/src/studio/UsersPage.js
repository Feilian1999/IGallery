import * as React from "react";
import {api} from "../api";
import {useSession} from "../session";

const ROLES = {admin: "管理者", member: "會員"};

// Admin: member accounts. Members can't reset forgotten passwords themselves, so it happens here.
const UsersPage = () => {
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

  const setRole = (user, role) => run(() => api(`/admin/users/${user.id}`, {method: "PATCH", body: {role}}), `已將 ${user.displayName} 設為${ROLES[role]}`);
  const resetPassword = (user) => {
    const password = window.prompt(`為 ${user.displayName} 設定新密碼（至少 8 個字元）`);
    if (password) run(() => api(`/admin/users/${user.id}/password`, {method: "POST", body: {password}}), `已重設 ${user.displayName} 的密碼，請把新密碼告訴對方`);
  };
  const remove = (user) => {
    if (window.confirm(`確定要刪除 ${user.displayName} 嗎？他的 ${user.works} 件作品和圖片也會一起刪除，無法復原。`)) {
      run(() => api(`/admin/users/${user.id}`, {method: "DELETE"}), `已刪除 ${user.displayName}`);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Accounts</div>
          <h1 className="admin-title">使用者</h1>
        </div>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {notice && <div className="admin-success">{notice}</div>}
      {users === null ? <div className="admin-spinner" /> : (
        <table className="admin-table">
          <thead>
            <tr><th>使用者</th><th>角色</th><th>作品</th><th>加入時間</th><th /></tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const self = user.id === session.user.id;
              return (
                <tr key={user.id}>
                  <td><strong>{user.displayName}</strong><div className="admin-muted">@{user.username}</div></td>
                  <td>
                    <select value={user.role} disabled={self} onChange={(event) => setRole(user, event.target.value)}>
                      {Object.entries(ROLES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  </td>
                  <td>{user.works}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString("zh-TW")}</td>
                  <td className="admin-table__actions">
                    <button className="admin-button" onClick={() => resetPassword(user)}>重設密碼</button>
                    <button className="admin-button admin-button--danger" disabled={self} onClick={() => remove(user)}>刪除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="admin-muted">訪客帳號不會列在這裡；超過 7 天沒用的訪客帳號會自動清除。</p>
    </div>
  );
};

export default UsersPage;
