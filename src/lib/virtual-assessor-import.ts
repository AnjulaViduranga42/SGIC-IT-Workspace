import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import * as cheerio from 'cheerio';

export interface VirtualAssessorImportRow {
  sourceKey: string;
  referenceNo: string;
  description: string | null;
  customerName: string | null;
  customerMobile: string | null;
  product: string | null;
  agentId: string;
  agentName: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  jobDate: Date;
  cancelReason: string | null;
  sourceFile: string;
}

type RawRow = Record<string, unknown>;

const aliases: Record<string, string> = {
  refno: 'referenceNo',
  referenceno: 'referenceNo',
  description: 'description',
  desciption: 'description',
  customername: 'customerName',
  customermobile: 'customerMobile',
  product: 'product',
  agentid: 'agentId',
  agentname: 'agentName',
  latitude: 'latitude',
  longitude: 'longitude',
  jobstatus: 'status',
  status: 'status',
  jobdate: 'jobDate',
  cancelreason: 'cancelReason',
  cancellationreason: 'cancelReason',
};

function normalizeHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function text(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized && normalized.toLowerCase() !== 'nan' ? normalized : null;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(excelDate.getTime())) return excelDate;
  }

  const parsed = new Date(String(value ?? '').trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(value: unknown) {
  const raw = String(value ?? '').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('cancel')) return 'Cancelled';
  if (lower.includes('complete')) return 'Completed';
  return raw || 'Unknown';
}

function mapHeaders(headers: unknown[]) {
  return headers.map((header) => aliases[normalizeHeader(header)] ?? normalizeHeader(header));
}

function parseHtml(buffer: Buffer): RawRow[] {
  const $ = cheerio.load(buffer.toString('utf8'));
  const table = $('table').first();
  if (!table.length) throw new Error('No data table was found in the uploaded report.');

  const rows = table.find('tr').toArray();
  if (rows.length < 2) return [];

  const headers = mapHeaders(
    $(rows[0]).find('th,td').toArray().map((cell) => $(cell).text().trim())
  );

  return rows.slice(1).map((row) => {
    const values = $(row).find('th,td').toArray().map((cell) => $(cell).text().trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

async function parseXlsx(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('The workbook does not contain a worksheet.');

  const headerValues = (worksheet.getRow(1).values as unknown[]).slice(1);
  const headers = mapHeaders(headerValues);
  const rows: RawRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = (row.values as unknown[]).slice(1);
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  });

  return rows;
}

export async function parseVirtualAssessorFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const prefix = buffer.subarray(0, 200).toString('utf8').trimStart().toLowerCase();
  const rawRows = prefix.startsWith('<') ? parseHtml(buffer) : await parseXlsx(buffer);

  const rows: VirtualAssessorImportRow[] = [];
  const rejected: number[] = [];

  rawRows.forEach((raw, index) => {
    const referenceNo = text(raw.referenceNo);
    const agentId = text(raw.agentId);
    const jobDate = dateValue(raw.jobDate);

    if (!referenceNo || !agentId || !jobDate) {
      rejected.push(index + 2);
      return;
    }

    const status = normalizeStatus(raw.status);
    const sourceKey = createHash('sha256')
      .update([referenceNo, jobDate.toISOString(), agentId.toLowerCase(), status].join('|'))
      .digest('hex');

    rows.push({
      sourceKey,
      referenceNo,
      description: text(raw.description),
      customerName: text(raw.customerName),
      customerMobile: text(raw.customerMobile),
      product: text(raw.product),
      agentId,
      agentName: text(raw.agentName),
      latitude: numberValue(raw.latitude),
      longitude: numberValue(raw.longitude),
      status,
      jobDate,
      cancelReason: text(raw.cancelReason),
      sourceFile: file.name,
    });
  });

  return { rows, rejected };
}
