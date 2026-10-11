import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getApplication, getMyAssessment, saveAssessment, claimMilestone, setMilestoneState, addMilestoneRemark, submitMilestone } from '@/lib/access';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';
import ApplicationViewSection from '@/components/application/ApplicationViewSection';

export default async function SECApplicationDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') redirect('/login');

  const { id } = await Promise.resolve(params); // Next.js 14 params pattern
  const app = await getApplication(session as any, id);
  const assessment = await getMyAssessment(session as any, id);

  async function handleSaveAssessment(formData: FormData) {
    'use server';
    const s = await getSession();
    if (!s) return;
    
    const isSubmit = formData.get('submit') === 'true';
    const statusForm = {
      notes: formData.get('status_notes') as string,
    };
    const experimentForm = {
      experiment: formData.get('experiment_notes') as string,
    };
    
    await saveAssessment(s as any, id, { statusForm, experimentForm }, isSubmit);
    revalidatePath(`/sec/${id}`);
  }

  async function handleClaimMilestone(formData: FormData) {
    'use server';
    const s = await getSession();
    if (!s) return;
    
    const track = formData.get('track') as string;
    const names = (formData.get('names') as string).split(',').map(n => n.trim());
    
    await claimMilestone(s as any, id, track, names);
    revalidatePath(`/sec/${id}`);
  }

  async function handleSubmitMilestone() {
    'use server';
    const s = await getSession();
    if (!s) return;
    await submitMilestone(s as any, id);
    revalidatePath(`/sec/${id}`);
  }

  const isMilestoneOwner = app.milestone?.ownerId === session.userId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Application: {app.startup.teamName}</h1>
        <Link href="/sec"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <ApplicationViewSection application={app} />
        </div>
        
        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle>My Assessment (Form 1 & 3)</CardTitle></CardHeader>
            <CardContent>
              <form action={handleSaveAssessment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Status Notes (Form 1)</label>
                  <textarea name="status_notes" defaultValue={(assessment?.statusForm as any)?.notes || ''} className="w-full border rounded p-2" rows={4} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Experiment Notes (Form 3)</label>
                  <textarea name="experiment_notes" defaultValue={(assessment?.experimentForm as any)?.experiment || ''} className="w-full border rounded p-2" rows={4} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" name="submit" value="false" variant="outline">Save Draft</Button>
                  <Button type="submit" name="submit" value="true">Submit Assessment</Button>
                </div>
                {assessment?.status === 'SUBMITTED' && <p className="text-green-600 text-sm mt-2">Assessment is submitted and locked.</p>}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Shared Milestone Form (Form 2)</CardTitle></CardHeader>
            <CardContent>
              {!app.milestone ? (
                <form action={handleClaimMilestone} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium">Track</label>
                    <input name="track" type="text" className="w-full border rounded p-2" placeholder="e.g. Hardware" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Milestones (comma separated)</label>
                    <input name="names" type="text" className="w-full border rounded p-2" placeholder="Milestone 1, Milestone 2" />
                  </div>
                  <Button type="submit">Claim & Create Milestones</Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p>Milestone claimed by: {isMilestoneOwner ? 'You' : 'Another SEC Member'}</p>
                  <p>Status: {app.milestone.status}</p>
                  <ul className="list-disc pl-5">
                    {app.milestone.items.map((item: any) => (
                      <li key={item.id}>{item.name} - {item.state}</li>
                    ))}
                  </ul>
                  {isMilestoneOwner && app.milestone.status === 'DRAFT' && (
                    <form action={handleSubmitMilestone}>
                      <Button type="submit">Submit Milestone Form</Button>
                    </form>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
