import * as React from "react";
import {useTranslation} from "react-i18next";
import {api} from "../api";
import {useSession, isArtist} from "../session";
import limits from "../shared/artworkLimits.json";
import {Section, useForm, Feedback, SwitchRow} from "./ProfilePage";

// Commission settings, shown in SettingsDialog (#me/commissions): open or closed,
// terms, contact, and up to a few price plans for the artist page's 約稿 tab.
const CommissionSettings = () => {
  const {t} = useTranslation("studio");
  const {session, refresh} = useSession();
  const page = useForm(session.user.commission);

  const setPage = (key, value) => page.setValues((current) => ({...current, [key]: value}));
  const setPlan = (index, key) => (event) => setPage("plans", page.values.plans.map((plan, i) => (i === index ? {...plan, [key]: event.target.value} : plan)));

  if (!isArtist(session)) {
    return (
      <Section title={t("commission.title")}>
        <p className="admin-muted">{t("commission.notArtist")}</p>
        <a className="admin-button admin-button--primary" href="#me/apply">{t("commission.apply")}</a>
      </Section>
    );
  }

  return (
    <Section title={t("commission.title")}>
      <form onSubmit={page.submit(async ({open, info, contact, plans}) => {
        await api("/me/profile", {method: "PATCH", body: {commission: {open, info, contact, plans: plans.filter((plan) => plan.title.trim())}}});
        await refresh();
      }, t("saved"))}>
        <SwitchRow label={t("commission.open")} hint={t("commission.openHint")}
          checked={page.values.open} onChange={(open) => setPage("open", open)} />
        <label className="admin-field"><span>{t("commission.info")}<em>{page.values.info.length} / {limits.commissionInfo}</em></span>
          <textarea rows={4} value={page.values.info} onChange={page.set("info")} maxLength={limits.commissionInfo}
            placeholder={t("commission.infoPlaceholder")} /></label>
        <label className="admin-field"><span>{t("commission.contact")}<em>{t("commission.contactHint")}</em></span>
          <input value={page.values.contact} onChange={page.set("contact")} maxLength={limits.commissionContact} placeholder={t("commission.contactPlaceholder")} /></label>
        <div className="admin-field"><span>{t("commission.plans")}<em>{page.values.plans.length} / {limits.commissionPlans}</em></span></div>
        {page.values.plans.map((plan, i) => (
          <div className="admin-offer" key={i}>
            <div className="admin-offer__row">
              <input value={plan.title} onChange={setPlan(i, "title")} maxLength={limits.planTitle} placeholder={t("commission.planTitle")} required />
              <input value={plan.price} onChange={setPlan(i, "price")} maxLength={limits.planPrice} placeholder={t("commission.planPrice")} />
              <button type="button" className="admin-button" onClick={() => setPage("plans", page.values.plans.filter((_, j) => j !== i))}>{t("commission.remove")}</button>
            </div>
            <textarea rows={2} value={plan.description} onChange={setPlan(i, "description")} maxLength={limits.planDescription} placeholder={t("commission.planDescription")} />
          </div>
        ))}
        {page.values.plans.length < limits.commissionPlans && (
          <button type="button" className="admin-button admin-offer__add" onClick={() => setPage("plans", [...page.values.plans, {title: "", price: "", description: ""}])}>{t("commission.addPlan")}</button>
        )}
        <Feedback status={page.status} />
        <div className="admin-form-footer"><button className="admin-button admin-button--primary" disabled={page.status.busy}>{t("save")}</button></div>
      </form>
    </Section>
  );
};

export default CommissionSettings;
