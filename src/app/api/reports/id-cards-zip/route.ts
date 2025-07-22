import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { query } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const admissionYear = searchParams.get('admissionYear');
//   const date = searchParams.get('date'); // only for filename, not filtering

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

    while (hasMore) {
      const results = await query<RowDataPacket[]>(`
        SELECT i.id
        FROM id_card_issues i
        INNER JOIN studentpersonaldetails s ON s.id = i.student_id_fk
        INNER JOIN accademicyear ay ON ay.id = s.academicyearid
        WHERE ay.accademicYearName = ?
          AND i.id = (
            SELECT MAX(sub.id)
            FROM id_card_issues sub
            WHERE sub.student_id_fk = i.student_id_fk
          )
        ORDER BY i.id
        LIMIT ? OFFSET ?
      `, [admissionYear, PAGE_SIZE, offset]);

      console.log(`Fetched ${results.length} records at offset ${offset}`);

      if (results.length === 0) {
        hasMore = false;
        break;
      }

      for (const row of results) {
        const fileName = `${row.id}.png`;
        const filePath = path.join(dirPath, fileName);
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

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=id-cards-${admissionYear}.zip`,
    },
  });
}
