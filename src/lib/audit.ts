import { prisma } from '@/lib/db';

export async function logAudit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
      },
    });
  } catch (error) {
    console.error('[AuditLog Error]:', error);
  }
}
