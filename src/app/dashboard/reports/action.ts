"use server"
import { dbPostgres, query } from "@/lib/db";
import { Buffer } from 'node:buffer';

import { getAdmissionYears } from "@/lib/services/reports.service";
import { format, parse } from "date-fns";
import { RowDataPacket } from "mysql2";

export async function fetchAdmissionYears() {
    return await getAdmissionYears();
}

export async function fetchDatesByAdmissionYear(admissionYear: string) {
    console.log("in fetchDatesByAdmissionYear(), admissionYear:", admissionYear)
    const results = await query<RowDataPacket[]>(`
      SELECT DISTINCT DATE(idcard.issue_date) as date
      FROM id_card_issues idcard
      JOIN accademicyear ay ON ay.accademicYearName = ?
    `, [admissionYear]);
  console.log(`results:`, results)
    return results as { date: string }[];
  }

 


export async function fetchIdCardStatsPerHour(date: string) {
  const parsedDate = parse(date, 'dd-MM-yyyy', new Date());
  const formattedDate = format(parsedDate, 'yyyy-MM-dd');

  console.log("Formatted issue_date:", formattedDate);

  // Get only the non-zero hour groups from DB
  const dbResults = await query<RowDataPacket[]>(`
    SELECT 
      HOUR(CONVERT_TZ(created_at, '+00:00', '+05:30')) AS hour,
      COUNT(*) AS count,
      GROUP_CONCAT(id) AS issue_ids
    FROM 
      id_card_issues
    WHERE 
      issue_date = ?
    GROUP BY 
      hour
    ORDER BY 
      hour
  `, [formattedDate]);

  // Only include results with count > 0
  return dbResults
    .filter((row) => row.count > 0)
    .map((row) => {
      const from = `${row.hour.toString().padStart(2, '0')}:00`;
      const to = `${((row.hour + 1) % 24).toString().padStart(2, '0')}:00`;

      return {
        from,
        to,
        count: row.count,
        issue_ids: row.issue_ids?.split(',').map(Number) || []
      };
    });
}

import ExcelJS from 'exceljs';

/**
 * Generate Excel for ID cards issued at a specific date + hour
 * Only includes entries where issue_status = 'ISSUED'
 */
import { format as formatDate, parseISO } from 'date-fns';

export async function downloadIdCardDetails(date: string, hour: number): Promise<Buffer> {
  console.log('fired download');
  
  const formattedDate = formatDate(new Date(date.split('-').reverse().join('-')), 'yyyy-MM-dd');
  console.log(formattedDate);

  const results = await query<RowDataPacket[]>(`
    SELECT 
      i.id,
      i.expiry_date,
      i.issue_status,
      i.remarks,
      i.created_at,
      i.name,
      i.phone_mobile_no,
      i.blood_group_name,
      i.course_name
    FROM id_card_issues i
    WHERE 
      i.issue_date = ?
      AND HOUR(CONVERT_TZ(i.created_at, '+00:00', '+05:30')) = ?
      AND i.issue_status = 'ISSUED'
    ORDER BY i.created_at
  `, [formattedDate, hour]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('ID Card Details');

  // Add header
  sheet.addRow([
    'ID', 'Name', 'Phone', 'Blood Group', 'Course',
    'Expiry Date', 'Status', 'Remarks', 'Created At'
  ]);
  

  // Add rows with formatted dates
  results.forEach(row => {
    sheet.addRow([
      row.id,
      row.name,
      row.phone_mobile_no,
      row.blood_group_name,
      row.course_name,
      row.expiry_date ? formatDate(new Date(row.expiry_date), 'dd-MM-yyyy') : '',
      row.issue_status,
      row.remarks,
      row.created_at ? formatDate(new Date(row.created_at), 'dd-MM-yyyy HH:mm:ss') : '',
    ]);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
