"use server"
import { query } from "@/lib/db";
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
      JOIN studentpersonaldetails s ON s.id = idcard.student_id_fk
      JOIN accademicyear ay ON ay.accademicYearName = s.admissionYear
      WHERE ay.accademicYearName = ?
      AND idcard.issue_date IS NOT NULL
      ORDER BY date DESC
    `, [admissionYear]);
  console.log(`results:`, results)
    return results as { date: string }[];
  }

export async function fetchIdCardStatsPerDate(year: string, date: string) {
  const parsedDate = parse(date, 'dd-MM-yyyy', new Date());
  const formattedDate = format(parsedDate, 'yyyy-MM-dd');

  console.log("Formatted issue_date:", formattedDate);

  // Get date-based statistics from DB
  const dbResults = await query<RowDataPacket[]>(`
    SELECT 
      DATE(issue_date) AS date,
      COUNT(*) AS count,
      GROUP_CONCAT(id) AS issue_ids
    FROM 
      id_card_issues
    WHERE 
      YEAR(issue_date) = ?
      AND issue_date = ?
    GROUP BY 
      DATE(issue_date)
    ORDER BY 
      date
  `, [year, formattedDate]);

  // Only include results with count > 0
  return dbResults
    .filter((row) => row.count > 0 && row.date !== null)
    .map((row) => {
      const formattedDisplayDate = format(new Date(row.date), 'dd-MM-yyyy');
      
      return {
        date: formattedDisplayDate,
        count: row.count,
        issue_ids: row.issue_ids?.split(',').map(Number) || []
      };
    });
}

import ExcelJS from 'exceljs';

/**
 * Generate Excel for ID cards issued on a specific date
 * Only includes entries where issue_status = 'ISSUED'
 */
import { format as formatDate } from 'date-fns';

export async function downloadIdCardDetailsByDate(date: string): Promise<ArrayBuffer | Uint8Array> {
  console.log('fired download by date');
  // Robust date parsing
  let formattedDate = date;
  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    const [dd, mm, yyyy] = date.split('-');
    formattedDate = `${yyyy}-${mm}-${dd}`;
  }
  console.log('Formatted issue_date:', formattedDate);

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
      i.course_name,
      s.codeNumber
    FROM id_card_issues i
    JOIN studentpersonaldetails s ON s.id = i.student_id_fk
    WHERE 
      i.issue_date = ?
      AND i.issue_status = 'ISSUED'
    ORDER BY i.created_at
  `, [formattedDate]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('ID Card Details');

  // ✅ Corrected header
  sheet.addRow([
    'ID', 'Name', 'Phone', 'Blood Group', 'Course', 'UID',
    'Expiry Date', 'Status', 'Remarks', 'Created At'
  ]);

  results.forEach(row => {
    sheet.addRow([
      row.id,
      row.name,
      row.phone_mobile_no,
      row.blood_group_name,
      row.course_name,
      row.codeNumber,
      row.expiry_date ? formatDate(new Date(row.expiry_date), 'dd-MM-yyyy') : '',
      row.issue_status,
      row.remarks,
      row.created_at ? formatDate(new Date(row.created_at), 'dd-MM-yyyy HH:mm:ss') : '',
    ]);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

