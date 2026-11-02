import {query} from "./db";

// Members apply to become artists; an admin approves (the role changes) or declines with a reason.
export type ApplicationStatus = "pending" | "approved" | "rejected";

const toApplication = (row: Record<string, any>) => ({
  id: row.id as number,
  userId: row.user_id as number,
  status: row.status as ApplicationStatus,
  message: row.message as string,
  links: row.links as string,
  reviewNote: row.review_note as string,
  createdAt: new Date(row.created_at).toISOString(),
  reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
  user: row.username ? {id: row.user_id, username: row.username, displayName: row.display_name || row.username, bio: row.bio} : undefined,
});

export const latestApplication = async (userId: number) => {
  const [row] = await query("select * from artist_applications where user_id = $1 order by created_at desc limit 1", [userId]);
  return row ? toApplication(row) : null;
};

// null when the member already has an application waiting
export const createApplication = async (userId: number, message: string, links: string) => {
  const [row] = await query(
      `insert into artist_applications (user_id, message, links) values ($1, $2, $3)
       on conflict (user_id) where status = 'pending' do nothing returning *`,
      [userId, message, links],
  );
  return row ? toApplication(row) : null;
};

export const listApplications = async (status: ApplicationStatus) => {
  const rows = await query(
      `select a.*, u.username, u.display_name, u.bio from artist_applications a join users u on u.id = a.user_id
       where a.status = $1 order by a.created_at`,
      [status],
  );
  return rows.map(toApplication);
};

export const pendingApplicationCount = async () => {
  const [row] = await query("select count(*)::int as count from artist_applications where status = 'pending'");
  return row.count as number;
};

// Approving makes a member an artist (admins keep their role). Null if it wasn't pending.
export const decideApplication = async (id: number, approve: boolean, reviewerId: number, note = "") => {
  const [row] = await query(
      `update artist_applications set status = $2, review_note = $3, reviewer_id = $4, reviewed_at = now()
       where id = $1 and status = 'pending' returning *`,
      [id, approve ? "approved" : "rejected", note, reviewerId],
  );
  if (!row) return null;
  if (approve) await query("update users set role = 'artist' where id = $1 and role = 'member'", [row.user_id]);
  return toApplication(row);
};
