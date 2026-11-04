import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { CanonicalApplicationData } from './application-data';
import { formatISTDateTime } from './dates';

export async function generateApplicationPdf(
  data: CanonicalApplicationData,
  dataHash: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // 15-second safety timeout for small server environment
    const timeout = setTimeout(() => {
      reject(new Error('PDF_GENERATION_TIMEOUT: Exceeded 15s limit'));
    }, 15000);

    try {
      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true,
        autoFirstPage: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      // Register Devanagari fonts for Hindi text support
      const fontsDir = path.join(process.cwd(), 'public', 'fonts');
      const regularFontPath = path.join(fontsDir, 'NotoSansDevanagari-Regular.ttf');
      const boldFontPath = path.join(fontsDir, 'NotoSansDevanagari-Bold.ttf');

      if (fs.existsSync(regularFontPath)) {
        doc.registerFont('Devanagari', regularFontPath);
      }
      if (fs.existsSync(boldFontPath)) {
        doc.registerFont('DevanagariBold', boldFontPath);
      }

      const fontRegular = fs.existsSync(regularFontPath) ? 'Devanagari' : 'Helvetica';
      const fontBold = fs.existsSync(boldFontPath) ? 'DevanagariBold' : 'Helvetica-Bold';

      const logoPath = path.join(process.cwd(), 'public', 'brand', 'logo.png');
      const contentWidth = 515; // 595 - 40 * 2
      const leftMargin = 40;

      // Helper: Check space and add page if needed
      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > 760) {
          doc.addPage();
        }
      };

      // Helper: Section Header
      const renderSectionHeader = (title: string) => {
        ensureSpace(40);
        doc.moveDown(0.8);
        const y = doc.y;
        doc
          .rect(leftMargin, y, contentWidth, 20)
          .fillAndStroke('#f1f5f9', '#cbd5e1');
        doc
          .font(fontBold)
          .fontSize(10)
          .fillColor('#0f172a')
          .text(title, leftMargin + 8, y + 5);
        doc.y = y + 26;
      };

      // Helper: Two-column key-value row
      const renderKeyValue = (key: string, val: string, fullWidth = false) => {
        ensureSpace(18);
        doc.font(fontBold).fontSize(8.5).fillColor('#475569').text(key + ': ', { continued: true });
        doc.font(fontRegular).fillColor('#0f172a').text(val || '—');
      };

      // ─────────────────────────────────────────────────────────────
      // 1. OFFICIAL BRAND HEADER
      // ─────────────────────────────────────────────────────────────
      const headerTop = 40;
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftMargin, headerTop, { width: 130 });
      }

      doc
        .font(fontBold)
        .fontSize(13)
        .fillColor('#0f172a')
        .text('IDEAPAD SEED FUND APPLICATION', leftMargin + 140, headerTop + 2, { align: 'right', width: contentWidth - 140 });

      doc
        .font(fontRegular)
        .fontSize(8.5)
        .fillColor('#64748b')
        .text('ITM University Gwalior — Innovation & Incubation Centre', leftMargin + 140, headerTop + 20, { align: 'right', width: contentWidth - 140 });

      doc
        .font(fontRegular)
        .fontSize(8)
        .fillColor('#475569')
        .text(`App ID: ${data.applicationId} · Version: v${data.version} · Status: ${data.status}`, leftMargin + 140, headerTop + 33, { align: 'right', width: contentWidth - 140 });

      doc.y = 85;
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(leftMargin, 85).lineTo(leftMargin + contentWidth, 85).stroke();

      // Top Overview Box
      doc.y = 92;
      doc.rect(leftMargin, doc.y, contentWidth, 42).fillAndStroke('#f8fafc', '#e2e8f0');
      const boxY = doc.y;

      doc.font(fontBold).fontSize(8.5).fillColor('#0f172a');
      doc.text('Target Grant Category:', leftMargin + 10, boxY + 8, { continued: true });
      doc.font(fontRegular).text(` ${data.grantTierName}`);

      doc.font(fontBold).text('Requested Total:', leftMargin + 10, boxY + 24, { continued: true });
      doc.font(fontRegular).text(` ₹${data.requestedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

      doc.font(fontBold).text('Submitted On (IST):', leftMargin + 270, boxY + 8, { continued: true });
      doc.font(fontRegular).text(` ${data.submittedAtIST}`);

      doc.font(fontBold).text('Canonical Hash:', leftMargin + 270, boxY + 24, { continued: true });
      doc.font(fontRegular).text(` ${dataHash.substring(0, 12)}...`);

      doc.y = boxY + 50;

      // ─────────────────────────────────────────────────────────────
      // 2. APPLICANT & STARTUP DETAILS (Section 1)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('1. APPLICANT & STARTUP DETAILS');
      doc.moveDown(0.2);

      const col1X = leftMargin + 8;
      const col2X = leftMargin + 260;
      let startY = doc.y;

      // Left Column
      doc.text('', col1X, startY);
      renderKeyValue('Team / Startup Name', data.startup.teamName);
      renderKeyValue('Applicant Full Name', data.startup.applicantName);
      renderKeyValue('Enrollment Number', data.startup.enrollmentNo);

      const leftBottom = doc.y;

      // Right Column
      doc.y = startY;
      doc.x = col2X;
      renderKeyValue('Program & Department', `${data.startup.program}${data.startup.department && data.startup.department !== '—' ? ` · ${data.startup.department}` : ''}`);
      doc.x = col2X;
      renderKeyValue('Contact Phone', data.startup.phone);
      doc.x = col2X;
      renderKeyValue('Registered Email', data.startup.applicantEmail);

      doc.y = Math.max(leftBottom, doc.y) + 6;
      doc.x = leftMargin;

      // ─────────────────────────────────────────────────────────────
      // 3. POLICY AGREEMENT ACCEPTANCE (Section 2)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('2. GRANT POLICY AGREEMENT ACCEPTANCE');
      doc.moveDown(0.2);

      if (data.agreement) {
        doc.font(fontBold).fontSize(8.5).fillColor('#15803d');
        doc.text(`✓ Official Terms & Conditions Accepted (Version ${data.agreement.version})`);
        doc.font(fontRegular).fontSize(8).fillColor('#334155');
        doc.text(`Accepted by ${data.agreement.acceptedByName} on ${data.agreement.acceptedAtIST}`);
        doc.text(`Agreement SHA-256 Text Hash: ${data.agreement.textHash}`);
      } else {
        doc.font(fontRegular).fontSize(8.5).fillColor('#b91c1c').text('Agreement not accepted.');
      }

      // ─────────────────────────────────────────────────────────────
      // 4. BASIC INFORMATION & CONCEPT (Section 3)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('3. BASIC INFORMATION & CONCEPT');
      doc.moveDown(0.2);

      ensureSpace(40);
      doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text('Problem Statement (Problem you are solving):');
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(data.concept.problemStatement || '—', { align: 'justify' });
      doc.moveDown(0.4);

      ensureSpace(40);
      doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text('Proposed Solution:');
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(data.concept.proposedSolution || '—', { align: 'justify' });
      doc.moveDown(0.4);

      ensureSpace(40);
      doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text('Effort and Traction So Far:');
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(data.concept.effortAndTraction || '—', { align: 'justify' });
      doc.moveDown(0.4);

      if (data.concept.hasReceivedGrantBefore) {
        doc.font(fontBold).fontSize(8).fillColor('#b45309').text('Note: Applicant reports having received prior grant support.');
      }

      // ─────────────────────────────────────────────────────────────
      // 5. 10 EXPERIMENT HEADINGS (Section 4)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('4. EXPERIMENT DEFINITION (10 Headings)');
      doc.moveDown(0.2);

      const expSections = [
        { label: '1. Objective (Hypothesis being tested)', val: data.experiment.objective },
        { label: '2. Problem Statement (Specific technical/market gap)', val: data.experiment.problemStatement },
        { label: '3. Expected Outcome (TRL-3 proof/validation milestone)', val: data.experiment.expectedOutcome },
        { label: '4. Methodology (Experiment execution steps)', val: data.experiment.methodology },
        { label: '5. Experimental Setup (Tools, hardware, equipment)', val: data.experiment.experimentalSetup },
        { label: '6. Data to be Collected (Metrics, measurements, observations)', val: data.experiment.dataToBeCollected },
        { label: '7. Validation Criteria (Pass/fail benchmarks)', val: data.experiment.validationCriteria },
        { label: '8. Risks and Assumptions (Key dependencies & risks)', val: data.experiment.risksAndAssumptions },
        { label: '9. Timeline (Key stages, schedule & completion targets)', val: data.experiment.timeline },
        { label: '10. Deliverables (Working prototype, validation report, demo)', val: data.experiment.deliverables },
      ];

      for (const item of expSections) {
        ensureSpace(32);
        doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text(item.label + ':');
        doc.font(fontRegular).fontSize(8).fillColor('#334155').text(item.val || '—', { align: 'justify' });
        doc.moveDown(0.3);
      }

      // ─────────────────────────────────────────────────────────────
      // 6. ITEMIZED BUDGET TABLE (Section 5)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('5. ITEMIZED BUDGET BREAKDOWN (Annexure 1)');
      doc.moveDown(0.2);

      // Table Header
      const renderBudgetTableHeader = () => {
        ensureSpace(24);
        const y = doc.y;
        doc.rect(leftMargin, y, contentWidth, 16).fillAndStroke('#e2e8f0', '#cbd5e1');
        doc.font(fontBold).fontSize(7.5).fillColor('#0f172a');
        doc.text('#', leftMargin + 4, y + 4, { width: 16 });
        doc.text('Category', leftMargin + 22, y + 4, { width: 95 });
        doc.text('Item Description', leftMargin + 120, y + 4, { width: 140 });
        doc.text('Vendor / Source', leftMargin + 265, y + 4, { width: 95 });
        doc.text('Unit Cost', leftMargin + 365, y + 4, { width: 50, align: 'right' });
        doc.text('Qty', leftMargin + 420, y + 4, { width: 25, align: 'center' });
        doc.text('Total (₹)', leftMargin + 450, y + 4, { width: 60, align: 'right' });
        doc.y = y + 18;
      };

      renderBudgetTableHeader();

      if (data.budget.items.length === 0) {
        doc.font(fontRegular).fontSize(8).fillColor('#64748b').text('No budget line items recorded.', leftMargin + 4, doc.y);
      } else {
        data.budget.items.forEach((item, idx) => {
          ensureSpace(16);
          if (doc.y > 740) {
            doc.addPage();
            renderBudgetTableHeader();
          }

          const y = doc.y;
          const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(leftMargin, y, contentWidth, 14).fill(bg);

          doc.font(fontRegular).fontSize(7.5).fillColor('#1e293b');
          doc.text(String(item.sno), leftMargin + 4, y + 3, { width: 16 });
          doc.text(item.headerName, leftMargin + 22, y + 3, { width: 95, ellipsis: true });
          doc.text(item.name || '—', leftMargin + 120, y + 3, { width: 140, ellipsis: true });
          doc.text(item.vendor || '—', leftMargin + 265, y + 3, { width: 95, ellipsis: true });
          doc.text(`₹${item.unitCost.toFixed(2)}`, leftMargin + 365, y + 3, { width: 50, align: 'right' });
          doc.text(String(item.qty), leftMargin + 420, y + 3, { width: 25, align: 'center' });
          doc.font(fontBold).text(`₹${item.total.toFixed(2)}`, leftMargin + 450, y + 3, { width: 60, align: 'right' });

          doc.y = y + 15;
        });

        // Totals Box
        ensureSpace(35);
        doc.moveDown(0.3);
        const totY = doc.y;
        doc.rect(leftMargin + 260, totY, contentWidth - 260, 32).fillAndStroke('#f1f5f9', '#cbd5e1');
        doc.font(fontRegular).fontSize(8).fillColor('#334155');
        doc.text(`Direct Items Subtotal: ₹${data.budget.nonContingencyTotal.toFixed(2)}`, leftMargin + 268, totY + 4);
        doc.text(`Contingency (${data.budget.contingencyPercentage.toFixed(1)}%): ₹${data.budget.contingencyTotal.toFixed(2)}`, leftMargin + 268, totY + 14);
        doc.font(fontBold).fontSize(9).fillColor('#0f172a');
        doc.text(`Grand Total: ₹${data.budget.grandTotal.toFixed(2)}`, leftMargin + 268, totY + 23);
        doc.y = totY + 38;
      }

      // ─────────────────────────────────────────────────────────────
      // 7. BUDGET JUSTIFICATIONS (Section 6)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('6. BUDGET JUSTIFICATIONS (By Item)');
      doc.moveDown(0.2);

      data.budget.items.forEach((item) => {
        ensureSpace(24);
        doc.font(fontBold).fontSize(8).fillColor('#0f172a').text(`Item #${item.sno}: ${item.name} (${item.headerName} · ₹${item.total.toFixed(2)})`);
        doc.font(fontRegular).fontSize(7.5).fillColor('#475569').text(item.justification ? `Justification: ${item.justification}` : 'Justification: Standard incubator baseline.', { align: 'justify' });
        doc.moveDown(0.2);
      });

      // ─────────────────────────────────────────────────────────────
      // 8. TRL / MRL / IRL & MILESTONES (Section 7)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('7. TECHNOLOGY & READINESS LEVELS (Self-Assessment)');
      doc.moveDown(0.2);

      ensureSpace(45);
      renderKeyValue('Technology Readiness Level (TRL)', `Level ${data.selfAssessment.trl}: ${data.selfAssessment.trlLabel}`);
      renderKeyValue('Manufacturing Readiness Level (MRL)', `Level ${data.selfAssessment.mrl}: ${data.selfAssessment.mrlLabel}`);
      renderKeyValue('Integration Readiness Level (IRL)', `Level ${data.selfAssessment.irl}: ${data.selfAssessment.irlLabel}`);
      renderKeyValue('Milestone Track Selected', `${data.selfAssessment.trackLabel} (${data.selfAssessment.track})`);

      doc.moveDown(0.3);
      doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text('Track Milestones:');
      doc.moveDown(0.1);

      data.selfAssessment.milestones.forEach((m, idx) => {
        ensureSpace(14);
        doc.font(fontRegular).fontSize(8).fillColor('#334155');
        const badge = m.status === 'COMPLETED' ? '[✓ Done]' : '[○ Pending]';
        doc.text(`${idx + 1}. ${badge} ${m.name}${m.remarks ? ` — ${m.remarks}` : ''}`);
      });

      // ─────────────────────────────────────────────────────────────
      // 9. TEAM & DOCUMENTS (Section 8)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('8. TEAM & UPLOADED DOCUMENTS');
      doc.moveDown(0.2);

      ensureSpace(30);
      doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text('Founding Team Members:');
      const teamNames = data.team.map((t) => t.name).join(', ') || 'Sole Founder';
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(teamNames);
      doc.moveDown(0.3);

      doc.font(fontBold).fontSize(8.5).fillColor('#0f172a').text('Uploaded Document Registry (Names & Categories Only):');
      doc.font(fontRegular).fontSize(7.5).fillColor('#64748b').text('(Note: Identity documents and binary file contents are omitted for privacy and security)');
      doc.moveDown(0.2);

      if (data.documents.length === 0) {
        doc.font(fontRegular).fontSize(8).fillColor('#94a3b8').text('No documents uploaded.');
      } else {
        data.documents.forEach((d, idx) => {
          ensureSpace(12);
          doc.font(fontRegular).fontSize(8).fillColor('#334155');
          const memberSuffix = d.memberLabel ? ` [Member: ${d.memberLabel}]` : '';
          doc.text(`• ${d.typeName}: "${d.fileName}"${memberSuffix}`);
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 10. FINAL DECLARATION & ELECTRONIC SIGNATURE (Section 9)
      // ─────────────────────────────────────────────────────────────
      renderSectionHeader('9. FINAL DECLARATION & ELECTRONIC SIGNATURE');
      doc.moveDown(0.2);

      ensureSpace(50);
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(
        'I hereby declare that all information provided in this application is true, accurate, and complete to the best of my knowledge. The requested seed grant funds will be utilized strictly for the objectives and milestones specified herein in compliance with ITM University IDEAPAD seed fund regulations.',
        { align: 'justify' }
      );
      doc.moveDown(0.3);

      if (data.declaration) {
        doc.font(fontBold).fontSize(8.5).fillColor('#15803d');
        doc.text(`✓ Electronically Signed by: ${data.declaration.declaredByName}`);
        doc.font(fontRegular).fontSize(8).fillColor('#475569');
        doc.text(`Signature Timestamp: ${data.declaration.declaredAtIST}`);
      } else {
        doc.font(fontRegular).fontSize(8).fillColor('#b91c1c').text('Declaration signature pending.');
      }

      // ─────────────────────────────────────────────────────────────
      // 11. RUNNING PAGE FOOTERS (All Pages)
      // ─────────────────────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      const generatedAtIST = formatISTDateTime(new Date().toISOString());
      const shortHash = dataHash.substring(0, 12);

      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(leftMargin, 792).lineTo(leftMargin + contentWidth, 792).stroke();

        doc.font(fontRegular).fontSize(7).fillColor('#64748b');
        doc.text(
          `IDEAPAD Seed Fund Application · App ID: ${data.applicationId} (v${data.version})`,
          leftMargin,
          798,
          { width: 220 }
        );

        doc.text(
          `Page ${i + 1} of ${range.count}`,
          leftMargin,
          798,
          { align: 'center', width: contentWidth }
        );

        doc.text(
          `Generated: ${generatedAtIST} · Hash: ${shortHash}`,
          leftMargin + contentWidth - 220,
          798,
          { align: 'right', width: 220 }
        );
      }

      doc.end();
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}
