import { pdfmake } from './font-setup';
import { BUDGET_HEADERS } from '../seedfund-constants';

export async function generateApplicationPdfBuffer(app: any): Promise<Buffer> {
  const formData = app.formData || {};
  const agreement = formData.agreement || {};
  const experiment = formData.experiment || {};
  const teamMembers = formData.teamMembers || [];
  const readiness = formData.readinessLevel || {};
  const milestoneList = formData.milestones || [];
  const startup = app.startup || {};
  const user = startup.user || {};

  const budgetRows: any[] = [
    [
      { text: 'Header', bold: true, fillColor: '#f3f4f6' },
      { text: 'Item', bold: true, fillColor: '#f3f4f6' },
      { text: 'Vendor', bold: true, fillColor: '#f3f4f6' },
      { text: 'Qty', bold: true, fillColor: '#f3f4f6' },
      { text: 'Unit (₹)', bold: true, fillColor: '#f3f4f6' },
      { text: 'Total (₹)', bold: true, fillColor: '#f3f4f6' },
      { text: 'Justification', bold: true, fillColor: '#f3f4f6' },
    ],
  ];

  for (const item of app.budgetItems || []) {
    const h = BUDGET_HEADERS.find((bh) => bh.key === item.header)?.name || item.header;
    budgetRows.push([
      { text: h, fontSize: 8 },
      { text: item.name || '', fontSize: 8 },
      { text: item.vendor || '-', fontSize: 8 },
      { text: String(item.qty || 1), fontSize: 8, alignment: 'center' },
      { text: `₹ ${Number(item.unitCost).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right' },
      { text: `₹ ${Number(item.total).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right' },
      { text: item.justification || '-', fontSize: 8 },
    ]);
  }

  const requestedTotalStr = `₹ ${Number(app.requestedTotal || 0).toLocaleString('en-IN')}`;

  const docDefinition: any = {
    defaultStyle: {
      font: 'DejaVu',
      fontSize: 9,
      lineHeight: 1.2,
      color: '#1f2937',
    },
    pageMargins: [36, 40, 36, 40],
    content: [
      {
        text: 'IDEAPAD SEED GRANT APPLICATION FORM',
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 4],
        color: '#1e3a8a',
      },
      {
        text: `Application ID: ${app.id} | Tier: ${app.grantType || 'IDEATION'} | Status: ${app.status}`,
        fontSize: 9,
        alignment: 'center',
        color: '#4b5563',
        margin: [0, 0, 0, 14],
      },

      // Section: Profile
      { text: '1. Applicant & Startup Profile', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [{ text: 'Team / Startup Name:', bold: true }, startup.teamName || '-', { text: 'Grant Tier:', bold: true }, app.grantType || '-'],
            [{ text: 'Applicant Name:', bold: true }, formData.applicantName || user.name || '-', { text: 'Enrollment No:', bold: true }, startup.enrollmentNo || '-'],
            [{ text: 'Program:', bold: true }, startup.program || '-', { text: 'Department:', bold: true }, startup.department || '-'],
            [{ text: 'Email:', bold: true }, user.email || '-', { text: 'Phone:', bold: true }, startup.phone || '-'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },

      // Agreement acceptance line
      { text: 'Agreement Acceptance', fontSize: 10, bold: true, margin: [0, 4, 0, 2] },
      {
        text: `Accepted terms version ${agreement.version || '1.0'} by "${agreement.acceptedByName || '-'}" on ${agreement.acceptedAt ? new Date(agreement.acceptedAt).toLocaleDateString('en-IN') : '-'} (Hash: ${(agreement.textHash || '-').substring(0, 16)}...)`,
        fontSize: 8,
        color: '#4b5563',
        italics: true,
        margin: [0, 0, 0, 10],
      },

      // Problem & Solution
      { text: '2. Problem Statement', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      { text: formData.problemStatement || '-', margin: [0, 0, 0, 8] },

      { text: '3. Proposed Solution', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      { text: formData.proposedSolution || '-', margin: [0, 0, 0, 8] },

      { text: '4. Traction / Effort So Far', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      { text: formData.effortAndTraction || '-', margin: [0, 0, 0, 8] },

      // Experiment Definition (10 fields)
      { text: '5. Experiment Definition', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            [{ text: 'Objective', bold: true }, experiment.objective || '-'],
            [{ text: 'Problem to Test', bold: true }, experiment.problemStatement || '-'],
            [{ text: 'Expected Outcome', bold: true }, experiment.expectedOutcome || '-'],
            [{ text: 'Methodology', bold: true }, experiment.methodology || '-'],
            [{ text: 'Experimental Setup', bold: true }, experiment.experimentalSetup || '-'],
            [{ text: 'Data to be Collected', bold: true }, experiment.dataToBeCollected || '-'],
            [{ text: 'Validation Criteria', bold: true }, experiment.validationCriteria || '-'],
            [{ text: 'Risks & Assumptions', bold: true }, experiment.risksAndAssumptions || '-'],
            [{ text: 'Timeline', bold: true }, experiment.timeline || '-'],
            [{ text: 'Deliverables', bold: true }, experiment.deliverables || '-'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },

      // Budget Table
      { text: '6. Proposed Budget Details', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      {
        table: {
          headerRows: 1,
          widths: ['22%', '18%', '14%', '6%', '12%', '12%', '16%'],
          body: budgetRows,
        },
        margin: [0, 0, 0, 4],
      },
      {
        text: `Requested Total: ${requestedTotalStr}`,
        fontSize: 10,
        bold: true,
        alignment: 'right',
        margin: [0, 0, 0, 10],
        color: '#1e3a8a',
      },

      // Self Assessment
      { text: '7. Self-Assessment (Readiness Levels & Milestones)', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      {
        text: `Startup Readiness Self-Assessment: TRL ${readiness.trl || '-'} · MRL ${readiness.mrl || '-'} · IRL ${readiness.irl || '-'}`,
        bold: true,
        margin: [0, 0, 0, 4],
      },
      {
        text: `Self-Assessed Milestones: ${(milestoneList || []).map((m: any) => `${m.name || m} (${m.status || 'Planned'})`).join('; ') || 'None specified'}`,
        fontSize: 8,
        color: '#4b5563',
        margin: [0, 0, 0, 10],
      },

      // Team Members
      { text: '8. Team Members', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      {
        ul: teamMembers.length > 0
          ? teamMembers.map((m: any) => `${m.name || '-'} (${m.role || 'Member'}) - ${m.program || ''} - ${m.email || ''}`)
          : ['No additional team members listed'],
        fontSize: 8,
        margin: [0, 0, 0, 10],
      },

      // Uploaded Documents
      { text: '9. Uploaded Documents (Names & Labels Only)', fontSize: 11, bold: true, margin: [0, 6, 0, 4], color: '#1e3a8a' },
      {
        table: {
          headerRows: 1,
          widths: ['25%', '45%', '30%'],
          body: [
            [
              { text: 'Type', bold: true, fillColor: '#f3f4f6' },
              { text: 'File Name', bold: true, fillColor: '#f3f4f6' },
              { text: 'Member / Label', bold: true, fillColor: '#f3f4f6' },
            ],
            ...(app.documents && app.documents.length > 0
              ? app.documents.map((d: any) => [
                  { text: d.type || '-', fontSize: 8 },
                  { text: d.name || '-', fontSize: 8 },
                  { text: d.memberLabel || '-', fontSize: 8 },
                ])
              : [[{ text: 'No documents uploaded', colSpan: 3, alignment: 'center', fontSize: 8 }, {}, {}]]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },
    ],
  };

  const doc = (pdfmake as any).createPdf(docDefinition);
  return doc.getBuffer();
}
