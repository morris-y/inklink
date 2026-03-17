import sql from '../db/client';

export interface ResolvedInvite {
  inviteId: string;
  readerProfileId: string | null;
  readerGroupId: string | null;
  label: string | null;
}

export async function resolveInviteToken(token: string, workId: string): Promise<ResolvedInvite | null> {
  const rows = await sql`
    SELECT id, reader_profile_id, reader_group_id, label, is_active, expires_at
    FROM reader_invites
    WHERE token = ${token} AND work_id = ${workId}
  `;
  if (rows.length === 0) return null;
  const invite = rows[0];
  if (!invite.is_active) return null;
  if (invite.expires_at && new Date(invite.expires_at as string) < new Date()) return null;
  return {
    inviteId: invite.id as string,
    readerProfileId: invite.reader_profile_id as string | null,
    readerGroupId: invite.reader_group_id as string | null,
    label: invite.label as string | null,
  };
}
