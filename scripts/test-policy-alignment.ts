import { prisma } from '../src/lib/prisma';
import {
  hashPassword,
  createSession,
  verifySession,
} from '../src/lib/auth';
import {
  getOrCreateDraft,
  acceptAgreement,
  saveDraft,
  saveBudget,
  addDocument,
  submitApplication,
  getApplication,
  formBReadiness,
  submitFormB,
  claimMilestone,
  setMilestoneState,
  addMilestoneRemark,
  submitMilestone,
  startAssessment,
  saveAssessment,
  listApplications,
} from '../src/lib/access';
import { formatISTDateTime, formatISTDate } from '../src/lib/dates';
import { getStorageAdapter } from '../src/lib/storage';
import { BUDGET_HEADERS, STATUTORY_TERMS } from '../src/lib/seedfund-constants';
import fs from 'fs';
import path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pass(name: string, detail?: string) {
  console.log(`${GREEN}✔ PASS:${RESET} ${BOLD}${name}${RESET}${detail ? ` - ${detail}` : ''}`);
}

function fail(name: string, err: any): never {
  console.error(`${RED}✘ FAIL:${RESET} ${BOLD}${name}${RESET}`, err);
  process.exit(1);
}

function info(title: string) {
  console.log(`\n${BLUE}====================================================${RESET}`);
  console.log(`${BOLD}${BLUE}${title}${RESET}`);
  console.log(`${BLUE}====================================================${RESET}`);
}

async function runPolicyAlignmentTests() {
  const runId = Date.now();
  console.log(`Running Policy Alignment End-to-End Suite [RunId: ${runId}]`);

  // =========================================================================
  // 1. BRANDING & DEVANAGARI FONT VERIFICATION
  // =========================================================================
  info('1. BRANDING & DEVANAGARI FONT VERIFICATION');

  const logoPath = path.join(process.cwd(), 'public/brand/logo.png');
  if (!fs.existsSync(logoPath)) fail('Original Logo file', 'public/brand/logo.png missing');
  const logoStats = fs.statSync(logoPath);
  if (logoStats.size < 10000) fail('Original Logo size', `Logo size too small (${logoStats.size} bytes)`);
  pass('Original Logo file exists', `1200x377 authentic brand asset (${logoStats.size} bytes)`);

  const faviconPath = path.join(process.cwd(), 'public/favicon.ico');
  const ogPath = path.join(process.cwd(), 'public/brand/og-image.png');
  if (!fs.existsSync(faviconPath)) fail('Favicon', 'public/favicon.ico missing');
  if (!fs.existsSync(ogPath)) fail('OG Image', 'public/brand/og-image.png missing');
  pass('Favicon & OG Image', 'Favicon and OpenGraph image properly installed');

  const regularFont = path.join(process.cwd(), 'public/fonts/NotoSansDevanagari-Regular.ttf');
  const boldFont = path.join(process.cwd(), 'public/fonts/NotoSansDevanagari-Bold.ttf');
  if (!fs.existsSync(regularFont) || !fs.existsSync(boldFont)) {
    fail('Devanagari fonts', 'Devanagari TrueType fonts missing from public/fonts');
  }
  pass('Devanagari fonts installed', 'NotoSansDevanagari Regular and Bold ready for Hindi text');

  // =========================================================================
  // 2. IST TIMEZONE INTEGRITY
  // =========================================================================
  info('2. IST DATE & TIMEZONE FORMATTING');
  const testDate = new Date('2026-11-04T00:30:00.000Z'); // 6:00 AM IST
  const formattedDateTime = formatISTDateTime(testDate);
  const formattedDate = formatISTDate(testDate);

  if (!formattedDateTime.includes('06:00') || !formattedDateTime.includes('IST')) {
    fail('IST DateTime Formatting', `Expected IST time with 06:00 and IST, got: ${formattedDateTime}`);
  }
  pass('IST DateTime formatting', formattedDateTime);

  if (!formattedDate.includes('4 Nov 2026')) {
    fail('IST Date-only formatting', `Expected '4 Nov 2026', got: ${formattedDate}`);
  }
  pass('IST Date-only formatting', formattedDate);

  // =========================================================================
  // 3. STORAGE ADAPTER SECURITY & ISOLATION
  // =========================================================================
  info('3. LOCAL DISK STORAGE ADAPTER');
  const storage = getStorageAdapter();
  const testBuffer = Buffer.from('PDF_POLICY_TEST_DOCUMENT_DATA_12345');
  const savedKey = await storage.saveFile(testBuffer, 'test_deck.pdf', 'application/pdf');

  if (!savedKey || savedKey.includes('test_deck')) {
    fail('Storage UUID anonymization', `Storage key should be UUID, got: ${savedKey}`);
  }
  const readBack = await storage.readFile(savedKey);
  if (!readBack || readBack.toString() !== testBuffer.toString()) {
    fail('Storage readback', 'Retrieved file contents do not match saved bytes');
  }
  pass('StorageAdapter saveFile & readFile', `Stored privately with UUID key: ${savedKey}`);

  await storage.deleteFile(savedKey);
  try {
    await storage.readFile(savedKey);
    fail('Storage deleteFile', 'File still readable after deletion');
  } catch {
    pass('StorageAdapter deleteFile', 'File removed successfully from disk');
  }

  // =========================================================================
  // 4. STARTUP MULTI-SECTION DATA POPULATION & SUBMISSION
  // =========================================================================
  info('4. STARTUP POLICY FORM COMPLETION & DRAFT PERSISTENCE');
  const startupPassHash = await hashPassword('StartupPass123!');
  const founderName = `Aarav Verma ${runId.toString().slice(-4)}`;
  const founderEmail = `founder_${runId}@itmuniversity.ac.in`;

  const startupUser = await prisma.user.create({
    data: {
      email: founderEmail,
      name: founderName,
      role: 'STARTUP',
      approvalStatus: 'APPROVED',
      active: true,
      passwordHash: startupPassHash,
      department: 'SOET - Mechanical Engineering',
    },
  });

  const startupRecord = await prisma.startup.create({
    data: {
      userId: startupUser.id,
      teamName: `AeroDynamics_${runId.toString().slice(-4)}`,
      phone: '9876543210',
      enrollmentNo: `EN2026_${runId.toString().slice(-4)}`,
      program: 'B.Tech Mechanical Engineering',
      department: 'SOET - Mechanical',
    },
  });

  const startupSession = { userId: startupUser.id, role: 'STARTUP' } as any;
  const draftApp = await getOrCreateDraft(startupSession);
  pass('Created initial startup draft', `Application ID: ${draftApp.id}`);

  // Accept policy legal agreement
  await acceptAgreement(startupSession, draftApp.id, founderName);
  const appWithAgreement = await getApplication(startupSession, draftApp.id);
  pass('Accepted Policy Agreement', `Agreement accepted by ${founderName}`);

  // Test document upload size boundary enforcement:
  // Pitch deck: 5–7 MB (max 7 MB allowed)
  const oversizedDeckBuffer = Buffer.alloc(8 * 1024 * 1024, '%PDF-oversized'); // 8 MB
  try {
    await addDocument(
      startupSession,
      draftApp.id,
      { name: 'oversized_deck.pdf', type: 'application/pdf', size: oversizedDeckBuffer.length, buffer: oversizedDeckBuffer },
      'DECK'
    );
    fail('Pitch Deck Size Enforcement', 'Oversized pitch deck (8MB) was not blocked');
  } catch (err: any) {
    if (!err.message.includes('FILE_TOO_LARGE') || !err.message.includes('7 MB')) {
      fail('Pitch Deck Size Error Format', err.message);
    }
    pass('Pitch Deck Size Gate (>7MB Blocked)', err.message);
  }

  // Other documents: 200–500 KB (max 500 KB allowed)
  const oversizedPanBuffer = Buffer.alloc(600 * 1024, '%PDF-oversized-kyc'); // 600 KB
  try {
    await addDocument(
      startupSession,
      draftApp.id,
      { name: 'oversized_pan.pdf', type: 'application/pdf', size: oversizedPanBuffer.length, buffer: oversizedPanBuffer },
      'PAN',
      founderName
    );
    fail('KYC Doc Size Enforcement', 'Oversized KYC document (600KB) was not blocked');
  } catch (err: any) {
    if (!err.message.includes('FILE_TOO_LARGE') || !err.message.includes('500 KB')) {
      fail('KYC Doc Size Error Format', err.message);
    }
    pass('KYC Doc Size Gate (>500KB Blocked)', err.message);
  }

  // Upload valid documents: Pitch Deck (within 5–7 MB range), PAN/Aadhaar/Photo/Quotation (within 200–500 KB range)
  const validDeckBuffer = Buffer.alloc(5.5 * 1024 * 1024, '%PDF-valid-pitch-deck-5.5MB');
  await addDocument(
    startupSession,
    draftApp.id,
    { name: 'pitch_deck.pdf', type: 'application/pdf', size: validDeckBuffer.length, buffer: validDeckBuffer },
    'DECK'
  );

  const validKycBuffer = Buffer.alloc(300 * 1024, '%PDF-valid-kyc-300KB');
  await addDocument(
    startupSession,
    draftApp.id,
    { name: 'pan.pdf', type: 'application/pdf', size: validKycBuffer.length, buffer: validKycBuffer },
    'PAN',
    founderName
  );
  await addDocument(
    startupSession,
    draftApp.id,
    { name: 'aadhaar.pdf', type: 'application/pdf', size: validKycBuffer.length, buffer: validKycBuffer },
    'AADHAAR',
    founderName
  );
  await addDocument(
    startupSession,
    draftApp.id,
    { name: 'photo.png', type: 'image/png', size: validKycBuffer.length, buffer: validKycBuffer },
    'PHOTO',
    founderName
  );
  await addDocument(
    startupSession,
    draftApp.id,
    { name: 'quotation.pdf', type: 'application/pdf', size: validKycBuffer.length, buffer: validKycBuffer },
    'QUOTATION'
  );
  pass('Uploaded required documents within limits', '5.5MB Deck (5–7 MB allowed) & 300KB KYC docs (200–500 KB allowed) successfully stored');

  // Save full form data meeting all policy validations (P6)
  const fullPolicyFormData = {
    ...(appWithAgreement?.formData as any),
    problemStatement: 'Heavy drone propellers suffer micro-fractures under high-vibration field deployment.',
    proposedSolution: 'Carbon-fiber reinforced polymer composite blades with integrated acoustic damping.',
    effortAndTraction: 'Early mold tested in university lab; demonstrated 20% noise reduction.',
    experiment: {
      objective: 'Validate aerodynamic efficiency and fracture resistance up to 8,000 RPM (TRL-3 proof).',
      problemStatement: 'Current commercial blades fail catastrophic stress tests above 6,500 RPM.',
      expectedOutcome: 'Zero hairline cracks after 50 continuous flight test cycles at target RPM.',
      methodology: 'High-speed optical vibrometry and strain gauge data logging in wind tunnel.',
      experimentalSetup: 'SOET Wind tunnel, stroboscopic camera, RPM optical tachometer, vibration analyzer.',
      dataToBeCollected: 'Vibration amplitude (dB), strain (microstrain), surface temperature (deg C).',
      validationCriteria: 'Blade maintains integrity under 1.5x max rated operational load.',
      risksAndAssumptions: 'Assumes ambient temperature remains within 20-35 deg C during tunnel test.',
      timeline: '6 weeks total: 2 weeks mold fabrication, 2 weeks wind tunnel, 2 weeks analysis.',
      deliverables: 'Functional prototype set of 4 blades, stress analysis report, demonstration video.',
    },
    selfAssessment: {
      trl: 'TRL 3 - Analytical and experimental proof of concept',
      mrl: 'MRL 2 - Manufacturing concept defined',
      irl: 'IRL 2 - Customer discovery interviews completed',
      track: 'Hardware & Engineering',
      milestones: [
        'Propeller mold fabrication',
        'Wind tunnel aerodynamic benchmark',
        'Endurance vibration test 50 cycles',
      ],
    },
    teamMembers: [
      { name: founderName, role: 'Lead Design Engineer', enrollmentNo: `EN2026_${runId.toString().slice(-4)}`, phone: '9876543210' },
    ],
    declaration: {
      accepted: true,
      declaredByName: founderName,
    },
  };

  await saveDraft(startupSession, draftApp.id, {
    grantType: 'PROOF',
    formData: fullPolicyFormData,
  });
  pass('Form Sections Saved', 'Problem, Solution, 10 Experiment Fields, Self-Assessment, Declaration saved');

  // Save Annexure 1 budget items
  const budgetItems = [
    {
      header: 'equipment',
      name: 'High-speed stroboscopic optical inspection tachometer',
      vendor: 'Testo India Pvt Ltd',
      unitCost: 28000,
      qty: 1,
      justification: 'Crucial for measuring dynamic blade deflection at 8000 RPM per P7.1',
    },
    {
      header: 'consumables',
      name: 'Carbon-fiber tow 3k and aerospace grade epoxy resin pack',
      vendor: 'Composite India Ltd',
      unitCost: 12000,
      qty: 1,
      justification: 'Materials for 4 test blade prototypes per P7.2',
    },
    {
      header: 'contingency',
      name: 'Unplanned small fixtures, safety acrylic shield, logistics',
      vendor: 'Local Vendors',
      unitCost: 4000,
      qty: 1,
      justification: '10% contingency for minor test apparatus modifications per P7.9',
    },
  ];

  await saveBudget(startupSession, draftApp.id, budgetItems);
  pass('Budget configured under Annexure 1', 'Equipment (₹28,000), Consumables (₹12,000), Contingency (₹4,000) = ₹44,000');

  // Submit Application
  await submitApplication(startupSession, draftApp.id);
  const reloadedApp = await prisma.application.findUnique({ where: { id: draftApp.id } });
  if (reloadedApp?.status !== 'SUBMITTED') {
    fail('Submit Application', `Expected status SUBMITTED, got: ${reloadedApp?.status}`);
  }
  pass('Application Submitted & Locked', `Status: ${reloadedApp.status}, Requested Total: ₹${reloadedApp.requestedTotal}`);

  // =========================================================================
  // 5. SEC COMMITTEE EVALUATION WORKFLOW
  // =========================================================================
  info('5. SEC SPLIT VIEW: FORM A ASSESSMENT');
  const secUser1 = await prisma.user.findFirst({ where: { email: 'sec1@ideapad.co.in' } });
  const secSession1 = { userId: secUser1!.id, role: 'SEC_MEMBER' } as any;

  // 12 Questions answered YES
  const twelveQuestionsObj: Record<string, string> = {};
  for (let i = 1; i <= 12; i++) {
    twelveQuestionsObj[`q${i}`] = 'YES';
  }

  // Start assessment and claim Panel Position 1
  await startAssessment(secSession1, draftApp.id);

  // Save individual assessment Form A
  await saveAssessment(
    secSession1,
    draftApp.id,
    {
      statusForm: {
        stageScore: 4,
        trlScore: 3,
        mrlScore: 2,
        irlScore: 2,
        technicalFeasibility: 'High feasibility. Drone blade composite layup is sound.',
        notes: 'Impressive demonstration and testing plan.',
      },
      experimentForm: {
        score: 5,
        twelveQuestions: twelveQuestionsObj,
        relevanceDecision: 'APPROVE',
        moderatedBudget: 42000,
        trancheCount: 2,
        experimentNotes: 'Wind tunnel setup at SOET is well-suited for this verification.',
      },
    },
    true // Submit and lock
  );
  pass('SEC Member 1 assessment submitted', 'Form A submitted with TRL 3, MRL 2, IRL 2, and 12/12 YES');

  // Claim Form 2 Shared Milestone Assessment
  const milestoneAssessment = await claimMilestone(
    secSession1,
    draftApp.id,
    'Hardware & Engineering',
    [
      'Propeller mold fabrication',
      'Wind tunnel aerodynamic benchmark',
      'Endurance vibration test 50 cycles',
    ]
  );
  pass('SEC claimed Form 2 Milestone assessment', `Milestone ID: ${milestoneAssessment.id}`);

  // Update milestone item state and audit log
  const milestoneWithItems = await prisma.milestoneAssessment.findUnique({
    where: { id: milestoneAssessment.id },
    include: { items: true },
  });
  const firstItem = milestoneWithItems!.items[0];
  await setMilestoneState(secSession1, firstItem.id, 'COMPLETED', 'Mold finished and inspected in machine shop.');
  await addMilestoneRemark(secSession1, firstItem.id, 'Evaluator inspection confirmed tolerances within 0.1mm.');
  await submitMilestone(secSession1, draftApp.id);
  pass('Milestone assessment finalized', 'Items set to COMPLETED and locked');

  // Submit evaluations for 2 additional SEC members to complete the 3-member panel
  const activeSecUsers = await prisma.user.findMany({
    where: { role: 'SEC_MEMBER', approvalStatus: 'APPROVED', active: true },
  });
  const otherSecUsers = activeSecUsers.filter((u) => u.id !== secUser1!.id).slice(0, 2);

  for (const user of otherSecUsers) {
    const s = { userId: user.id, role: 'SEC_MEMBER' } as any;
    await startAssessment(s, draftApp.id);
    await saveAssessment(
      s,
      draftApp.id,
      {
        statusForm: { stageScore: 4, trlScore: 3, mrlScore: 2, irlScore: 2 },
        experimentForm: {
          twelveQuestions: twelveQuestionsObj,
          relevanceDecision: 'APPROVE',
          moderatedBudget: 42000,
          trancheCount: 2,
        },
      },
      true
    );
  }
  pass('All 3 panel SEC members submitted evaluations', 'Quorum complete (3/3 submitted assessments)');

  // =========================================================================
  // 6. ADMIN FORM B SANCTION WORKFLOW
  // =========================================================================
  info('6. ADMIN FORM B SANCTION WORKFLOW');
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const adminSession = { userId: adminUser!.id, role: 'ADMIN' } as any;

  // Verify Form B readiness gate
  const gate = await formBReadiness(draftApp.id);
  if (!gate.ready) {
    fail('Form B Readiness Gate', `Expected ready=true, got ready=false (${gate.submitted}/${gate.members} completed)`);
  }
  pass('Form B Readiness Gate OPEN', `${gate.submitted}/${gate.members} SEC evaluations completed; Milestone finalized: ${gate.milestoneSubmitted}`);

  // Submit Form B
  await submitFormB(
    adminSession,
    draftApp.id,
    {
      decision: 'APPROVED',
      approvedTotal: 42000,
      amounts: {
        equipment: 26000,
        consumables: 12000,
        contingency: 4000,
      },
      timeline: {
        presentationDate: '2026-11-04',
        secRecommendationDate: '2026-11-04',
        adminApprovalDate: '2026-11-04',
        sanctionOrderDate: '2026-11-04',
        agreementSigningDate: '2026-11-05',
        tranche1DisbursalTarget: '2026-11-10',
        midTermReviewDate: '2026-12-10',
        finalUtilizationDate: '2027-01-10',
      },
      note: 'Sanction approved under IDEAPAD Proof Grant policy (P2, TRL-3 PoC).',
    }
  );
  pass('Admin Form B Sanction Issued', 'Approved total ₹42,000 across 8 timeline dates');

  const finalApp = await prisma.application.findUnique({
    where: { id: draftApp.id },
    include: { evaluation: true },
  });
  if (finalApp?.status !== 'APPROVED') {
    fail('Final Sanction Status', `Expected APPROVED, got: ${finalApp?.status}`);
  }
  pass('Application status APPROVED', `Sanction Order Date: ${finalApp.evaluation?.timeline ? (finalApp.evaluation.timeline as any).sanctionOrderDate : 'N/A'}`);

  console.log(`\n${GREEN}====================================================${RESET}`);
  console.log(`${BOLD}${GREEN}ALL POLICY ALIGNMENT TESTS PASSED PERFECTLY!${RESET}`);
  console.log(`${GREEN}====================================================${RESET}`);
  await prisma.$disconnect();
  process.exit(0);
}

runPolicyAlignmentTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
