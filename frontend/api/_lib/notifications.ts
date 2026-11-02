import {query} from "./db";

// In-app notifications. The wording lives in the frontend; a notification stores the
// event type, who caused it, which artwork, and any extra text (a review note, a title).
export type NotificationType =
  | "like" // someone liked your artwork
  | "approved" // your artwork passed review
  | "rejected" // your artwork was sent back; message = the reason
  | "review_requested" // (admins) an artwork is waiting for review
  | "unpublished" // an admin took your artwork down
  | "removed" // an admin deleted your artwork; message = its title
  | "role"; // your role changed; message = the new role

type Details = {artworkId?: string | null; actorId?: number | null; message?: string};

const KEEP_READ_DAYS = 90;
const PAGE_SIZE = 40;

// Never lets a failed notification break the action that caused it.
const safely = async (work: () => Promise<unknown>) => {
  try {
    await work();
  } catch (error) {
    console.error("[igallery] could not create notification", error);
  }
};

export const notify = (userId: number | null | undefined, type: NotificationType, {artworkId = null, actorId = null, message = ""}: Details = {}) =>
  safely(async () => {
    // nobody needs to hear about their own actions
    if (!userId || userId === actorId) return;
    await query(
        `insert into notifications (user_id, type, artwork_id, actor_id, message) values ($1, $2, $3, $4, $5)
         on conflict do nothing`,
        [userId, type, artworkId, actorId, message],
    );
  });

export const notifyAdmins = (type: NotificationType, {artworkId = null, actorId = null, message = ""}: Details = {}) =>
  safely(async () => {
    await query(
        `insert into notifications (user_id, type, artwork_id, actor_id, message)
         select id, $1, $2, $3, $4 from users where role = 'admin' and id is distinct from $3`,
        [type, artworkId, actorId, message],
    );
  });

export const unreadCount = async (userId: number) => {
  const [row] = await query("select count(*)::int as count from notifications where user_id = $1 and read_at is null", [userId]);
  return row.count as number;
};

export const listNotifications = async (userId: number) => {
  // old read notifications are cleared out as people look at their list
  await query(`delete from notifications where user_id = $1 and read_at < now() - interval '${KEEP_READ_DAYS} days'`, [userId]);
  const rows = await query(
      `select n.id, n.type, n.message, n.read_at, n.created_at,
         a.id as artwork_id, a.title as artwork_title, a.preview_url as artwork_preview,
         u.id as actor_id, coalesce(nullif(u.display_name, ''), u.username) as actor_name
       from notifications n
       left join artworks a on a.id = n.artwork_id
       left join users u on u.id = n.actor_id
       where n.user_id = $1
       order by n.created_at desc
       limit $2`,
      [userId, PAGE_SIZE],
  );
  return rows.map((row) => ({
    id: row.id,
    type: row.type as NotificationType,
    message: row.message,
    read: Boolean(row.read_at),
    createdAt: new Date(row.created_at).toISOString(),
    artwork: row.artwork_id ? {id: row.artwork_id, title: row.artwork_title, previewUrl: row.artwork_preview} : null,
    actor: row.actor_id ? {id: row.actor_id, displayName: row.actor_name} : null,
  }));
};

// Marks the given notifications (or all of them) as read.
export const markRead = async (userId: number, ids?: number[]) => {
  if (ids) {
    await query("update notifications set read_at = now() where user_id = $1 and read_at is null and id = any($2::int[])", [userId, ids]);
  } else {
    await query("update notifications set read_at = now() where user_id = $1 and read_at is null", [userId]);
  }
};
