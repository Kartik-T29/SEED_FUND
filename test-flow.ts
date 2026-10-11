import { PrismaClient } from '@prisma/client';
import { 
  createDraft, saveDraft, submitApplication, 
  saveAssessment, claimMilestone, submitMilestone, adminComparison, formBReadiness, submitFormB 
} from './src/lib/access';

const prisma = new PrismaClient();

async function runTest() {
  console.log("=== Starting End-to-End Test Flow ===");

  try {
    // 1. Setup Users
    console.log("1. Setting up users...");
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const secMembers = await prisma.user.findMany({ where: { role: 'SEC_MEMBER' } });
    
    if (!admin || secMembers.length < 3) throw new Error("Missing admin or SEC members");

    // Create fake startup
    const fakeStartupEmail = 'fake_startup_test2@fake.com';
    let startupUser = await prisma.user.findUnique({ where: { email: fakeStartupEmail } });
    if (!startupUser) {
      startupUser = await prisma.user.create({
        data: {
          email: fakeStartupEmail,
          name: 'Fake Startup User',
          passwordHash: 'dummy',
          role: 'STARTUP',
          startup: {
            create: {
              teamName: 'Fake Test Team',
              enrollmentNo: '99999',
              program: 'B.Tech',
              phone: '1234567890'
            }
          }
        }
      });
      console.log(`Created fake startup: ${fakeStartupEmail}`);
    } else {
      console.log(`Using existing fake startup: ${fakeStartupEmail}`);
    }

    const startupSession = { userId: startupUser.id, role: 'STARTUP' as const };
    const adminSession = { userId: admin.id, role: 'ADMIN' as const };
    const secSessions = secMembers.map(sec => ({ userId: sec.id, role: 'SEC_MEMBER' as const }));

    // 2. Startup creates and submits application
    console.log("2. Startup creating draft...");
    let app = await prisma.application.findFirst({
      where: { startup: { userId: startupUser.id }, status: 'DRAFT' }
    });
    
    if (!app) {
      app = await createDraft(startupSession);
    }
    
    console.log(`Draft created: ${app.id}. Saving data...`);
    await saveDraft(startupSession, app.id, {
      grantType: 'IDEATION',
      requestedTotal: 4500,
      formData: { applicantName: "Fake Tester", problemStatement: "Test problem" },
      budgetItems: [
        { header: "EQUIPMENT", name: "Laptop", unitCost: 4500, qty: 1, total: 4500 }
      ]
    });

    console.log("Submitting application...");
    await submitApplication(startupSession, app.id);
    
    const submittedApp = await prisma.application.findUnique({ where: { id: app.id } });
    console.log(`Application submitted! Status: ${submittedApp?.status}`);

    // 3. SEC Members assess
    console.log("3. SEC Members submitting assessments...");
    for (let i = 0; i < secSessions.length; i++) {
      const secSess = secSessions[i];
      await saveAssessment(secSess, app.id, {
        statusForm: { notes: `Looks good from SEC ${i+1}` },
        experimentForm: { experiment: `Viable from SEC ${i+1}` }
      }, true); // true = submit
      console.log(`SEC ${i+1} submitted assessment.`);
    }

    // 3.5. SEC 1 claims and submits milestone
    console.log("3.5. SEC 1 claiming milestone...");
    await claimMilestone(secSessions[0], app.id, "Testing", ["Milestone 1", "Milestone 2"]);
    await submitMilestone(secSessions[0], app.id);
    console.log("Milestone claimed and submitted.");

    // 4. Admin reviews and approves
    console.log("4. Admin reviewing applications...");
    const comparison = await adminComparison(adminSession, app.id);
    console.log(`Admin comparison fetched: ${comparison.length} assessments found.`);

    const readiness = await formBReadiness(app.id);
    console.log(`Form B Readiness: ${readiness.ready ? 'READY' : 'NOT READY'}`);
    
    if (!readiness.ready) {
      throw new Error(`Form B not ready. Status: ${JSON.stringify(readiness)}`);
    }

    console.log("Admin submitting Form B (Approval)...");
    await submitFormB(adminSession, app.id, {
      decision: "APPROVED",
      approvedTotal: 4000,
      amounts: { "EQUIPMENT": 4000 },
      timeline: { start: "2026-10-15", end: "2027-10-15" },
      note: "Approved with slight budget cut."
    });

    const finalApp = await prisma.application.findUnique({ where: { id: app.id }, include: { evaluation: true } });
    console.log(`Final Application Status: ${finalApp?.status}`);
    console.log(`Grant Evaluation Note: ${finalApp?.evaluation?.note}`);
    
    console.log("=== End-to-End Test Flow Completed Successfully! ===");

  } catch (error) {
    console.error("Test Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
