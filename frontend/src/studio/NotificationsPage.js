import * as React from "react";
import {useTranslation} from "react-i18next";
import {api} from "../api";
import {formatDate} from "../i18n";
import {useSession} from "../session";

const titleOf = (t, notification) => t("notifications.quoted", {title: notification.artwork?.title || notification.message || t("untitled")});

// The sentence, icon and destination for each kind of notification. `message` is
// user content (a rejection reason, a deleted title) or, for "role", a role id.
const describe = (t, notification) => {
  const actor = notification.actor?.displayName || t("notifications.someone");
  const title = titleOf(t, notification);
  const reason = notification.message ? t("notifications.reason", {reason: notification.message}) : "";
  const artworkLink = notification.artwork ? `#me/artwork/${notification.artwork.id}` : null;
  switch (notification.type) {
    case "like":
      return {icon: "♥", text: t("notifications.like", {actor, title}), href: artworkLink};
    case "approved":
      return {icon: "✓", text: t("notifications.approved", {title}), href: artworkLink};
    case "rejected":
      return {icon: "↩", text: t("notifications.rejected", {title}), detail: reason, href: artworkLink};
    case "review_requested":
      return {icon: "✎", text: t("notifications.reviewRequested", {actor, title}), href: "#admin/review"};
    case "unpublished":
      return {icon: "⤓", text: t("notifications.unpublished", {title}), href: artworkLink};
    case "removed":
      return {icon: "✕", text: t("notifications.removed", {title: t("notifications.quoted", {title: notification.message || t("untitled")})}), href: null};
    case "role":
      return {icon: "★", text: t("notifications.role", {role: t(`common:roles.${notification.message}`, {defaultValue: notification.message})}), href: "#me"};
    case "artist_requested":
      return {icon: "✎", text: t("notifications.artistRequested", {actor}), href: "#admin/applications"};
    case "artist_approved":
      return {icon: "★", text: t("notifications.artistApproved"), href: "#me/new"};
    case "artist_rejected":
      return {icon: "↩", text: t("notifications.artistRejected"), detail: reason, href: "#me/apply"};
    default:
      return {icon: "•", text: t("notifications.fallback"), href: null};
  }
};

const timeAgo = (t, iso) => {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return t("notifications.justNow");
  if (seconds < 3600) return t("notifications.minutesAgo", {count: Math.floor(seconds / 60)});
  if (seconds < 86400) return t("notifications.hoursAgo", {count: Math.floor(seconds / 3600)});
  if (seconds < 86400 * 7) return t("notifications.daysAgo", {count: Math.floor(seconds / 86400)});
  return formatDate(iso);
};

const NotificationsPage = () => {
  const {t} = useTranslation("studio");
  const {setUnread} = useSession();
  const [notifications, setNotifications] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    api("/me/notifications")
        .then((data) => {
          setNotifications(data.notifications);
          setUnread(data.unread);
        })
        .catch((failure) => setError(failure.message));
  }, [setUnread]);

  // mark one as read when it is opened; the list keeps showing it, just no longer highlighted
  const open = (notification) => {
    if (notification.read) return;
    setNotifications((current) => current.map((item) => (item.id === notification.id ? {...item, read: true} : item)));
    api("/me/notifications/read", {method: "POST", body: {ids: [notification.id]}}).then((data) => setUnread(data.unread)).catch(() => {});
  };

  const readAll = async () => {
    try {
      const data = await api("/me/notifications/read", {method: "POST", body: {}});
      setNotifications((current) => current.map((item) => ({...item, read: true})));
      setUnread(data.unread);
    } catch (failure) {
      setError(failure.message);
    }
  };

  const unread = (notifications || []).filter((item) => !item.read).length;

  return (
    <div className="admin-page admin-page--narrow">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Notifications</div>
          <h1 className="admin-title">{t("notifications.title")}</h1>
        </div>
        <button className="admin-button" onClick={readAll} disabled={!unread}>{t("notifications.readAll")}</button>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {notifications === null ? <div className="admin-spinner" /> : !notifications.length ? (
        <p className="admin-muted">{t("notifications.empty")}</p>
      ) : (
        <ul className="admin-notifications">
          {notifications.map((notification) => {
            const {icon, text, detail, href} = describe(t, notification);
            const Item = href ? "a" : "div";
            return (
              <li key={notification.id}>
                <Item
                  className={`admin-notification admin-notification--${notification.type}${notification.read ? "" : " admin-notification--unread"}`}
                  href={href || undefined}
                  onClick={() => open(notification)}
                >
                  <span className="admin-notification__icon">{icon}</span>
                  <span className="admin-notification__body">
                    <span>{text}</span>
                    {detail && <span className="admin-notification__detail">{detail}</span>}
                    <span className="admin-muted">{timeAgo(t, notification.createdAt)}</span>
                  </span>
                  {notification.artwork && <img className="admin-notification__thumb" src={notification.artwork.previewUrl} alt="" />}
                </Item>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPage;
