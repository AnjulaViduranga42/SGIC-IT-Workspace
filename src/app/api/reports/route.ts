import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import ExcelJS from 'exceljs';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/auth';

async function getSessionUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get('export');

    // Fetch all Tasks
    const tasks = await db.task.findMany({
      include: {
        taskType: true,
        userGroup: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Fetch all KPIs and their values
    const kpis = await db.kPI.findMany({
      include: {
        values: {
          orderBy: {
            period: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (exportFormat === 'excel') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SGIC IT Workspace';
      workbook.lastModifiedBy = 'SGIC IT Workspace';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Sheet 1: Tasks Report
      const taskSheet = workbook.addWorksheet('Tasks Report');
      
      // Define Columns
      taskSheet.columns = [
        { header: 'Task ID', key: 'id', width: 10 },
        { header: 'Title', key: 'title', width: 25 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Task Type', key: 'type', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Due Date', key: 'dueDate', width: 22 },
        { header: 'Assignee Emails', key: 'assignees', width: 25 },
        { header: 'Assigned User Group', key: 'group', width: 20 },
        { header: 'Reminder Days Prior', key: 'reminderDays', width: 18 },
        { header: 'Reminder Sent At', key: 'reminderSent', width: 22 },
      ];

      // Format header row
      const headerRow = taskSheet.getRow(1);
      headerRow.height = 25;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Segoe UI', size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4F46E5' }, // Indigo-600
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Add Data
      tasks.forEach((task) => {
        taskSheet.addRow({
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.taskType.name,
          status: task.status,
          dueDate: task.dueDate.toISOString().replace('T', ' ').substring(0, 19),
          assignees: task.assigneeEmails || 'N/A',
          group: task.userGroup?.name || 'N/A',
          reminderDays: task.reminderDaysBefore,
          reminderSent: task.reminderSentAt ? task.reminderSentAt.toISOString().replace('T', ' ').substring(0, 19) : 'Not Sent',
        });
      });

      // Apply row styles
      taskSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
          // Border
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };
          
          // Status color highlighting
          if (cell.value === 'PENDING') {
            cell.font = { color: { argb: 'B45309' }, bold: true }; // Amber-700
          } else if (cell.value === 'COMPLETED') {
            cell.font = { color: { argb: '15803D' }, bold: true }; // Green-700
          }
        });
      });

      // Sheet 2: KPIs Report
      const kpiSheet = workbook.addWorksheet('KPIs Report');
      kpiSheet.columns = [
        { header: 'KPI ID', key: 'id', width: 10 },
        { header: 'KPI Name', key: 'name', width: 25 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Target Value', key: 'target', width: 15 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Frequency', key: 'frequency', width: 12 },
        { header: 'Period', key: 'period', width: 12 },
        { header: 'Period Target', key: 'pTarget', width: 15 },
        { header: 'Period Actual', key: 'pActual', width: 15 },
        { header: 'Performance (%)', key: 'perf', width: 18 },
      ];

      // Format header row
      const kpiHeader = kpiSheet.getRow(1);
      kpiHeader.height = 25;
      kpiHeader.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, name: 'Segoe UI', size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '06B6D4' }, // Cyan-500
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Add Data
      kpis.forEach((kpi) => {
        if (kpi.values.length === 0) {
          kpiSheet.addRow({
            id: kpi.id,
            name: kpi.name,
            description: kpi.description || 'N/A',
            target: kpi.target,
            unit: kpi.unit,
            frequency: kpi.frequency,
            period: 'N/A',
            pTarget: 'N/A',
            pActual: 'N/A',
            perf: 'N/A',
          });
        } else {
          kpi.values.forEach((val) => {
            const performance = val.targetValue > 0 ? (val.actualValue / val.targetValue) * 100 : 0;
            kpiSheet.addRow({
              id: kpi.id,
              name: kpi.name,
              description: kpi.description || 'N/A',
              target: kpi.target,
              unit: kpi.unit,
              frequency: kpi.frequency,
              period: val.period,
              pTarget: val.targetValue,
              pActual: val.actualValue,
              perf: parseFloat(performance.toFixed(2)),
            });
          });
        }
      });

      // Apply row styles
      kpiSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } },
          };
        });
      });

      // Write to Buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Return file
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment; filename="SGIC_IT_Workspace_Report.xlsx"',
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
    }

    // Default JSON response
    return NextResponse.json({
      tasksCount: tasks.length,
      kpisCount: kpis.length,
      tasks,
      kpis,
    });
  } catch (error) {
    console.error('Reports generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
