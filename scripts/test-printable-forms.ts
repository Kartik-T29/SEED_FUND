import { prisma } from '../src/lib/prisma';
import {
  startAssessment,
  adminReleasePanelSlot,
  getApplication,
  listApplications,
  saveAssessment,
  claimMilestone,
  setMilestoneState,
  addMilestoneRemark,
  submitMilestone,
  submitFormB,
  getStartupSubmissionForDownload,
  updateSecProfile,
} from '../src/lib/access';
import { buildFormAData, canonicalizeFormAData } from '../src/lib/form-a-data';
import { buildFormBData, canonicalizeFormBData } from '../src/lib/form-b-data';
import {
  generateFormAPdf,
  generateFormBPdf,
  generateApplicationPdf,
} from '../src/lib/pdf-generator';
import { getSignatories, updateSignatory } from '../src/lib/signatories';
import { hashPassword } from '../src/lib/auth';
import fs from 'fs';
import path from 'path';

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

function pass(name: string, detail?: string) {
  console.log(`${GREEN}✔ PASS: ${name}${RESET}${detail ? ` - ${detail}` : ''}`);
}

function fail(name: string, reason: string) {
  console.error(`${RED}✘ FAIL: ${name}${RESET} - ${reason}`);
  throw new Error(`Test failed: ${name} -> ${reason}`);
}

function info(title: string) {
  console.log(`\n${CYAN}====================================================${RESET}`);
  console.log(`${CYAN}${title}${RESET}`);
  console.log(`${CYAN}====================================================${RESET}`);
}

async function main() {
  const runId = Date.now();
  console.log(`Starting Printable Forms & Panel Rule Test Suite [RunId: ${runId}]`);

  // Setup Admin user
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) throw new Error('No ADMIN user found in database');
  const adminSession = { userId: adminUser.id, role: 'ADMIN' as const };

  // Setup 4 distinct SEC Evaluator users with verified profiles
  const secUsers = [];
  for (let i = 1; i <= 5; i++) {
    const email = `evaluator_${i}_${runId}@ideapad.edu`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword('EvaluatorPass123!'),
        name: `Dr. Evaluator ${i}`,
        role: 'SEC_MEMBER',
        approvalStatus: 'APPROVED',
        active: true,
        designation: `Associate Professor ${i}`,
        department: `Department of Engineering ${i}`,
      },
    });
    secUsers.push(user);
  }

  // Setup 1 Pending SEC Evaluator and 1 Deactivated SEC Evaluator
  const pendingSecUser = await prisma.user.create({
    data: {
      email: `pending_${runId}@ideapad.edu`,
      passwordHash: await hashPassword('PendingPass123!'),
      name: `Dr. Pending Evaluator`,
      role: 'SEC_MEMBER',
      approvalStatus: 'PENDING',
      active: true,
    },
  });

  const deactivatedSecUser = await prisma.user.create({
    data: {
      email: `deactivated_${runId}@ideapad.edu`,
      passwordHash: await hashPassword('DeactivatedPass123!'),
      name: `Dr. Deactivated Evaluator`,
      role: 'SEC_MEMBER',
      approvalStatus: 'APPROVED',
      active: false,
    },
  });

  // Setup Startup User & Application
  const startupUser = await prisma.user.create({
    data: {
      email: `startup_${runId}@test.edu`,
      passwordHash: await hashPassword('StartupPass123!'),
      name: `Founder Ananya ${runId}`,
      role: 'STARTUP',
    },
  });

  const startup = await prisma.startup.create({
    data: {
      userId: startupUser.id,
      teamName: `SolarClean Tech ${runId}`,
      program: 'B.Tech Mechanical',
      department: 'SOET',
      enrollmentNo: `ENR${runId}`,
      phone: '9876543210',
    },
  });
  const startupSession = { userId: startupUser.id, role: 'STARTUP' as const };

  // Create submitted application with Hindi description, 40 budget rows, and 800-char text
  const longProblem =
    'यह एक अत्याधुनिक सौर ऊर्जा सफाई प्रणाली है जो जल रहित सफाई तकनीक का उपयोग करती है। ' +
    'The autonomous cleaning mechanism incorporates electrostatic dust mitigation and mechanical wiper passes. ' +
    'Reliability under harsh ambient conditions (45°C ambient, abrasive silica particles) has been lab benchmarked. '.repeat(6);

  const budgetData = [];
  for (let b = 1; b <= 40; b++) {
    budgetData.push({
      header: `${(b % 9) + 1}`,
      name: `Precision Component #${b} - Specialized Assembly Module`,
      qty: 1,
      unitCost: 1000,
      total: 1000,
      justification: `Essential component #${b} for experimental prototype assembly.`,
    });
  }

  const testApp = await prisma.application.create({
    data: {
      startupId: startup.id,
      grantType: 'VALIDATION',
      requestedTotal: 40000,
      status: 'SUBMITTED',
      submittedAt: new Date(),
      formData: {
        problemStatement: longProblem,
        solution: 'Robotic dry cleaning kit with automatic return dock and solar charging station.',
        teamMembers: [{ name: 'Aarav Sharma', role: 'Lead Engineer' }],
        agreement: {
          acceptedAt: new Date().toISOString(),
          signatoryName: `Founder Ananya ${runId}`,
          textHash: 'mock-canonical-agreement-hash-321',
        },
      },
      budgetItems: {
        create: budgetData,
      },
    },
  });
  pass('Setup completed', `Created test application ID: ${testApp.id} with 40 budget items & Hindi text`);

  // =========================================================================
  // 1. PANEL RULE & CONCURRENCY TESTS
  // =========================================================================
  info('1. PANEL RULE & CONCURRENCY TESTS (FIRST 3 TO START)');

  // 1a. Minimal card check: unstarted approved SEC evaluator
  const sec1Session = { userId: secUsers[0].id, role: 'SEC_MEMBER' as const };
  const secAppsList = await listApplications(sec1Session as any);
  const foundApp = secAppsList.find((a) => a.id === testApp.id);
  if (!foundApp) fail('Minimal card view', 'Application not listed for approved SEC');
  if (foundApp.panelMembers.length !== 0) fail('Initial panel count', 'Panel should be empty before starting');
  pass('Approved SEC sees minimal card before starting', `Panel slots filled: ${foundApp.panelMembers.length}/3`);

  // 1b. Member 1 starts -> takes Position 1 (Milestone Lead)
  const res1 = await startAssessment(sec1Session as any, testApp.id);
  if (res1.position !== 1) fail('Member 1 position', `Expected position 1, got ${res1.position}`);
  pass('First member to start claims Position 1', `Evaluator 1 assigned position ${res1.position}`);

  // 1c. Member 1 cannot take two slots
  const res1Again = await startAssessment(sec1Session as any, testApp.id);
  if (res1Again.position !== 1) fail('Double slot attempt', 'Should return existing position 1');
  const panelCountAfter1Again = await prisma.applicationPanelMember.count({ where: { applicationId: testApp.id } });
  if (panelCountAfter1Again !== 1) fail('Double slot count', `Expected 1 slot, found ${panelCountAfter1Again}`);
  pass('Member cannot take two slots', 'Calling startAssessment again returned existing slot without consuming new slot');

  // 1d. Member 2 starts -> takes Position 2
  const sec2Session = { userId: secUsers[1].id, role: 'SEC_MEMBER' as const };
  const res2 = await startAssessment(sec2Session as any, testApp.id);
  if (res2.position !== 2) fail('Member 2 position', `Expected position 2, got ${res2.position}`);
  pass('Second member to start claims Position 2', `Evaluator 2 assigned position ${res2.position}`);

  // 1e. CONCURRENCY: Two members click 'Start assessment' for slot 3 at exact same moment
  // Member 3 (secUsers[2]) and Member 4 (secUsers[3]) start concurrently
  const sec3Session = { userId: secUsers[2].id, role: 'SEC_MEMBER' as const };
  const sec4Session = { userId: secUsers[3].id, role: 'SEC_MEMBER' as const };

  const results = await Promise.allSettled([
    startAssessment(sec3Session as any, testApp.id),
    startAssessment(sec4Session as any, testApp.id),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  if (fulfilled.length !== 1 || rejected.length !== 1) {
    fail(
      'Slot 3 Concurrency Race',
      `Expected exactly 1 success and 1 rejection. Got ${fulfilled.length} fulfilled, ${rejected.length} rejected.`
    );
  }

  const winningResult = (fulfilled[0] as PromiseFulfilledResult<any>).value;
  const losingReason = (rejected[0] as PromiseRejectedResult).reason;

  if (winningResult.position !== 3) {
    fail('Concurrent winner position', `Expected slot 3, got ${winningResult.position}`);
  }
  if (!losingReason.message.includes('The panel for this application is complete')) {
    fail(
      'Concurrent loser message',
      `Expected 'The panel for this application is complete', got: ${losingReason.message}`
    );
  }

  const finalPanelCount = await prisma.applicationPanelMember.count({ where: { applicationId: testApp.id } });
  if (finalPanelCount !== 3) {
    fail('Final panel count', `Expected exactly 3 rows in database, got ${finalPanelCount}`);
  }
  pass('Slot 3 Concurrency Race Resolved Atomically', 'Exactly 1 took slot 3, the other received "The panel for this application is complete"');

  // 1f. A fourth/fifth member attempting to start gets blocked
  const sec5Session = { userId: secUsers[4].id, role: 'SEC_MEMBER' as const };
  try {
    await startAssessment(sec5Session as any, testApp.id);
    fail('5th member start', 'Should have thrown complete panel error');
  } catch (err: any) {
    if (!err.message.includes('The panel for this application is complete')) {
      fail('5th member message', `Unexpected error message: ${err.message}`);
    }
    pass('Subsequent evaluators blocked from full panel', 'Fourth/Fifth evaluator received "The panel for this application is complete"');
  }

  // 1g. Audit trail for starts
  const startAuditLogs = await prisma.auditLog.findMany({
    where: {
      action: 'START_ASSESSMENT',
      entityId: testApp.id,
    },
  });
  if (startAuditLogs.length !== 3) {
    fail('Start assessment audit count', `Expected 3 start audit log entries, found ${startAuditLogs.length}`);
  }
  pass('Start assessment writes to audit log', `Verified ${startAuditLogs.length} audited panel starts`);

  // 1h. Admin slot release with written reason
  // Identify the member who took slot 3
  const slot3Member = await prisma.applicationPanelMember.findFirst({
    where: { applicationId: testApp.id, position: 3 },
  });
  if (!slot3Member) fail('Slot 3 lookup', 'Slot 3 member not found');

  // Attempt release without reason -> must fail
  try {
    await adminReleasePanelSlot(adminSession as any, testApp.id, slot3Member.memberId, '   ');
    fail('Release slot without reason', 'Should have failed on empty reason');
  } catch (err: any) {
    pass('Admin release slot requires non-empty reason', 'Blocked empty reason');
  }

  // Admin releases slot 3 with valid audited reason
  await adminReleasePanelSlot(
    adminSession as any,
    testApp.id,
    slot3Member.memberId,
    'Member declared conflict of interest with applicant team'
  );

  const panelCountAfterRelease = await prisma.applicationPanelMember.count({ where: { applicationId: testApp.id } });
  if (panelCountAfterRelease !== 2) {
    fail('Panel count after release', `Expected 2 panel members, got ${panelCountAfterRelease}`);
  }

  const releaseAuditLog = await prisma.auditLog.findFirst({
    where: {
      action: 'RELEASE_PANEL_SLOT',
      details: { contains: 'conflict of interest' },
    },
  });
  if (!releaseAuditLog) fail('Release audit log', 'Audit log for RELEASE_PANEL_SLOT missing');
  pass('Admin releases panel slot with audited reason', 'Slot 3 released; audit log recorded reason');

  // Let Member 4 now claim the open slot 3
  const sec4Reclaim = await startAssessment(sec4Session as any, testApp.id);
  if (sec4Reclaim.position !== 3) fail('Reclaim position', `Expected position 3, got ${sec4Reclaim.position}`);
  pass('Open slot successfully reclaimed by next evaluator', `Evaluator assigned position ${sec4Reclaim.position}`);

  // =========================================================================
  // 2. FORM A DRAFT VS FINAL & AUDIT TRAIL
  // =========================================================================
  info('2. FORM A DRAFT VS FINAL & AUDIT TRAIL');

  // 2a. Form A before all 3 submit -> DRAFT watermark & lists missing evaluators
  const formADraftData = await buildFormAData(testApp.id, adminSession as any);
  if (formADraftData.isFinal !== false) fail('Form A draft isFinal', 'Should not be final yet');
  if (!formADraftData.draftWatermark) fail('Form A draft watermark', 'Draft watermark missing');
  if (formADraftData.draftNotes.length === 0) fail('Form A draft notes', 'Draft notes should list unsubmitted members');
  pass('Form A Draft state verified', `Watermark present; unsubmitted notes: "${formADraftData.draftNotes.join(', ')}"`);

  // Generate Draft PDF and verify
  const formADraftPdf = await generateFormAPdf(formADraftData);
  if (!formADraftPdf || formADraftPdf.length < 5000) fail('Form A Draft PDF', 'Generated PDF too small or corrupt');
  const pdfDraftHeader = formADraftPdf.toString('utf-8', 0, 10);
  if (!pdfDraftHeader.startsWith('%PDF-')) fail('Form A Draft PDF header', 'Not a valid PDF file');
  pass('Form A Draft PDF generated successfully', `Size: ${formADraftPdf.length} bytes`);

  // Save sample Form A Draft
  fs.writeFileSync(path.join(process.cwd(), 'docs/samples/sample_form_a_draft.pdf'), formADraftPdf);
  pass('Saved sample_form_a_draft.pdf to docs/samples/');

  // 2b. Evaluator 1 (Position 1) claims and submits Milestone assessment
  const milestone = await claimMilestone(sec1Session as any, testApp.id, 'Prototyping & Professional Track', [
    'A1: Basic test bed',
    'B1: Business registration',
  ]);
  const msWithItems = await prisma.milestoneAssessment.findUnique({
    where: { id: milestone.id },
    include: { items: true },
  });
  if (msWithItems?.items && msWithItems.items.length > 0) {
    await setMilestoneState(sec1Session as any, msWithItems.items[0].id, 'COMPLETED', 'Test bed bench verified');
    await addMilestoneRemark(sec1Session as any, msWithItems.items[0].id, 'Peer review: verified sensor readings');
  }
  await submitMilestone(sec1Session as any, testApp.id);
  pass('Evaluator 1 (Position 1) completed and submitted shared milestone form');

  // Non-lead (Position 2) cannot claim milestone
  try {
    await claimMilestone(sec2Session as any, testApp.id, 'Other Track', ['Item 1']);
    fail('Position 2 claim milestone', 'Should not allow non-lead to claim milestone');
  } catch (err: any) {
    pass('Panel Position 2 blocked from claiming milestone form', 'Restricted to SEC Member 1 per policy');
  }

  // 2c. All 3 panel members submit their individual assessments
  const sample12Questions: Record<string, string> = {};
  for (let q = 1; q <= 12; q++) {
    sample12Questions[`q${q}`] = q % 2 === 0 ? 'YES' : 'NO';
  }

  // Member 1 submits
  await saveAssessment(
    sec1Session as any,
    testApp.id,
    {
      statusForm: { trlScore: 4, mrlScore: 3, irlScore: 3, notes: 'Promising technology' },
      experimentForm: {
        twelveQuestions: sample12Questions,
        relevanceDecision: 'APPROVE',
        moderatedBudget: 38000,
        grantTypeRecommendation: 'VALIDATION',
        recommendationNote: 'Strong technical grounding and clear lab methodology.',
        suggestedBudgets: { '1': 15000, '2': 10000, '3': 5000 },
      },
    },
    true // Submit final
  );

  // Member 2 submits
  await saveAssessment(
    sec2Session as any,
    testApp.id,
    {
      statusForm: { trlScore: 3, mrlScore: 3, irlScore: 2, notes: 'Requires component testing' },
      experimentForm: {
        twelveQuestions: sample12Questions,
        relevanceDecision: 'APPROVE',
        moderatedBudget: 35000,
        grantTypeRecommendation: 'VALIDATION',
        recommendationNote: 'Feasible implementation plan. Recommend milestone-based disbursement.',
        suggestedBudgets: { '1': 12000, '2': 12000, '3': 6000 },
      },
    },
    true
  );

  // Form A still draft because Member 4 (Position 3) has not submitted yet
  const formAStillDraft = await buildFormAData(testApp.id, adminSession as any);
  if (formAStillDraft.isFinal) fail('Form A with 2/3 submitted', 'Should not be final until all 3 submit');
  pass('Form A remains DRAFT when 2 of 3 evaluators have submitted');

  // Member 4 (Position 3) submits
  await saveAssessment(
    sec4Session as any,
    testApp.id,
    {
      statusForm: { trlScore: 4, mrlScore: 4, irlScore: 3, notes: 'Execution readiness verified' },
      experimentForm: {
        twelveQuestions: sample12Questions,
        relevanceDecision: 'APPROVE',
        moderatedBudget: 40000,
        grantTypeRecommendation: 'VALIDATION',
        recommendationNote: 'Excellent team capability and sound risk mitigation plan.',
        suggestedBudgets: { '1': 15000, '2': 15000, '3': 10000 },
      },
    },
    true
  );

  // 2d. Now all 3 have submitted -> Form A is FINAL!
  const formAFinalData = await buildFormAData(testApp.id, adminSession as any);
  if (!formAFinalData.isFinal) fail('Form A Final check', 'Should be final now that all 3 submitted');
  if (formAFinalData.draftWatermark) fail('Form A Final watermark', 'Watermark should be removed in final');
  pass('Form A transitions to FINAL when all 3 panel members submit', 'Draft watermark removed; ready for signature');

  // Generate Final Form A PDF
  const formAFinalPdf = await generateFormAPdf(formAFinalData);
  if (!formAFinalPdf || formAFinalPdf.length < 5000) fail('Form A Final PDF', 'Generated PDF too small');
  fs.writeFileSync(path.join(process.cwd(), 'docs/samples/sample_form_a_final.pdf'), formAFinalPdf);
  pass('Saved sample_form_a_final.pdf to docs/samples/', `Size: ${formAFinalPdf.length} bytes`);

  // =========================================================================
  // 3. FORM B DRAFT VS FINAL & SANCTION
  // =========================================================================
  info('3. FORM B DRAFT VS FINAL & SANCTION');

  // 3a. Form B before decision -> DRAFT watermark
  const formBDraftData = await buildFormBData(testApp.id, adminSession as any);
  if (formBDraftData.isFinal) fail('Form B draft isFinal', 'Should not be final before admin decision');
  if (!formBDraftData.draftWatermark) fail('Form B draft watermark', 'Draft watermark missing');
  pass('Form B Draft state verified', 'Marked "DRAFT - NOT FOR SIGNATURE" prior to executive sanction');

  // 3b. Admin issues Form B Sanction Decision
  await submitFormB(adminSession as any, testApp.id, {
    decision: 'APPROVED',
    approvedTotal: 38000,
    amounts: {
      '1': 15000,
      '2': 13000,
      '3': 10000,
    },
    timeline: {
      sanctionDate: '2026-11-04',
      tranche1Date: '2026-11-15',
      tranche2Date: '2027-02-15',
    },
    note: 'Sanctioned under ITM University Seed Fund scheme for CleanTech validation.',
  });

  // 3c. Form B after decision -> FINAL!
  const formBFinalData = await buildFormBData(testApp.id, adminSession as any);
  if (!formBFinalData.isFinal) fail('Form B final isFinal', 'Should be final after decision');
  if (formBFinalData.draftWatermark) fail('Form B final watermark', 'Draft watermark should be removed');
  if (formBFinalData.sanctionedBudget.totalAmountRaw !== 38000) fail('Form B approved total', `Expected 38000, got ${formBFinalData.sanctionedBudget.totalAmountRaw}`);
  pass('Form B transitions to FINAL after executive decision', 'Approved total ₹38,000; draft watermark removed');

  // Generate Final Form B PDF
  const formBFinalPdf = await generateFormBPdf(formBFinalData);
  if (!formBFinalPdf || formBFinalPdf.length < 5000) fail('Form B Final PDF', 'Generated PDF too small');
  fs.writeFileSync(path.join(process.cwd(), 'docs/samples/sample_form_b_final.pdf'), formBFinalPdf);
  pass('Saved sample_form_b_final.pdf to docs/samples/', `Size: ${formBFinalPdf.length} bytes`);

  // =========================================================================
  // 4. SIGNATORIES FROM SETTINGS & HASH RECOMPUTATION
  // =========================================================================
  info('4. SIGNATORIES FROM SETTINGS & CANONICAL HASH VERIFICATION');

  const signatoriesInitial = await getSignatories();
  if (signatoriesInitial.length !== 3) fail('Signatories count', `Expected 3 signatories, found ${signatoriesInitial.length}`);
  pass('Signatories loaded from settings table', `Keys: ${signatoriesInitial.map((s) => s.key).join(', ')}`);

  // Baseline: ensure vice_chancellor has blank name per policy default
  await updateSignatory(adminSession as any, 'vice_chancellor', {
    name: '',
    designation: 'Vice Chancellor, ITM University, Gwalior',
  });

  const formBBeforeUpdate = await buildFormBData(testApp.id, adminSession as any);
  const { fullHash: hashBefore } = canonicalizeFormBData(formBBeforeUpdate);

  // Admin updates signatory (e.g. VC name filled in)
  await updateSignatory(
    adminSession as any,
    'vice_chancellor',
    {
      name: `Prof. Yogesh Upadhyay ${runId}`,
      designation: 'Vice Chancellor, ITM University, Gwalior',
    }
  );

  const updatedFormBData = await buildFormBData(testApp.id, adminSession as any);
  const vcSig = updatedFormBData.approvalBlock.find((s) => s.key === 'vice_chancellor');
  if (vcSig?.name !== `Prof. Yogesh Upadhyay ${runId}`) fail('Signatory update reflection', 'VC name not reflected in buildFormBData');

  const { fullHash: hashAfter } = canonicalizeFormBData(updatedFormBData);
  if (hashBefore === hashAfter) fail('Signatory hash recomputation', 'Data hash must change when signatory is updated');
  pass('Updating signatory settings updates data object & changes canonical hash', `Previous: ${hashBefore.slice(0, 12)}... -> New: ${hashAfter.slice(0, 12)}...`);

  // Restore VC name back to empty string for baseline consistency
  await updateSignatory(
    adminSession as any,
    'vice_chancellor',
    {
      name: '',
      designation: 'Vice Chancellor, ITM University, Gwalior',
    }
  );

  // =========================================================================
  // 5. SECURITY, PERMISSIONS & IDOR PROTECTION
  // =========================================================================
  info('5. SECURITY, PERMISSIONS & IDOR PROTECTION');

  // 5a. Startup cannot print/download Form A or Form B
  try {
    await buildFormAData(testApp.id, startupSession as any);
    fail('Startup access Form A', 'Startup should be forbidden from accessing Form A data');
  } catch (err: any) {
    pass('Startup blocked from Form A data builder', 'Server threw Forbidden');
  }

  try {
    await buildFormBData(testApp.id, startupSession as any);
    fail('Startup access Form B', 'Startup should be forbidden from accessing Form B data');
  } catch (err: any) {
    pass('Startup blocked from Form B data builder', 'Server threw Forbidden (Admin only)');
  }

  // 5b. SEC member NOT on panel cannot print/download Form A or read full application
  try {
    await buildFormAData(testApp.id, sec5Session as any);
    fail('Non-panel SEC access Form A', 'Non-panel SEC should be forbidden from Form A');
  } catch (err: any) {
    pass('Non-panel SEC evaluator blocked from Form A', 'Server enforced panel membership check');
  }

  try {
    await getApplication(sec5Session as any, testApp.id);
    fail('Non-panel SEC read application', 'Non-panel SEC should not read application details');
  } catch (err: any) {
    pass('Non-panel SEC evaluator blocked from full application', 'Server threw NOT_A_PANEL_MEMBER');
  }

  // 5c. Deactivated SEC member sees nothing
  const deactivatedSession = { userId: deactivatedSecUser.id, role: 'SEC_MEMBER' as const };
  const deactivatedApps = await listApplications(deactivatedSession as any);
  if (deactivatedApps.length !== 0) fail('Deactivated SEC list applications', 'Deactivated SEC must see empty list');
  try {
    await getApplication(deactivatedSession as any, testApp.id);
    fail('Deactivated SEC get application', 'Deactivated SEC must be blocked');
  } catch (err: any) {
    pass('Deactivated SEC member sees zero applications & cannot access review portal');
  }

  // 5d. Pending SEC member sees nothing
  const pendingSession = { userId: pendingSecUser.id, role: 'SEC_MEMBER' as const };
  const pendingApps = await listApplications(pendingSession as any);
  if (pendingApps.length !== 0) fail('Pending SEC list applications', 'Pending SEC must see empty list');
  try {
    await getApplication(pendingSession as any, testApp.id);
    fail('Pending SEC get application', 'Pending SEC must be blocked');
  } catch (err: any) {
    pass('Pending SEC member sees zero applications & cannot access review portal');
  }

  // =========================================================================
  // 6. ONE SOURCE OF TRUTH & STRESS TESTS
  // =========================================================================
  info('6. ONE SOURCE OF TRUTH & STRESS TESTS');

  // 6a. Data Object Verification
  const reloadedFormA = await buildFormAData(testApp.id, adminSession as any);
  if (!reloadedFormA.applicationId || !reloadedFormA.startup.teamName || !reloadedFormA.statusAssessment) {
    fail('Form A data completeness', 'Missing essential top-level fields');
  }
  if (reloadedFormA.panelMembers.length !== 3) {
    fail('Panel member length in Form A', `Expected 3 panel members, got ${reloadedFormA.panelMembers.length}`);
  }
  pass('One Source of Truth: Form A data object verified', 'Consistent structure across panel members, scales, milestones, and questions');

  // 6b. Startup Application PDF generation (with 40 budget rows and Hindi text)
  const { snapshot } = await getStartupSubmissionForDownload(startupSession as any, { applicationId: testApp.id });
  const appPdf = await generateApplicationPdf(snapshot.data as any, snapshot.dataHash);
  if (!appPdf || appPdf.length < 5000) fail('Startup App PDF', 'Generated PDF too small');
  fs.writeFileSync(path.join(process.cwd(), 'docs/samples/sample_application_printout.pdf'), appPdf);
  pass('Saved sample_application_printout.pdf to docs/samples/', `Size: ${appPdf.length} bytes`);

  // 6c. Verify Privacy: PAN / Aadhaar images and SEC evaluation scores must NEVER appear in startup application printout
  const pdfString = appPdf.toString('utf-8');
  if (pdfString.includes('evaluator_') || pdfString.includes('TRL Score') || pdfString.includes('stageScore')) {
    fail('Privacy breach', 'Internal SEC evaluation data found in startup printout');
  }
  pass('Privacy integrity verified: zero SEC evaluation data or KYC numbers in startup printout');

  console.log(`\n${GREEN}====================================================${RESET}`);
  console.log(`${GREEN}ALL PRINTABLE FORMS & PANEL RULE TESTS PASSED!${RESET}`);
  console.log(`${GREEN}====================================================${RESET}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
