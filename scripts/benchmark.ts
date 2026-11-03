import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

// Force local sqlite client for clean local benchmarking
const prisma = new PrismaClient({
  datasources: { db: { url: 'file:./dev.db' } },
});

async function seedBenchmarkData() {
  const existingStartups = await prisma.user.count({ where: { role: 'STARTUP', email: { startsWith: 'startup_bench_' } } });
  if (existingStartups >= 200) {
    console.log(`[Seed] Dataset already contains ${existingStartups} startups. Skipping generation.`);
    return;
  }

  console.log(`[Seed] Cleaning incomplete benchmark users and generating 200 startups, applications, and 600 assessments...`);
  await prisma.budgetItem.deleteMany({ where: { application: { startup: { user: { email: { startsWith: 'startup_bench_' } } } } } });
  await prisma.assessment.deleteMany({ where: { application: { startup: { user: { email: { startsWith: 'startup_bench_' } } } } } });
  await prisma.application.deleteMany({ where: { startup: { user: { email: { startsWith: 'startup_bench_' } } } } });
  await prisma.startup.deleteMany({ where: { user: { email: { startsWith: 'startup_bench_' } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: 'startup_bench_' } } });

  // Ensure 3 SEC members exist
  const secMembers = [];
  for (let i = 1; i <= 3; i++) {
    const email = `sec_evaluator_${i}@itmuniversity.ac.in`;
    const sec = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: `SEC Evaluator ${i}`,
        passwordHash: '$2a$12$DummyHashForBenchmarkTesting1234567890abcdefghij',
        role: 'SEC_MEMBER',
        approvalStatus: 'APPROVED',
        active: true,
        designation: 'Professor',
        department: 'School of Engineering',
      },
    });
    secMembers.push(sec);
  }

  const longText = `This project addresses a critical engineering and market challenge in real-time embedded telemetry for localized edge IoT clusters. Our proposed system introduces fault-tolerant heuristic synchronization protocols that minimize packet collisions across lossy low-power wireless meshes. Extensive laboratory trials indicate a 40% reduction in transmission latency compared to baseline Zigbee mesh architectures. Phase 1 focuses on breadboard validation and micro-benchmarking against simulated packet corruption vectors under variable electromagnetic interference. Phase 2 extends the firmware kernel to dual-core ARM Cortex-M processors with integrated security elements.`;

  const sampleFormData = {
    problemStatement: longText,
    proposedSolution: longText,
    effortAndTraction: longText,
    experiment: {
      objective: 'Validate packet delivery latency below 15ms under 30% synthetic packet drops.',
      problemStatement: 'Current mesh topologies experience severe queuing delay and frame exhaustion.',
      expectedOutcome: 'TRL-3 proof demonstrating packet recovery within two beacon intervals.',
      methodology: 'Deploy 24 hardware sensor nodes across an indoor RF chamber with variable attenuation.',
      experimentalSetup: 'Vector signal analyzer, programmable RF attenuator matrix, and digital logic capture.',
      dataToBeCollected: 'End-to-end packet latency histograms, RSSI distributions, and energy per bit.',
      validationCriteria: 'Mean latency <= 14.8ms with zero packet drop over a 12-hour continuous window.',
      risksAndAssumptions: 'Thermal drift in crystal oscillators may require temperature compensation.',
      timeline: 'Months 1-3: Hardware bring-up. Months 4-5: Chamber characterization. Month 6: Protocol tuning.',
      deliverables: 'Functional proof-of-concept mesh prototype, calibrated dataset, and validation report.',
    },
    agreement: {
      version: '1.0',
      acceptedByName: 'Founder Benchmark',
      acceptedAt: new Date().toISOString(),
    },
    selfAssessment: { trl: 3, mrl: 2, irl: 2, track: 'PROTOTYPING' },
    teamMembers: [{ name: 'Founder 1' }, { name: 'Co-Founder 2' }],
  };

  const grantTiers = ['IDEATION', 'VALIDATION', 'PROOF', 'SCALING'] as const;
  const statuses = ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REPRESENT'] as const;

  const BATCH_SIZE = 50;
  for (let batch = 0; batch < 4; batch++) {
    console.log(`[Seed] Processing batch ${batch + 1}/4 (50 startups)...`);
    for (let i = 1; i <= BATCH_SIZE; i++) {
      const idx = batch * BATCH_SIZE + i;
      const email = `startup_bench_${idx}@itmuniversity.ac.in`;
      const tier = grantTiers[idx % grantTiers.length];
      const status = statuses[idx % statuses.length];

      const user = await prisma.user.create({
        data: {
          email,
          name: `Founder Bench ${idx}`,
          passwordHash: '$2a$12$DummyHashForBenchmarkTesting1234567890abcdefghij',
          role: 'STARTUP',
          approvalStatus: 'APPROVED',
          active: true,
          startup: {
            create: {
              teamName: `Project Nova ${idx}`,
              enrollmentNo: `EN2024${String(idx).padStart(4, '0')}`,
              program: 'B.Tech CSE',
              phone: `98765${String(idx).padStart(5, '0')}`,
            },
          },
        },
        include: { startup: true },
      });

      const app = await prisma.application.create({
        data: {
          startupId: user.startup!.id,
          version: 1,
          status,
          grantType: tier,
          requestedTotal: 25000 + (idx * 500),
          formData: sampleFormData,
          submittedAt: new Date(Date.now() - (idx * 3600000)),
          budgetItems: {
            createMany: {
              data: [
                { header: 'equipment', name: 'Microcontroller Dev Board', unitCost: 4500, qty: 2, total: 9000, justification: 'Core testbed hardware for RF node emulation' },
                { header: 'consumables', name: 'Passive Component Assortment', unitCost: 1500, qty: 3, total: 4500, justification: 'Surface mount prototyping' },
                { header: 'travel', name: 'Field Testing Transit', unitCost: 3000, qty: 1, total: 3000, justification: 'Testing telemetry in outdoor rural corridor' },
                { header: 'contingency', name: 'Contingency Reserve', unitCost: 1500, qty: 1, total: 1500, justification: 'Buffer for component price fluctuation' },
              ],
            },
          },
        },
      });

      // Create 3 assessments for each application
      for (let s = 0; s < secMembers.length; s++) {
        await prisma.assessment.create({
          data: {
            applicationId: app.id,
            memberId: secMembers[s].id,
            status: 'SUBMITTED',
            statusForm: {
              a1: 8, a2: 7, a3: 9, b1: 8, b2: 8, b3: 7, c1: 8, c2: 9, c3: 8, c4: 7,
              comments: 'Clear experimental design and well-justified telemetry architecture.'
            },
            experimentForm: {
              feasibility: 'HIGH',
              methodologyScore: 9,
              recommendation: 'Proceed to next round with milestone on chamber testing.'
            },
            submittedAt: new Date(),
          },
        });
      }
    }
  }

  const finalAppCount = await prisma.application.count();
  const finalAssessCount = await prisma.assessment.count();
  console.log(`[Seed Complete] Total applications: ${finalAppCount}, Total assessments: ${finalAssessCount}`);
}

async function runBenchmark() {
  await seedBenchmarkData();

  console.log('\n========================================');
  console.log('       PHASE 0: BASELINE BENCHMARKS      ');
  console.log('========================================\n');

  // 1. Admin/SEC Application List Query (Current listApplications implementation)
  const secAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const reviewable = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "REPRESENT"];

  const iters = 10;
  let totalListTime = 0;
  let listPayloadBytes = 0;

  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    const list = await prisma.application.findMany({
      where: { status: { in: reviewable as any } },
      orderBy: { submittedAt: 'desc' },
      include: {
        startup: { select: { teamName: true } },
        _count: { select: { assessments: { where: { status: 'SUBMITTED' } } } },
      },
    });
    const t1 = performance.now();
    totalListTime += (t1 - t0);
    if (i === 0) {
      listPayloadBytes = Buffer.byteLength(JSON.stringify(list));
    }
  }

  const avgListTime = (totalListTime / iters).toFixed(2);
  const listRows = await prisma.application.count({ where: { status: { in: reviewable as any } } });
  console.log(`[Query 1] listApplications (Full row with formData):`);
  console.log(`  - Rows retrieved: ${listRows}`);
  console.log(`  - Average latency: ${avgListTime} ms`);
  console.log(`  - Payload size (JSON serialized): ${(listPayloadBytes / 1024).toFixed(1)} KB`);

  // 2. Application Detail Query (Current getApplication implementation)
  const sampleApp = await prisma.application.findFirst({ where: { status: 'SUBMITTED' } });
  let totalDetailTime = 0;
  let detailPayloadBytes = 0;

  if (sampleApp) {
    for (let i = 0; i < iters; i++) {
      const t0 = performance.now();
      const app = await prisma.application.findFirst({
        where: { id: sampleApp.id },
        include: {
          budgetItems: true,
          documents: true,
          startup: { include: { user: true } },
          milestone: { include: { items: { include: { remarks: true } } } },
        },
      });
      const t1 = performance.now();
      totalDetailTime += (t1 - t0);
      if (i === 0) {
        detailPayloadBytes = Buffer.byteLength(JSON.stringify(app));
      }
    }
  }

  const avgDetailTime = (totalDetailTime / iters).toFixed(2);
  console.log(`\n[Query 2] getApplication (Full detail with nested relations):`);
  console.log(`  - Average latency: ${avgDetailTime} ms`);
  console.log(`  - Payload size: ${(detailPayloadBytes / 1024).toFixed(1)} KB`);

  // 3. Document Encoding / In-Memory Decoding (Data URI roundtrip)
  const testBuffer = Buffer.alloc(450 * 1024, 'A'); // 450 KB document
  const tDoc0 = performance.now();
  const dataUri = `data:application/pdf;name=test.pdf;base64,${testBuffer.toString('base64')}`;
  const tDoc1 = performance.now();
  const commaIdx = dataUri.indexOf(',');
  const decodedBuffer = Buffer.from(dataUri.slice(commaIdx + 1), 'base64');
  const tDoc2 = performance.now();

  console.log(`\n[Document Handling] 450 KB PDF (Turso Data URI):`);
  console.log(`  - Base64 Encode time: ${(tDoc1 - tDoc0).toFixed(2)} ms`);
  console.log(`  - Base64 Decode & Streaming time: ${(tDoc2 - tDoc1).toFixed(2)} ms`);
  console.log(`  - Base64 Payload size in DB: ${(dataUri.length / 1024).toFixed(1)} KB`);

  // 4. Memory Usage
  const mem = process.memoryUsage();
  console.log(`\n[Memory Benchmark]:`);
  console.log(`  - RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  - Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);

  // 5. Codebase Line Counts & Dead Code Statistics
  console.log('\n[Baseline Codebase Statistics]');
  return {
    listTime: avgListTime,
    listPayloadKb: (listPayloadBytes / 1024).toFixed(1),
    listRows,
    detailTime: avgDetailTime,
    detailPayloadKb: (detailPayloadBytes / 1024).toFixed(1),
    encodeTime: (tDoc1 - tDoc0).toFixed(2),
    decodeTime: (tDoc2 - tDoc1).toFixed(2),
    rssMb: (mem.rss / 1024 / 1024).toFixed(2),
    heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
  };
}

runBenchmark().catch(console.error).finally(() => prisma.$disconnect());
