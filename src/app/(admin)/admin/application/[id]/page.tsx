import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminComparison, formBReadiness, submitFormB, getApplication } from '@/lib/access';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { revalidatePath } from 'next/cache';
import ApplicationViewSection from '@/components/application/ApplicationViewSection';

export default async function AdminApplicationDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const { id } = await Promise.resolve(params);
  
  const [app, assessments, readiness] = await Promise.all([
    getApplication(session as any, id),
    adminComparison(session as any, id),
    formBReadiness(id)
  ]);

  const isDecided = app.status === 'APPROVED' || app.status === 'REJECTED' || app.status === 'REPRESENT';

  async function handleDecision(formData: FormData) {
    'use server';
    const s = await getSession();
    if (!s) return;
    
    const decision = formData.get('decision') as string;
    const note = formData.get('note') as string;
    const approvedTotal = parseFloat(formData.get('approvedTotal') as string) || 0;
    
    await submitFormB(s as any, id, {
      decision,
      note,
      approvedTotal,
      amounts: {}, // Simplified for demo
      timeline: {}
    });
    
    revalidatePath(`/admin/application/${id}`);
    redirect(`/admin/application/${id}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application: {app.startup.teamName}</h1>
          <Badge variant="info">{app.status}</Badge>
        </div>
        <Link href="/admin"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <ApplicationViewSection application={app} />
          
          <Card>
            <CardHeader><CardTitle>SEC Assessments</CardTitle></CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <p className="text-sm text-gray-500">No assessments submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  {assessments.map((a: any) => (
                    <div key={a.id} className="border p-4 rounded bg-gray-50">
                      <h4 className="font-bold">{a.member.name}</h4>
                      <div className="mt-2 text-sm">
                        <p><strong>Status Notes:</strong> {JSON.stringify(a.statusForm)}</p>
                        <p><strong>Experiment Notes:</strong> {JSON.stringify(a.experimentForm)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Final Decision (Form B)</CardTitle></CardHeader>
            <CardContent>
              {!readiness.ready ? (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded text-sm">
                  <p><strong>Gate Locked:</strong> You cannot make a decision yet.</p>
                  <ul className="list-disc ml-5 mt-2">
                    <li>{readiness.submitted} of {readiness.members} SEC forms submitted.</li>
                    <li>Milestone form: {readiness.milestoneSubmitted ? 'Submitted' : 'Pending'}</li>
                  </ul>
                </div>
              ) : (
                <form action={handleDecision} className="space-y-4">
                  <Select 
                    name="decision"
                    label="Decision"
                    options={[
                      { value: 'APPROVED', label: 'Approve Grant' },
                      { value: 'REJECTED', label: 'Reject' },
                      { value: 'REPRESENT', label: 'Request Re-presentation' },
                    ]}
                    disabled={isDecided}
                  />
                  <Input 
                    type="number"
                    name="approvedTotal"
                    label="Approved Total Amount (₹)"
                    disabled={isDecided}
                  />
                  <Textarea 
                    name="note"
                    label="Admin Note"
                    disabled={isDecided}
                    placeholder="Enter final remarks..."
                  />
                  {!isDecided && (
                    <Button type="submit" variant="primary" className="w-full">
                      Submit Final Decision
                    </Button>
                  )}
                  {isDecided && (
                    <p className="text-green-600 font-semibold text-center mt-2">Decision submitted.</p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
