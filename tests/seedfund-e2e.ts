import { prisma } from '../src/lib/prisma';
import {
  getOrCreateDraft,
  acceptAgreement,
  saveDraft,
  saveBudget,
  addDocument,
  removeDocument,
  submitApplication,
  getApplication,
  listApplications,
  Forbidden,
} from '../src/lib/access';
import { AGREEMENT_VERSION } from '../src/lib/agreement';
import { DocType } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE SEED FUND PORTAL TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    passedTests++;
    console.log(`✅ PASSED: ${msg}`);
  }

  try {
    // 0. Ensure test users exist
    const startupUser = await prisma.user.findUnique({
      where: { email: 'startup1@test.com' },
      include: { startup: true },
    });
    assert(!!startupUser && !!startupUser.startup, 'User startup1@test.com exists with Startup profile');

    const secUser = await prisma.user.findFirst({ where: { role: 'SEC_MEMBER' } });
    assert(!!secUser, 'SEC Member exists');

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    assert(!!adminUser, 'Admin exists');

    // Create a secondary startup user to test authorization boundaries
    let secondaryStartup = await prisma.user.findUnique({
      where: { email: 'startup2@test.com' },
      include: { startup: true },
    });
    if (!secondaryStartup) {
      secondaryStartup = await prisma.user.create({
        data: {
          email: 'startup2@test.com',
          name: 'Second Startup Founder',
          passwordHash: await bcrypt.hash('Startup@123', 10),
          role: 'STARTUP',
          startup: {
            create: {
              teamName: 'Second Startup Team',
              enrollmentNo: 'ENR999999',
              program: 'B.Tech CSE',
              phone: '9876543210',
            },
          },
        },
        include: { startup: true },
      });
    }

    const s1Session = { userId: startupUser!.id, role: 'STARTUP' as const };
    const s2Session = { userId: secondaryStartup.id, role: 'STARTUP' as const };
    const secSession = { userId: secUser!.id, role: 'SEC_MEMBER' as const };
    const adminSession = { userId: adminUser!.id, role: 'ADMIN' as const };

    // Reset previous applications for clean test
    await prisma.application.deleteMany({
      where: { startupId: startupUser!.startup!.id },
    });
    await prisma.application.deleteMany({
      where: { startupId: secondaryStartup.startup!.id },
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Open draft & Concurrency rules
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Testing Draft Creation & Concurrency Rules ---');
    const draft1 = await getOrCreateDraft(s1Session);
    assert(draft1.status === 'DRAFT', 'Created fresh draft for startup1');

    const draftAgain = await getOrCreateDraft(s1Session);
    assert(draftAgain.id === draft1.id, 'getOrCreateDraft returns the existing open draft (one application per startup)');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Agreement Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Testing Agreement Validation ---');
    // Test name mismatch
    let nameMismatchFailed = false;
    try {
      await acceptAgreement(s1Session, draft1.id, 'Completely Wrong Name');
    } catch (e: any) {
      nameMismatchFailed = e.message === 'NAME_MISMATCH';
    }
    assert(nameMismatchFailed, 'acceptAgreement rejects mismatched applicant name');

    // Accept properly (case-insensitive)
    const acceptedApp = await acceptAgreement(
      s1Session,
      draft1.id,
      startupUser!.name.toUpperCase()
    );
    const agreementRecord = (acceptedApp.formData as any)?.agreement;
    assert(
      agreementRecord?.version === AGREEMENT_VERSION &&
      agreementRecord?.acceptedByName.toLowerCase() === startupUser!.name.toLowerCase(),
      'acceptAgreement accepts case-insensitive valid name and records version'
    );
    assert(
      agreementRecord?.acceptedByUserId === s1Session.userId && !!agreementRecord?.acceptedAt,
      'acceptedByUserId and acceptedAt are securely stamped on the server'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Budget Validation (Totals, Range, Contingency, Quotation)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Testing Budget Computations and Rules ---');
    // Save basic info: IDEATION (Range: 1000 - 5000)
    await saveDraft(s1Session, draft1.id, {
      grantType: 'IDEATION',
      formData: {
        ...(acceptedApp.formData as any),
        problemStatement: 'This is a valid problem statement solving a real-world need in agriculture.',
        proposedSolution: 'This is our proposed hardware IoT system that monitors crop health.',
        effortAndTraction: 'We conducted 25 farmer interviews and built an initial benchtop prototype.',
        hasReceivedGrantBefore: false,
      },
    });

    // Client sends intentionally wrong totals
    const wrongClientBudget = [
      {
        header: 'consumables',
        name: 'Sensors',
        vendor: 'Robu.in',
        unitCost: 500,
        qty: 3,
        total: 10, // Client forged wrong total (500 * 3 should be 1500)
        justification: 'Critical soil moisture sensors for prototype',
      },
    ];
    const budgetRes1 = await saveBudget(s1Session, draft1.id, wrongClientBudget);
    assert(
      budgetRes1.requestedTotal === 1500 && budgetRes1.items[0].total === 1500,
      'Server recomputes client-supplied totals (500 x 3 = 1500)'
    );

    // Test out-of-range budget: IDEATION is max 5000. Send 6000!
    let outOfRangeRejected = false;
    try {
      await saveBudget(s1Session, draft1.id, [
        {
          header: 'consumables',
          name: 'Expensive Component',
          vendor: 'Vendor A',
          unitCost: 6000,
          qty: 1,
          total: 6000,
          justification: 'Too expensive for Ideation',
        },
      ]);
    } catch (e: any) {
      outOfRangeRejected = e.message === 'GRANT_TOTAL_OUT_OF_RANGE';
    }
    assert(outOfRangeRejected, 'Server rejects budget exceeding grant range (6000 > 5000 max for IDEATION)');

    // Test contingency: block over 20%
    let contingencyBlocked = false;
    try {
      await saveBudget(s1Session, draft1.id, [
        {
          header: 'consumables',
          name: 'Components',
          vendor: 'Vendor A',
          unitCost: 2000,
          qty: 1,
          total: 2000,
          justification: 'Core components',
        },
        {
          header: 'contingency',
          name: 'Contingency',
          vendor: 'Sundry',
          unitCost: 600, // 600 is 30% of 2000 -> exceeds 20%
          qty: 1,
          total: 600,
          justification: 'Buffer funds',
        },
      ]);
    } catch (e: any) {
      contingencyBlocked = e.message === 'CONTINGENCY_EXCEEDS_20_PERCENT';
    }
    assert(contingencyBlocked, 'Server blocks contingency exceeding 20% of other budget headers');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Document Uploads & Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Testing Document Uploads & Constraints ---');
    // Test invalid mime type
    let invalidMimeBlocked = false;
    try {
      await addDocument(
        s1Session,
        draft1.id,
        {
          name: 'malicious.exe',
          type: 'application/x-msdownload',
          size: 1000,
          buffer: Buffer.from('malicious content'),
        },
        DocType.DECK
      );
    } catch (e: any) {
      invalidMimeBlocked = e.message === 'INVALID_MIME_TYPE';
    }
    assert(invalidMimeBlocked, 'addDocument rejects disallowed file types (.exe)');

    // Test max 5 MB limit
    let tooLargeBlocked = false;
    try {
      await addDocument(
        s1Session,
        draft1.id,
        {
          name: 'huge.pdf',
          type: 'application/pdf',
          size: 6 * 1024 * 1024,
          buffer: Buffer.alloc(6 * 1024 * 1024),
        },
        DocType.DECK
      );
    } catch (e: any) {
      tooLargeBlocked = e.message === 'FILE_TOO_LARGE';
    }
    assert(tooLargeBlocked, 'addDocument rejects files over 5 MB limit');

    // Upload valid Pitch Deck
    const deckDoc = await addDocument(
      s1Session,
      draft1.id,
      {
        name: 'PitchDeck_Final.pdf',
        type: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('%PDF-1.4 Mock Pitch Deck Content'),
      },
      DocType.DECK
    );
    assert(deckDoc.type === DocType.DECK, 'Pitch Deck uploaded successfully');

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Authorization & Data Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Testing Cross-Tenant Security & Isolation ---');
    let s2TamperBlocked = false;
    try {
      // Startup 2 attempts to view or edit Startup 1's draft
      await getApplication(s2Session, draft1.id);
    } catch (e) {
      s2TamperBlocked = e instanceof Forbidden;
    }
    assert(s2TamperBlocked, 'Second startup cannot view or query first startup application (404/Forbidden)');

    let s2DocTamperBlocked = false;
    try {
      await removeDocument(s2Session, deckDoc.id);
    } catch (e) {
      s2DocTamperBlocked = e instanceof Forbidden;
    }
    assert(s2DocTamperBlocked, 'Second startup cannot delete first startup document (404/Forbidden)');

    // SEC and Admin cannot view drafts
    let secDraftBlocked = false;
    try {
      await getApplication(secSession, draft1.id);
    } catch (e) {
      secDraftBlocked = e instanceof Forbidden;
    }
    assert(secDraftBlocked, 'SEC Member cannot view draft application (only reviewable statuses allowed)');

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Complete Valid Submission Flow
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 6. Testing Complete Valid 8-Step Submission ---');

    // Valid budget: 2500 Equipment + 1000 Consumables + 300 Contingency = 3800 (within 1000-5000 Ideation)
    // Upload Quotation for Equipment
    const quotationDoc = await addDocument(
      s1Session,
      draft1.id,
      {
        name: 'Equipment_Quotation.pdf',
        type: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 Mock Equipment Quotation'),
      },
      DocType.QUOTATION
    );

    await saveBudget(s1Session, draft1.id, [
      {
        header: 'equipment',
        name: 'Testing Rig Device',
        vendor: 'TechLabs India',
        unitCost: 2500,
        qty: 1,
        total: 2500,
        justification: 'Essential calibrated measurement rig for the prototype testing.',
      },
      {
        header: 'consumables',
        name: 'Electronic Components',
        vendor: 'Robu.in',
        unitCost: 500,
        qty: 2,
        total: 1000,
        justification: 'Sensors and microcontrollers consumed during circuit assembly.',
      },
      {
        header: 'contingency',
        name: 'Contingency Buffer',
        vendor: 'Sundry',
        unitCost: 300, // 300 is ~8.5% of 3500 -> well under 20%
        qty: 1,
        total: 300,
        justification: 'Miscellaneous cables and emergency shipping expenses.',
      },
    ]);

    // Team member KYC documents
    const memberName = startupUser!.name;
    await addDocument(
      s1Session,
      draft1.id,
      { name: 'pan.pdf', type: 'application/pdf', size: 1024, buffer: Buffer.from('PAN') },
      DocType.PAN,
      memberName
    );
    await addDocument(
      s1Session,
      draft1.id,
      { name: 'aadhaar.pdf', type: 'application/pdf', size: 1024, buffer: Buffer.from('AADHAAR') },
      DocType.AADHAAR,
      memberName
    );
    await addDocument(
      s1Session,
      draft1.id,
      { name: 'photo.jpg', type: 'image/jpeg', size: 1024, buffer: Buffer.from('PHOTO') },
      DocType.PHOTO,
      memberName
    );

    // Save full formData (10 experiment fields, self-assessment, declaration)
    const currentApp = await prisma.application.findUnique({ where: { id: draft1.id } });
    const fullFormData = {
      ...(currentApp?.formData as any),
      experiment: {
        objective: 'To test the hypothesis that IoT soil sensors reduce water usage by 30%.',
        problemStatement: 'Smallholder farmers lack precise soil hydration telemetry.',
        expectedOutcome: 'TRL-3 proof demonstrating accurate sensor readings over 14 days.',
        methodology: 'Deploy 5 calibrated sensor probes in test soil beds with varied moisture.',
        experimentalSetup: 'Test plots, microcontrollers, wireless gateway, and test multimeter.',
        dataToBeCollected: 'Soil resistivity, volumetric water content, and temperature.',
        validationCriteria: 'Sensor readings match standard lab gravimetric measurements within 5%.',
        risksAndAssumptions: 'Battery life depletion and outdoor sensor corrosion risks.',
        timeline: 'Weeks 1-2 setup, Weeks 3-4 data logging, Weeks 5-6 validation report.',
        deliverables: 'Benchtop working prototype, validation dataset, and technical report.',
      },
      selfAssessment: {
        trl: 3,
        mrl: 2,
        irl: 2,
        track: 'PROTOTYPING',
        milestones: [
          { name: 'Customer interviews', status: 'COMPLETED', remarks: '15 farmer interviews' },
          { name: 'Problem framing and validation', status: 'COMPLETED', remarks: 'Completed' },
          { name: 'MVP sketching and hypothesis', status: 'COMPLETED', remarks: 'Designed' },
        ],
      },
      teamMembers: [{ name: memberName }],
      declaration: {
        accepted: true,
        declaredByName: memberName,
        declaredAt: new Date().toISOString(),
      },
    };

    await saveDraft(s1Session, draft1.id, { formData: fullFormData });

    // Submit Application!
    await submitApplication(s1Session, draft1.id);

    const submittedApp = await prisma.application.findUnique({ where: { id: draft1.id } });
    assert(submittedApp?.status === 'SUBMITTED', 'Application status updated to SUBMITTED');
    assert(!!submittedApp?.submittedAt, 'Application submittedAt timestamp recorded');

    // Verify form is now read-only (edits blocked)
    let editBlockedAfterSubmit = false;
    try {
      await saveDraft(s1Session, draft1.id, { requestedTotal: 9999 });
    } catch (e) {
      editBlockedAfterSubmit = e instanceof Forbidden;
    }
    assert(editBlockedAfterSubmit, 'Subsequent edits are strictly blocked after submission (read-only)');

    // ─────────────────────────────────────────────────────────────
    // TEST 7: SEC and Admin Visibility
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 7. Testing SEC & Admin Visibility of Submitted Application ---');
    const secView = await getApplication(secSession, draft1.id);
    assert(secView.id === draft1.id, 'SEC Member can now access the submitted application');
    assert(secView.budgetItems.length === 3, 'SEC Member can see all itemized budget headers');
    const adminView = await getApplication(adminSession, draft1.id);
    assert(adminView.id === draft1.id, 'Admin can access the submitted application');

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Multiple Applications Concurrency Rule
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 8. Testing Startup Creating Another Application Before Decision ---');
    // Startup1 creates a 2nd application while application 1 is still SUBMITTED (pending panel decision)
    const draft2 = await getOrCreateDraft(s1Session);
    assert(draft2.id !== draft1.id, 'Startup can create a second draft while first application is pending review');
    assert(draft2.status === 'DRAFT', 'Second draft initialized in DRAFT status');

    // Fill in second application (e.g. Validation grant)
    await acceptAgreement(s1Session, draft2.id, memberName);
    await saveDraft(s1Session, draft2.id, {
      grantType: 'VALIDATION',
      formData: {
        ...fullFormData,
        problemStatement: 'Second innovative agricultural problem being tackled with IoT sensing.',
        proposedSolution: 'Second modular telemetry unit with automated alerts and solar harvesting.',
        effortAndTraction: 'Early pilot deployed across 3 regional greenhouse units with positive results.',
      },
    });

    await saveBudget(
      s1Session,
      draft2.id,
      [
        {
          header: 'equipment',
          name: 'Thermal Imaging Sensor',
          vendor: 'Teledyne FLIR',
          unitCost: 10000,
          qty: 1,
          justification: 'Thermal inspection of crop canopies.',
        },
        {
          header: 'consumables',
          name: 'Calibration Standards',
          vendor: 'Sigma Aldrich',
          unitCost: 2000,
          qty: 1,
          justification: 'Chemical standards for sensor recalibration.',
        },
        {
          header: 'contingency',
          name: 'Operational Reserve',
          unitCost: 1000,
          qty: 1,
          justification: 'Contingency for sensor spares.',
        },
      ],
      { allowPartial: false }
    );

    // Upload required documents for draft2 (Deck, Quotation for equipment, KYC)
    await addDocument(
      s1Session,
      draft2.id,
      {
        name: 'PitchDeck_V2.pdf',
        type: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('%PDF-1.4 Mock Pitch Deck Content V2'),
      },
      DocType.DECK
    );

    await addDocument(
      s1Session,
      draft2.id,
      {
        name: 'FLIR_Quotation.pdf',
        type: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 Mock Equipment Quotation V2'),
      },
      DocType.QUOTATION
    );

    await addDocument(
      s1Session,
      draft2.id,
      {
        name: 'PAN_V2.pdf',
        type: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 Mock PAN V2'),
      },
      DocType.PAN,
      memberName
    );

    await addDocument(
      s1Session,
      draft2.id,
      {
        name: 'Aadhaar_V2.pdf',
        type: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 Mock Aadhaar V2'),
      },
      DocType.AADHAAR,
      memberName
    );

    await addDocument(
      s1Session,
      draft2.id,
      {
        name: 'Photo_V2.jpg',
        type: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('Mock Photo Bytes V2'),
      },
      DocType.PHOTO,
      memberName
    );

    // Submit second application!
    await submitApplication(s1Session, draft2.id);

    const submittedApp2 = await prisma.application.findUnique({ where: { id: draft2.id } });
    assert(submittedApp2?.status === 'SUBMITTED', 'Second application successfully submitted without waiting for first decision');

    // Both applications must appear in startup's list
    const startupApps = await listApplications(s1Session);
    const hasApp1 = startupApps.some((a) => a.id === draft1.id);
    const hasApp2 = startupApps.some((a) => a.id === draft2.id);
    assert(hasApp1 && hasApp2, 'Startup can see both active submitted applications in dashboard list');

    // Both applications must appear in SEC list
    const secApps = await listApplications(secSession);
    const secHasApp1 = secApps.some((a) => a.id === draft1.id);
    const secHasApp2 = secApps.some((a) => a.id === draft2.id);
    assert(secHasApp1 && secHasApp2, 'SEC Committee sees both submitted applications for evaluation');

    // Both applications must appear in Admin list
    const adminApps = await listApplications(adminSession);
    const adminHasApp1 = adminApps.some((a) => a.id === draft1.id);
    const adminHasApp2 = adminApps.some((a) => a.id === draft2.id);
    assert(adminHasApp1 && adminHasApp2, 'Admin sees both submitted applications for management');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ Test execution encountered an error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
