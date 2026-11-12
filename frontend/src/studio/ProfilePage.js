/* eslint-disable react/prop-types */
import * as React from "react";
import {useTranslation, Trans} from "react-i18next";
import {api} from "../api";
import {formatDate} from "../i18n";
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
  const {t} = useTranslation("studio");
  const {session, refresh} = useSession();
  const user = session.user;
  const profile = useForm({displayName: user.displayName, bio: user.bio});
  const password = useForm({current: "", next: ""});
  const upgrade = useForm({username: "", password: "", displayName: user.displayName});
  const privacy = useForm({likesPublic: user.likesPublic});

  return (
    <>

      {!isMember(session) && (
        <Section title={t("registerMember")}>
          <p className="admin-muted">{t("profile.registerBody")}</p>
          <form onSubmit={upgrade.submit(async (values) => {
            await api("/auth/upgrade", {method: "POST", body: values});
            await refresh();
          }, t("profile.registered"))}>
            <label className="admin-field"><span>{t("username")}<em>{t("profile.usernameHint")}</em></span>
              <input value={upgrade.values.username} onChange={upgrade.set("username")} autoComplete="username" required /></label>
            <label className="admin-field"><span>{t("displayName")}</span>
              <input value={upgrade.values.displayName} onChange={upgrade.set("displayName")} maxLength={limits.displayName} /></label>
            <label className="admin-field"><span>{t("password")}<em>{t("minPassword")}</em></span>
              <input type="password" value={upgrade.values.password} onChange={upgrade.set("password")} autoComplete="new-password" required /></label>
            <Feedback status={upgrade.status} />
            <button className="admin-button admin-button--primary" disabled={upgrade.status.busy}>{t("profile.register")}</button>
          </form>
        </Section>
      )}

      <Section title={t("profile.public")}>
        <form onSubmit={profile.submit(async (values) => {
          await api("/me/profile", {method: "PATCH", body: values});
          await refresh();
        }, t("saved"))}>
          <div className="admin-profile-id">
            <span className="admin-avatar admin-avatar--large">{(profile.values.displayName || user.username).slice(0, 1)}</span>
            <div>
              <div>@{user.username}</div>
              <div className="admin-muted">{t("profile.joinedAt", {date: formatDate(user.createdAt)})}</div>
            </div>
          </div>
          <label className="admin-field"><span>{t("displayName")}<em>{profile.values.displayName.length} / {limits.displayName}</em></span>
            <input value={profile.values.displayName} onChange={profile.set("displayName")} maxLength={limits.displayName} required /></label>
          <label className="admin-field"><span>{t("profile.bio")}<em>{profile.values.bio.length} / {limits.bio}</em></span>
            <textarea rows={4} value={profile.values.bio} onChange={profile.set("bio")} maxLength={limits.bio} /></label>
          <Feedback status={profile.status} />
          <button className="admin-button admin-button--primary" disabled={profile.status.busy}>{t("save")}</button>
        </form>
      </Section>

      {isMember(session) && (
        <Section title={t("profile.privacy")}>
          <form onSubmit={privacy.submit(async (values) => {
            await api("/me/profile", {method: "PATCH", body: values});
            await refresh();
          }, t("saved"))}>
            <SwitchRow label={t("profile.likesPublic")} hint={t("profile.likesPublicHint")}
              checked={privacy.values.likesPublic} onChange={(likesPublic) => privacy.setValues({likesPublic})} />
            <Feedback status={privacy.status} />
            <button className="admin-button admin-button--primary" disabled={privacy.status.busy}>{t("save")}</button>
          </form>
          {isArtist(session) && <p className="admin-muted"><Trans t={t} i18nKey="profile.commissionNote" components={{go: <a className="admin-link" href="#me/commissions" />}} /></p>}
        </Section>
      )}

      {isMember(session) && (
        <Section title={t("profile.changePassword")}>
          <form onSubmit={password.submit(async (values) => {
            await api("/auth/password", {method: "PUT", body: values});
            password.setValues({current: "", next: ""});
          }, t("profile.passwordUpdated"))}>
            <label className="admin-field"><span>{t("profile.currentPassword")}</span>
              <input type="password" value={password.values.current} onChange={password.set("current")} autoComplete="current-password" required /></label>
            <label className="admin-field"><span>{t("profile.newPassword")}<em>{t("minPassword")}</em></span>
              <input type="password" value={password.values.next} onChange={password.set("next")} autoComplete="new-password" required /></label>
            <Feedback status={password.status} />
            <button className="admin-button admin-button--primary" disabled={password.status.busy}>{t("profile.updatePassword")}</button>
          </form>
          <p className="admin-muted">{t("profile.forgot")}</p>
        </Section>
      )}
    </>
  );
};

export default ProfilePage;
