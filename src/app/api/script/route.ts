import { query } from "@/lib/db";
import { getIdCardIssuesByUid } from "@/lib/services/id-card-issue.service";
// import { RowDataPacket } from "mysql2";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { NextRequest } from "next/server";

const BATCH_SIZE = 500;
export async function GET(request: NextRequest) {
    console.log(request.url);
    try {
        const [{ studentCount }] = (await query(`
            SELECT COUNT(DISTINCT student_id_fk) AS studentCount
            FROM id_card_issues;
        `)) as [{ studentCount: number }];

        const totalBatches = Math.ceil(studentCount / BATCH_SIZE);
        console.log(`Total students: ${studentCount}, Total batches: ${totalBatches}`);

        for (let b = 0; b < totalBatches; b++) {
            const offset = b * BATCH_SIZE;
            console.log(`Processing batch ${b + 1}/${totalBatches} with offset ${offset}`);

            const students = (await query(`
                SELECT 
                    DISTINCT i.student_id_fk,
                    s.codeNumber AS uid
                FROM 
                    id_card_issues i,
                    studentpersonaldetails s
                WHERE s.id = i.student_id_fk
                LIMIT ${BATCH_SIZE} OFFSET ${offset};
            `)) as { student_id_fk: number; uid: string }[];

            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                const imgfile = `Student_Image_${student.uid}.jpg`;

                const [foundIdCard] = await getIdCardIssuesByUid(student.uid);
                if (!foundIdCard) {
                    console.log(`No ID card issue found for UID: ${student.uid}, skipping.`);
                    continue;
                }

                console.log('fetching uid:', student.uid, 'imgfile:', imgfile);
                const imageRes = await fetch(`https://academic360.app/besc/id-card-generate/api/images?uid=${student.uid}&crop=true`);

                if (!imageRes.ok) {
                    console.error(`Failed to fetch image for UID: ${student.uid}, status: ${imageRes.status}`);
                    continue;
                }

                const imageBlob = await imageRes.blob();
                const buffer = Buffer.from(await imageBlob.arrayBuffer());
                const imagePath = path.join(process.env.SNAPCARD_IMAGE_BASE_PATH!, '/images', imgfile);

                // Use async file system methods
                try {
                    await fs.promises.mkdir(path.dirname(imagePath), { recursive: true });
                    await fs.promises.writeFile(imagePath, buffer);
                    console.log(`Done: ${i+1} / ${students.length} | ${b+1} / ${totalBatches}`);

                    // Uncomment the following lines to update the student record in the database
                    await query(`
                        UPDATE studentpersonaldetails 
                        SET imgfile = ?
                        WHERE id = ?;
                    `, [imgfile, student.student_id_fk]);
                } catch (fileErr) {
                    console.error(`Error saving image for UID: ${student.uid} at ${imagePath}:`, fileErr);
                }
            }
        }
    } catch (err) {
        console.error("Error during processing:", err);
    }
}
