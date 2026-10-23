import { jsPDF } from 'jspdf';

/**
 * jsPDF 기본 폰트(Helvetica)는 Latin-1만 지원해서 한글이 깨진다.
 * 한글이 섞인 값은 브라우저 캔버스에 그린 뒤 이미지로 삽입해 정상 출력한다.
 */
const NON_LATIN = /[^\u0000-\u00FF]/;
const PT_TO_MM = 25.4 / 72;
const CANVAS_FONT_PX = 48; // 축소 삽입되므로 크게 그려야 선명하다

const FONT_STACK = "'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

function textToImage(text, bold) {
  try {
    const canvas = document.createElement('canvas');
    const measureCtx = canvas.getContext('2d');
    if (!measureCtx) return null;
    const font = `${bold ? '700 ' : ''}${CANVAS_FONT_PX}px ${FONT_STACK}`;
    measureCtx.font = font;
    const width = Math.ceil(measureCtx.measureText(text).width) + 2;
    const height = Math.ceil(CANVAS_FONT_PX * 1.3);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, 1, CANVAS_FONT_PX);
    return { dataUrl: canvas.toDataURL('image/png'), width, height };
  } catch {
    return null;
  }
}

function drawText(doc, text, x, y, { size = 10, bold = false } = {}) {
  const value = text == null ? '' : String(text);
  if (!value) return;
  doc.setFontSize(size);
  if (!NON_LATIN.test(value)) {
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    doc.text(value, x, y);
    return;
  }
  const img = textToImage(value, bold);
  if (!img) {
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    doc.text(value, x, y);
    return;
  }
  const mmPerPx = (size * PT_TO_MM) / CANVAS_FONT_PX;
  doc.addImage(img.dataUrl, 'PNG', x, y - size * PT_TO_MM, img.width * mmPerPx, img.height * mmPerPx);
}

/**
 * 번호 + 이름 형태의 명단 PDF를 만들어 다운로드한다.
 *
 * @param {object} opts
 * @param {string} opts.title        문서 상단 제목
 * @param {string} [opts.subtitle]   제목 아래 보조 문구 (날짜 등)
 * @param {Array}  opts.columns      [{ key, header, x }]
 * @param {Array}  opts.rows         컬럼 key 를 가진 데이터 배열
 * @param {string} [opts.totalLabel] 마지막 합계 문구
 * @param {string} opts.fileName     저장 파일명 (.pdf 포함)
 */
export function generateListPdf({ title, subtitle, columns, rows, totalLabel, fileName }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const MARGIN_X = 14;
  const RIGHT_X = 196;
  const BOTTOM_Y = 282;
  const ROW_H = 8;

  let y = 0;
  let page = 1;

  const drawPageHead = (withTitle) => {
    y = 18;
    if (withTitle) {
      drawText(doc, title, MARGIN_X, y, { size: 16, bold: true });
      if (subtitle) {
        y += 7;
        drawText(doc, subtitle, MARGIN_X, y, { size: 10 });
      }
      y += 10;
    } else {
      drawText(doc, title, MARGIN_X, y, { size: 11, bold: true });
      y += 10;
    }
    columns.forEach(col => drawText(doc, col.header, col.x, y, { size: 10, bold: true }));
    doc.setDrawColor(150);
    doc.line(MARGIN_X, y + 2, RIGHT_X, y + 2);
  };

  const stampPageNumber = () => drawText(doc, `Page ${page}`, RIGHT_X - 15, 290, { size: 8 });

  drawPageHead(true);

  rows.forEach((row) => {
    y += ROW_H;
    if (y > BOTTOM_Y) {
      stampPageNumber();
      doc.addPage();
      page += 1;
      drawPageHead(false);
      y += ROW_H;
    }
    columns.forEach(col => drawText(doc, row[col.key] || '-', col.x, y, { size: 10 }));
  });

  if (totalLabel) {
    y += ROW_H + 4;
    if (y > BOTTOM_Y) {
      stampPageNumber();
      doc.addPage();
      page += 1;
      y = 20;
    }
    drawText(doc, totalLabel, MARGIN_X, y, { size: 9 });
  }

  stampPageNumber();
  doc.save(fileName);
}

/**
 * 그룹(조)마다 박스로 묶은 명단 PDF. 그룹 제목은 박스 위에, 박스 안에는 헤더 + 행.
 * 박스가 페이지 경계에서 잘리지 않도록 남은 공간이 모자라면 다음 페이지로 넘긴다.
 *
 * @param {Array} opts.columns  [{ key, header, x }]  — x 는 페이지 기준 mm
 * @param {Array} opts.groups   [{ label, tag, rows }]
 */
export function generateGroupedPdf({ title, subtitle, columns, groups, totalLabel, fileName }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const LEFT = 14;
  const RIGHT = 196;
  const BOTTOM_Y = 282;
  const ROW_H = 7;
  const TITLE_H = 7;   // 그룹 제목 줄
  const GAP = 7;       // 박스 사이 간격

  let y = 18;
  let page = 1;
  const stampPageNumber = () => drawText(doc, `Page ${page}`, RIGHT - 15, 290, { size: 8 });
  const newPage = () => { stampPageNumber(); doc.addPage(); page += 1; y = 18; };

  drawText(doc, title, LEFT, y, { size: 16, bold: true });
  if (subtitle) { y += 7; drawText(doc, subtitle, LEFT, y, { size: 10 }); }
  y += 12;

  groups.forEach(({ label, tag, rows }) => {
    const boxH = 9 + ROW_H * rows.length;
    if (y + TITLE_H + boxH > BOTTOM_Y) newPage();

    // 그룹 제목 + 구분 태그 (박스 위)
    drawText(doc, label, LEFT, y, { size: 12, bold: true });
    if (tag) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      const tagX = LEFT + doc.getTextWidth(label) + 3;
      doc.setTextColor(100);
      drawText(doc, tag, tagX, y, { size: 10 });
      doc.setTextColor(0);
    }

    const top = y + 3;
    doc.setDrawColor(170);
    doc.setLineWidth(0.3);
    doc.roundedRect(LEFT, top, RIGHT - LEFT, boxH, 2, 2);

    const headY = top + 6;
    columns.forEach(col => drawText(doc, col.header, col.x, headY, { size: 9, bold: true }));
    doc.setDrawColor(220);
    doc.line(LEFT, headY + 2, RIGHT, headY + 2);

    rows.forEach((row, i) => {
      columns.forEach(col => drawText(doc, row[col.key] || '', col.x, headY + ROW_H * (i + 1), { size: 10 }));
    });

    y = top + boxH + GAP + TITLE_H - 2;
  });

  if (totalLabel) {
    if (y > BOTTOM_Y) newPage();
    drawText(doc, totalLabel, LEFT, y, { size: 9 });
  }

  stampPageNumber();
  doc.save(fileName);
}

/**
 * 골프링크(Golflink) 번호가 등록된 회원만 뽑아 번호 · 이름 순서로 PDF 생성.
 * 이름은 GA 등록명이 있으면 그것을, 없으면 회원 이름을 쓴다.
 *
 * @returns {{ exported: number, missing: string[] }}
 */
export function generateGolflinkPdf(members = []) {
  const withNumber = [];
  const missing = [];

  members.forEach((m) => {
    if (m.isActive === false || m.approvalStatus === 'pending' || m.isGuest) return;
    const number = (m.golflinkNumber || '').toString().trim();
    const name = (m.gaRegisteredName || '').toString().trim() || (m.name || '').toString().trim();
    if (number) withNumber.push({ number, name: name || '-' });
    else missing.push(m.name || m.nickname || '-');
  });

  withNumber.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  if (withNumber.length === 0) return { exported: 0, missing };

  const today = new Date();
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  generateListPdf({
    title: '3355 GOLF CLUB',
    subtitle: `Golflink Member List · ${stamp}`,
    columns: [
      { key: 'number', header: 'Golflink Number', x: 14 },
      { key: 'name', header: 'Name', x: 80 },
    ],
    rows: withNumber,
    totalLabel: `Total: ${withNumber.length} members`,
    fileName: `3355_Golflink_List_${stamp}.pdf`,
  });

  return { exported: withNumber.length, missing };
}
