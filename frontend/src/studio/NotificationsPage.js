import * as React from "react";
import {api} from "../api";
import {useSession} from "../session";

const ROLE_NAMES = {admin: "管理者", member: "會員"};

const titleOf = (notification) => `《${notification.artwork?.title || notification.message || "未命名"}》`;

// The sentence, icon and destination for each kind of notification.
const describe = (notification) => {
  const actor = notification.actor?.displayName || "有人";
  const artworkLink = notification.artwork ? `#me/artwork/${notification.artwork.id}` : null;
  switch (notification.type) {
    case "like":
      return {icon: "♥", text: `${actor} 喜歡你的作品${titleOf(notification)}`, href: artworkLink};
    case "approved":
      return {icon: "✓", text: `你的作品${titleOf(notification)}通過審核，現在公開展出了`, href: artworkLink};
    case "rejected":
      return {icon: "↩", text: `你的作品${titleOf(notification)}被退回了`, detail: notification.message ? `原因：${notification.message}` : "", href: artworkLink};
    case "review_requested":
      return {icon: "✎", text: `${actor} 送出了${titleOf(notification)}，等待審核`, href: "#admin/review"};
    case "unpublished":
      return {icon: "⤓", text: `管理者下架了你的作品${titleOf(notification)}`, href: artworkLink};
    case "removed":
      return {icon: "✕", text: `管理者刪除了你的作品《${notification.message}》`, href: null};
    case "role":
      return {icon: "★", text: `你的身分已變更為${ROLE_NAMES[notification.message] || notification.message}`, href: "#me"};
    default:
      return {icon: "•", text: "新的通知", href: null};
  }
};

const timeAgo = (iso) => {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "剛剛";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分鐘前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小時前`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh-TW");
};

const NotificationsPage = () => {
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
          <h1 className="admin-title">通知</h1>
        </div>
        <button className="admin-button" onClick={readAll} disabled={!unread}>全部標為已讀</button>
      </div>
      {error && <div className="admin-error">{error}</div>}
      {notifications === null ? <div className="admin-spinner" /> : !notifications.length ? (
        <p className="admin-muted">還沒有通知。作品被喜歡、審核有結果時，都會出現在這裡。</p>
      ) : (
        <ul className="admin-notifications">
          {notifications.map((notification) => {
            const {icon, text, detail, href} = describe(notification);
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
                    <span className="admin-muted">{timeAgo(notification.createdAt)}</span>
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
