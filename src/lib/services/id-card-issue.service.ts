import { IdCardIssue } from "@/types";
import { query } from "../db";
import { RowDataPacket } from "mysql2";

export async function createIdCardIssue(givenIdCardIssue: IdCardIssue) {
    console.log('createIdCardIssue input:', givenIdCardIssue);
    const sql = `INSERT INTO id_card_issues(
        student_id_fk,
        issue_date,
        expiry_date,
        issue_status,
        renewed_from_id,
        remarks
    ) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [
        givenIdCardIssue.student_id_fk,
        givenIdCardIssue.issue_date,
        givenIdCardIssue.expiry_date,
        givenIdCardIssue.issue_status,
        givenIdCardIssue.renewed_from_id,
        givenIdCardIssue.remarks
    ];
    console.log('SQL:', sql);
    console.log('Values:', values);
    const result = await query(sql, values) as unknown as { insertId: number };
    console.log('Insert result:', result);
    const newIssue = await getIdCardIssueById(result.insertId);
    console.log('Fetched new issue:', newIssue);
    return newIssue;
}

export async function getIdCardIssueById(id: number) {
    const [result] = await query<RowDataPacket[]>(
        `SELECT * FROM id_card_issues WHERE id = ? ORDER BY issue_date DESC`,
        [id]
    ) as IdCardIssue[];
    return result;
}

export async function updateIdCardIssue(id: number, update: Partial<IdCardIssue>) {
    const fields = Object.keys(update).map(key => `${key} = ?`).join(', ');
    const values = Object.values(update);
    await query(
        `UPDATE id_card_issues SET ${fields} WHERE id = ?`,
        [...values, id]
    );
    return getIdCardIssueById(id);
}

export async function deleteIdCardIssue(id: number) {
    await query(`DELETE FROM id_card_issues WHERE id = ?`, [id]);
    return true;
}

// Fix getIdCardIssuesByStudentId to return all issues
export async function getIdCardIssuesByStudentId(studentId: number) {
    const results = await query<RowDataPacket[]>(
        `SELECT * FROM id_card_issues WHERE student_id_fk = ? ORDER BY id DESC`,
        [studentId]
    ) as IdCardIssue[];
    return results;
}

// Fix getRecentIdCardIssueByStudentId to return the most recent one
export async function getRecentIdCardIssueByStudentId(studentId: number) {
    const results = await query<RowDataPacket[]>(
        `SELECT * FROM id_card_issues WHERE student_id_fk = ? ORDER BY issue_date DESC LIMIT 1`,
        [studentId]
    ) as IdCardIssue[];
    return results[0] || null;
}