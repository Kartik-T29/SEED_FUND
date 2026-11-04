import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { CanonicalApplicationData } from './application-data';
import { FormAData } from './form-a-data';
import { FormBData } from './form-b-data';
import { formatISTDateTime } from './dates';

/**
 * Register bundled fonts (Latin serif + Devanagari Hindi support).
 */
function setupFonts(doc: PDFKit.PDFDocument) {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');

  const notoSerif = path.join(fontsDir, 'NotoSerif-Regular.ttf');
  const notoSerifBold = path.join(fontsDir, 'NotoSerif-Bold.ttf');
  const notoSerifDev = path.join(fontsDir, 'NotoSerifDevanagari-Regular.ttf');
  const notoSerifDevBold = path.join(fontsDir, 'NotoSerifDevanagari-Bold.ttf');

  const notoDevRegular = path.join(fontsDir, 'NotoSansDevanagari-Regular.ttf');
  const notoDevBold = path.join(fontsDir, 'NotoSansDevanagari-Bold.ttf');

  if (fs.existsSync(notoSerif)) doc.registerFont('NotoSerif', notoSerif);
  if (fs.existsSync(notoSerifBold)) doc.registerFont('NotoSerifBold', notoSerifBold);
  if (fs.existsSync(notoSerifDev)) doc.registerFont('DevanagariSerif', notoSerifDev);
  if (fs.existsSync(notoSerifDevBold)) doc.registerFont('DevanagariSerifBold', notoSerifDevBold);

  if (fs.existsSync(notoDevRegular)) doc.registerFont('Devanagari', notoDevRegular);
  if (fs.existsSync(notoDevBold)) doc.registerFont('DevanagariBold', notoDevBold);
}

/**
 * Smart font selector writing text in Latin or Devanagari Hindi.
 */
function writeBilingualText(
  doc: PDFKit.PDFDocument,
  text: string,
  options: PDFKit.Mixins.TextOptions = {},
  isBold = false,
  isSerif = true
) {
  if (!text) return;
  const str = String(text);

  const hasDevanagari = /[\u0900-\u097F\uA8E0-\uA8FF]/.test(str);
  if (!hasDevanagari) {
    if (isSerif) {
      doc.font(isBold ? 'NotoSerifBold' : 'NotoSerif');
    } else {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
    }
    doc.text(str, options);
    return;
  }

  // Split contiguous chunks
  const regex = /([\u0900-\u097F\uA8E0-\uA8FF]+|[^\u0900-\u097F\uA8E0-\uA8FF]+)/g;
  const parts = str.match(regex) || [str];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isPartDevanagari = /[\u0900-\u097F\uA8E0-\uA8FF]/.test(part);
    let chosenFont = 'Helvetica';

    if (isPartDevanagari) {
      chosenFont = isBold ? 'DevanagariSerifBold' : 'DevanagariSerif';
    } else {
      chosenFont = isBold ? (isSerif ? 'NotoSerifBold' : 'Helvetica-Bold') : (isSerif ? 'NotoSerif' : 'Helvetica');
    }

    doc.font(chosenFont);
    const isLast = i === parts.length - 1;
    doc.text(part, {
      ...options,
      continued: options.continued || !isLast,
    });
  }
}

/**
 * Draw draft watermark across page.
 */
function renderDraftWatermark(doc: PDFKit.PDFDocument, width: number, height: number) {
  doc.save();
  doc.opacity(0.12);
  doc.fillColor('#dc2626');
  doc.font('Helvetica-Bold').fontSize(42);
  doc.rotate(-32, { origin: [width / 2, height / 2] });
  doc.text('DRAFT - NOT FOR SIGNATURE', 0, height / 2 - 20, {
    align: 'center',
    width: width,
  });
  doc.restore();
}

// ─────────────────────────────────────────────────────────────
// 1. FORM A PDF GENERATOR (FAITHFUL TO OFFICIAL WORD TEMPLATE)
// ─────────────────────────────────────────────────────────────
export async function generateFormAPdf(
  data: FormAData,
  dataHash: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('PDF_GENERATION_TIMEOUT: Form A generation exceeded 15s'));
    }, 15000);

    try {
      // 24 pt margins for maximum table readability on A4
      const leftMargin = 24;
      const topMargin = 28;
      const contentWidth = 547; // 595 - 48
      const maxContentY = 790;

      const doc = new PDFDocument({
        margin: leftMargin,
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

      setupFonts(doc);

      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > maxContentY) {
          doc.addPage();
          renderFormAHeaderMeta(true);
        }
      };

      const logoPath = path.join(process.cwd(), 'public', 'brand', 'logo.png');

      // Helper to render Form A Header and Meta
      const renderFormAHeaderMeta = (isSubsequentPage = false) => {
        if (isSubsequentPage) {
          // Minimal running header on subsequent pages
          doc.y = topMargin;
          doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000');
          doc.text(`FORM A: SEC Startup Assessment and recommendation · App ID: ${data.applicationId}`, leftMargin, doc.y, { width: contentWidth });
          doc.strokeColor('#000000').lineWidth(0.5).moveTo(leftMargin, doc.y + 4).lineTo(leftMargin + contentWidth, doc.y + 4).stroke();
          doc.y += 10;
          return;
        }

        doc.y = topMargin;
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, leftMargin, doc.y, { width: 110 });
        }

        doc.font('NotoSerifBold').fontSize(12).fillColor('#000000');
        doc.text('FORM A : SEC Startup Assessment and recommendation', leftMargin + 120, doc.y + 2, { align: 'right', width: contentWidth - 120 });

        doc.font('NotoSerif').fontSize(7.5).fillColor('#333333');
        doc.text('(SEC members are requested to fill this form online, when all members have provided the data, the form will be printed for approval signatures)', leftMargin + 120, doc.y + 2, { align: 'right', width: contentWidth - 120 });

        doc.moveDown(0.6);
        const headerBottomY = Math.max(doc.y, topMargin + 48);

        // Watermark notice if draft
        if (!data.isFinal) {
          doc.y = headerBottomY;
          doc.rect(leftMargin, doc.y, contentWidth, 16).fillAndStroke('#fee2e2', '#ef4444');
          doc.font('NotoSerifBold').fontSize(7.5).fillColor('#991b1b');
          const unsubmittedStr = data.unsubmittedList.length > 0 ? `Pending submissions: ${data.unsubmittedList.join(', ')}` : 'Awaiting panel completion';
          doc.text(`DRAFT - NOT FOR SIGNATURE · ${unsubmittedStr}`, leftMargin + 6, doc.y + 4);
          doc.y += 20;
        } else {
          doc.y = headerBottomY + 4;
        }

        // Table 1: Meta Table (Word template 2 columns)
        const metaY = doc.y;
        const col1W = 200;
        const col2W = contentWidth - col1W;
        const rowH = 15;

        // Row 1
        doc.rect(leftMargin, metaY, col1W, rowH).stroke('#000000');
        doc.rect(leftMargin + col1W, metaY, col2W, rowH).stroke('#000000');
        doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Name of applicant/team/startup', leftMargin + 4, metaY + 3.5);
        doc.font('NotoSerif').fontSize(8.5).fillColor('#000000').text(data.startup.teamName, leftMargin + col1W + 4, metaY + 3.5);

        // Row 2
        doc.rect(leftMargin, metaY + rowH, col1W, rowH).stroke('#000000');
        doc.rect(leftMargin + col1W, metaY + rowH, col2W, rowH).stroke('#000000');
        doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Assessment date', leftMargin + 4, metaY + rowH + 3.5);
        doc.font('NotoSerif').fontSize(8.5).fillColor('#000000').text(`${data.assessmentDateIST} (Applicant: ${data.startup.applicantName} · Enrollment: ${data.startup.enrollmentNo})`, leftMargin + col1W + 4, metaY + rowH + 3.5);

        doc.y = metaY + rowH * 2 + 8;
      };

      // Initial Header & Meta
      renderFormAHeaderMeta(false);

      // ─────────────────────────────────────────────────────────────
      // SECTION 1: Current Status assessment based on idea pitch :
      // ─────────────────────────────────────────────────────────────
      ensureSpace(160);
      doc.font('NotoSerifBold').fontSize(9.5).fillColor('#000000').text('1. Current Status assessment based on idea pitch :', leftMargin, doc.y);
      doc.moveDown(0.3);

      const sec1Y = doc.y;
      const blockWidth = Math.floor(contentWidth / 3);
      const descColW = 86;
      const memColW = Math.floor((blockWidth - descColW) / 3);

      const scales: Array<{ key: 'trl' | 'mrl' | 'irl'; title: string; levels: typeof data.statusAssessment.trl }> = [
        { key: 'trl', title: 'TRL', levels: data.statusAssessment.trl },
        { key: 'mrl', title: 'MRL', levels: data.statusAssessment.mrl },
        { key: 'irl', title: 'IRL', levels: data.statusAssessment.irl },
      ];

      // Draw header row for all 3 blocks
      const s1HeaderH = 22;
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const sc = scales[sIdx];
        const startX = leftMargin + sIdx * blockWidth;

        // Scale title cell
        doc.rect(startX, sec1Y, descColW, s1HeaderH).fillAndStroke('#f8fafc', '#000000');
        doc.font('NotoSerifBold').fontSize(8).fillColor('#000000').text(sc.title, startX + 3, sec1Y + 6);

        // Member 1, 2, 3 header cells
        for (let m = 0; m < 3; m++) {
          const mX = startX + descColW + m * memColW;
          doc.rect(mX, sec1Y, memColW, s1HeaderH).fillAndStroke('#f8fafc', '#000000');
          doc.font('NotoSerifBold').fontSize(6).fillColor('#000000').text(`M${m + 1}`, mX + 1, sec1Y + 3, { align: 'center', width: memColW - 2 });
          const mName = data.panelMembers[m].name.split(' ')[0] || '';
          doc.font('NotoSerif').fontSize(5.5).text(mName, mX + 1, sec1Y + 12, { align: 'center', width: memColW - 2 });
        }
      }

      // Draw 9 level rows for each block
      let currRowY = sec1Y + s1HeaderH;
      const s1RowH = 13.5;

      for (let lvl = 0; lvl < 9; lvl++) {
        for (let sIdx = 0; sIdx < 3; sIdx++) {
          const sc = scales[sIdx];
          const item = sc.levels[lvl];
          const startX = leftMargin + sIdx * blockWidth;

          // Level description cell
          doc.rect(startX, currRowY, descColW, s1RowH).stroke('#000000');
          doc.font('NotoSerif').fontSize(5.8).fillColor('#000000').text(item.label, startX + 2, currRowY + 3, {
            width: descColW - 4,
            height: s1RowH - 3,
            lineBreak: false,
          });

          // Member columns
          for (let m = 0; m < 3; m++) {
            const mX = startX + descColW + m * memColW;
            const isAchieved = item.achieved[m];
            doc.rect(mX, currRowY, memColW, s1RowH).stroke('#000000');
            if (isAchieved) {
              doc.font('NotoSerifBold').fontSize(6).fillColor('#000000').text('achieved', mX + 1, currRowY + 3.5, {
                align: 'center',
                width: memColW - 2,
              });
            }
          }
        }
        currRowY += s1RowH;
      }

      doc.y = currRowY + 8;

      // ─────────────────────────────────────────────────────────────
      // SECTION 2: Milestone assessment :
      // ─────────────────────────────────────────────────────────────
      ensureSpace(180);
      doc.font('NotoSerifBold').fontSize(9.5).fillColor('#000000').text('2. Milestone assessment :', leftMargin, doc.y);
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#111827').text(data.milestoneAssessment.note, leftMargin, doc.y + 2, { width: contentWidth });
      doc.moveDown(0.6);

      const msStartY = doc.y;
      const msCol1W = 145;
      const msCol2W = 155;
      const msMemberColsW = contentWidth - msCol1W - msCol2W;
      const msSingleMemW = Math.floor(msMemberColsW / 3);

      // Header Row 1
      const msH1Height = 15;
      doc.rect(leftMargin, msStartY, msCol1W, msH1Height).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text('Milestones for Idea Prototyping and proof of concept', leftMargin + 3, msStartY + 3, { width: msCol1W - 6 });

      doc.rect(leftMargin + msCol1W, msStartY, msCol2W, msH1Height).fillAndStroke('#f8fafc', '#000000');
      doc.text('Milestones for Professional Practice and Entrepreneurship Development', leftMargin + msCol1W + 3, msStartY + 3, { width: msCol2W - 6 });

      doc.rect(leftMargin + msCol1W + msCol2W, msStartY, msMemberColsW, msH1Height).fillAndStroke('#f8fafc', '#000000');
      doc.text('Status (Completed/Pending) and remarks from SEC members', leftMargin + msCol1W + msCol2W + 3, msStartY + 3, { align: 'center', width: msMemberColsW - 6 });

      // Header Row 2
      const msH2Y = msStartY + msH1Height;
      const msH2Height = 13;
      doc.rect(leftMargin, msH2Y, msCol1W, msH2Height).fillAndStroke('#f8fafc', '#000000');
      doc.rect(leftMargin + msCol1W, msH2Y, msCol2W, msH2Height).fillAndStroke('#f8fafc', '#000000');

      for (let m = 0; m < 3; m++) {
        const mX = leftMargin + msCol1W + msCol2W + m * msSingleMemW;
        doc.rect(mX, msH2Y, msSingleMemW, msH2Height).fillAndStroke('#f8fafc', '#000000');
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(`${m + 1}. ${data.panelMembers[m].name.split(' ')[0]}`, mX + 2, msH2Y + 2.5, { align: 'center', width: msSingleMemW - 4 });
      }

      let currMsY = msH2Y + msH2Height;
      const msRowH = 15;

      for (const row of data.milestoneAssessment.rows) {
        ensureSpace(msRowH + 2);
        doc.rect(leftMargin, currMsY, msCol1W, msRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(6.5).fillColor('#000000').text(row.setAText, leftMargin + 3, currMsY + 3, { width: msCol1W - 6, height: msRowH - 4 });

        doc.rect(leftMargin + msCol1W, currMsY, msCol2W, msRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(6.5).fillColor('#000000').text(row.setBText, leftMargin + msCol1W + 3, currMsY + 3, { width: msCol2W - 6, height: msRowH - 4 });

        for (let m = 0; m < 3; m++) {
          const mX = leftMargin + msCol1W + msCol2W + m * msSingleMemW;
          doc.rect(mX, currMsY, msSingleMemW, msRowH).stroke('#000000');
          doc.font('NotoSerif').fontSize(6).fillColor('#000000').text(row.memberRemarks[m], mX + 2, currMsY + 3, { width: msSingleMemW - 4, height: msRowH - 4 });
        }
        currMsY += msRowH;
      }

      doc.y = currMsY + 6;

      // Corrections Audit Log
      if (data.milestoneAssessment.corrections.length > 0) {
        ensureSpace(45);
        doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Milestone Corrections Audit Log (Policy Signed Requirement):', leftMargin, doc.y);
        doc.moveDown(0.2);

        const cRowH = 13;
        for (const c of data.milestoneAssessment.corrections) {
          ensureSpace(cRowH + 2);
          doc.font('NotoSerif').fontSize(6.5).fillColor('#333333');
          doc.text(`• ${c.changedAtIST} by ${c.changedByName}: ${c.field} changed from "${c.oldValue}" to "${c.newValue}" | Signature: __________________`, leftMargin + 6, doc.y);
          doc.moveDown(0.2);
        }
        doc.moveDown(0.4);
      }

      // ─────────────────────────────────────────────────────────────
      // SECTION 3: TRL 2/TRL3 Experiment Assessment (12 Questions)
      // ─────────────────────────────────────────────────────────────
      ensureSpace(220);
      doc.font('NotoSerifBold').fontSize(9.5).fillColor('#000000').text('3. TRL 2/TRL3 Experiment Assessment', leftMargin, doc.y);
      doc.font('NotoSerif').fontSize(7.5).fillColor('#333333').text('This assessment will be done by each SEC member', leftMargin, doc.y + 1);
      doc.moveDown(0.5);

      const qStartY = doc.y;
      const qCol1W = 345;
      const qMemColW = Math.floor((contentWidth - qCol1W) / 3);

      const qH1 = 14;
      doc.rect(leftMargin, qStartY, qCol1W, qH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Evaluation Question', leftMargin + 3, qStartY + 3);

      for (let m = 0; m < 3; m++) {
        const mX = leftMargin + qCol1W + m * qMemColW;
        doc.rect(mX, qStartY, qMemColW, qH1).fillAndStroke('#f8fafc', '#000000');
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(`${m + 1}. ${data.panelMembers[m].name.split(' ')[0]}`, mX + 2, qStartY + 3, { align: 'center', width: qMemColW - 4 });
      }

      let currQY = qStartY + qH1;
      const qRowH = 14;

      let lastCategory = '';
      for (const q of data.experimentAssessment.questions) {
        if (q.category !== lastCategory) {
          lastCategory = q.category;
          ensureSpace(qRowH + 2);
          doc.rect(leftMargin, currQY, contentWidth, qRowH).fillAndStroke('#f1f5f9', '#000000');
          doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text(q.category, leftMargin + 4, currQY + 3.5);
          currQY += qRowH;
        }

        ensureSpace(qRowH + 2);
        doc.rect(leftMargin, currQY, qCol1W, qRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(7).fillColor('#000000').text(`${q.num}. ${q.text}`, leftMargin + 3, currQY + 3, { width: qCol1W - 6 });

        for (let m = 0; m < 3; m++) {
          const mX = leftMargin + qCol1W + m * qMemColW;
          const vote = q.votes[m];
          doc.rect(mX, currQY, qMemColW, qRowH).stroke('#000000');
          const voteColor = vote === 'YES' ? '#15803d' : vote === 'NO' ? '#b91c1c' : '#475569';
          doc.font('NotoSerifBold').fontSize(7).fillColor(voteColor).text(vote, mX + 1, currQY + 3.5, { align: 'center', width: qMemColW - 2 });
        }
        currQY += qRowH;
      }

      // Vote Totals row
      ensureSpace(qRowH + 2);
      doc.rect(leftMargin, currQY, qCol1W, qRowH).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Total Votes (YES / NO)', leftMargin + 4, currQY + 3.5);

      for (let m = 0; m < 3; m++) {
        const mX = leftMargin + qCol1W + m * qMemColW;
        doc.rect(mX, currQY, qMemColW, qRowH).fillAndStroke('#f8fafc', '#000000');
        const tot = data.experimentAssessment.memberVoteTotals[m];
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(`Y:${tot.yes} · N:${tot.no}`, mX + 1, currQY + 3.5, { align: 'center', width: qMemColW - 2 });
      }
      currQY += qRowH;

      doc.y = currQY + 6;
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#1e293b').text(data.experimentAssessment.decisionGuide, leftMargin, doc.y);
      doc.moveDown(0.5);

      // Notes Table
      ensureSpace(60);
      doc.font('NotoSerif').fontSize(7.5).fillColor('#000000').text('Notes from SEC members with reference to questions asked above number (to be used for final recommendation):', leftMargin, doc.y);
      doc.moveDown(0.3);

      const notesY = doc.y;
      const nCol1W = 120;
      const nCol2W = contentWidth - nCol1W;
      const nH1 = 13;

      doc.rect(leftMargin, notesY, nCol1W, nH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text('name of members', leftMargin + 3, notesY + 3);
      doc.rect(leftMargin + nCol1W, notesY, nCol2W, nH1).fillAndStroke('#f8fafc', '#000000');
      doc.text('Notes', leftMargin + nCol1W + 3, notesY + 3);

      let currNoteY = notesY + nH1;
      for (let m = 0; m < 3; m++) {
        const nRowH = 16;
        ensureSpace(nRowH + 2);
        doc.rect(leftMargin, currNoteY, nCol1W, nRowH).stroke('#000000');
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(`member ${m + 1} : ${data.panelMembers[m].name.split(' ')[0]}`, leftMargin + 3, currNoteY + 3.5);

        doc.rect(leftMargin + nCol1W, currNoteY, nCol2W, nRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(6.5).fillColor('#333333').text(data.experimentAssessment.memberNotes[m].notes, leftMargin + nCol1W + 3, currNoteY + 3, { width: nCol2W - 6, height: nRowH - 4 });
        currNoteY += nRowH;
      }

      doc.y = currNoteY + 8;

      // ─────────────────────────────────────────────────────────────
      // SECTION 4: Recommendation Note from SEC members :
      // ─────────────────────────────────────────────────────────────
      ensureSpace(80);
      doc.font('NotoSerifBold').fontSize(9.5).fillColor('#000000').text('4. Recommendation Note from SEC members :', leftMargin, doc.y);
      doc.moveDown(0.3);

      const recY = doc.y;
      const rCol1W = 120;
      const rCol2W = contentWidth - rCol1W;
      const rH1 = 13;

      doc.rect(leftMargin, recY, rCol1W, rH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text('name of members', leftMargin + 3, recY + 3);
      doc.rect(leftMargin + rCol1W, recY, rCol2W, rH1).fillAndStroke('#f8fafc', '#000000');
      doc.text('recommendation', leftMargin + rCol1W + 3, recY + 3);

      let currRecY = recY + rH1;
      for (let m = 0; m < 3; m++) {
        const rRowH = 22;
        ensureSpace(rRowH + 2);
        doc.rect(leftMargin, currRecY, rCol1W, rRowH).stroke('#000000');
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(`member ${m + 1} : ${data.panelMembers[m].name}`, leftMargin + 3, currRecY + 4, { width: rCol1W - 6 });

        doc.rect(leftMargin + rCol1W, currRecY, rCol2W, rRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(6.5).fillColor('#333333').text(data.recommendationNotes[m].recommendation, leftMargin + rCol1W + 3, currRecY + 3, { width: rCol2W - 6, height: rRowH - 4 });
        currRecY += rRowH;
      }

      doc.y = currRecY + 8;

      // ─────────────────────────────────────────────────────────────
      // SECTION 5: Grant Evaluation by SEC member
      // ─────────────────────────────────────────────────────────────
      ensureSpace(80);
      doc.font('NotoSerifBold').fontSize(9.5).fillColor('#000000').text('5: Grant Evaluation by  SEC member', leftMargin, doc.y);
      doc.moveDown(0.3);

      const evStartY = doc.y;
      const evCol1W = 255;
      const evMemColW = Math.floor((contentWidth - evCol1W) / 3);

      const evH1 = 14;
      doc.rect(leftMargin, evStartY, evCol1W, evH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Type of grant', leftMargin + 4, evStartY + 3.5);

      for (let m = 0; m < 3; m++) {
        const mX = leftMargin + evCol1W + m * evMemColW;
        doc.rect(mX, evStartY, evMemColW, evH1).fillAndStroke('#f8fafc', '#000000');
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(`Member: ${m + 1}.`, mX + 2, evStartY + 3.5, { align: 'center', width: evMemColW - 4 });
      }

      let currEvY = evStartY + evH1;
      const evRowH = 13.5;

      for (const row of data.grantEvaluation.rows) {
        ensureSpace(evRowH + 2);
        doc.rect(leftMargin, currEvY, evCol1W, evRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(7).fillColor('#000000').text(row.label, leftMargin + 4, currEvY + 3);

        for (let m = 0; m < 3; m++) {
          const mX = leftMargin + evCol1W + m * evMemColW;
          doc.rect(mX, currEvY, evMemColW, evRowH).stroke('#000000');
          if (row.approved[m]) {
            doc.font('NotoSerifBold').fontSize(7).fillColor('#15803d').text('approved', mX + 1, currEvY + 3, { align: 'center', width: evMemColW - 2 });
          }
        }
        currEvY += evRowH;
      }

      doc.y = currEvY + 8;

      // ─────────────────────────────────────────────────────────────
      // SECTION 6: Grant suggested under various headers :
      // ─────────────────────────────────────────────────────────────
      ensureSpace(160);
      doc.font('NotoSerifBold').fontSize(9.5).fillColor('#000000').text('6. Grant suggested under various headers :', leftMargin, doc.y);
      doc.moveDown(0.3);

      const bStartY = doc.y;
      const bCol1W = 255;
      const bMemColW = Math.floor((contentWidth - bCol1W) / 3);

      const bH1 = 14;
      doc.rect(leftMargin, bStartY, bCol1W, bH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Grant approved for', leftMargin + 4, bStartY + 3.5);

      doc.rect(leftMargin + bCol1W, bStartY, contentWidth - bCol1W, bH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Amount', leftMargin + bCol1W + 4, bStartY + 3.5, { align: 'center', width: contentWidth - bCol1W - 8 });

      const bH2Y = bStartY + bH1;
      doc.rect(leftMargin, bH2Y, bCol1W, bH1).fillAndStroke('#f8fafc', '#000000');
      for (let m = 0; m < 3; m++) {
        const mX = leftMargin + bCol1W + m * bMemColW;
        doc.rect(mX, bH2Y, bMemColW, bH1).fillAndStroke('#f8fafc', '#000000');
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(`member ${m + 1}: ${data.panelMembers[m].name.split(' ')[0]}`, mX + 2, bH2Y + 3.5, { align: 'center', width: bMemColW - 4 });
      }

      let currBY = bH2Y + bH1;
      const bRowH = 13.5;

      for (const h of data.suggestedBudgets.headers) {
        ensureSpace(bRowH + 2);
        doc.rect(leftMargin, currBY, bCol1W, bRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(7).fillColor('#000000').text(h.name, leftMargin + 4, currBY + 3);

        for (let m = 0; m < 3; m++) {
          const mX = leftMargin + bCol1W + m * bMemColW;
          doc.rect(mX, currBY, bMemColW, bRowH).stroke('#000000');
          doc.font('NotoSerif').fontSize(7).fillColor('#000000').text(h.amounts[m], mX + 2, currBY + 3, { align: 'right', width: bMemColW - 6 });
        }
        currBY += bRowH;
      }

      // Total Row
      ensureSpace(bRowH + 2);
      doc.rect(leftMargin, currBY, bCol1W, bRowH).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('total :', leftMargin + 4, currBY + 3.5);

      for (let m = 0; m < 3; m++) {
        const mX = leftMargin + bCol1W + m * bMemColW;
        doc.rect(mX, currBY, bMemColW, bRowH).fillAndStroke('#f8fafc', '#000000');
        doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text(data.suggestedBudgets.totals[m], mX + 2, currBY + 3.5, { align: 'right', width: bMemColW - 6 });
      }
      currBY += bRowH;

      doc.y = currBY + 10;

      // ─────────────────────────────────────────────────────────────
      // SECTION 7: Assessed By: (3 Panel Members) & Reviewed By:
      // ─────────────────────────────────────────────────────────────
      ensureSpace(120);
      doc.font('NotoSerifBold').fontSize(9.5).fillColor('#000000').text('7. Assessed By:', leftMargin, doc.y);
      doc.moveDown(0.3);

      const sigY = doc.y;
      const sigColW = Math.floor(contentWidth / 3);
      const sigBoxH = 55;

      for (let m = 0; m < 3; m++) {
        const pm = data.panelMembers[m];
        const sX = leftMargin + m * sigColW;
        doc.rect(sX, sigY, sigColW, sigBoxH).stroke('#000000');

        doc.strokeColor('#000000').lineWidth(0.5).moveTo(sX + 15, sigY + 28).lineTo(sX + sigColW - 15, sigY + 28).stroke();
        doc.font('NotoSerif').fontSize(6).fillColor('#64748b').text('Signature & Date', sX + 15, sigY + 30);

        doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text(pm.name, sX + 6, sigY + 38, { width: sigColW - 12 });
        doc.font('NotoSerif').fontSize(6.5).fillColor('#475569').text(`${pm.designation} · ${pm.department}`, sX + 6, sigY + 47, { width: sigColW - 12 });
      }

      doc.y = sigY + sigBoxH + 10;

      // Reviewed By: Signatories from Settings
      ensureSpace(80);
      doc.font('NotoSerifBold').fontSize(9.5).fillColor('#000000').text('Reviewed by:', leftMargin, doc.y);
      doc.moveDown(0.3);

      const revY = doc.y;
      const revColW = Math.floor(contentWidth / 2);
      const revBoxH = 50;

      for (let r = 0; r < data.signatories.reviewedBy.length; r++) {
        const sig = data.signatories.reviewedBy[r];
        const rX = leftMargin + r * revColW;
        doc.rect(rX, revY, revColW, revBoxH).stroke('#000000');

        doc.strokeColor('#000000').lineWidth(0.5).moveTo(rX + 20, revY + 24).lineTo(rX + revColW - 20, revY + 24).stroke();
        doc.font('NotoSerif').fontSize(6).fillColor('#64748b').text('Signature & Date', rX + 20, revY + 26);

        doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text(sig.name, rX + 8, revY + 33, { width: revColW - 16 });
        doc.font('NotoSerif').fontSize(6.5).fillColor('#475569').text(sig.designation, rX + 8, revY + 41, { width: revColW - 16 });
      }

      // Footers
      const range = doc.bufferedPageRange();
      const generatedAtIST = data.generatedAtIST;
      const shortHash = dataHash.substring(0, 12);

      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        if (!data.isFinal) {
          renderDraftWatermark(doc, doc.page.width, doc.page.height);
        }

        doc.strokeColor('#000000').lineWidth(0.5).moveTo(leftMargin, 810).lineTo(leftMargin + contentWidth, 810).stroke();

        doc.font('NotoSerif').fontSize(6.5).fillColor('#333333');
        doc.text(
          `Form A: SEC Startup Assessment · App ID: ${data.applicationId}`,
          leftMargin,
          814,
          { width: 230 }
        );

        doc.text(
          `Page ${i + 1} of ${range.count}`,
          leftMargin,
          814,
          { align: 'center', width: contentWidth }
        );

        doc.text(
          `Generated: ${generatedAtIST} · Hash: ${shortHash}`,
          leftMargin + contentWidth - 230,
          814,
          { align: 'right', width: 230 }
        );
      }

      doc.end();
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 2. FORM B PDF GENERATOR (ADMIN EVALUATION REPORT & SANCTION)
// ─────────────────────────────────────────────────────────────
export async function generateFormBPdf(
  data: FormBData,
  dataHash: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('PDF_GENERATION_TIMEOUT: Form B generation exceeded 15s'));
    }, 15000);

    try {
      const leftMargin = 28;
      const topMargin = 28;
      const contentWidth = 539;
      const maxContentY = 790;

      const doc = new PDFDocument({
        margin: leftMargin,
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

      setupFonts(doc);

      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > maxContentY) {
          doc.addPage();
        }
      };

      const logoPath = path.join(process.cwd(), 'public', 'brand', 'logo.png');

      // Header
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftMargin, topMargin, { width: 110 });
      }

      doc.font('NotoSerifBold').fontSize(12).fillColor('#000000');
      doc.text('FORM B : Grant Evaluation Report', leftMargin + 120, topMargin + 2, { align: 'right', width: contentWidth - 120 });

      doc.font('NotoSerif').fontSize(8).fillColor('#333333');
      doc.text('by Startup Evaluation Committee ( SEC)\n( to be filled in by IDEAPAD )', leftMargin + 120, topMargin + 17, { align: 'right', width: contentWidth - 120 });

      const headerBottomY = topMargin + 48;

      if (!data.isFinal) {
        doc.y = headerBottomY;
        doc.rect(leftMargin, doc.y, contentWidth, 16).fillAndStroke('#fee2e2', '#ef4444');
        doc.font('NotoSerifBold').fontSize(7.5).fillColor('#991b1b');
        doc.text('DRAFT - NOT FOR SIGNATURE · Sanction order pending administrative decision', leftMargin + 6, doc.y + 4);
        doc.y += 20;
      } else {
        doc.y = headerBottomY + 4;
      }

      // Meta Table
      const metaY = doc.y;
      const col1W = 200;
      const col2W = contentWidth - col1W;
      const rowH = 15;

      doc.rect(leftMargin, metaY, col1W, rowH).stroke('#000000');
      doc.rect(leftMargin + col1W, metaY, col2W, rowH).stroke('#000000');
      doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Name of applicant/team/startup', leftMargin + 4, metaY + 3.5);
      doc.font('NotoSerif').fontSize(8.5).fillColor('#000000').text(data.startup.teamName, leftMargin + col1W + 4, metaY + 3.5);

      doc.rect(leftMargin, metaY + rowH, col1W, rowH).stroke('#000000');
      doc.rect(leftMargin + col1W, metaY + rowH, col2W, rowH).stroke('#000000');
      doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Assessment date', leftMargin + 4, metaY + rowH + 3.5);
      doc.font('NotoSerif').fontSize(8.5).fillColor('#000000').text(`${data.sanctionDateIST} (Applicant: ${data.startup.applicantName} · Enrollment: ${data.startup.enrollmentNo})`, leftMargin + col1W + 4, metaY + rowH + 3.5);

      doc.y = metaY + rowH * 2 + 10;

      // Decision table
      ensureSpace(80);
      const decStartY = doc.y;
      const decCol1W = 340;
      const decCol2W = contentWidth - decCol1W;
      const decH1 = 14;

      doc.rect(leftMargin, decStartY, decCol1W, decH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Type of grant', leftMargin + 4, decStartY + 3.5);
      doc.rect(leftMargin + decCol1W, decStartY, decCol2W, decH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Approved grant', leftMargin + decCol1W + 4, decStartY + 3.5, { align: 'center', width: decCol2W - 8 });

      let currDecY = decStartY + decH1;
      const decRowH = 13.5;
      for (const row of data.grantEvaluation.rows) {
        doc.rect(leftMargin, currDecY, decCol1W, decRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(7.5).fillColor('#000000').text(row.label, leftMargin + 4, currDecY + 3);

        doc.rect(leftMargin + decCol1W, currDecY, decCol2W, decRowH).stroke('#000000');
        if (row.approved) {
          doc.font('NotoSerifBold').fontSize(7.5).fillColor('#15803d').text('Approved', leftMargin + decCol1W + 4, currDecY + 3, { align: 'center', width: decCol2W - 8 });
        }
        currDecY += decRowH;
      }

      doc.y = currDecY + 10;

      // Budget headers
      ensureSpace(160);
      doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Grant approved for various headers :', leftMargin, doc.y);
      doc.moveDown(0.3);

      const bStartY = doc.y;
      const bCol1W = 340;
      const bCol2W = contentWidth - bCol1W;
      const bH1 = 14;

      doc.rect(leftMargin, bStartY, bCol1W, bH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Grant approved for', leftMargin + 4, bStartY + 3.5);
      doc.rect(leftMargin + bCol1W, bStartY, bCol2W, bH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('Amount', leftMargin + bCol1W + 4, bStartY + 3.5, { align: 'right', width: bCol2W - 8 });

      let currBY = bStartY + bH1;
      const bRowH = 13.5;
      for (const h of data.sanctionedBudget.headers) {
        doc.rect(leftMargin, currBY, bCol1W, bRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(7.5).fillColor('#000000').text(h.name, leftMargin + 4, currBY + 3);

        doc.rect(leftMargin + bCol1W, currBY, bCol2W, bRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(7.5).fillColor('#000000').text(h.amount, leftMargin + bCol1W + 4, currBY + 3, { align: 'right', width: bCol2W - 8 });
        currBY += bRowH;
      }

      // Total Row
      doc.rect(leftMargin, currBY, bCol1W, bRowH).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('total :', leftMargin + 4, currBY + 3.5);

      doc.rect(leftMargin + bCol1W, currBY, bCol2W, bRowH).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text(data.sanctionedBudget.totalAmount, leftMargin + bCol1W + 4, currBY + 3.5, { align: 'right', width: bCol2W - 8 });
      currBY += bRowH;

      if (data.sanctionedBudget.rangeNotice) {
        doc.y = currBY + 4;
        doc.font('NotoSerif').fontSize(7).fillColor('#b45309').text(data.sanctionedBudget.rangeNotice, leftMargin + 4, doc.y);
        doc.y += 10;
      } else {
        doc.y = currBY + 10;
      }

      // Approved timeline
      ensureSpace(160);
      doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Approved timeline :', leftMargin, doc.y);
      doc.moveDown(0.3);

      const tStartY = doc.y;
      const tCol1W = 150;
      const tCol2W = 240;
      const tCol3W = contentWidth - tCol1W - tCol2W;
      const tH1 = 14;

      doc.rect(leftMargin, tStartY, tCol1W, tH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('date type', leftMargin + 4, tStartY + 3.5);
      doc.rect(leftMargin + tCol1W, tStartY, tCol2W, tH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('description', leftMargin + tCol1W + 4, tStartY + 3.5);
      doc.rect(leftMargin + tCol1W + tCol2W, tStartY, tCol3W, tH1).fillAndStroke('#f8fafc', '#000000');
      doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text('calander dates', leftMargin + tCol1W + tCol2W + 4, tStartY + 3.5, { align: 'center', width: tCol3W - 8 });

      let currTY = tStartY + tH1;
      const tRowH = 15;
      for (const t of data.timeline) {
        doc.rect(leftMargin, currTY, tCol1W, tRowH).stroke('#000000');
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(t.label, leftMargin + 4, currTY + 4);

        doc.rect(leftMargin + tCol1W, currTY, tCol2W, tRowH).stroke('#000000');
        doc.font('NotoSerif').fontSize(6.5).fillColor('#333333').text(t.description, leftMargin + tCol1W + 4, currTY + 3, { width: tCol2W - 8, height: tRowH - 4 });

        doc.rect(leftMargin + tCol1W + tCol2W, currTY, tCol3W, tRowH).stroke('#000000');
        doc.font('NotoSerifBold').fontSize(7).fillColor('#000000').text(t.dateIST, leftMargin + tCol1W + tCol2W + 4, currTY + 4, { align: 'center', width: tCol3W - 8 });
        currTY += tRowH;
      }

      doc.y = currTY + 10;

      // Final Recommendation Note from SEC
      ensureSpace(60);
      doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Final Recommendation Note from SEC :', leftMargin, doc.y);
      doc.moveDown(0.2);

      const rBoxY = doc.y;
      doc.rect(leftMargin, rBoxY, contentWidth, 30).stroke('#000000');
      doc.font('NotoSerif').fontSize(7).fillColor('#1e293b').text(data.secRecommendationNote, leftMargin + 6, rBoxY + 5, { width: contentWidth - 12 });
      doc.y = rBoxY + 36;

      // Terms and conditions
      ensureSpace(70);
      doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Terms and conditions :', leftMargin, doc.y);
      doc.moveDown(0.2);

      for (const tc of data.termsAndConditions) {
        doc.font('NotoSerif').fontSize(7).fillColor('#1f2937');
        doc.text(`• ${tc}`, leftMargin + 6, doc.y);
        doc.moveDown(0.15);
      }
      doc.moveDown(0.3);

      // Approved By:
      ensureSpace(80);
      doc.font('NotoSerifBold').fontSize(8.5).fillColor('#000000').text('Approved By:', leftMargin, doc.y);
      doc.moveDown(0.3);

      const appY = doc.y;
      const appCount = data.approvalBlock.length;
      const appColW = Math.floor(contentWidth / Math.max(1, appCount));
      const appBoxH = 55;

      for (let i = 0; i < appCount; i++) {
        const sig = data.approvalBlock[i];
        const aX = leftMargin + i * appColW;
        doc.rect(aX, appY, appColW, appBoxH).stroke('#000000');

        doc.strokeColor('#000000').lineWidth(0.5).moveTo(aX + 15, appY + 26).lineTo(aX + appColW - 15, appY + 26).stroke();
        doc.font('NotoSerif').fontSize(6).fillColor('#64748b').text('Signature & Date', aX + 15, appY + 28);

        if (sig.hasName) {
          doc.font('NotoSerifBold').fontSize(7.5).fillColor('#000000').text(sig.name, aX + 6, appY + 36, { width: appColW - 12 });
          doc.font('NotoSerif').fontSize(6.5).fillColor('#475569').text(sig.designation, aX + 6, appY + 45, { width: appColW - 12 });
        } else {
          doc.strokeColor('#000000').lineWidth(0.5).moveTo(aX + 10, appY + 41).lineTo(aX + appColW - 10, appY + 41).stroke();
          doc.font('NotoSerif').fontSize(6.5).fillColor('#475569').text(sig.designation, aX + 6, appY + 44, { width: appColW - 12 });
        }
      }

      // Footers
      const range = doc.bufferedPageRange();
      const generatedAtIST = data.generatedAtIST;
      const shortHash = dataHash.substring(0, 12);

      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        if (!data.isFinal) {
          renderDraftWatermark(doc, doc.page.width, doc.page.height);
        }

        doc.strokeColor('#000000').lineWidth(0.5).moveTo(leftMargin, 810).lineTo(leftMargin + contentWidth, 810).stroke();

        doc.font('NotoSerif').fontSize(6.5).fillColor('#333333');
        doc.text(
          `Form B: Grant Evaluation Report · App ID: ${data.applicationId}`,
          leftMargin,
          814,
          { width: 230 }
        );

        doc.text(
          `Page ${i + 1} of ${range.count}`,
          leftMargin,
          814,
          { align: 'center', width: contentWidth }
        );

        doc.text(
          `Generated: ${generatedAtIST} · Hash: ${shortHash}`,
          leftMargin + contentWidth - 230,
          814,
          { align: 'right', width: 230 }
        );
      }

      doc.end();
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 3. STARTUP APPLICATION PDF GENERATOR (POLICY P6)
// ─────────────────────────────────────────────────────────────
export async function generateApplicationPdf(
  data: CanonicalApplicationData,
  dataHash: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('PDF_GENERATION_TIMEOUT: Application PDF exceeded 15s'));
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

      setupFonts(doc);

      const fontRegular = 'NotoSerif';
      const fontBold = 'NotoSerifBold';

      const logoPath = path.join(process.cwd(), 'public', 'brand', 'logo.png');
      const contentWidth = 515;
      const leftMargin = 40;

      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > 760) {
          doc.addPage();
        }
      };

      const writeText = (
        text: string,
        options: PDFKit.Mixins.TextOptions = {},
        isBold = false
      ) => {
        writeBilingualText(doc, text, options, isBold, true);
      };

      const renderSectionHeader = (title: string) => {
        ensureSpace(40);
        doc.moveDown(0.8);
        const y = doc.y;
        doc
          .rect(leftMargin, y, contentWidth, 20)
          .fillAndStroke('#f1f5f9', '#cbd5e1');
        doc
          .fontSize(10)
          .fillColor('#0f172a');
        doc.text('', leftMargin + 8, y + 5);
        writeText(title, {}, true);
        doc.y = y + 26;
      };

      const renderKeyValue = (key: string, val: string, fullWidth = false) => {
        ensureSpace(18);
        doc.font(fontBold).fontSize(8.5).fillColor('#475569').text(key + ': ', { continued: true });
        doc.fillColor('#0f172a');
        writeText(val || '—', {}, false);
      };

      // Header
      const headerTop = 40;
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftMargin, headerTop, { width: 130 });
      }

      doc
        .font(fontBold)
        .fontSize(13)
        .fillColor('#0f172a')
        .text('IDEAPAD – SEED GRANT APPLICATION FORM', leftMargin + 140, headerTop + 2, { align: 'right', width: contentWidth - 140 });

      doc
        .font(fontRegular)
        .fontSize(8.5)
        .fillColor('#64748b')
        .text('Grants for upgrading TRL/MRL/IRL status of startups', leftMargin + 140, headerTop + 20, { align: 'right', width: contentWidth - 140 });

      doc
        .font(fontRegular)
        .fontSize(8)
        .fillColor('#475569')
        .text(`App ID: ${data.applicationId} · Version: v${data.version} · Status: ${data.status}`, leftMargin + 140, headerTop + 33, { align: 'right', width: contentWidth - 140 });

      doc.y = 85;
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(leftMargin, 85).lineTo(leftMargin + contentWidth, 85).stroke();

      // Overview Box
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

      doc.font(fontBold).text('Verification Hash:', leftMargin + 270, boxY + 24, { continued: true });
      doc.font(fontRegular).text(` ${dataHash.substring(0, 12)}`);

      doc.y = boxY + 50;

      // 1. Applicant & Startup Details
      renderSectionHeader('1. Applicant & Startup Details');
      renderKeyValue('Name of Applicant (Team Leader)', data.startup.applicantName);
      renderKeyValue('Enrollment No.', data.startup.enrollmentNo);
      renderKeyValue('Program & Department', `${data.startup.program} · ${data.startup.department || '—'}`);
      renderKeyValue('Team / Startup Name', data.startup.teamName);
      renderKeyValue('Contact Phone', data.startup.phone);
      renderKeyValue('Official Email', data.startup.applicantEmail);

      // 2. Grant Policy Agreement
      renderSectionHeader('Grant Policy Agreement Acceptance');
      if (data.agreement) {
        renderKeyValue('Policy Agreement Version', data.agreement.version);
        renderKeyValue('Accepted By', data.agreement.acceptedByName);
        renderKeyValue('Accepted At (IST)', data.agreement.acceptedAtIST);
        renderKeyValue('Agreement Terms Hash', data.agreement.textHash);
      } else {
        doc.font(fontRegular).fontSize(8.5).fillColor('#64748b').text('Agreement record pending.');
      }

      // 3. Problem Statement
      renderSectionHeader('2. What is the problem you are solving');
      ensureSpace(30);
      writeText(data.concept.problemStatement || 'Not provided', { width: contentWidth });

      // 4. Proposed Solution
      renderSectionHeader('3. Summarize your proposed solution');
      ensureSpace(30);
      writeText(data.concept.proposedSolution || 'Not provided', { width: contentWidth });

      // 5. Effort & Traction
      renderSectionHeader('4. Summarize your effort and traction so far');
      ensureSpace(30);
      writeText(data.concept.effortAndTraction || 'Not provided', { width: contentWidth });
      renderKeyValue('Has Received Prior Seed Grant', data.concept.hasReceivedGrantBefore ? 'YES' : 'NO');

      // 6. 10 Experiment Definition Headings
      renderSectionHeader('5. Experiment Definition & Proof of Concept Plan');
      const expHeadings = [
        { label: '1. Objective (Hypothesis / concept tested)', val: data.experiment.objective },
        { label: '2. Problem Statement (Gap addressed)', val: data.experiment.problemStatement },
        { label: '3. Expected Outcome (Desired metric)', val: data.experiment.expectedOutcome },
        { label: '4. Methodology (Experimental approach)', val: data.experiment.methodology },
        { label: '5. Experimental Setup (Equipment & apparatus)', val: data.experiment.experimentalSetup },
        { label: '6. Data to be Collected (Primary measurements)', val: data.experiment.dataToBeCollected },
        { label: '7. Validation Criteria (Success thresholds)', val: data.experiment.validationCriteria },
        { label: '8. Risks and Assumptions (Key dependencies)', val: data.experiment.risksAndAssumptions },
        { label: '9. Timeline (Milestones & work schedule)', val: data.experiment.timeline },
        { label: '10. Deliverables (Prototypes, datasets, reports)', val: data.experiment.deliverables },
      ];

      for (const h of expHeadings) {
        ensureSpace(35);
        doc.moveDown(0.4);
        doc.font(fontBold).fontSize(8.5).fillColor('#1e293b').text(h.label);
        doc.moveDown(0.2);
        doc.font(fontRegular).fontSize(8).fillColor('#334155');
        writeText(h.val || 'Not provided', { width: contentWidth });
      }

      // 7. Budget Breakdown
      renderSectionHeader('6. Detailed Requirement for this Experiment (Annexure 1)');
      ensureSpace(40);

      const tableTop = doc.y + 4;
      doc.rect(leftMargin, tableTop, contentWidth, 16).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.font(fontBold).fontSize(7.5).fillColor('#334155');
      doc.text('S.No', leftMargin + 4, tableTop + 4, { width: 24 });
      doc.text('Header / Description', leftMargin + 32, tableTop + 4, { width: 220 });
      doc.text('Vendor', leftMargin + 256, tableTop + 4, { width: 90 });
      doc.text('Unit Cost', leftMargin + 350, tableTop + 4, { width: 55, align: 'right' });
      doc.text('Qty', leftMargin + 410, tableTop + 4, { width: 25, align: 'right' });
      doc.text('Total (₹)', leftMargin + 440, tableTop + 4, { width: 70, align: 'right' });

      doc.y = tableTop + 16;

      for (const item of data.budget.items) {
        ensureSpace(18);
        const y = doc.y;
        doc.rect(leftMargin, y, contentWidth, 16).stroke('#e2e8f0');
        doc.font(fontRegular).fontSize(7).fillColor('#0f172a');
        doc.text(String(item.sno), leftMargin + 4, y + 4, { width: 24 });

        const desc = `[${item.headerName}] ${item.name}`;
        writeText(desc, { width: 220, height: 12, lineBreak: false });

        doc.font(fontRegular).text(item.vendor, leftMargin + 256, y + 4, { width: 90, height: 12, lineBreak: false });
        doc.text(`₹${item.unitCost.toLocaleString('en-IN')}`, leftMargin + 350, y + 4, { width: 55, align: 'right' });
        doc.text(String(item.qty), leftMargin + 410, y + 4, { width: 25, align: 'right' });
        doc.font(fontBold).text(`₹${item.total.toLocaleString('en-IN')}`, leftMargin + 440, y + 4, { width: 70, align: 'right' });
        doc.y = y + 16;
      }

      // Budget Totals Summary Box
      ensureSpace(40);
      const sumY = doc.y + 4;
      doc.rect(leftMargin, sumY, contentWidth, 32).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.font(fontRegular).fontSize(8).fillColor('#334155');
      doc.text(`Non-Contingency: ₹${data.budget.nonContingencyTotal.toLocaleString('en-IN')}`, leftMargin + 10, sumY + 8);
      doc.text(`Contingency (${data.budget.contingencyPercentage.toFixed(1)}%): ₹${data.budget.contingencyTotal.toLocaleString('en-IN')}`, leftMargin + 180, sumY + 8);
      doc.font(fontBold).fontSize(9).fillColor('#0f172a');
      doc.text(`Grand Total: ₹${data.budget.grandTotal.toLocaleString('en-IN')}`, leftMargin + 360, sumY + 8, { align: 'right', width: 140 });
      doc.y = sumY + 38;

      // 8. Itemized Justifications
      renderSectionHeader('7. Justification for Each Item (By Serial Number)');
      for (const item of data.budget.items) {
        ensureSpace(22);
        doc.font(fontBold).fontSize(8).fillColor('#1e293b').text(`Item ${item.sno} (${item.name}): `, { continued: true });
        doc.font(fontRegular).fillColor('#475569');
        writeText(item.justification || 'Standard operational requirement.', { width: contentWidth });
      }

      // 9. Self Assessment
      renderSectionHeader('8. Self Assessment of Project Status');
      renderKeyValue('Technology Readiness Level (TRL)', `Level ${data.selfAssessment.trl}: ${data.selfAssessment.trlLabel}`);
      renderKeyValue('Manufacturing Readiness Level (MRL)', `Level ${data.selfAssessment.mrl}: ${data.selfAssessment.mrlLabel}`);
      renderKeyValue('Integration Readiness Level (IRL)', `Level ${data.selfAssessment.irl}: ${data.selfAssessment.irlLabel}`);
      renderKeyValue('Evaluation Track', data.selfAssessment.trackLabel);

      renderSectionHeader('9. Self Assessment of Milestones');
      for (const m of data.selfAssessment.milestones) {
        ensureSpace(16);
        doc.font(fontBold).fontSize(8).fillColor('#1e293b').text(`• ${m.name}: `, { continued: true });
        doc.font(fontRegular).fillColor(m.status === 'COMPLETED' ? '#15803d' : '#b45309').text(`[${m.status}] `, { continued: true });
        doc.font(fontRegular).fillColor('#475569');
        writeText(m.remarks || 'No remarks entered.');
      }

      // 10. Documents & Team
      renderSectionHeader('10. Team Members & Uploaded Documents Registry');
      doc.font(fontBold).fontSize(8).fillColor('#1e293b').text('Team Members: ');
      doc.font(fontRegular).fontSize(8).fillColor('#475569').text(data.team.map((t) => t.name).join(', ') || 'N/A');
      doc.moveDown(0.4);

      doc.font(fontBold).fontSize(8).fillColor('#1e293b').text('Uploaded Documents:');
      for (const docItem of data.documents) {
        ensureSpace(14);
        doc.font(fontRegular).fontSize(7.5).fillColor('#334155');
        const memberInfo = docItem.memberLabel ? ` (${docItem.memberLabel})` : '';
        doc.text(`• [${docItem.typeName}] ${docItem.fileName}${memberInfo}`);
      }

      // 11. Final Declaration
      renderSectionHeader('11. Applicant Declaration & Sign-off');
      ensureSpace(40);
      doc.font(fontRegular).fontSize(8).fillColor('#334155').text(
        '“I hereby declare that all information provided is true and the requested grant amount will be used strictly for the stated purpose.”',
        { width: contentWidth }
      );
      doc.moveDown(0.6);

      if (data.declaration) {
        doc.font(fontBold).fontSize(8.5).fillColor('#15803d');
        doc.text('✓ Electronically Signed by: ', { continued: true });
        writeText(data.declaration.declaredByName, {}, true);
        doc.font(fontRegular).fontSize(8).fillColor('#475569');
        doc.text(`Signature Timestamp: ${data.declaration.declaredAtIST}`);
      } else {
        doc.font(fontRegular).fontSize(8).fillColor('#b91c1c').text('Declaration signature pending.');
      }

      // Running footers
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
          leftMargin + contentWidth - 230,
          798,
          { align: 'right', width: 230 }
        );
      }

      doc.end();
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}
