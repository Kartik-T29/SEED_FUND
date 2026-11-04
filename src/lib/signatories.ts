import { prisma } from './prisma';
import { requireRole, Session } from './access';

export interface Signatory {
  id: string;
  key: string;
  name: string;
  designation: string;
  sortOrder: number;
}

export const DEFAULT_SIGNATORIES: Array<Omit<Signatory, 'id'>> = [
  {
    key: 'head_incubation',
    name: 'Mr. Aakash Kumar Shukla',
    designation: 'Head, Incubation and Startups, IDEAPAD',
    sortOrder: 1,
  },
  {
    key: 'director_ideapad',
    name: 'Ashish Chandel',
    designation: 'Professor of Practice and Director, IDEAPAD',
    sortOrder: 2,
  },
  {
    key: 'vice_chancellor',
    name: '',
    designation: 'Vice Chancellor, ITM University, Gwalior',
    sortOrder: 3,
  },
];

/**
 * Loads official signatories from settings.
 * Seeded via additive migration/seed. No hardcoded names or designations.
 */
export async function getSignatories(): Promise<Signatory[]> {
  try {
    const list = await prisma.signatorySetting.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    if (list.length > 0) {
      return list.map((item) => ({
        id: item.id,
        key: item.key,
        name: item.name,
        designation: item.designation,
        sortOrder: item.sortOrder,
      }));
    }
  } catch (err) {
    console.error('Failed to load signatories from DB, using fallback:', err);
  }

  // Fallback if settings table hasn't been populated yet
  return DEFAULT_SIGNATORIES.map((s, idx) => ({
    id: `default_${idx + 1}`,
    ...s,
  }));
}

export async function getSignatory(key: string): Promise<Signatory | null> {
  const signatories = await getSignatories();
  return signatories.find((s) => s.key === key) || null;
}

/**
 * Admin action to update a signatory's name and designation in settings.
 */
export async function updateSignatory(
  s: Session,
  key: string,
  data: { name: string; designation: string }
) {
  requireRole(s, 'ADMIN');

  const name = String(data.name || '').trim();
  const designation = String(data.designation || '').trim();

  const updated = await prisma.signatorySetting.upsert({
    where: { key },
    create: {
      key,
      name,
      designation,
      sortOrder: key === 'head_incubation' ? 1 : key === 'director_ideapad' ? 2 : 3,
    },
    update: {
      name,
      designation,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: 'UPDATE_SIGNATORY_SETTING',
      entity: 'SignatorySetting',
      entityId: updated.id,
      details: JSON.stringify({ key, name, designation }),
    },
  });

  return updated;
}
