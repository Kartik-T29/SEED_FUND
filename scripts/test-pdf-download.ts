import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';
import { createSession } from '../src/lib/auth';
import { generateApplicationPdf } from '../src/lib/pdf-generator';
import { buildApplicationData, canonicalizeApplicationData } from '../src/lib/application-data';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

async function parsePdf(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  // @ts-ignore
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  await parser.destroy();
  return {
    text: textResult.text || '',
    numpages: textResult.pages?.length || 1,
  };
}

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

async function main() {
  console.log(`\n${BLUE}====================================================${RESET}`);
  console.log(`${BOLD}${BLUE}STARTUP PDF APPLICATION DOWNLOAD TEST SUITE${RESET}`);
  console.log(`${BLUE}====================================================\n${RESET}`);

  // 1. Setup Test Users
  console.log(`${BOLD}1. Setting up Test Users and Seeded Database State...${RESET}`);

  // Startup A
  let userA = await prisma.user.findFirst({ where: { email: 'startup_test_a@ideapad.local' } });
  if (!userA) {
    userA = await prisma.user.create({
      data: {
        email: 'startup_test_a@ideapad.local',
        name: 'Aarav Sharma',
        passwordHash: 'dummy',
        role: 'STARTUP',
        mustChangePassword: false,
      },
    });
  }

  let startupA = await prisma.startup.findUnique({ where: { userId: userA.id } });
  if (!startupA) {
    startupA = await prisma.startup.create({
      data: {
        userId: userA.id,
        teamName: 'AeroDynamics AI',
        enrollmentNo: 'ENR-2026-001',
        program: 'B.Tech Mechanical',
        department: 'Engineering',
        phone: '+91 9876543210',
      },
    });
  }

  // Startup B
  let userB = await prisma.user.findFirst({ where: { email: 'startup_test_b@ideapad.local' } });
  if (!userB) {
    userB = await prisma.user.create({
      data: {
        email: 'startup_test_b@ideapad.local',
        name: 'Rohan Verma',
        passwordHash: 'dummy',
        role: 'STARTUP',
        mustChangePassword: false,
      },
    });
  }

  let startupB = await prisma.startup.findUnique({ where: { userId: userB.id } });
  if (!startupB) {
    startupB = await prisma.startup.create({
      data: {
        userId: userB.id,
        teamName: 'BioTech Innovations',
        enrollmentNo: 'ENR-2026-002',
        program: 'M.Tech Biotechnology',
        department: 'Life Sciences',
        phone: '+91 9876543211',
      },
    });
  }

  // Admin user
  let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin_test@ideapad.local',
        name: 'Admin User',
        passwordHash: 'dummy',
        role: 'ADMIN',
        mustChangePassword: false,
      },
    });
  }

  // SEC member
  let secUser = await prisma.user.findFirst({ where: { role: 'SEC_MEMBER' } });
  if (!secUser) {
    secUser = await prisma.user.create({
      data: {
        email: 'sec_test@ideapad.local',
        name: 'SEC Reviewer',
        passwordHash: 'dummy',
        role: 'SEC_MEMBER',
        mustChangePassword: false,
      },
    });
  }

  const tokenA = await createSession({ userId: userA.id, role: 'STARTUP', mustChangePassword: false });
  const tokenB = await createSession({ userId: userB.id, role: 'STARTUP', mustChangePassword: false });
  const tokenAdmin = await createSession({ userId: adminUser.id, role: 'ADMIN', mustChangePassword: false });
  const tokenSEC = await createSession({ userId: secUser.id, role: 'SEC_MEMBER', mustChangePassword: false });

  pass('Setup', 'Test users and session tokens ready');

  // ---------------------------------------------------------
  // Test 1: Unauthenticated request
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/dashboard/application/download`, {
      redirect: 'manual',
    });
    // Either redirected to /login by middleware or returns 401
    if (res.status === 401 || res.status === 307 || res.status === 302) {
      pass('Unauthenticated Access Control', `Blocked with status ${res.status}`);
    } else {
      fail('Unauthenticated Access Control', `Expected 401/307, got ${res.status}`);
    }
  } catch (e) {
    fail('Unauthenticated Access Control', e);
  }

  // ---------------------------------------------------------
  // Test 2: Role-based Access Control (Admin / SEC cannot access startup download route)
  // ---------------------------------------------------------
  try {
    const resAdmin = await fetch(`${BASE_URL}/dashboard/application/download`, {
      headers: { Cookie: `ideapad_session=${tokenAdmin}` },
    });
    if (resAdmin.status === 403) {
      pass('Role-based Access: Admin blocked', 'HTTP 403 Forbidden received');
    } else {
      fail('Role-based Access: Admin blocked', `Expected 403, got ${resAdmin.status}`);
    }

    const resSEC = await fetch(`${BASE_URL}/dashboard/application/download`, {
      headers: { Cookie: `ideapad_session=${tokenSEC}` },
    });
    if (resSEC.status === 403) {
      pass('Role-based Access: SEC blocked', 'HTTP 403 Forbidden received');
    } else {
      fail('Role-based Access: SEC blocked', `Expected 403, got ${resSEC.status}`);
    }
  } catch (e) {
    fail('Role-based Access Control', e);
  }

  // ---------------------------------------------------------
  // Test 3: Draft Application cannot be downloaded
  // ---------------------------------------------------------
  try {
    // Clean existing applications for startup B to test fresh draft
    await prisma.applicationSnapshot.deleteMany({
      where: { application: { startupId: startupB.id } },
    });
    await prisma.application.deleteMany({ where: { startupId: startupB.id } });

    const draftAppB = await prisma.application.create({
      data: {
        startupId: startupB.id,
        status: 'DRAFT',
        grantType: 'VALIDATION',
        requestedTotal: 50000,
        formData: { problem: 'Draft problem statement' },
      },
    });

    const resDraft = await fetch(`${BASE_URL}/dashboard/application/download`, {
      headers: { Cookie: `ideapad_session=${tokenB}` },
    });

    if (resDraft.status === 403) {
      const data = await resDraft.json();
      if (data.error === 'You can download your application after you submit it.') {
        pass('Draft Download Blocked', 'HTTP 403 with exact error message');
      } else {
        fail('Draft Download Blocked', `Expected exact message, got: ${data.error}`);
      }
    } else {
      fail('Draft Download Blocked', `Expected 403, got ${resDraft.status}`);
    }
  } catch (e) {
    fail('Draft Download Blocked', e);
  }

  // ---------------------------------------------------------
  // Test 4: Submitted Application Download, Headers & Content
  // ---------------------------------------------------------
  let submittedAppA: any;
  try {
    // Reset applications for Startup A
    await prisma.applicationSnapshot.deleteMany({
      where: { application: { startupId: startupA.id } },
    });
    await prisma.application.deleteMany({ where: { startupId: startupA.id } });

    // Seed comprehensive submitted application for Startup A
    submittedAppA = await prisma.application.create({
      data: {
        startupId: startupA.id,
        status: 'SUBMITTED',
        grantType: 'VALIDATION',
        version: 1,
        requestedTotal: 175000,
        submittedAt: new Date(),
        formData: {
          problemStatement: 'Farmers lack low-cost crop monitoring tools in remote areas.',
          proposedSolution: 'Autonomous AI-powered drone delivering multispectral soil and crop analysis.',
          effortAndTraction: 'Field tested with 25 local farmers covering 150 acres.',
          teamMembers: [
            { name: 'Aarav Sharma', role: 'Founder & Hardware Lead', department: 'Mechanical' },
            { name: 'Neha Gupta', role: 'AI Software Lead', department: 'Computer Science' },
          ],
          experiment: {
            objective: 'Multi-spectral imaging increases early blight detection by 40%.',
            problemStatement: 'Early crop blight detection without expensive lab infrastructure.',
            expectedOutcome: 'TRL-3 validation with 95% classification accuracy.',
            methodology: 'Weekly automated flight scans across 5 test farms.',
            experimentalSetup: 'Specialized 4-band spectral sensor on hexacopter.',
            dataToBeCollected: 'Normalized Difference Vegetation Index (NDVI) images.',
            validationCriteria: '40% earlier detection vs manual inspection.',
            risksAndAssumptions: 'Inclement weather mitigation via automated return-to-base.',
            timeline: '6 months duration across 3 validation milestones.',
            deliverables: 'Calibrated multispectral sensor unit and pilot report.',
          },
          justifications: {
            '1': 'Specialized camera is the primary sensing instrument.',
            '2': 'Propellers and batteries wear out during field test flights.',
            '3': 'Fuel and transit for field validation across test sites.',
          },
          assessments: {
            trl: 4,
            mrl: 3,
            irl: 4,
          },
          milestones: [
            { name: 'Sensor Assembly & Calibration', targetMonth: 2, deliverable: 'Bench test report' },
            { name: 'Field Testing on 25 Farms', targetMonth: 4, deliverable: 'Pilot data validation' },
            { name: 'Final Prototype Evaluation', targetMonth: 6, deliverable: 'Fully functional unit' },
          ],
          declaration: {
            accepted: true,
            declaredByName: 'Aarav Sharma',
            declaredAt: new Date().toISOString(),
          },
          agreement: {
            version: '1.0',
            textHash: 'abc123def456789012345678',
            acceptedByName: 'Aarav Sharma',
            acceptedAt: new Date().toISOString(),
          },
        },
        budgetItems: {
          create: [
            { header: 'EQUIPMENT', name: 'Multispectral 4-band Sensor', vendor: 'Sentera Tech', unitCost: 120000, qty: 1, total: 120000 },
            { header: 'CONSUMABLES', name: 'Carbon Fiber Propellers (Set of 4)', vendor: 'RoboIndia', unitCost: 5000, qty: 4, total: 20000 },
            { header: 'TRAVEL', name: 'Field transit to test farms', vendor: 'Local Taxi / Fuel', unitCost: 15000, qty: 1, total: 15000 },
            { header: 'CONTINGENCY', name: 'Unforeseen testing spares', vendor: 'Various', unitCost: 20000, qty: 1, total: 20000 },
          ],
        },
        documents: {
          create: [
            { type: 'PAN', path: 'documents/pan_123.pdf', memberLabel: 'Aarav Sharma' },
            { type: 'AADHAAR', path: 'documents/aadhaar_123.pdf', memberLabel: 'Aarav Sharma' },
            { type: 'QUOTATION', path: 'documents/quote_sensor.pdf' },
          ],
        },
      },
      include: {
        startup: { include: { user: true } },
        budgetItems: true,
        documents: true,
      },
    });

    // Create Snapshot for v1
    const canonicalV1 = buildApplicationData(submittedAppA);
    const { fullHash: fullHashV1 } = canonicalizeApplicationData(canonicalV1);
    await prisma.applicationSnapshot.create({
      data: {
        applicationId: submittedAppA.id,
        version: 1,
        data: canonicalV1 as any,
        dataHash: fullHashV1,
        reconstructed: false,
      },
    });

    const res = await fetch(`${BASE_URL}/dashboard/application/download`, {
      headers: { Cookie: `ideapad_session=${tokenA}` },
    });

    if (res.status !== 200) {
      fail('Submitted Application Download', `Status: ${res.status} ${await res.text()}`);
    }

    // Verify Headers
    const contentType = res.headers.get('content-type');
    const contentDisposition = res.headers.get('content-disposition');
    const cacheControl = res.headers.get('cache-control');

    if (!contentType?.includes('application/pdf')) {
      fail('Headers: Content-Type', `Expected application/pdf, got ${contentType}`);
    }
    if (!contentDisposition?.includes('attachment') || !contentDisposition?.includes('IDEAPAD-Seed-Application-AeroDynamics-AI')) {
      fail('Headers: Content-Disposition', `Expected attachment with filename, got ${contentDisposition}`);
    }
    if (!cacheControl?.includes('no-store')) {
      fail('Headers: Cache-Control', `Expected no-store, got ${cacheControl}`);
    }
    pass('Headers Verification', 'Content-Type, Content-Disposition, Cache-Control (no-store) all conform');

    // Parse PDF binary
    const arrayBuffer = await res.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const parsedPdf = await parsePdf(pdfBuffer);

    if (parsedPdf.numpages < 1) {
      fail('PDF Parsing', 'Expected at least 1 page');
    }
    pass('PDF Generation & Parsing', `Valid PDF with ${parsedPdf.numpages} pages generated (${pdfBuffer.length} bytes)`);

    const pdfText = parsedPdf.text;

    // Check required policy sections and contents
    const expectedStrings = [
      'IDEAPAD SEED FUND APPLICATION',
      'AeroDynamics AI',
      'ENR-2026-001',
      'Validation Grant',
      'Farmers lack low-cost crop monitoring tools',
      'Autonomous AI-powered drone',
      'Multi-spectral imaging increases early blight detection',
      'Multispectral 4-band Sensor',
      'Sentera Tech',
      '120000.00',
      'Aarav Sharma',
      'FINAL DECLARATION & ELECTRONIC SIGNATURE',
      fullHashV1.slice(0, 12), // 12-char data hash in footer
    ];

    for (const str of expectedStrings) {
      if (!pdfText.includes(str)) {
        fail('PDF Content Verification', `Missing expected string in PDF: "${str}"`);
      }
    }
    pass('PDF Policy Content Verification', 'All policy sections, budget rows, declarations and 12-char hash verified');
  } catch (e) {
    fail('Submitted Application Download', e);
  }

  // ---------------------------------------------------------
  // Test 5: Privacy Checks (NO PAN, Aadhaar, Evaluation notes/scores)
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/dashboard/application/download`, {
      headers: { Cookie: `ideapad_session=${tokenA}` },
    });
    const buffer = Buffer.from(await res.arrayBuffer());
    const parsed = await parsePdf(buffer);
    const text = parsed.text;

    // Verify PAN / Aadhaar data privacy:
    // Internal file paths (e.g. documents/pan_123.pdf) must never be embedded
    if (text.includes('documents/')) {
      fail('Privacy: Raw Document Paths', 'Internal storage paths should not be exposed');
    }

    // PAN regex: 5 uppercase letters, 4 digits, 1 uppercase letter
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]/;
    if (panRegex.test(text)) {
      fail('Privacy: PAN Number Leak', 'PAN number pattern detected in PDF text');
    }

    // Aadhaar regex: 12 digits
    const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/;
    if (aadhaarRegex.test(text)) {
      fail('Privacy: Aadhaar Number Leak', 'Aadhaar number pattern detected in PDF text');
    }

    // Check for evaluation terms that should never appear in a startup submission PDF
    const forbiddenEvaluationTerms = [
      'SEC Evaluation',
      'Panel Member',
      'Form A',
      'Form B',
      'Evaluator Score',
      'Approved Amount',
      'Committee Comments',
      'Assessed Total',
    ];

    for (const term of forbiddenEvaluationTerms) {
      if (text.includes(term)) {
        fail('Privacy: SEC Evaluation Leak', `Forbidden term "${term}" found in startup PDF`);
      }
    }
    pass('Privacy Verification', 'No internal file paths, PAN/Aadhaar images, or SEC evaluation scores present in PDF');
  } catch (e) {
    fail('Privacy Verification', e);
  }

  // ---------------------------------------------------------
  // Test 6: IDOR Protection & Session Parameter Immunity
  // ---------------------------------------------------------
  try {
    // Startup B tries to download Startup A's application by supplying ?id=<submittedAppA.id> or ?applicationId=...
    const resIdor = await fetch(`${BASE_URL}/dashboard/application/download?id=${submittedAppA.id}&applicationId=${submittedAppA.id}`, {
      headers: { Cookie: `ideapad_session=${tokenB}` },
    });

    // Startup B has only a draft (from Test 3), so it should return 403 (Draft not downloadable)
    // and NEVER return Startup A's application!
    if (resIdor.status === 403) {
      const data = await resIdor.json();
      if (data.error === 'You can download your application after you submit it.') {
        pass('IDOR Protection: Parameter Tampering', 'Client application ID ignored, Startup B prevented from accessing Startup A');
      } else {
        fail('IDOR Protection: Parameter Tampering', `Unexpected response: ${JSON.stringify(data)}`);
      }
    } else {
      fail('IDOR Protection: Parameter Tampering', `Expected 403 for Startup B, got ${resIdor.status}`);
    }
  } catch (e) {
    fail('IDOR Protection', e);
  }

  // ---------------------------------------------------------
  // Test 7: Multi-Version Revisions & Snapshot Immutability
  // ---------------------------------------------------------
  try {
    let userRev = await prisma.user.findFirst({ where: { email: 'startup_rev@ideapad.local' } });
    if (!userRev) {
      userRev = await prisma.user.create({
        data: {
          email: 'startup_rev@ideapad.local',
          name: 'Priya Patel',
          passwordHash: 'dummy',
          role: 'STARTUP',
          mustChangePassword: false,
        },
      });
    }

    let startupRev = await prisma.startup.findUnique({ where: { userId: userRev.id } });
    if (!startupRev) {
      startupRev = await prisma.startup.create({
        data: {
          userId: userRev.id,
          teamName: 'SolarFlow Systems',
          enrollmentNo: 'ENR-2026-REV',
          program: 'M.Tech Energy',
          department: 'Renewables',
          phone: '+91 9876543299',
        },
      });
    }

    const tokenRev = await createSession({ userId: userRev.id, role: 'STARTUP', mustChangePassword: false });

    // Clean previous app
    await prisma.applicationSnapshot.deleteMany({
      where: { application: { startupId: startupRev.id } },
    });
    await prisma.application.deleteMany({ where: { startupId: startupRev.id } });

    // Create v1 for startupRev
    const revAppV1 = await prisma.application.create({
      data: {
        startupId: startupRev.id,
        version: 1,
        status: 'SUPERSEDED',
        grantType: 'VALIDATION',
        requestedTotal: 120000,
        submittedAt: new Date(Date.now() - 3600000),
        formData: {
          problemStatement: 'Solar panels lose 30% efficiency due to dust in arid climates.',
          proposedSolution: 'Electrostatic dust removal subsystem.',
          effortAndTraction: 'Pilot installation on 10 panels.',
          declaration: { accepted: true, declaredByName: 'Priya Patel', declaredAt: new Date().toISOString() },
          agreement: { version: '1.0', textHash: 'revhash123', acceptedByName: 'Priya Patel', acceptedAt: new Date().toISOString() },
        },
        budgetItems: {
          create: [
            { header: 'EQUIPMENT', name: 'Multispectral 4-band Sensor', vendor: 'Sentera Tech', unitCost: 120000, qty: 1, total: 120000 },
          ],
        },
      },
      include: { startup: { include: { user: true } }, budgetItems: true, documents: true },
    });

    const canonicalRevV1 = buildApplicationData(revAppV1);
    const { fullHash: fullHashRevV1 } = canonicalizeApplicationData(canonicalRevV1);
    await prisma.applicationSnapshot.create({
      data: {
        applicationId: revAppV1.id,
        version: 1,
        data: canonicalRevV1 as any,
        dataHash: fullHashRevV1,
        reconstructed: false,
      },
    });

    // Create v2 for startupRev
    const revAppV2 = await prisma.application.create({
      data: {
        startupId: startupRev.id,
        version: 2,
        supersedesId: revAppV1.id,
        status: 'SUBMITTED',
        grantType: 'VALIDATION',
        requestedTotal: 195000,
        submittedAt: new Date(),
        formData: {
          problemStatement: 'REVISED V2: Advanced smart farming sensor suite for precision agriculture.',
          proposedSolution: 'Autonomous drone with upgraded LiDAR and hyperspectral imaging payload.',
          effortAndTraction: 'Expanded to 50 test farms across 3 states.',
          teamMembers: [
            { name: 'Priya Patel', role: 'Founder & Hardware Lead' },
            { name: 'Neha Gupta', role: 'AI Software Lead' },
          ],
          experiment: {
            objective: 'Hyperspectral payload improves early pest detection to 98%.',
          },
          declaration: {
            accepted: true,
            declaredByName: 'Priya Patel',
            declaredAt: new Date().toISOString(),
          },
          agreement: {
            version: '1.0',
            textHash: 'revhash123',
            acceptedByName: 'Priya Patel',
            acceptedAt: new Date().toISOString(),
          },
        },
        budgetItems: {
          create: [
            { header: 'EQUIPMENT', name: 'Upgraded LiDAR Scanner', vendor: 'Velodyne', unitCost: 150000, qty: 1, total: 150000 },
            { header: 'CONTINGENCY', name: 'Field testing reserve', vendor: 'Various', unitCost: 45000, qty: 1, total: 45000 },
          ],
        },
      },
      include: {
        startup: { include: { user: true } },
        budgetItems: true,
        documents: true,
      },
    });

    const canonicalRevV2 = buildApplicationData(revAppV2);
    const { fullHash: fullHashRevV2 } = canonicalizeApplicationData(canonicalRevV2);
    await prisma.applicationSnapshot.create({
      data: {
        applicationId: revAppV2.id,
        version: 2,
        data: canonicalRevV2 as any,
        dataHash: fullHashRevV2,
        reconstructed: false,
      },
    });

    // Default download should now give v2
    const resV2 = await fetch(`${BASE_URL}/dashboard/application/download`, {
      headers: { Cookie: `ideapad_session=${tokenRev}` },
    });
    if (resV2.status !== 200) fail('Download v2', `Failed: ${resV2.status}`);
    const v2Text = (await parsePdf(Buffer.from(await resV2.arrayBuffer()))).text;
    if (!v2Text.includes('Upgraded LiDAR Scanner') || !v2Text.includes('v2')) {
      fail('Download v2 Content', 'v2 content missing from latest download');
    }
    pass('Latest Version Download (v2)', 'Default download returns latest v2 submission');

    // Downloading specific version 1 (?version=1) should still give immutable v1!
    const resV1 = await fetch(`${BASE_URL}/dashboard/application/download?version=1`, {
      headers: { Cookie: `ideapad_session=${tokenRev}` },
    });
    if (resV1.status !== 200) fail('Download v1 from historical snapshot', `Failed: ${resV1.status}`);
    const v1Text = (await parsePdf(Buffer.from(await resV1.arrayBuffer()))).text;
    if (!v1Text.includes('Multispectral 4-band Sensor') || !v1Text.includes('v1')) {
      fail('Download v1 Historical Snapshot', 'v1 does not match original submission snapshot');
    }
    if (v1Text.includes('Upgraded LiDAR Scanner')) {
      fail('Snapshot Immutability', 'v1 download was mutated by v2 data!');
    }
    pass('Historical Version Download (v1)', 'v1 snapshot is preserved and immutable');

    // Test 8: Legacy Application Snapshot Reconstruction on startupRev
    // Delete snapshot for v2 to simulate legacy submitted app
    await prisma.applicationSnapshot.deleteMany({
      where: { applicationId: revAppV2.id, version: 2 },
    });

    const resLegacy = await fetch(`${BASE_URL}/dashboard/application/download?version=2`, {
      headers: { Cookie: `ideapad_session=${tokenRev}` },
    });
    if (resLegacy.status !== 200) fail('Legacy Reconstruction', `Status: ${resLegacy.status}`);

    const reconstructedSnapshot = await prisma.applicationSnapshot.findFirst({
      where: { applicationId: revAppV2.id, version: 2 },
    });

    if (!reconstructedSnapshot || !reconstructedSnapshot.reconstructed) {
      fail('Legacy Reconstruction', 'Snapshot was not marked reconstructed: true');
    }
    pass('Legacy Snapshot Reconstruction', 'Auto-reconstructed with reconstructed: true');
  } catch (e) {
    fail('Multi-Version Revisions', e);
  }

  // ---------------------------------------------------------
  // Test 9: Devanagari Hindi Text & Heavy Payload Rendering
  // ---------------------------------------------------------
  try {
    const heavyBudgetItems = Array.from({ length: 40 }).map((_, i) => ({
      header: 'CONSUMABLES',
      name: `Testing Consumable Item Component #${i + 1}`,
      vendor: `Vendor Partner ${i + 1}`,
      unitCost: 1000,
      qty: 2,
      total: 2000,
    }));

    const longAnswer800 = 'यह एक व्यापक परीक्षण है। '.repeat(35); // ~800+ chars Hindi & Devanagari

    const testCanonicalData = buildApplicationData({
      id: 'app-heavy-hindi-test',
      version: 1,
      status: 'SUBMITTED',
      grantType: 'VALIDATION',
      requestedTotal: 80000,
      submittedAt: new Date(),
      createdAt: new Date(),
      startup: {
        teamName: 'नवाचार टेक (Navachar Tech)',
        enrollmentNo: 'ENR-HINDI-099',
        program: 'अभियांत्रिकी और प्रौद्योगिकी',
        department: 'कंप्यूटर विज्ञान',
        contactPhone: '+91 9999988888',
        user: { name: 'राजेश कुमार', email: 'rajesh@example.com' },
      },
      budgetItems: heavyBudgetItems,
      documents: [],
      formData: {
        problem: `समस्या विवरण (Problem Statement): ${longAnswer800}`,
        solution: 'समाधान (Solution Statement): स्वायत्त रोबोटिक्स और आईओटी आधारित स्मार्ट कृषि प्रणाली।',
        declaration: { accepted: true, declaredByName: 'राजेश कुमार', declaredAt: new Date().toISOString() },
        agreement: { version: '1.0', textHash: 'hash123', acceptedByName: 'राजेश कुमार', acceptedAt: new Date().toISOString() },
      },
    });

    const { fullHash } = canonicalizeApplicationData(testCanonicalData);
    const heavyPdfBuffer = await generateApplicationPdf(testCanonicalData, fullHash);
    const heavyParsed = await parsePdf(heavyPdfBuffer);

    if (heavyParsed.numpages < 2) {
      fail('Heavy Payload Pagination', `Expected multi-page PDF for 40 rows + 800 chars, got ${heavyParsed.numpages}`);
    }
    pass('Devanagari Hindi & Pagination', `Generated ${heavyParsed.numpages}-page PDF without overflow or font errors`);
  } catch (e) {
    fail('Devanagari Hindi & Pagination', e);
  }

  // ---------------------------------------------------------
  // Test 10: Audit Log Verification
  // ---------------------------------------------------------
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        actorId: userA.id,
        action: { startsWith: 'DOWNLOAD_APPLICATION_PDF' },
      },
      orderBy: { at: 'desc' },
    });

    if (logs.length === 0) {
      fail('Audit Log Verification', 'No DOWNLOAD_APPLICATION_PDF audit log entries found');
    }
    pass('Audit Log Verification', `Recorded ${logs.length} download audit log entries`);
  } catch (e) {
    fail('Audit Log Verification', e);
  }

  // ---------------------------------------------------------
  // Test 11: Rate Limiter (Max 10 downloads per minute per user)
  // ---------------------------------------------------------
  try {
    // Generate fresh startup user for rate limit test
    const rateLimitUser = await prisma.user.create({
      data: {
        email: `ratelimit_${Date.now()}@ideapad.local`,
        name: 'Rate Limit User',
        passwordHash: 'dummy',
        role: 'STARTUP',
        mustChangePassword: false,
      },
    });

    const rateStartup = await prisma.startup.create({
      data: {
        userId: rateLimitUser.id,
        teamName: 'Speedy Startup',
        enrollmentNo: 'ENR-RATE-1',
        program: 'B.Tech',
        department: 'IT',
        phone: '9999999999',
      },
    });

    const rateApp = await prisma.application.create({
      data: {
        startupId: rateStartup.id,
        status: 'SUBMITTED',
        grantType: 'VALIDATION',
        version: 1,
        requestedTotal: 50000,
        formData: { problem: 'Speed test problem' },
      },
      include: { startup: { include: { user: true } }, budgetItems: true, documents: true },
    });

    const canonicalRate = buildApplicationData(rateApp);
    const { fullHash: rateHash } = canonicalizeApplicationData(canonicalRate);
    await prisma.applicationSnapshot.create({
      data: {
        applicationId: rateApp.id,
        version: 1,
        data: canonicalRate as any,
        dataHash: rateHash,
      },
    });

    const rateToken = await createSession({
      userId: rateLimitUser.id,
      role: 'STARTUP',
      mustChangePassword: false,
    });

    let hit429 = false;
    for (let i = 1; i <= 12; i++) {
      const res = await fetch(`${BASE_URL}/dashboard/application/download`, {
        headers: { Cookie: `ideapad_session=${rateToken}` },
      });
      if (res.status === 429) {
        hit429 = true;
        pass('Rate Limiting (10/min)', `Request #${i} returned HTTP 429 Rate Limit Exceeded`);
        break;
      }
    }

    if (!hit429) {
      fail('Rate Limiting', 'Did not hit HTTP 429 after 12 rapid requests');
    }
  } catch (e) {
    fail('Rate Limiting', e);
  }

  console.log(`\n${GREEN}${BOLD}====================================================${RESET}`);
  console.log(`${GREEN}${BOLD}ALL 11 TEST SUITES PASSED PERFECTLY!${RESET}`);
  console.log(`${GREEN}${BOLD}====================================================\n${RESET}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
