import * as React from "react";
import {useTranslation} from "react-i18next";
import {api} from "../api";
import {formatDateTime} from "../i18n";
import {useSession, isMember, isArtist} from "../session";
import limits from "../shared/artworkLimits.json";

// A member's way to become an artist: tell the admins about your work and wait for review.
// Shows the latest application's status, and the form when there is none (or it was declined).
const ArtistApplication = () => {
  const {t} = useTranslation("studio");
  const {session, refresh} = useSession();
  // undefined while loading
  const [application, setApplication] = React.useState(undefined);
  const [form, setForm] = React.useState({message: "", links: ""});
  const [status, setStatus] = React.useState({busy: false, error: ""});

  React.useEffect(() => {
    if (!isMember(session) || isArtist(session)) return;
    api("/me/artist-application").then((data) => setApplication(data.application)).catch(() => setApplication(null));
  }, [session]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({busy: true, error: ""});
    try {
      const data = await api("/me/artist-application", {method: "POST", body: form});
      setApplication(data.application);
      setStatus({busy: false, error: ""});
    } catch (failure) {
      setStatus({busy: false, error: failure.message});
    }
  };

  let content;
  if (!isMember(session)) {
    content = (
      <>
        <p className="admin-muted">{t("apply.guestBody")}</p>
        <a className="admin-button admin-button--primary" href="#me/profile">{t("registerMember")}</a>
      </>
    );
  } else if (isArtist(session)) {
    content = (
      <>
        <p>{t("apply.alreadyArtist")}</p>
        <a className="admin-button admin-button--primary" href="#me/new">{t("publishArtwork")}</a>
      </>
    );
  } else if (application === undefined) {
    content = <div className="admin-spinner" />;
  } else if (application?.status === "pending") {
    content = (
      <>
        <div className="admin-notice admin-notice--inline">{t("apply.pending")}</div>
        <dl className="admin-review__meta">
          <dt>{t("application.intro")}</dt><dd className="admin-prewrap">{application.message}</dd>
          <dt>{t("application.links")}</dt><dd className="admin-prewrap">{application.links || "--"}</dd>
          <dt>{t("apply.submittedAt")}</dt><dd>{formatDateTime(application.createdAt)}</dd>
        </dl>
      </>
    );
  } else if (application?.status === "approved") {
    // approved but the session hasn't caught up with the new role yet
    content = (
      <>
        <p>{t("apply.approved")}</p>
        <button className="admin-button admin-button--primary" onClick={refresh}>{t("apply.start")}</button>
      </>
    );
  } else {
    content = (
      <form onSubmit={submit}>
        {application?.status === "rejected" && (
          <div className="admin-review-note admin-review-note--banner">{t("apply.rejectedBanner", {note: application.reviewNote})}</div>
        )}
        <p className="admin-muted">{t("apply.intro")}</p>
        <label className="admin-field"><span>{t("apply.message")}<em>{form.message.length} / {limits.applicationMessage}</em></span>
          <textarea rows={6} value={form.message} maxLength={limits.applicationMessage} required
            placeholder={t("apply.messagePlaceholder")}
            onChange={(event) => setForm({...form, message: event.target.value})} /></label>
        <label className="admin-field"><span>{t("apply.links")}<em>{t("apply.linksHint")}</em></span>
          <textarea rows={3} value={form.links} maxLength={limits.applicationLinks}
            placeholder="https://www.pixiv.net/users/…&#10;https://www.instagram.com/…"
            onChange={(event) => setForm({...form, links: event.target.value})} /></label>
        {status.error && <div className="admin-error">{status.error}</div>}
        <button className="admin-button admin-button--primary" disabled={status.busy}>{status.busy ? t("apply.sending") : t("apply.submit")}</button>
      </form>
    );
  }

  return (
    <div className="admin-page admin-page--narrow">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Become an artist</div>
          <h1 className="admin-title">{t("apply.title")}</h1>
        </div>
      </div>
      <section className="admin-panel">{content}</section>
    </div>
  );
};

export default ArtistApplication;
