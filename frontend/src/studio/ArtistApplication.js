import * as React from "react";
import {api} from "../api";
import {useSession, isMember, isArtist} from "../session";
import limits from "../shared/artworkLimits.json";

// A member's way to become an artist: tell the admins about your work and wait for review.
// Shows the latest application's status, and the form when there is none (or it was declined).
const ArtistApplication = () => {
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
        <p className="admin-muted">訪客只能瀏覽。先註冊成為會員，再申請成為藝術家，這個帳號也會保留下來。</p>
        <a className="admin-button admin-button--primary" href="#me/profile">註冊成為會員</a>
      </>
    );
  } else if (isArtist(session)) {
    content = (
      <>
        <p>你已經是藝術家了，可以發布作品。</p>
        <a className="admin-button admin-button--primary" href="#me/new">＋ 發布作品</a>
      </>
    );
  } else if (application === undefined) {
    content = <div className="admin-spinner" />;
  } else if (application?.status === "pending") {
    content = (
      <>
        <div className="admin-notice admin-notice--inline">申請已送出，正在等待管理者審核，結果會通知你。</div>
        <dl className="admin-review__meta">
          <dt>自我介紹</dt><dd className="admin-prewrap">{application.message}</dd>
          <dt>作品連結</dt><dd className="admin-prewrap">{application.links || "--"}</dd>
          <dt>送出時間</dt><dd>{new Date(application.createdAt).toLocaleString("zh-TW")}</dd>
        </dl>
      </>
    );
  } else if (application?.status === "approved") {
    // approved but the session hasn't caught up with the new role yet
    content = (
      <>
        <p>申請已通過！</p>
        <button className="admin-button admin-button--primary" onClick={refresh}>開始發布作品</button>
      </>
    );
  } else {
    content = (
      <form onSubmit={submit}>
        {application?.status === "rejected" && (
          <div className="admin-review-note admin-review-note--banner">上次的申請沒有通過：{application.reviewNote}。可以補充後再申請一次。</div>
        )}
        <p className="admin-muted">藝術家可以發布作品、接受約稿。簡單介紹你的創作，管理者審核通過後就會開放。</p>
        <label className="admin-field"><span>自我介紹與創作經歷<em>{form.message.length} / {limits.applicationMessage}</em></span>
          <textarea rows={6} value={form.message} maxLength={limits.applicationMessage} required
            placeholder="你畫什麼、創作多久了、想在這裡展出什麼樣的作品……"
            onChange={(event) => setForm({...form, message: event.target.value})} /></label>
        <label className="admin-field"><span>作品集連結<em>選填，一行一個</em></span>
          <textarea rows={3} value={form.links} maxLength={limits.applicationLinks}
            placeholder="https://www.pixiv.net/users/…&#10;https://www.instagram.com/…"
            onChange={(event) => setForm({...form, links: event.target.value})} /></label>
        {status.error && <div className="admin-error">{status.error}</div>}
        <button className="admin-button admin-button--primary" disabled={status.busy}>{status.busy ? "送出中…" : "送出申請"}</button>
      </form>
    );
  }

  return (
    <div className="admin-page admin-page--narrow">
      <div className="admin-page__head">
        <div>
          <div className="admin-eyebrow">Become an artist</div>
          <h1 className="admin-title">成為藝術家</h1>
        </div>
      </div>
      <section className="admin-panel">{content}</section>
    </div>
  );
};

export default ArtistApplication;
