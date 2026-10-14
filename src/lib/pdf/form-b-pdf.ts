import { pdfmake } from './font-setup';
import { BUDGET_HEADERS } from '../seedfund-constants';

export async function generateFormBPdfBuffer(evaluation: any, reportData: any): Promise<Buffer> {
  const application = reportData.application || {};
  const startup = application.startup || {};
  const user = startup.user || {};
  const isDraft = evaluation?.status !== 'SUBMITTED';

  const amounts = evaluation?.amounts || {};
  const timeline = evaluation?.timeline || {};

  const budgetRows: any[] = [
    [
      { text: 'Budget Header', bold: true, fillColor: '#f3f4f6', fontSize: 8 },
      { text: 'Requested (₹)', bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'right' },
      { text: 'Approved (₹)', bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'right' },
    ],
  ];

  for (const h of BUDGET_HEADERS) {
    const req = reportData.section6?.requested?.[h.key] || 0;
    const apprv = amounts[h.key] || 0;
    budgetRows.push([
      { text: h.name, fontSize: 8 },
      { text: `₹ ${Number(req).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right' },
      { text: `₹ ${Number(apprv).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right', bold: true },
    ]);
  }

  budgetRows.push([
    { text: 'Total Sanctioned Grant', bold: true, fillColor: '#f9fafb', fontSize: 9 },
    { text: `₹ ${Number(application.requestedTotal || 0).toLocaleString('en-IN')}`, bold: true, fillColor: '#f9fafb', fontSize: 9, alignment: 'right' },
    { text: `₹ ${Number(evaluation?.approvedTotal || 0).toLocaleString('en-IN')}`, bold: true, fillColor: '#f9fafb', fontSize: 9, alignment: 'right', color: '#1e3a8a' },
  ]);

  const docDefinition: any = {
    defaultStyle: {
      font: 'DejaVu',
      fontSize: 9,
      lineHeight: 1.2,
      color: '#1f2937',
    },
    pageMargins: [36, 36, 36, 36],
    ...(isDraft ? { watermark: { text: 'DRAFT', color: '#6b7280', opacity: 0.15, bold: true } } : {}),
    content: [
      {
        text: 'IDEAPAD SEED GRANT EVALUATION REPORT (FORM B)',
        fontSize: 14,
        bold: true,
        alignment: 'center',
        color: '#1e3a8a',
        margin: [0, 0, 0, 4],
      },
      {
        text: `Application ID: ${application.id} | Date: ${evaluation?.assessmentDate ? new Date(evaluation.assessmentDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`,
        fontSize: 8,
        alignment: 'center',
        color: '#4b5563',
        margin: [0, 0, 0, 12],
      },

      // Startup Header block
      { text: '1. Beneficiary Information', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 4, 0, 2] },
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [{ text: 'Startup / Team:', bold: true }, startup.teamName || '-', { text: 'Grant Tier:', bold: true }, application.grantType || '-'],
            [{ text: 'Lead Applicant:', bold: true }, application.formData?.applicantName || user.name || '-', { text: 'Enrollment No:', bold: true }, startup.enrollmentNo || '-'],
            [{ text: 'Program:', bold: true }, startup.program || '-', { text: 'Phone:', bold: true }, startup.phone || '-'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },

      // Grant Decision Summary
      { text: '2. Grant Sanction Decision', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 4, 0, 2] },
      {
        table: {
          widths: ['35%', '65%'],
          body: [
            [{ text: 'SEC Majority Recommendation:', bold: true }, reportData.section5?.majorityLabel || 'No majority recommendation'],
            [{ text: 'Final Sanctioned Decision:', bold: true }, `${evaluation?.decision || 'PENDING'} (Total: ₹ ${Number(evaluation?.approvedTotal || 0).toLocaleString('en-IN')})`],
            ...(evaluation?.secDecisionNote
              ? [[{ text: 'SEC Mismatch Justification:', bold: true, color: '#b91c1c' }, { text: evaluation.secDecisionNote, color: '#b91c1c' }]]
              : []),
            [{ text: 'Director / Final Recommendation Note:', bold: true }, evaluation?.note || 'None recorded'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },

      // Approved Budget Breakdown
      { text: '3. Sanctioned Budget Allocation', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 4, 0, 2] },
      {
        table: {
          headerRows: 1,
          widths: ['40%', '30%', '30%'],
          body: budgetRows,
        },
        margin: [0, 0, 0, 10],
      },

      // Implementation Timeline
      { text: '4. Project Implementation Timeline', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 4, 0, 2] },
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [{ text: 'Grant Approval Date:', bold: true }, timeline.grantApprovalDate ? new Date(timeline.grantApprovalDate).toLocaleDateString('en-IN') : '-'],
            [{ text: 'Fund Release Date:', bold: true }, timeline.fundReleaseDate ? new Date(timeline.fundReleaseDate).toLocaleDateString('en-IN') : '-'],
            [{ text: 'Mid-Review Date:', bold: true }, timeline.midReviewDate ? new Date(timeline.midReviewDate).toLocaleDateString('en-IN') : '-'],
            [{ text: 'Grant Utilization Deadline:', bold: true }, timeline.grantUtilizationDeadline ? new Date(timeline.grantUtilizationDeadline).toLocaleDateString('en-IN') : '-'],
            [{ text: 'Experiment Completion Date:', bold: true }, timeline.experimentCompletionDate ? new Date(timeline.experimentCompletionDate).toLocaleDateString('en-IN') : '-'],
            [{ text: 'Final Submission Date:', bold: true }, timeline.finalSubmissionDate ? new Date(timeline.finalSubmissionDate).toLocaleDateString('en-IN') : '-'],
            [{ text: 'Project Closure Date:', bold: true }, timeline.closureDate ? new Date(timeline.closureDate).toLocaleDateString('en-IN') : '-'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10],
      },

      // Terms and Conditions
      { text: '5. Terms and Conditions', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 4, 0, 2] },
      {
        ol: [
          'The seed grant is sanctioned solely for the research/prototype activities approved in this application.',
          'Funds must be utilized strictly in accordance with approved budget heads and university financial norms.',
          'Milestone reports and utilization certificates must be submitted by the deadlines indicated above.',
          'Equipment purchased remains the property of IDEAPAD / University and must be cataloged appropriately.',
          'Any diversion or unauthorized expenses will lead to recovery and revocation of grant.',
        ],
        fontSize: 7.5,
        color: '#374151',
        margin: [0, 0, 0, 14],
      },

      // 5 Approval Signature Blocks:
      // Vice Chancellor, Dean/HoD, Director IDEAPAD, Assistant Director Startups, SOM representative
      { text: '6. Approval Signatures', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 6, 0, 6] },
      {
        table: {
          widths: ['33%', '33%', '34%'],
          body: [
            [
              {
                stack: [
                  { text: 'Vice Chancellor', bold: true, fontSize: 8 },
                  { text: '\n\n\n_________________________', fontSize: 8 },
                  { text: 'Signature & Seal', fontSize: 7, color: '#6b7280' },
                ],
              },
              {
                stack: [
                  { text: 'Dean / HoD', bold: true, fontSize: 8 },
                  { text: '\n\n\n_________________________', fontSize: 8 },
                  { text: 'Signature & Seal', fontSize: 7, color: '#6b7280' },
                ],
              },
              {
                stack: [
                  { text: 'Director, IDEAPAD', bold: true, fontSize: 8 },
                  { text: '\n\n\n_________________________', fontSize: 8 },
                  { text: 'Signature & Seal', fontSize: 7, color: '#6b7280' },
                ],
              },
            ],
            [
              {
                stack: [
                  { text: '\nAssistant Director (Startups)', bold: true, fontSize: 8 },
                  { text: '\n\n_________________________', fontSize: 8 },
                  { text: 'Signature', fontSize: 7, color: '#6b7280' },
                ],
              },
              {
                stack: [
                  { text: '\nSOM Representative', bold: true, fontSize: 8 },
                  { text: '\n\n_________________________', fontSize: 8 },
                  { text: 'Signature', fontSize: 7, color: '#6b7280' },
                ],
              },
              { text: '' },
            ],
          ],
        },
        layout: 'noBorders',
      },
    ],
  };

  const doc = (pdfmake as any).createPdf(docDefinition);
  return doc.getBuffer();
}
