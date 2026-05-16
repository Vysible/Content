import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db';

export type AuditAction =
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.status_change'
  | 'project.review_mode_change'
  | 'project.hwg_flag_set'
  | 'generation.start'
  | 'generation.complete'
  | 'generation.error'
  | 'export.download'
  | 'share_link.create'
  | 'share_link.delete'
  | 'api_key.create'
  | 'api_key.delete'
  | 'user.login'
  | 'user.logout'
  | 'admin.user.update'
  | 'admin.user.create'
  | 'praxis.approve'
  | 'praxis.comment'
  | 'praxis.invite'
  | 'wordpress.draft_created'
  | 'wordpress.draft_blocked'
  | 'klicktipp.campaign_created'
  | 'klicktipp.campaign_blocked'
  | 'klicktipp.credentials_saved'
  | 'klicktipp.credentials_removed'
  | 'social.draft_blocked'
  | 'social.draft_created';

interface AuditParams {
  action: AuditAction;
  entity: string;
  entityId?: string;
  projectId?: string;
  userId?: string;
  userEmail?: string;
  meta?: Record<string, unknown>;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action:    params.action,
        entity:    params.entity,
        entityId:  params.entityId,
        projectId: params.projectId,
        userId:    params.userId,
        userEmail: params.userEmail,
        meta:      params.meta ? (JSON.parse(JSON.stringify(params.meta)) as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (err: unknown) {
    console.error('[Vysible] [FAIL] AuditLog-Schreiben fehlgeschlagen:', err);
  }
}
