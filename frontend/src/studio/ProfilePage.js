/* eslint-disable react/prop-types */
import * as React from "react";
import {api} from "../api";
import {useSession, isMember} from "../session";
import limits from "../shared/artworkLimits.json";

const Section = ({title, children}) => (
  <section className="admin-panel">
    <h2 className="admin-subtitle">{title}</h2>
    {children}
  </section>
);


// A small form with its own busy / error / done state.
const useForm = (initial) => {
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

const Feedback = ({status}) => (
  <>
    {status.error && <div className="admin-error">{status.error}</div>}
    {status.done && <div className="admin-success">{status.done}</div>}
  </>
);

// The profile settings, shown in ProfileDialog.
const ProfilePage = () => {
  const {session, refresh} = useSession();
  const user = session.user;
  const profile = useForm({displayName: user.displayName, bio: user.bio});
  const password = useForm({current: "", next: ""});
  const upgrade = useForm({username: "", password: "", displayName: user.displayName});
  const page = useForm({likesPublic: user.likesPublic, ...user.commission});

  const setPage = (key, value) => page.setValues((current) => ({...current, [key]: value}));
  const setPlan = (index, key) => (event) => setPage("plans", page.values.plans.map((plan, i) => (i === index ? {...plan, [key]: event.target.value} : plan)));

  return (
    <>

      {!isMember(session) && (
        <Section title="註冊成為會員">
          <p className="admin-muted">設定帳號密碼後，這個訪客帳號會直接變成正式會員，可以上傳作品和按讚。</p>
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
        <Section title="個人頁與約稿">
          <form onSubmit={page.submit(async ({likesPublic, open, info, contact, plans}) => {
            await api("/me/profile", {method: "PATCH", body: {likesPublic, commission: {open, info, contact, plans: plans.filter((plan) => plan.title.trim())}}});
            await refresh();
          }, "已儲存")}>
            <label className="admin-check">
              <input type="checkbox" checked={page.values.likesPublic} onChange={(event) => setPage("likesPublic", event.target.checked)} />
              <span>公開我的收藏<em>關閉後，只有你自己能在個人頁看到按過愛心的作品</em></span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={page.values.open} onChange={(event) => setPage("open", event.target.checked)} />
              <span>接受約稿<em>個人頁會顯示「接受約稿」標籤和約稿按鈕</em></span>
            </label>
            <label className="admin-field"><span>約稿說明<em>{page.values.info.length} / {limits.commissionInfo}</em></span>
              <textarea rows={4} value={page.values.info} onChange={page.set("info")} maxLength={limits.commissionInfo}
                placeholder="可接的類型、交期、修改次數、使用範圍……" /></label>
            <label className="admin-field"><span>聯絡方式<em>開放約稿時才會顯示</em></span>
              <input value={page.values.contact} onChange={page.set("contact")} maxLength={limits.commissionContact} placeholder="Email、Discord、表單連結……" /></label>
            <div className="admin-field"><span>方案<em>{page.values.plans.length} / {limits.commissionPlans}</em></span></div>
            {page.values.plans.map((plan, i) => (
              <div className="admin-offer" key={i}>
                <div className="admin-offer__row">
                  <input value={plan.title} onChange={setPlan(i, "title")} maxLength={limits.planTitle} placeholder="方案名稱，例如：半身插圖" required />
                  <input value={plan.price} onChange={setPlan(i, "price")} maxLength={limits.planPrice} placeholder="價格，例如：NT$ 1,500 起" />
                  <button type="button" className="admin-button" onClick={() => setPage("plans", page.values.plans.filter((_, j) => j !== i))}>移除</button>
                </div>
                <textarea rows={2} value={plan.description} onChange={setPlan(i, "description")} maxLength={limits.planDescription} placeholder="內容說明（選填）" />
              </div>
            ))}
            {page.values.plans.length < limits.commissionPlans && (
              <button type="button" className="admin-button" onClick={() => setPage("plans", [...page.values.plans, {title: "", price: "", description: ""}])}>＋ 新增方案</button>
            )}
            <Feedback status={page.status} />
            <div><button className="admin-button admin-button--primary" disabled={page.status.busy}>儲存</button></div>
          </form>
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
