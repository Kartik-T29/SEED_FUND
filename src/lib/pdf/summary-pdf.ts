import { pdfmake } from './font-setup';
import {
  TRL_LABELS_FORM_A,
  MRL_LABELS_FORM_A,
  IRL_LABELS_FORM_A,
  GRANT_EVALUATION_OPTIONS,
} from '../consolidated-constants';
import { BUDGET_HEADERS } from '../seedfund-constants';
import { FLAT_SEC_QUESTIONS } from '../sec-questions';

export async function generateSummaryReportPdfBuffer(reportData: any): Promise<Buffer> {
  const {
    application,
    submittedAssessments,
    milestone,
    section1,
    section5,
    section6,
    isComplete,
    incompleteBanner,
  } = reportData;

  const members = submittedAssessments.map((a: any) => a.member);
  const m1Name = members[0]?.name || 'Member 1';
  const m2Name = members[1]?.name || 'Member 2';
  const m3Name = members[2]?.name || 'Member 3';

  // Section 1 table: 3 blocks side by side
  // Block 1: TRL label | M1 | M2 | M3
  // Block 2: MRL label | M1 | M2 | M3
  // Block 3: IRL label | M1 | M2 | M3
  // Total 12 columns.
  const sec1HeaderRow: any[] = [
    { text: 'TRL Scale', bold: true, fillColor: '#e5e7eb', fontSize: 7 },
    { text: `SEC: ${m1Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
    { text: `SEC: ${m2Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
    { text: `SEC: ${m3Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
    { text: 'MRL Scale', bold: true, fillColor: '#e5e7eb', fontSize: 7 },
    { text: `SEC: ${m1Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
    { text: `SEC: ${m2Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
    { text: `SEC: ${m3Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
    { text: 'IRL Scale', bold: true, fillColor: '#e5e7eb', fontSize: 7 },
    { text: `SEC: ${m1Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
    { text: `SEC: ${m2Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
    { text: `SEC: ${m3Name}`, bold: true, fillColor: '#e5e7eb', fontSize: 6, alignment: 'center' },
  ];

  const sec1Rows: any[] = [sec1HeaderRow];

  for (let i = 0; i < 9; i++) {
    const trlLabel = TRL_LABELS_FORM_A[i];
    const mrlLabel = MRL_LABELS_FORM_A[i];
    const irlLabel = IRL_LABELS_FORM_A[i];

    const trlAchieved = section1.trl[i] || [];
    const mrlAchieved = section1.mrl[i] || [];
    const irlAchieved = section1.irl[i] || [];

    sec1Rows.push([
      { text: trlLabel, fontSize: 6 },
      { text: trlAchieved[0] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
      { text: trlAchieved[1] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
      { text: trlAchieved[2] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
      { text: mrlLabel, fontSize: 6 },
      { text: mrlAchieved[0] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
      { text: mrlAchieved[1] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
      { text: mrlAchieved[2] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
      { text: irlLabel, fontSize: 6 },
      { text: irlAchieved[0] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
      { text: irlAchieved[1] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
      { text: irlAchieved[2] ? 'achieved' : '', fontSize: 6, bold: true, color: '#166534', alignment: 'center' },
    ]);
  }

  // Section 2 Milestones
  const sec2Rows: any[] = [
    [
      { text: 'Milestone', bold: true, fillColor: '#f3f4f6', fontSize: 8 },
      { text: 'Status (Owner)', bold: true, fillColor: '#f3f4f6', fontSize: 8 },
      { text: `Remarks: ${m1Name}`, bold: true, fillColor: '#f3f4f6', fontSize: 8 },
      { text: `Remarks: ${m2Name}`, bold: true, fillColor: '#f3f4f6', fontSize: 8 },
      { text: `Remarks: ${m3Name}`, bold: true, fillColor: '#f3f4f6', fontSize: 8 },
    ],
  ];

  for (const item of milestone?.items || []) {
    const r1 = item.remarks?.find((r: any) => r.memberId === members[0]?.id)?.remark || '-';
    const r2 = item.remarks?.find((r: any) => r.memberId === members[1]?.id)?.remark || '-';
    const r3 = item.remarks?.find((r: any) => r.memberId === members[2]?.id)?.remark || '-';
    sec2Rows.push([
      { text: item.name, fontSize: 8 },
      { text: `${item.state} (${milestone.owner?.name || 'Owner'})`, fontSize: 8 },
      { text: r1, fontSize: 8 },
      { text: r2, fontSize: 8 },
      { text: r3, fontSize: 8 },
    ]);
  }

  // Section 3 Experiment Assessment
  const isExperimentApplicable = !['IDEATION', 'EMERGENCY'].includes(application.grantType);
  const sec3Rows: any[] = [
    [
      { text: '#', bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'center' },
      { text: 'Question', bold: true, fillColor: '#f3f4f6', fontSize: 8 },
      { text: m1Name, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'center' },
      { text: m2Name, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'center' },
      { text: m3Name, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'center' },
      { text: 'Yes Tally', bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'center' },
    ],
  ];

  if (!isExperimentApplicable) {
    sec3Rows.push([
      { text: '-', alignment: 'center', fontSize: 8 },
      { text: 'TRL 2/3 Experiment Assessment is N/A for Ideation / Emergency grant tiers.', fontSize: 8 },
      { text: 'N/A', alignment: 'center', fontSize: 8 },
      { text: 'N/A', alignment: 'center', fontSize: 8 },
      { text: 'N/A', alignment: 'center', fontSize: 8 },
      { text: 'N/A', alignment: 'center', fontSize: 8 },
    ]);
  } else {
    for (const q of FLAT_SEC_QUESTIONS) {
      const qNum = q.number;
      const ans1 = submittedAssessments[0]?.experimentForm?.answers?.[qNum];
      const ans2 = submittedAssessments[1]?.experimentForm?.answers?.[qNum];
      const ans3 = submittedAssessments[2]?.experimentForm?.answers?.[qNum];

      const yesCount = [ans1, ans2, ans3].filter((a) => a === true).length;
      sec3Rows.push([
        { text: String(qNum), fontSize: 8, alignment: 'center' },
        { text: `${q.group}: ${q.text}`, fontSize: 8 },
        { text: ans1 === true ? 'Yes' : ans1 === false ? 'No' : '-', fontSize: 8, alignment: 'center' },
        { text: ans2 === true ? 'Yes' : ans2 === false ? 'No' : '-', fontSize: 8, alignment: 'center' },
        { text: ans3 === true ? 'Yes' : ans3 === false ? 'No' : '-', fontSize: 8, alignment: 'center' },
        { text: `${yesCount} / ${submittedAssessments.length}`, fontSize: 8, bold: true, alignment: 'center' },
      ]);
    }
  }

  // Section 5 Grant evaluation grid
  const sec5Rows: any[] = [
    [
      { text: 'Option', bold: true, fillColor: '#f3f4f6', fontSize: 8 },
      { text: m1Name, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'center' },
      { text: m2Name, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'center' },
      { text: m3Name, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'center' },
    ],
  ];

  for (const opt of GRANT_EVALUATION_OPTIONS) {
    const c1 = submittedAssessments[0]?.suggestedGrant === opt.key ? '✔' : '';
    const c2 = submittedAssessments[1]?.suggestedGrant === opt.key ? '✔' : '';
    const c3 = submittedAssessments[2]?.suggestedGrant === opt.key ? '✔' : '';
    sec5Rows.push([
      { text: opt.label, fontSize: 8 },
      { text: c1, fontSize: 10, bold: true, color: '#1e3a8a', alignment: 'center' },
      { text: c2, fontSize: 10, bold: true, color: '#1e3a8a', alignment: 'center' },
      { text: c3, fontSize: 10, bold: true, color: '#1e3a8a', alignment: 'center' },
    ]);
  }

  // Section 6 Suggested Budget Headers
  const sec6Rows: any[] = [
    [
      { text: 'Budget Header', bold: true, fillColor: '#f3f4f6', fontSize: 8 },
      { text: 'Requested (₹)', bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'right' },
      { text: `${m1Name} (₹)`, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'right' },
      { text: `${m2Name} (₹)`, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'right' },
      { text: `${m3Name} (₹)`, bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'right' },
      { text: 'Average (₹)', bold: true, fillColor: '#f3f4f6', fontSize: 8, alignment: 'right' },
    ],
  ];

  for (const h of BUDGET_HEADERS) {
    const req = section6.requested[h.key] || 0;
    const a1 = section6.memberAmounts[0]?.[h.key] || 0;
    const a2 = section6.memberAmounts[1]?.[h.key] || 0;
    const a3 = section6.memberAmounts[2]?.[h.key] || 0;
    const avg = section6.averages[h.key] || 0;

    sec6Rows.push([
      { text: h.name, fontSize: 8 },
      { text: `₹ ${Number(req).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right' },
      { text: `₹ ${Number(a1).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right' },
      { text: `₹ ${Number(a2).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right' },
      { text: `₹ ${Number(a3).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right' },
      { text: `₹ ${Number(avg).toLocaleString('en-IN')}`, fontSize: 8, alignment: 'right', bold: true },
    ]);
  }

  // Total row
  sec6Rows.push([
    { text: 'Total', bold: true, fillColor: '#f9fafb', fontSize: 8 },
    { text: `₹ ${Number(section6.requestedTotal).toLocaleString('en-IN')}`, bold: true, fillColor: '#f9fafb', fontSize: 8, alignment: 'right' },
    {
      text: `₹ ${Number(section6.memberTotals[0] || 0).toLocaleString('en-IN')}`,
      bold: true,
      fillColor: section6.memberOutOfRange[0] ? '#fef2f2' : '#f9fafb',
      color: section6.memberOutOfRange[0] ? '#b91c1c' : '#1f2937',
      fontSize: 8,
      alignment: 'right',
    },
    {
      text: `₹ ${Number(section6.memberTotals[1] || 0).toLocaleString('en-IN')}`,
      bold: true,
      fillColor: section6.memberOutOfRange[1] ? '#fef2f2' : '#f9fafb',
      color: section6.memberOutOfRange[1] ? '#b91c1c' : '#1f2937',
      fontSize: 8,
      alignment: 'right',
    },
    {
      text: `₹ ${Number(section6.memberTotals[2] || 0).toLocaleString('en-IN')}`,
      bold: true,
      fillColor: section6.memberOutOfRange[2] ? '#fef2f2' : '#f9fafb',
      color: section6.memberOutOfRange[2] ? '#b91c1c' : '#1f2937',
      fontSize: 8,
      alignment: 'right',
    },
    { text: `₹ ${Number(section6.totalAverage).toLocaleString('en-IN')}`, bold: true, fillColor: '#f9fafb', fontSize: 8, alignment: 'right' },
  ]);

  const docDefinition: any = {
    defaultStyle: {
      font: 'DejaVu',
      fontSize: 8,
      lineHeight: 1.15,
      color: '#1f2937',
    },
    pageOrientation: 'landscape',
    pageMargins: [28, 28, 28, 28],
    ...(incompleteBanner ? { watermark: { text: 'INCOMPLETE', color: '#ef4444', opacity: 0.15, bold: true } } : {}),
    content: [
      ...(incompleteBanner
        ? [
            {
              text: incompleteBanner,
              fontSize: 11,
              bold: true,
              color: '#b91c1c',
              alignment: 'center',
              margin: [0, 0, 0, 8],
            },
          ]
        : []),
      {
        text: 'STARTUP EVALUATION COMMITTEE (SEC) - CONSOLIDATED REPORT (FORM A)',
        fontSize: 13,
        bold: true,
        alignment: 'center',
        color: '#1e3a8a',
        margin: [0, 0, 0, 6],
      },
      // Header block
      {
        table: {
          widths: ['16%', '34%', '16%', '34%'],
          body: [
            [{ text: 'Startup / Team:', bold: true }, application.startup.teamName, { text: 'Applicant Name:', bold: true }, application.formData?.applicantName || application.startup.user.name],
            [{ text: 'Grant Tier:', bold: true }, application.grantType, { text: 'Requested Total:', bold: true }, `₹ ${Number(application.requestedTotal).toLocaleString('en-IN')}`],
            [{ text: 'Presentation Date:', bold: true }, submittedAssessments[0]?.assessmentDate ? new Date(submittedAssessments[0].assessmentDate).toLocaleDateString('en-IN') : '-', { text: 'SEC Members:', bold: true }, members.map((m: any) => `${m.name} (${m.designation || 'SEC'})`).join(' · ') || 'None'],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 8],
      },

      // Section 1: Current Status Assessment (TRL / MRL / IRL)
      { text: 'Section 1: Current Status Assessment (TRL / MRL / IRL)', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 4, 0, 3] },
      {
        table: {
          widths: ['17%', '5%', '5%', '5%', '18%', '5%', '5%', '5%', '25%', '5%', '5%', '5%'],
          body: sec1Rows,
        },
        margin: [0, 0, 0, 4],
      },
      {
        text: `Startup self-assessment: TRL ${section1.selfTrl} · MRL ${section1.selfMrl} · IRL ${section1.selfIrl}`,
        fontSize: 8,
        bold: true,
        margin: [0, 2, 0, 1],
      },
      {
        text: `Committee view: TRL: ${section1.committeeViewTrl.label} | MRL: ${section1.committeeViewMrl.label} | IRL: ${section1.committeeViewIrl.label}`,
        fontSize: 8,
        bold: true,
        color: '#1e3a8a',
        margin: [0, 0, 0, 8],
      },

      // Section 2: Milestone assessment
      { text: 'Section 2: Milestone Assessment', fontSize: 10, bold: true, color: '#1e3a8a', pageBreak: 'before', margin: [0, 4, 0, 3] },
      { text: `Track: ${milestone?.track || 'Not Selected'} | Owner: ${milestone?.owner?.name || '-'}`, fontSize: 8, bold: true, margin: [0, 0, 0, 4] },
      {
        table: {
          widths: ['25%', '15%', '20%', '20%', '20%'],
          body: sec2Rows,
        },
        margin: [0, 0, 0, 4],
      },
      ...(milestone?.editLog && milestone.editLog.length > 0
        ? [
            { text: 'Audit / Corrections Log (corrections require signature):', fontSize: 7, bold: true, margin: [0, 4, 0, 2] },
            {
              ul: milestone.editLog.map(
                (log: any) =>
                  `Member: changed ${log.field} from "${log.oldValue}" to "${log.newValue}" on ${new Date(log.at).toLocaleDateString('en-IN')}`
              ),
              fontSize: 7,
              margin: [0, 0, 0, 6],
            },
          ]
        : []),

      // Section 3: Experiment Assessment
      { text: 'Section 3: TRL 2/3 Experiment Assessment', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 8, 0, 3] },
      {
        table: {
          widths: ['4%', '56%', '10%', '10%', '10%', '10%'],
          body: sec3Rows,
        },
        margin: [0, 0, 0, 4],
      },
      ...(isExperimentApplicable && submittedAssessments.some((a: any) => Object.keys(a.experimentForm?.notes || {}).length > 0)
        ? [
            { text: 'Member Notes on Experiment Questions:', fontSize: 8, bold: true, margin: [0, 4, 0, 2] },
            ...submittedAssessments.map((a: any) => ({
              text: `${a.member.name}: ${
                Object.entries(a.experimentForm?.notes || {})
                  .map(([q, n]) => `Q${q}: ${n}`)
                  .join('; ') || 'No specific notes'
              }`,
              fontSize: 7,
              margin: [0, 0, 0, 2],
            })),
          ]
        : []),

      // Section 4: Recommendation Notes
      { text: 'Section 4: Recommendation Notes', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 8, 0, 3] },
      ...submittedAssessments.map((a: any) => ({
        text: `${a.member.name}: ${a.recommendation || 'No recommendation note provided.'}`,
        fontSize: 8,
        margin: [0, 1, 0, 2],
      })),

      // Section 5: Grant Evaluation
      { text: 'Section 5: Grant Evaluation by SEC Members', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 8, 0, 3] },
      {
        table: {
          widths: ['40%', '20%', '20%', '20%'],
          body: sec5Rows,
        },
        margin: [0, 0, 0, 3],
      },
      { text: `SEC Majority: ${section5.majorityLabel}`, fontSize: 8, bold: true, color: '#1e3a8a', margin: [0, 0, 0, 8] },

      // Section 6: Grant suggested under headers
      { text: 'Section 6: Grant Suggested Under Budget Headers', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 8, 0, 3] },
      {
        table: {
          widths: ['25%', '15%', '15%', '15%', '15%', '15%'],
          body: sec6Rows,
        },
        margin: [0, 0, 0, 4],
      },
      ...(section6.hasOutOfRange
        ? [
            {
              text: 'Note: Highlighted amounts indicate member total exceeds/falls outside their recommended grant tier range.',
              fontSize: 7,
              color: '#b91c1c',
              margin: [0, 0, 0, 6],
            },
          ]
        : []),

      // Section 7: Assessed By (Signatures)
      { text: 'Section 7: Assessed By (Signatures)', fontSize: 10, bold: true, color: '#1e3a8a', margin: [0, 8, 0, 6] },
      {
        table: {
          widths: ['33%', '33%', '34%'],
          body: [
            [
              {
                stack: [
                  { text: 'Member 1 Signature', bold: true, fontSize: 8 },
                  { text: `Name: ${members[0]?.name || '-'}`, fontSize: 8 },
                  { text: `Designation: ${members[0]?.designation || 'SEC Member'}`, fontSize: 8 },
                  { text: `Date: ${submittedAssessments[0]?.assessmentDate ? new Date(submittedAssessments[0].assessmentDate).toLocaleDateString('en-IN') : '-'}`, fontSize: 8 },
                  { text: '\n\n_________________________', fontSize: 8 },
                ],
              },
              {
                stack: [
                  { text: 'Member 2 Signature', bold: true, fontSize: 8 },
                  { text: `Name: ${members[1]?.name || '-'}`, fontSize: 8 },
                  { text: `Designation: ${members[1]?.designation || 'SEC Member'}`, fontSize: 8 },
                  { text: `Date: ${submittedAssessments[1]?.assessmentDate ? new Date(submittedAssessments[1].assessmentDate).toLocaleDateString('en-IN') : '-'}`, fontSize: 8 },
                  { text: '\n\n_________________________', fontSize: 8 },
                ],
              },
              {
                stack: [
                  { text: 'Member 3 Signature', bold: true, fontSize: 8 },
                  { text: `Name: ${members[2]?.name || '-'}`, fontSize: 8 },
                  { text: `Designation: ${members[2]?.designation || 'SEC Member'}`, fontSize: 8 },
                  { text: `Date: ${submittedAssessments[2]?.assessmentDate ? new Date(submittedAssessments[2].assessmentDate).toLocaleDateString('en-IN') : '-'}`, fontSize: 8 },
                  { text: '\n\n_________________________', fontSize: 8 },
                ],
              },
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
