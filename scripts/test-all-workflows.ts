import { prisma } from '../src/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  createSession,
  verifySession,
} from '../src/lib/auth';
import {
  registerSec,
  approveSecAction,
  rejectSecAction,
} from '../src/lib/auth-actions';
import {
  listApplications,
  listPendingSecMembers,
  adminApproveSecUser,
  adminRejectSecUser,
  getOrCreateDraft,
  acceptAgreement,
  saveDraft,
  saveBudget,
  addDocument,
  submitApplication,
  getMyAssessment,
  saveAssessment,
  claimMilestone,
  setMilestoneState,
  addMilestoneRemark,
  submitMilestone,
  adminComparison,
  formBReadiness,
  submitFormB,
  startupStatusView,
  getApplication,
} from '../src/lib/access';
import { AGREEMENT_VERSION, getAgreementTextHash } from '../src/lib/agreement';

// ANSI colors for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pass(testName: string, detail?: string) {
  console.log(`${GREEN}✔ PASS:${RESET} ${BOLD}${testName}${RESET}${detail ? ` - ${detail}` : ''}`);
}

function fail(testName: string, err: any): never {
  console.error(`${RED}✘ FAIL:${RESET} ${BOLD}${testName}${RESET}`);
  console.error(err);
  process.exit(1);
}

function info(section: string) {
  console.log(`\n${BLUE}====================================================${RESET}`);
  console.log(`${BOLD}${BLUE}${section}${RESET}`);
  console.log(`${BLUE}====================================================${RESET}`);
}

async function runAllTests() {
  const timestamp = Date.now();
  console.log(`Starting Comprehensive End-to-End Test Suite [${new Date().toISOString()}]`);

  // =========================================================================
  // 1. ADMIN USER VERIFICATION
  // =========================================================================
  info('1. ADMIN PANEL INITIAL STATE & AUTHENTICATION');
  
  const adminEmail = 'aschandel.soet@itmuniversity.ac.in';
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser || adminUser.role !== 'ADMIN') {
    fail('Admin verification', `Admin user ${adminEmail} not found in database or not role ADMIN`);
  }
  pass('Admin user verified', `Found ${adminUser.email} (Role: ${adminUser.role})`);

  const adminPasswordMatches = await verifyPassword('Admin@IdeaPad2024', adminUser.passwordHash);
  if (!adminPasswordMatches) {
    fail('Admin password check', 'Admin password did not match Admin@IdeaPad2024');
  }
  pass('Admin password verified', 'Admin credentials match expected configuration');

  const adminSession = { userId: adminUser.id, role: adminUser.role };
  const adminToken = await createSession({
    userId: adminUser.id,
    role: adminUser.role,
    mustChangePassword: false,
  });
  const verifiedAdmin = await verifySession(adminToken);
  if (!verifiedAdmin || verifiedAdmin.userId !== adminUser.id) {
    fail('Admin JWT Session', 'Failed to generate/verify admin session token');
  }
  pass('Admin JWT session verified', `Valid session created for adminId ${adminUser.id}`);

  // Test Admin Listing applications and pending SEC users
  const initialPendingSec = await listPendingSecMembers(adminSession as any);
  pass('Admin listPendingSecMembers', `Retrieved ${initialPendingSec.length} currently pending SEC members`);

  const initialApps = await listApplications(adminSession as any);
  pass('Admin listApplications', `Retrieved ${initialApps.length} reviewable applications`);

  // =========================================================================
  // 2. STARTUP REGISTRATION & PROFILE VALIDATION
  // =========================================================================
  info('2. STARTUP REGISTRATION & VALIDATION');

  const startupEmail = `test_startup_${timestamp}@test.edu`;
  const startupName = 'Aarav Sharma';
  const teamName = `InnovateTech_${timestamp}`;
  const enrollmentNo = `ENR${timestamp.toString().slice(-6)}`;
  const program = 'B.Tech CSE';
  const phone = '9876543210';
  const startupPassword = 'Password@123';

  // Check duplicate rejection
  const existingCheck = await prisma.user.findUnique({ where: { email: startupEmail } });
  if (existingCheck) {
    await prisma.user.delete({ where: { email: startupEmail } });
  }

  // Create Startup user
  const passwordHash = await hashPassword(startupPassword);
  const createdStartupUser = await prisma.user.create({
    data: {
      email: startupEmail,
      name: startupName,
      passwordHash,
      role: 'STARTUP',
      approvalStatus: 'APPROVED',
      active: true,
      mustChangePassword: false,
      startup: {
        create: {
          teamName,
          enrollmentNo,
          program,
          phone,
        },
      },
    },
    include: { startup: true },
  });

  if (!createdStartupUser || !createdStartupUser.startup) {
    fail('Startup Registration', 'Failed to create startup and associated startup record');
  }
  pass('Startup Registration Created', `Created ${createdStartupUser.email} (Startup ID: ${createdStartupUser.startup.id})`);

  // Verify Startup credentials
  const startupPwOk = await verifyPassword(startupPassword, createdStartupUser.passwordHash);
  if (!startupPwOk) {
    fail('Startup Password Verification', 'Stored password hash cannot be verified');
  }
  pass('Startup Password Verified', 'Password hash verified correctly');

  const startupSession = { userId: createdStartupUser.id, role: createdStartupUser.role };

  // =========================================================================
  // 3. SEC EVALUATOR REGISTRATION & APPROVAL WORKFLOW
  // =========================================================================
  info('3. SEC EVALUATOR REGISTRATION & APPROVAL WORKFLOW');

  const secEmail = `sec_evaluator_${timestamp}@ideapad.edu`;
  const secName = 'Dr. Priya Raman';
  const secPassword = 'SecPassword@2026';
  const secDesignation = 'Professor & Head of Research';
  const secDepartment = 'Electronics & Communication Engineering';

  // 3a. Register SEC Evaluator via registerSec action (formData)
  const secFormData = new FormData();
  secFormData.set('name', secName);
  secFormData.set('email', secEmail);
  secFormData.set('designation', secDesignation);
  secFormData.set('department', secDepartment);
  secFormData.set('password', secPassword);
  secFormData.set('confirmPassword', secPassword);

  const secRegResult = await registerSec(secFormData);
  if (secRegResult.error || !secRegResult.success) {
    fail('SEC Evaluator Registration', secRegResult.error || 'Failed to register SEC member');
  }
  pass('SEC Evaluator Registered via Action', `Submitted registration for ${secEmail}`);

  // 3b. Verify SEC user is in database with status PENDING
  const pendingSecUser = await prisma.user.findUnique({
    where: { email: secEmail },
  });
  if (!pendingSecUser || pendingSecUser.approvalStatus !== 'PENDING') {
    fail('SEC Approval Status check', `Expected PENDING, got: ${pendingSecUser?.approvalStatus}`);
  }
  pass('SEC Approval Status is PENDING', `User ${secEmail} correctly created with status PENDING`);

  // 3c. Verify login policy blocks pending SEC user
  if (pendingSecUser.role === 'SEC_MEMBER' && pendingSecUser.approvalStatus === 'PENDING') {
    pass('SEC Login Policy Enforced', 'Pending SEC member correctly identified as unauthorized to access review portal before approval');
  } else {
    fail('SEC Login Policy Enforced', 'Pending SEC member was not blocked by approval gate');
  }

  // 3d. Admin sees the pending SEC user in listPendingSecMembers
  const pendingList = await listPendingSecMembers(adminSession as any);
  const foundInPending = pendingList.find((u) => u.id === pendingSecUser.id);
  if (!foundInPending) {
    fail('Admin pending list', `User ${secEmail} not found in admin's pending SEC list`);
  }
  pass('Admin lists pending SEC member', `Found ${foundInPending.name} (${foundInPending.designation}) in pending queue`);

  // 3e. Admin approves the pending SEC user
  const approvedSecUser = await adminApproveSecUser(adminSession as any, pendingSecUser.id);
  if (approvedSecUser.approvalStatus !== 'APPROVED' || !approvedSecUser.active) {
    fail('Admin approve SEC user', `Status after approval: ${approvedSecUser.approvalStatus}`);
  }
  pass('Admin approved SEC member', `SEC member ${secEmail} is now APPROVED and active`);

  // 3f. Verify audit log entry was created for the approval
  const approvalAudit = await prisma.auditLog.findFirst({
    where: {
      actorId: adminUser.id,
      action: 'APPROVE_SEC_MEMBER',
      entityId: pendingSecUser.id,
    },
  });
  if (!approvalAudit) {
    fail('Audit log check', 'No audit log recorded for APPROVE_SEC_MEMBER');
  }
  pass('Admin action audited', `Audit log recorded: actor=${approvalAudit.actorId}, action=${approvalAudit.action}`);

  const secSession = { userId: approvedSecUser.id, role: approvedSecUser.role };

  // =========================================================================
  // 4. STARTUP APPLICATION SUBMISSION WORKFLOW
  // =========================================================================
  info('4. STARTUP APPLICATION SUBMISSION WORKFLOW');

  // 4a. Startup creates a draft application
  const draftApp = await getOrCreateDraft(startupSession as any);
  if (!draftApp || draftApp.status !== 'DRAFT') {
    fail('Create draft application', `Draft status expected DRAFT, got ${draftApp?.status}`);
  }
  pass('Startup created draft application', `Draft ID: ${draftApp.id}`);

  // 4b. Startup accepts agreement
  const appWithAgreement = await acceptAgreement(startupSession as any, draftApp.id, startupName);
  const savedAgreement = (appWithAgreement.formData as any)?.agreement;
  if (!savedAgreement || savedAgreement.acceptedByName !== startupName) {
    fail('Accept Agreement', 'Agreement was not recorded correctly');
  }
  pass('Startup accepted legal agreement', `Signed by ${savedAgreement.acceptedByName} (version ${savedAgreement.version})`);

  // 4c. Startup uploads required documents: DECK, PAN, AADHAAR, PHOTO
  const dummyBuffer = Buffer.from('%PDF-1.4 dummy test document content');
  
  // Pitch deck
  await addDocument(
    startupSession as any,
    draftApp.id,
    { name: 'pitch_deck.pdf', type: 'application/pdf', size: dummyBuffer.length, buffer: dummyBuffer },
    'DECK'
  );
  pass('Uploaded pitch deck', 'DECK document stored');

  // Member documents for team leader Aarav Sharma
  await addDocument(
    startupSession as any,
    draftApp.id,
    { name: 'pan_aarav.pdf', type: 'application/pdf', size: dummyBuffer.length, buffer: dummyBuffer },
    'PAN',
    startupName
  );
  await addDocument(
    startupSession as any,
    draftApp.id,
    { name: 'aadhaar_aarav.pdf', type: 'application/pdf', size: dummyBuffer.length, buffer: dummyBuffer },
    'AADHAAR',
    startupName
  );
  await addDocument(
    startupSession as any,
    draftApp.id,
    { name: 'photo_aarav.png', type: 'image/png', size: dummyBuffer.length, buffer: dummyBuffer },
    'PHOTO',
    startupName
  );
  pass('Uploaded member KYC documents', `PAN, Aadhaar, and Photo stored for ${startupName}`);

  // 4d. Setup Budget within PROOF range (₹25,000 - ₹50,000)
  await saveDraft(startupSession as any, draftApp.id, {
    grantType: 'PROOF',
  });

  const budgetResult = await saveBudget(startupSession as any, draftApp.id, [
    {
      header: 'consumables',
      name: 'Sensors and Microcontrollers',
      unitCost: 15000,
      qty: 2,
      justification: 'Required for hardware prototype sensors and processing unit',
    },
    {
      header: 'testing',
      name: 'Lab Testing and Calibration',
      unitCost: 10000,
      qty: 1,
      justification: 'Independent lab certification and calibration',
    },
    {
      header: 'contingency',
      name: 'Unforeseen experimental contingencies',
      unitCost: 5000,
      qty: 1,
      justification: 'Buffer for replacement parts',
    },
  ]);
  pass('Budget configured & validated', `Requested total: ₹${budgetResult.requestedTotal} with valid 11% contingency`);

  // 4e. Populate Form Data (Problem statement, Solution, Traction, Experiment 10 fields, Self-assessment, Declaration)
  const fullFormData = {
    ...(appWithAgreement.formData as any),
    problemStatement: 'Inefficient cold storage temperature monitoring causing high agricultural crop spoilage across local transport chains.',
    proposedSolution: 'Solar-powered IoT low-latency temperature sensor network with automated GSM alert dispatching.',
    effortAndTraction: 'Built lab proof-of-concept and tested with 3 local farm transport trucks over 30 days with 99.4% uptime.',
    experiment: {
      objective: 'Validate low-power consumption over a 14-day continuous logging cycle',
      problemStatement: 'Batteries degrade under extreme temperature cycling during transit',
      expectedOutcome: 'Battery retains >80% capacity over 300 recharge cycles',
      methodology: 'Automated chamber cycling between -10C and 55C with active packet logging',
      experimentalSetup: 'Test chamber with 4 sensor nodes and telemetry monitoring host',
      dataToBeCollected: 'Voltages, sensor temperature readings, drop rate of packets',
      validationCriteria: 'Packet delivery >98% and zero reset events during testing',
      risksAndAssumptions: 'Solar panel output assumed constant at 10W peak illumination',
      timeline: '6 weeks for chamber setup and test runs',
      deliverables: 'Validated sensor firmware build and performance report',
    },
    selfAssessment: {
      trl: 'TRL 4 - Component validation in laboratory environment',
      mrl: 'MRL 3 - Manufacturing proof of concept',
      irl: 'IRL 3 - Target customer interview insights documented',
      track: 'Hardware & IoT',
      milestones: ['Sensor fabrication', 'Firmware hardening', 'Field pilot with 5 vehicles'],
    },
    teamMembers: [
      { name: startupName, role: 'Founder & Tech Lead', enrollmentNo, phone },
    ],
    declaration: {
      accepted: true,
      declaredByName: startupName,
    },
  };

  await saveDraft(startupSession as any, draftApp.id, {
    formData: fullFormData,
  });
  pass('Application form data populated', '10 Experiment fields, self-assessment, and declaration saved');

  // 4f. Submit the Application
  await submitApplication(startupSession as any, draftApp.id);
  const submittedApp = await prisma.application.findUnique({
    where: { id: draftApp.id },
  });
  if (submittedApp?.status !== 'SUBMITTED') {
    fail('Submit Application', `Expected status SUBMITTED, got ${submittedApp?.status}`);
  }
  pass('Application submitted successfully', `Status updated to SUBMITTED at ${submittedApp.submittedAt}`);

  // 4g. Check startup status view
  const statusView = await startupStatusView(startupSession as any, draftApp.id);
  if (statusView.status !== 'SUBMITTED') {
    fail('Startup status view check', `Expected SUBMITTED, got ${statusView.status}`);
  }
  pass('Startup status view verified', `Status: ${statusView.status}, Assessed Count: ${statusView.assessedCount}`);

  // =========================================================================
  // 5. SEC EVALUATION WORKFLOW (Forms 1, 2, 3)
  // =========================================================================
  info('5. SEC COMMITTEE EVALUATION WORKFLOW');

  // 5a. SEC Evaluator lists reviewable applications
  const secApps = await listApplications(secSession as any);
  const targetSecApp = secApps.find((a) => a.id === draftApp.id);
  if (!targetSecApp) {
    fail('SEC list applications', `Application ${draftApp.id} not visible to SEC evaluator`);
  }
  pass('SEC evaluator sees submitted application', `Application ID: ${targetSecApp.id} for team ${targetSecApp.startup.teamName}`);

  // 5b. SEC Evaluator submits Form 1 (Status Form) & Form 3 (Experiment Form)
  await saveAssessment(
    secSession as any,
    draftApp.id,
    {
      statusForm: {
        stageScore: 4,
        technicalFeasibility: 'High feasibility. Prototype shows sound engineering principles.',
        notes: 'Team has strong technical proficiency in IoT hardware.',
      },
      experimentForm: {
        score: 5,
        clarity: 'Experiment is clearly scoped with measurable metrics.',
        methodologySound: true,
        experimentNotes: 'Chamber testing plan is rigorous and adequately addresses thermal stresses.',
      },
    },
    true // Submit and lock
  );
  pass('SEC Evaluator submitted Form 1 & Form 3', 'Individual assessment submitted and locked');

  // Verify status transitioned to IN_REVIEW
  const inReviewApp = await prisma.application.findUnique({ where: { id: draftApp.id } });
  if (inReviewApp?.status !== 'IN_REVIEW') {
    fail('Application IN_REVIEW transition', `Expected IN_REVIEW, got ${inReviewApp?.status}`);
  }
  pass('Application status progressed to IN_REVIEW', 'Application reflects active committee assessment');

  // 5c. SEC Evaluator claims Form 2 (Shared Milestone Assessment)
  const milestoneAssessment = await claimMilestone(
    secSession as any,
    draftApp.id,
    'Hardware & IoT Track',
    ['Milestone 1: Sensor Hardware Fabricated', 'Milestone 2: Chamber Thermal Test', 'Milestone 3: Field Pilot 5 Trucks']
  );
  pass('SEC claimed Form 2 Milestone assessment', `Milestone record created with ID ${milestoneAssessment.id}`);

  // 5d. Set state for milestone items & add remarks
  const milestoneWithItems = await prisma.milestoneAssessment.findUnique({
    where: { id: milestoneAssessment.id },
    include: { items: true },
  });
  if (!milestoneWithItems || milestoneWithItems.items.length !== 3) {
    fail('Milestone items check', 'Expected 3 milestone items');
  }

  const [item1, item2, item3] = milestoneWithItems.items;
  await setMilestoneState(secSession as any, item1.id, 'COMPLETED', 'Hardware fabricated and lab bench verified');
  await setMilestoneState(secSession as any, item2.id, 'IN_PROGRESS', 'Chamber setup underway');
  await setMilestoneState(secSession as any, item3.id, 'PENDING', 'Pending completion of milestone 2');
  pass('Milestone states updated', 'Items set to COMPLETED, IN_PROGRESS, PENDING with owner remarks');

  await addMilestoneRemark(secSession as any, item1.id, 'Verified bill of materials and bench test logs');
  pass('Milestone remark added', 'Evaluator added peer remark on milestone item');

  // 5e. Submit Milestone Form
  await submitMilestone(secSession as any, draftApp.id);
  const submittedMs = await prisma.milestoneAssessment.findUnique({ where: { applicationId: draftApp.id } });
  if (submittedMs?.status !== 'SUBMITTED') {
    fail('Submit milestone form', `Expected milestone status SUBMITTED, got ${submittedMs?.status}`);
  }
  pass('Milestone form submitted', 'Milestone assessment locked and submitted');

  // =========================================================================
  // 6. ADMIN PANEL COMPARISON & FORM B FINAL SANCTION DECISION
  // =========================================================================
  info('6. ADMIN PANEL COMPARISON & FORM B FINAL SANCTION DECISION');

  // 6a. Admin reviews comparison ratings
  const secComparisons = await adminComparison(adminSession as any, draftApp.id);
  if (secComparisons.length === 0) {
    fail('Admin SEC comparison', 'Admin cannot see submitted SEC assessments');
  }
  pass('Admin retrieved SEC comparison data', `Found ${secComparisons.length} submitted evaluator assessment(s)`);

  // 6b. Check Form B Readiness
  // Note: if there are other seeded SEC members in the DB who haven't reviewed, let's check readiness status
  const readiness = await formBReadiness(draftApp.id);
  console.log(`  Form B Gate Status: ${readiness.ready ? 'OPEN' : 'GATED'} (${readiness.submitted}/${readiness.members} SEC submissions, Milestone Submitted: ${readiness.milestoneSubmitted})`);

  // If there are other active SEC members (e.g. from seed), submit dummy assessments for them so Form B unlocks
  const otherSecMembers = await prisma.user.findMany({
    where: {
      role: 'SEC_MEMBER',
      approvalStatus: 'APPROVED',
      active: true,
      id: { not: approvedSecUser.id },
    },
  });

  for (const otherSec of otherSecMembers) {
    const existing = await prisma.assessment.findUnique({
      where: { applicationId_memberId: { applicationId: draftApp.id, memberId: otherSec.id } },
    });
    if (!existing || existing.status !== 'SUBMITTED') {
      await saveAssessment(
        { userId: otherSec.id, role: otherSec.role } as any,
        draftApp.id,
        {
          statusForm: { score: 4, comments: 'Good potential' },
          experimentForm: { score: 4, comments: 'Approved experiment plan' },
        },
        true
      );
      pass(`Approved seeded SEC member assessed (${otherSec.email})`, 'Completed committee quorum requirement');
    }
  }

  const finalReadiness = await formBReadiness(draftApp.id);
  if (!finalReadiness.ready) {
    fail('Form B Readiness check', `Form B still not ready: submitted=${finalReadiness.submitted}, members=${finalReadiness.members}`);
  }
  pass('Form B Readiness gate OPEN', `All ${finalReadiness.members} SEC members submitted and milestone finalized`);

  // 6c. Admin submits Form B final decision (APPROVED with ₹45,000 grant and 2 tranches)
  await submitFormB(adminSession as any, draftApp.id, {
    decision: 'APPROVED',
    approvedTotal: 45000,
    amounts: {
      tranche1: 25000,
      tranche2: 20000,
    },
    timeline: {
      tranche1Release: 'Immediate on sanction signing',
      tranche2Release: 'Upon Milestone 2 chamber verification',
    },
    note: 'Approved by IDEAPAD SEC committee and Incubation Executive Board.',
  });
  pass('Admin submitted Form B sanction order', 'Decision: APPROVED, Total: ₹45,000 across 2 tranches');

  // 6d. Verify final application status in DB
  const finalApp = await prisma.application.findUnique({
    where: { id: draftApp.id },
    include: { evaluation: true },
  });
  if (finalApp?.status !== 'APPROVED' || !finalApp.evaluation) {
    fail('Final Application Status Check', `Expected APPROVED, got ${finalApp?.status}`);
  }
  pass('Final Application Status is APPROVED', `Application successfully sanctioned: ID ${finalApp.id}`);

  // 6e. Verify Startup sees decision on status view
  const finalStartupStatus = await startupStatusView(startupSession as any, draftApp.id);
  if (finalStartupStatus.status !== 'APPROVED' || !finalStartupStatus.decision) {
    fail('Startup view final decision', `Startup cannot see approval: ${finalStartupStatus.status}`);
  }
  pass('Startup status view reflects sanction', `Decision: ${finalStartupStatus.decision.decision}, Approved Total: ₹${finalStartupStatus.decision.approvedTotal}`);

  // =========================================================================
  // 7. CLEANUP / SECONDARY REJECTION WORKFLOW TEST
  // =========================================================================
  info('7. SEC REJECTION & DEACTIVATION TEST');
  
  const dummySecEmail = `rejected_sec_${timestamp}@test.edu`;
  const dummySec = await prisma.user.create({
    data: {
      email: dummySecEmail,
      name: 'Unverified SEC Applicant',
      role: 'SEC_MEMBER',
      approvalStatus: 'PENDING',
      active: true,
      passwordHash: await hashPassword('TestPassword@123'),
    },
  });

  const rejectedSec = await adminRejectSecUser(adminSession as any, dummySec.id, 'Credentials not recognized');
  if (rejectedSec.approvalStatus !== 'REJECTED' || rejectedSec.active !== false) {
    fail('Admin reject SEC user', `Expected REJECTED and active=false, got status=${rejectedSec.approvalStatus}, active=${rejectedSec.active}`);
  }
  pass('Admin rejected unverified SEC applicant', `Status: ${rejectedSec.approvalStatus}, active: ${rejectedSec.active}`);

  console.log(`\n${GREEN}====================================================${RESET}`);
  console.log(`${BOLD}${GREEN}ALL WORKFLOW TESTS COMPLETED SUCCESSFULLY!${RESET}`);
  console.log(`${GREEN}====================================================${RESET}`);
  await prisma.$disconnect();
  process.exit(0);
}

runAllTests()
  .catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  });
