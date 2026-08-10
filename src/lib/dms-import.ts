import ExcelJS from 'exceljs';

export interface DmsUserRow {
  externalUserId: string | null;
  userName: string | null;
  email: string | null;
  status: string;
  sourceFile: string;
}

export interface DmsIndexRow {
  userId: string;
  documentCount: number;
  month: string;
  sourceFile: string;
}

type ParsedSheet =
  | { kind: 'users'; rows: DmsUserRow[]; rejected: number }
  | { kind: 'index'; rows: DmsIndexRow[]; rejected: number };

function text(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '').trim();
    if ('result' in value) return String(value.result ?? '').trim();
    if ('richText' in value) return value.richText.map((part) => part.text).join('').trim();
  }
  return String(value).trim();
}

function key(value: ExcelJS.CellValue) {
  return text(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeStatus(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('inactive')) return 'In Active';
  if (normalized.includes('active')) return 'Active';
  return value || 'Unknown';
}

export async function parseDmsFile(file: File): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`${file.name} does not contain a worksheet.`);

  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => headers.set(key(cell.value), column));
  const column = (name: string) => headers.get(name);
  const value = (row: ExcelJS.Row, name: string) => {
    const index = column(name);
    return index ? text(row.getCell(index).value) : '';
  };

  if (column('noofdocuments') && column('month')) {
    const rows: DmsIndexRow[] = [];
    let rejected = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const userId = value(row, 'username');
      const month = value(row, 'month');
      const documentCount = Number(value(row, 'noofdocuments').replace(/,/g, ''));
      if (!userId || !month || !Number.isFinite(documentCount)) {
        rejected += 1;
        return;
      }
      rows.push({ userId, month, documentCount: Math.trunc(documentCount), sourceFile: file.name });
    });
    return { kind: 'index', rows, rejected };
  }

  if (column('status') && (column('email') || column('userid'))) {
    const rows: DmsUserRow[] = [];
    let rejected = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const status = value(row, 'status');
      if (!status) {
        rejected += 1;
        return;
      }
      rows.push({
        externalUserId: value(row, 'userid') || null,
        userName: value(row, 'username') || null,
        email: value(row, 'email') || null,
        status: normalizeStatus(status),
        sourceFile: file.name,
      });
    });
    return { kind: 'users', rows, rejected };
  }

  throw new Error(`${file.name} is not a recognized DMS index or user report.`);
}
