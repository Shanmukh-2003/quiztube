import { jsPDF } from 'jspdf';

const ACCENT = [0, 200, 255];
const DARK = [5, 13, 26];
const TEXT = [220, 232, 245];
const MUTED = [94, 122, 153];
const SUCCESS = [0, 229, 160];
const WARNING = [255, 184, 48];

export async function generateStudyGuidePDF(guide) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = W - margin * 2;
  let y = 0;

  function newPage() {
    doc.addPage();
    y = margin;
    // Subtle header line on every page
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(margin, 8, W - margin, 8);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('QuizTube Study Guide', margin, 6);
    doc.text(guide.video_title, W - margin, 6, { align: 'right' });
  }

  function checkPageBreak(needed = 10) {
    if (y + needed > H - margin) newPage();
  }

  function text(str, x, fontSize, color, opts = {}) {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(str, opts.maxWidth ?? contentW);
    checkPageBreak(lines.length * (fontSize * 0.4) + 4);
    doc.text(lines, x, y, opts);
    y += lines.length * (fontSize * 0.4) + (opts.gap ?? 3);
    return lines.length;
  }

  function sectionHeading(label) {
    checkPageBreak(14);
    y += 4;
    doc.setFillColor(...ACCENT);
    doc.roundedRect(margin, y - 4, contentW, 9, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setTextColor(5, 13, 26);
    doc.setFont(undefined, 'bold');
    doc.text(label.toUpperCase(), margin + 4, y + 2);
    doc.setFont(undefined, 'normal');
    y += 10;
  }

  function bullet(str, indent = 4, color = MUTED) {
    checkPageBreak(8);
    doc.setFontSize(10);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize('• ' + str, contentW - indent);
    doc.text(lines, margin + indent, y);
    y += lines.length * 4.5 + 1;
  }

  function divider() {
    checkPageBreak(6);
    y += 2;
    doc.setDrawColor(...[30, 48, 80]);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 4;
  }

  // ── Cover page ─────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, H, 'F');

  // Accent bar top
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, W, 3, 'F');

  // Logo-ish circle
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(2);
  doc.circle(W / 2, 70, 18, 'S');
  doc.setFillColor(...ACCENT);
  // Play triangle approximation
  doc.triangle(W / 2 - 5, 63, W / 2 - 5, 77, W / 2 + 9, 70, 'F');

  doc.setFontSize(10);
  doc.setTextColor(...ACCENT);
  doc.setFont(undefined, 'bold');
  doc.text('QUIZTUBE', W / 2, 97, { align: 'center' });

  doc.setFontSize(20);
  doc.setTextColor(...TEXT);
  doc.setFont(undefined, 'bold');
  const titleLines = doc.splitTextToSize(guide.video_title, W - 40);
  doc.text(titleLines, W / 2, 112, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.setFont(undefined, 'normal');
  doc.text('AI-Generated Study Guide', W / 2, 112 + titleLines.length * 8 + 6, { align: 'center' });

  const dateStr = new Date(guide.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(9);
  doc.text(`Generated on ${dateStr}`, W / 2, H - 20, { align: 'center' });

  doc.setFillColor(...ACCENT);
  doc.rect(0, H - 3, W, 3, 'F');

  // ── Page 2: Overview ───────────────────────────────────────
  newPage();

  // Learning objectives
  if (guide.learning_objectives?.length) {
    sectionHeading('Learning Objectives');
    guide.learning_objectives.forEach(obj => bullet(obj, 4, TEXT));
    y += 4;
  }

  divider();

  // Overview
  sectionHeading('Overview');
  doc.setFont(undefined, 'normal');
  text(guide.overview, margin, 10.5, TEXT, { gap: 5 });
  y += 2;

  // ── Sections ───────────────────────────────────────────────
  if (guide.sections?.length) {
    guide.sections.forEach((section, idx) => {
      checkPageBreak(20);
      y += 3;

      // Section heading
      doc.setFontSize(12);
      doc.setTextColor(...ACCENT);
      doc.setFont(undefined, 'bold');
      checkPageBreak(10);
      doc.text(`${idx + 1}. ${section.heading}`, margin, y);
      y += 7;

      // Content
      doc.setFont(undefined, 'normal');
      text(section.content, margin, 10.5, TEXT, { gap: 5 });

      // Key terms
      if (section.key_terms?.length) {
        checkPageBreak(10);
        doc.setFontSize(9);
        doc.setTextColor(...ACCENT);
        doc.setFont(undefined, 'bold');
        doc.text('Key Terms', margin + 2, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        section.key_terms.forEach(kt => {
          checkPageBreak(7);
          doc.setFontSize(9.5);
          doc.setTextColor(...WARNING);
          doc.setFont(undefined, 'bold');
          const termW = doc.getTextWidth(kt.term + ': ');
          doc.text(kt.term + ': ', margin + 4, y);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(...MUTED);
          const defLines = doc.splitTextToSize(kt.definition, contentW - 4 - termW);
          doc.text(defLines, margin + 4 + termW, y);
          y += defLines.length * 4 + 2;
        });
        y += 2;
      }

      // Examples
      if (section.examples?.length) {
        checkPageBreak(8);
        doc.setFontSize(9);
        doc.setTextColor(...SUCCESS);
        doc.setFont(undefined, 'bold');
        doc.text('Examples', margin + 2, y);
        y += 5;
        section.examples.forEach(ex => bullet(ex, 4, [180, 220, 210]));
        y += 2;
      }

      divider();
    });
  }

  // ── Concept Map ────────────────────────────────────────────
  if (guide.concept_map?.length) {
    sectionHeading('Concept Map');
    guide.concept_map.forEach(rel => bullet(rel, 4, TEXT));
    y += 4;
  }

  // ── Common Mistakes ────────────────────────────────────────
  if (guide.common_mistakes?.length) {
    checkPageBreak(14);
    sectionHeading('Common Mistakes to Avoid');
    guide.common_mistakes.forEach(m => bullet(m, 4, [255, 120, 120]));
    y += 4;
  }

  // ── Practice Questions ─────────────────────────────────────
  if (guide.practice_questions?.length) {
    checkPageBreak(14);
    sectionHeading('Practice Questions');
    guide.practice_questions.forEach((pq, i) => {
      checkPageBreak(18);
      doc.setFontSize(10.5);
      doc.setTextColor(...TEXT);
      doc.setFont(undefined, 'bold');
      const qLines = doc.splitTextToSize(`Q${i + 1}: ${pq.question}`, contentW);
      checkPageBreak(qLines.length * 5 + 2);
      doc.text(qLines, margin, y);
      y += qLines.length * 4.5 + 2;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...SUCCESS);
      const aLines = doc.splitTextToSize(`Answer: ${pq.answer}`, contentW - 4);
      checkPageBreak(aLines.length * 4.5 + 4);
      doc.text(aLines, margin + 4, y);
      y += aLines.length * 4.5 + 5;
    });
  }

  // ── Quiz Questions (if any from existing quiz) ─────────────
  if (guide.quiz_questions?.length) {
    checkPageBreak(14);
    sectionHeading('Quiz Questions');
    guide.quiz_questions.forEach((q, i) => {
      checkPageBreak(30);
      doc.setFontSize(10.5);
      doc.setTextColor(...TEXT);
      doc.setFont(undefined, 'bold');
      const qLines = doc.splitTextToSize(`${i + 1}. ${q.question}`, contentW);
      doc.text(qLines, margin, y);
      y += qLines.length * 4.5 + 2;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9.5);
      q.options?.forEach((opt, oi) => {
        const isCorrect = oi === q.correct;
        checkPageBreak(6);
        doc.setTextColor(...(isCorrect ? SUCCESS : MUTED));
        const label = ['A', 'B', 'C', 'D'][oi];
        doc.text(`${isCorrect ? '✓ ' : '  '}${label}. ${opt}`, margin + 6, y);
        y += 5;
      });
      if (q.explanation) {
        checkPageBreak(8);
        doc.setFontSize(9);
        doc.setTextColor(94, 140, 120);
        const expLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, contentW - 6);
        doc.text(expLines, margin + 6, y);
        y += expLines.length * 4 + 4;
      }
      y += 2;
    });
  }

  // ── Summary ────────────────────────────────────────────────
  checkPageBreak(20);
  sectionHeading('Summary');
  doc.setFont(undefined, 'italic');
  text(guide.summary, margin, 10.5, TEXT, { gap: 5 });
  doc.setFont(undefined, 'normal');

  // ── Next Steps ─────────────────────────────────────────────
  if (guide.next_steps?.length) {
    checkPageBreak(14);
    sectionHeading('Next Steps');
    guide.next_steps.forEach(step => bullet(step, 4, TEXT));
  }

  // ── Footer on last page ────────────────────────────────────
  y += 8;
  checkPageBreak(12);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Generated by QuizTube AI · ${dateStr} · youtube.com/watch?v=${guide.youtube_id}`, margin, y);

  // ── Page numbers ───────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${totalPages}`, W - margin, H - 6, { align: 'right' });
  }

  const filename = `QuizTube_${guide.video_title.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}_StudyGuide.pdf`;
  doc.save(filename);
}
