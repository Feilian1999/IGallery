import * as React from "react";
import {useTranslation} from "react-i18next";
import {api} from "../api";
import {formatDateTime} from "../i18n";
import {useSession} from "../session";
import limits from "../shared/artworkLimits.json";

// Turns plain text into lines, with web addresses as links.
const Links = ({text}) => text.split("\n").filter((line) => line.trim()).map((line, i) => (
  <div key={i}>{/^https?:\/\/\S+$/.test(line.trim()) ? <a className="admin-link" href={line.trim()} target="_blank" rel="noreferrer">{line.trim()}</a> : line}</div>
));

// Admin: members asking to become artists.
const ArtistApplications = () => {
  const {t} = useTranslation("studio");
  const {refresh} = useSession();
  const [applications, setApplications] = React.useState(null);
  const [rejecting, setRejecting] = React.useState(null);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    api("/admin/artist-applications").then((data) => setApplications(data.applications)).catch((failure) => setError(failure.message));
  }, []);

  const decide = async (application, action, body) => {
    setError("");
    try {
      await api(`/admin/artist-applications/${application.id}/${action}`, {method: "POST", body});
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setRejecting(null);
      setReason("");
      refresh();
    } catch (failure) {
      setError(failure.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Artists</div>
          <h1 className="admin-title">{t("applications.title")}</h1>
        </div>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {applications === null ? <div className="admin-spinner" /> : !applications.length ? (
        <p className="admin-muted">{t("applications.empty")}</p>
      ) : applications.map((application) => (
        <article key={application.id} className="admin-panel">
          <div className="admin-profile-id">
            <span className="admin-avatar admin-avatar--large">{application.user.displayName.slice(0, 1)}</span>
            <div>
              <a className="admin-link" href={`#users/${application.user.id}`}><strong>{application.user.displayName}</strong></a>
              <div className="admin-muted">@{application.user.username} · {t("applications.appliedAt", {date: formatDateTime(application.createdAt)})}</div>
            </div>
          </div>
          <dl className="admin-review__meta">
            <dt>{t("application.intro")}</dt><dd className="admin-prewrap">{application.message}</dd>
            <dt>{t("application.links")}</dt><dd>{application.links ? <Links text={application.links} /> : "--"}</dd>
          </dl>
          {rejecting === application.id ? (
            <div className="admin-review__reject">
              <textarea rows={2} value={reason} maxLength={limits.reviewNote} placeholder={t("applications.reasonPlaceholder")} onChange={(event) => setReason(event.target.value)} autoFocus />
              <div className="admin-actions">
                <button className="admin-button admin-button--danger" onClick={() => decide(application, "reject", {reason})}>{t("applications.confirmReject")}</button>
                <button className="admin-button admin-button--ghost" onClick={() => setRejecting(null)}>{t("cancel")}</button>
              </div>
            </div>
          ) : (
            <div className="admin-actions">
              <button className="admin-button admin-button--primary" onClick={() => decide(application, "approve")}>{t("applications.approve")}</button>
              <button className="admin-button" onClick={() => {
                setRejecting(application.id);
                setReason("");
              }}>{t("applications.reject")}</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
};

export default ArtistApplications;
