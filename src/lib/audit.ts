import { prisma } from '@/lib/db';

export async function logAudit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  reason?: string,
  details?: any
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        reason,
        details,
      },
    });
  } catch (error) {
    console.error('[AuditLog Error]:', error);
  }
}
