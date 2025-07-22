import { RowDataPacket } from "mysql2";
import { dbPostgres, query } from "../db";
import { idCardTemplateTable } from "../db/schema";
import { parse } from "date-fns";

export async function getAdmissionYears() {
    const result = await dbPostgres
        .select({admissionYear: idCardTemplateTable.admissionYear})
        .from(idCardTemplateTable);
    return result.map(ele => ele.admissionYear);
}

export async function getStats(year: string, date: string) {
    const parsedDate = parse(date, "dd-MM-yyyy", new Date());
const yearNumber = parsedDate.getFullYear();
    console.log("date:", date, yearNumber);
    const [{ totalStudents }] = await query<RowDataPacket[]>(
        `SELECT COUNT(std.id) AS totalStudents
         FROM studentpersonaldetails std
         JOIN accademicyear ay ON std.academicyearid = ay.id
         WHERE ay.accademicYearName = ?`,
        [year]
    ) as [{ totalStudents: number }];

    const [{ totalIdCards }] = await query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT student_id_fk) AS totalIdCards
         FROM id_card_issues
         WHERE issue_status = 'ISSUED' AND YEAR(created_at) = ?`,
        [yearNumber]
    ) as [{ totalIdCards: number }];

    const remaining = (totalStudents || 0) - (totalIdCards || 0);

    const [{ todayIdCards }] = await query<RowDataPacket[]>(
        `SELECT COUNT(*) AS todayIdCards
         FROM id_card_issues
         WHERE issue_status = 'ISSUED' AND DATE(created_at) = ?`,
        [date]
    ) as [{ todayIdCards: number }];

    return {
        totalStudents: Number(totalStudents || 0),
        totalIdCards: Number(totalIdCards || 0),
        remaining: Number(remaining),
        todayIdCards: Number(todayIdCards || 0),
    };
}

interface HourlyStatRow extends RowDataPacket {
    hour: number;
    count: number;
}

export async function getHourlyStats(date: string) {
    const result = await query<HourlyStatRow[]>(
        `SELECT HOUR(created_at) as hour, COUNT(*) as count
         FROM id_card_issues
         WHERE issue_status = 'ISSUED' AND DATE(created_at) = ?
         GROUP BY hour
         ORDER BY hour`,
        [date]
    );
    return result.map((row) => ({ hour: row.hour, count: Number(row.count) }));
}