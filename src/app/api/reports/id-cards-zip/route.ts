import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { IdCardIssue } from '@/types';
// import { number } from 'zod';

export interface IdCardIssueWithCodeNumber extends IdCardIssue {
  codeNumber: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const admissionYear = searchParams.get('admissionYear');
  const date = searchParams.get('date');

  if (!admissionYear) {
    return new Response('Missing admissionYear', { status: 400 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const zip = archiver('zip', { zlib: { level: 9 } });

  zip.on('data', chunk => writer.write(chunk));
  zip.on('end', () => writer.close());
  zip.on('error', err => {
    console.error('ZIP error:', err);
    writer.abort(err);
  });

  // Write in background
  (async () => {
    const dirPath = path.join(process.env.SNAPCARD_IMAGE_BASE_PATH!, 'idcards');
    console.log(`dirPath:`, dirPath);

    const PAGE_SIZE = 500;
    let offset = 0;
    let hasMore = true;
    const usedFilenames = new Set<string>();

    while (hasMore) {
      let queryString = '';
      let queryParams: (string | number)[] = [];

      if (date) {
        // If date is provided, filter by specific date
        queryString = `
          SELECT i.id, s.codeNumber
          FROM id_card_issues i
          INNER JOIN studentpersonaldetails s ON s.id = i.student_id_fk
          INNER JOIN accademicyear ay ON ay.id = s.academicyearid
          WHERE ay.accademicYearName = ?
            AND DATE(i.issue_date) = ?
            AND i.issue_status = 'ISSUED'
          ORDER BY i.id
          LIMIT ? OFFSET ?
        `;
        queryParams = [admissionYear, date, PAGE_SIZE, offset];
      } else {
        // If no date provided, get latest entry for each student
        queryString = `
          SELECT i.id, s.codeNumber
          FROM id_card_issues i
          INNER JOIN studentpersonaldetails s ON s.id = i.student_id_fk
          INNER JOIN accademicyear ay ON ay.id = s.academicyearid
          WHERE ay.accademicYearName = ?
            AND i.id = (
              SELECT MAX(sub.id)
              FROM id_card_issues sub
              WHERE sub.student_id_fk = i.student_id_fk
                AND sub.issue_status = 'ISSUED'
            )
          ORDER BY i.id
          LIMIT ? OFFSET ?
        `;
        queryParams = [admissionYear, PAGE_SIZE, offset];
      }

      const results = (await query<RowDataPacket[]>(queryString, queryParams)) as IdCardIssueWithCodeNumber[];

      console.log(`Fetched ${results.length} records at offset ${offset}`);

      if (results.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of results) {
        let fileName = `${row.codeNumber}.png`;
        let filePath = path.join(dirPath, fileName);
        let counter = 1;
        
        // If filename already exists in the zip, append a number
        while (usedFilenames.has(fileName)) {
          fileName = `${row.codeNumber} (${counter}).png`;
          filePath = path.join(dirPath, fileName);
          counter++;
        }
        
        usedFilenames.add(fileName);
        
        if (fs.existsSync(filePath)) {
          zip.file(filePath, { name: fileName });
        } else {
          console.warn(`Missing file: ${filePath}`);
        }
      }

      offset += PAGE_SIZE;
    }

    await zip.finalize();
  })();

  const filename = date 
    ? `id-cards-${admissionYear}-${date}.zip`
    : `id-cards-${admissionYear}.zip`;

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  });
}
