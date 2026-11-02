import * as React from "react";
import {api} from "../api";
import {useSession, isArtist} from "../session";
import limits from "../shared/artworkLimits.json";
import {Section, useForm, Feedback, SwitchRow} from "./ProfilePage";

// Commission settings, shown in SettingsDialog (#me/commissions): open or closed,
// terms, contact, and up to a few price plans for the artist page's 約稿 tab.
const CommissionSettings = () => {
  const {session, refresh} = useSession();
  const page = useForm(session.user.commission);

  const setPage = (key, value) => page.setValues((current) => ({...current, [key]: value}));
  const setPlan = (index, key) => (event) => setPage("plans", page.values.plans.map((plan, i) => (i === index ? {...plan, [key]: event.target.value} : plan)));

  if (!isArtist(session)) {
    return (
      <Section title="約稿資訊">
        <p className="admin-muted">成為藝術家後才能接受約稿。</p>
        <a className="admin-button admin-button--primary" href="#me/apply">申請成為藝術家</a>
      </Section>
    );
  }

  return (
    <Section title="約稿資訊">
      <form onSubmit={page.submit(async ({open, info, contact, plans}) => {
        await api("/me/profile", {method: "PATCH", body: {commission: {open, info, contact, plans: plans.filter((plan) => plan.title.trim())}}});
        await refresh();
      }, "已儲存")}>
        <SwitchRow label="接受約稿" hint="個人頁會顯示「接受約稿」標籤和約稿按鈕"
          checked={page.values.open} onChange={(open) => setPage("open", open)} />
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
          <button type="button" className="admin-button admin-offer__add" onClick={() => setPage("plans", [...page.values.plans, {title: "", price: "", description: ""}])}>＋ 新增方案</button>
        )}
        <Feedback status={page.status} />
        <div className="admin-form-footer"><button className="admin-button admin-button--primary" disabled={page.status.busy}>儲存</button></div>
      </form>
    </Section>
  );
};

export default CommissionSettings;
