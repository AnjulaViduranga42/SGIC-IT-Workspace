import ExcelJS from 'exceljs';

export interface SalvageStockRow {
  entryDate: Date; itemCode: string; itemName: string; stockUom: string | null;
  inQty: number; outQty: number; balanceQty: number; warehouse: string;
  itemGroup: string | null; voucherType: string | null; voucherNo: string | null; sourceFile: string;
}
export interface SalvageLoginRow {
  userName: string; email: string; lastLoginAt: Date | null; ipAddress: string | null; sourceFile: string;
}
type Parsed = { kind: 'stock'; rows: SalvageStockRow[]; rejected: number } | { kind: 'login'; rows: SalvageLoginRow[]; rejected: number };

function display(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '').trim();
    if ('result' in value) return String(value.result ?? '').trim();
    if ('richText' in value) return value.richText.map((part) => part.text).join('').trim();
  }
  return String(value).trim();
}
const headerKey = (value: ExcelJS.CellValue) => display(value).toLowerCase().replace(/[^a-z0-9]/g, '');
function cellDate(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(display(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function parseSalvageFile(file: File): Promise<Parsed> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`${file.name} does not contain a worksheet.`);
  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => headers.set(headerKey(cell.value), column));
  const raw = (row: ExcelJS.Row, name: string) => headers.get(name) ? row.getCell(headers.get(name)!).value : null;
  const value = (row: ExcelJS.Row, name: string) => display(raw(row, name));
  const number = (row: ExcelJS.Row, name: string) => Number(value(row, name).replace(/,/g, ''));

  if (headers.has('warehouse') && headers.has('inqty') && headers.has('date')) {
    const rows: SalvageStockRow[] = []; let rejected = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const entryDate = cellDate(raw(row, 'date')); const itemCode = value(row, 'item'); const warehouse = value(row, 'warehouse');
      const inQty = number(row, 'inqty'); const outQty = number(row, 'outqty'); const balanceQty = number(row, 'balanceqty');
      if (!entryDate || !itemCode || !warehouse || ![inQty, outQty, balanceQty].every(Number.isFinite)) { rejected++; return; }
      rows.push({ entryDate, itemCode, itemName: value(row, 'itemname') || itemCode, stockUom: value(row, 'stockuom') || null, inQty: Math.trunc(inQty), outQty: Math.trunc(outQty), balanceQty: Math.trunc(balanceQty), warehouse, itemGroup: value(row, 'itemgroup') || null, voucherType: value(row, 'vouchertype') || null, voucherNo: value(row, 'voucher') || null, sourceFile: file.name });
    });
    return { kind: 'stock', rows, rejected };
  }

  if (headers.has('useremail') && headers.has('lastlogindateandtime')) {
    const rows: SalvageLoginRow[] = []; let rejected = 0;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const userName = value(row, 'username'); const email = value(row, 'useremail');
      if (!userName || !email) { rejected++; return; }
      rows.push({ userName, email, lastLoginAt: cellDate(raw(row, 'lastlogindateandtime')), ipAddress: value(row, 'lastloginipaddress') || null, sourceFile: file.name });
    });
    return { kind: 'login', rows, rejected };
  }
  throw new Error(`${file.name} is not a recognized Stock Ledger or User Login Log report.`);
}
