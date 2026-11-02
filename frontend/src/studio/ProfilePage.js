/* eslint-disable react/prop-types */
import * as React from "react";
import {api} from "../api";
import {useSession, isMember, isArtist} from "../session";
import limits from "../shared/artworkLimits.json";

export const Section = ({title, children}) => (
  <section className="admin-panel">
    <h2 className="admin-subtitle">{title}</h2>
    {children}
  </section>
);


// A small form with its own busy / error / done state.
export const useForm = (initial) => {
  const [values, setValues] = React.useState(initial);
  const [status, setStatus] = React.useState({busy: false, error: "", done: ""});
  const set = (key) => (event) => setValues((current) => ({...current, [key]: event.target.value}));
  const submit = (request, doneMessage) => async (event) => {
    event.preventDefault();
    setStatus({busy: true, error: "", done: ""});
    try {
      await request(values);
      setStatus({busy: false, error: "", done: doneMessage});
    } catch (failure) {
      setStatus({busy: false, error: failure.message, done: ""});
    }
  };
  return {values, setValues, set, status, submit};
};

// A yes/no setting: the label and hint on the left, an on/off switch on the right.
export const SwitchRow = ({label, hint, checked, onChange}) => (
  <div className="admin-switch-row">
    <div>
      <div>{label}</div>
      {hint && <div className="admin-muted admin-switch-row__hint">{hint}</div>}
    </div>
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      className={`admin-switch${checked ? " admin-switch--on" : ""}`} onClick={() => onChange(!checked)}>
      <span className="admin-switch__state">{checked ? "Yes" : "No"}</span>
    </button>
  </div>
);

export const Feedback = ({status}) => (
  <>
    {status.error && <div className="admin-error">{status.error}</div>}
    {status.done && <div className="admin-success">{status.done}</div>}
  </>
);

// The profile settings, shown in SettingsDialog (#me/profile).
const ProfilePage = () => {
  const {session, refresh} = useSession();
  const user = session.user;
  const profile = useForm({displayName: user.displayName, bio: user.bio});
  const password = useForm({current: "", next: ""});
  const upgrade = useForm({username: "", password: "", displayName: user.displayName});
  const privacy = useForm({likesPublic: user.likesPublic});

  return (
    <>

      {!isMember(session) && (
        <Section title="註冊成為會員">
          <p className="admin-muted">設定帳號密碼後，這個訪客帳號會直接變成正式會員，可以按讚收藏，也能申請成為藝術家。</p>
          <form onSubmit={upgrade.submit(async (values) => {
            await api("/auth/upgrade", {method: "POST", body: values});
            await refresh();
          }, "已經成為會員了！")}>
            <label className="admin-field"><span>帳號<em>3–24 個英文小寫、數字、底線或連字號</em></span>
              <input value={upgrade.values.username} onChange={upgrade.set("username")} autoComplete="username" required /></label>
            <label className="admin-field"><span>顯示名稱</span>
              <input value={upgrade.values.displayName} onChange={upgrade.set("displayName")} maxLength={limits.displayName} /></label>
            <label className="admin-field"><span>密碼<em>至少 8 個字元</em></span>
              <input type="password" value={upgrade.values.password} onChange={upgrade.set("password")} autoComplete="new-password" required /></label>
            <Feedback status={upgrade.status} />
            <button className="admin-button admin-button--primary" disabled={upgrade.status.busy}>註冊</button>
          </form>
        </Section>
      )}

      <Section title="公開資料">
        <form onSubmit={profile.submit(async (values) => {
          await api("/me/profile", {method: "PATCH", body: values});
          await refresh();
        }, "已儲存")}>
          <div className="admin-profile-id">
            <span className="admin-avatar admin-avatar--large">{(profile.values.displayName || user.username).slice(0, 1)}</span>
            <div>
              <div>@{user.username}</div>
              <div className="admin-muted">加入於 {new Date(user.createdAt).toLocaleDateString("zh-TW")}</div>
            </div>
          </div>
          <label className="admin-field"><span>顯示名稱<em>{profile.values.displayName.length} / {limits.displayName}</em></span>
            <input value={profile.values.displayName} onChange={profile.set("displayName")} maxLength={limits.displayName} required /></label>
          <label className="admin-field"><span>自我介紹<em>{profile.values.bio.length} / {limits.bio}</em></span>
            <textarea rows={4} value={profile.values.bio} onChange={profile.set("bio")} maxLength={limits.bio} /></label>
          <Feedback status={profile.status} />
          <button className="admin-button admin-button--primary" disabled={profile.status.busy}>儲存</button>
        </form>
      </Section>

      {isMember(session) && (
        <Section title="隱私">
          <form onSubmit={privacy.submit(async (values) => {
            await api("/me/profile", {method: "PATCH", body: values});
            await refresh();
          }, "已儲存")}>
            <SwitchRow label="公開我的收藏" hint="關閉後，只有你自己能在個人頁看到按過愛心的作品"
              checked={privacy.values.likesPublic} onChange={(likesPublic) => privacy.setValues({likesPublic})} />
            <Feedback status={privacy.status} />
            <button className="admin-button admin-button--primary" disabled={privacy.status.busy}>儲存</button>
          </form>
          {isArtist(session) && <p className="admin-muted">約稿資訊在<a className="admin-link" href="#me/commissions">約稿設定</a>裡編輯。</p>}
        </Section>
      )}

      {isMember(session) && (
        <Section title="變更密碼">
          <form onSubmit={password.submit(async (values) => {
            await api("/auth/password", {method: "PUT", body: values});
            password.setValues({current: "", next: ""});
          }, "密碼已更新")}>
            <label className="admin-field"><span>目前的密碼</span>
              <input type="password" value={password.values.current} onChange={password.set("current")} autoComplete="current-password" required /></label>
            <label className="admin-field"><span>新密碼<em>至少 8 個字元</em></span>
              <input type="password" value={password.values.next} onChange={password.set("next")} autoComplete="new-password" required /></label>
            <Feedback status={password.status} />
            <button className="admin-button admin-button--primary" disabled={password.status.busy}>更新密碼</button>
          </form>
          <p className="admin-muted">忘記密碼時，請聯絡管理者幫你重設。</p>
        </Section>
      )}
    </>
  );
};

export default ProfilePage;
