import { query } from "@/lib/db";
import { Student } from "@/types";
import { RowDataPacket } from "mysql2";

type FindStudentsByUIDProps = {
    uid?: string;
    page?: number;
    size?: number;
    hasRfid?: boolean;
    courseId?: number;
    sessionId?: number;
};

export async function findStudents({
    uid,
    page = 1,
    size = 10,
    hasRfid,
    courseId,
    sessionId,
}: FindStudentsByUIDProps): Promise<{
    page: number;
    size: number;
    content: Student[];
    totalPages: number;
    totalStudents: number;
}> {
    const offset = (page - 1) * size;

    const whereConditions: string[] = ["ay.id >= 18", "spd.academicyearid = ay.id"];
    const params: (string | number)[] = [];

    if (uid) {
        whereConditions.push("spd.codeNumber LIKE ?");
        params.push(`%${uid}%`);
    }

    if (hasRfid) {
        whereConditions.push("spd.rfidno IS NOT NULL AND spd.rfidno != ''");
    }

    if (courseId) {
        whereConditions.push("spm.courseId = ?");
        params.push(courseId);
    }

    if (sessionId) {
        whereConditions.push("spm.sessionId = ?");
        params.push(sessionId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // ---- PAGINATED SELECT ----
    const sql = `
        SELECT
            spd.id,
            spd.name,
            spd.codeNumber,
            spd.oldCodeNumber,
            spd.rfidno,
            spd.securityQ,

            spd.bloodGroup AS bloodGroupId,
            bg.name AS bloodGroupName,

            spd.phoneMobileNo,
            spd.emrgnResidentPhNo,
            spd.emrgnFatherMobno,
            spd.emrgnMotherMobNo,
            spd.coursetype,

            spm.courseId,
            c.courseName,

            spm.sectionId,
            sec.sectionName,

            spm.shiftId,
            sh.shiftName,

            spm.sessionId,
            cs.sessionName,

            ay.accademicYearName AS academicYear

        FROM studentpersonaldetails spd

        JOIN (
            SELECT s1.*
            FROM studentpaperlinkingstudentlist s1
            JOIN (
                SELECT studentId, MAX(id) AS max_id
                FROM studentpaperlinkingstudentlist
                GROUP BY studentId
            ) AS latest ON latest.studentId = s1.studentId AND latest.max_id = s1.id
        ) AS spls ON spls.studentId = spd.id

        JOIN studentpaperlinkingpaperlist splp ON splp.id = spls.parent_id
        JOIN studentpaperlinkingmain spm ON spm.id = splp.parent_id

        JOIN accademicyear ay ON ay.sessionId = spm.sessionId 

        JOIN course c ON c.id = spm.courseId
        JOIN shift sh ON sh.id = spm.shiftId
        JOIN section sec ON sec.id = spm.sectionId
        JOIN currentsessionmaster cs ON cs.id = spm.sessionId
        JOIN bloodgroup bg ON bg.id = spd.bloodGroup

        ${whereClause}

        ORDER BY cs.id DESC
        LIMIT ?
        OFFSET ?;
    `;

    console.log(sql)
    

    const countSql = `
        SELECT COUNT(*) AS total
        FROM studentpersonaldetails spd

        JOIN (
            SELECT s1.*
            FROM studentpaperlinkingstudentlist s1
            JOIN (
                SELECT studentId, MAX(id) AS max_id
                FROM studentpaperlinkingstudentlist
                GROUP BY studentId
            ) AS latest ON latest.studentId = s1.studentId AND latest.max_id = s1.id
        ) AS spls ON spls.studentId = spd.id

        JOIN studentpaperlinkingpaperlist splp ON splp.id = spls.parent_id
        JOIN studentpaperlinkingmain spm ON spm.id = splp.parent_id
JOIN accademicyear ay ON ay.sessionId = spm.sessionId 
        JOIN course c ON c.id = spm.courseId
        JOIN shift sh ON sh.id = spm.shiftId
        JOIN section sec ON sec.id = spm.sectionId
        JOIN currentsessionmaster cs ON cs.id = spm.sessionId
        JOIN bloodgroup bg ON bg.id = spd.bloodGroup

        ${whereClause};
    `;
    console.log(countSql);
    
    const finalParams = [...params, size, offset];

    const results = await query<RowDataPacket[]>(sql, finalParams);
    const countResult = await query<RowDataPacket[]>(countSql, params);
    const totalStudents = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalStudents / size);

    return {
        page,
        size,
        content: results as Student[],
        totalPages,
        totalStudents,
    };
}

export async function updateRfid(uid: string, newRfid: string): Promise<Student | null> {
    try {
        // First, fetch student by UID
        const { content } = await findStudents({ uid });

        if (!content || content.length === 0) return null;

        const student = content[0];

        // Update RFID using student.id
        await query("UPDATE studentpersonaldetails SET rfidno = ? WHERE id = ?", [newRfid, student.id]);

        // Return the updated student
        return { ...student, rfidno: newRfid };
    } catch (error) {
        console.error("Error updating RFID:", error);
        return null;
    }
}

// export async function getStudentCount(params:type) {
    
// }