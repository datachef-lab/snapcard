export interface Student {
    readonly id: number;
    name: string;
    codeNumber: string;
    oldCodeNumber: string | null;
    rfidno: string | null;
    securityQ: number | null | string;
    phoneMobileNo: string | null;

    bloodGroupId: number | null;
    bloodGroupName: string | null;

    emrgnResidentPhNo: string | null;
    emrgnFatherMobno: string | null;
    emrgnMotherMobNo: string | null;
    coursetype: string | null;

    courseId: number;
    courseName: string | null;

    sectionId: number;
    sectionName: string | null;

    shiftId: number;
    shiftName: string | null;

    sessionId: number;
    sessionName: string | null;

    academicYear: string;
}

export interface IdCardIssue {
    readonly id?: number;
    student_id_fk: number;
    issue_date: Date | string;
    expiry_date: Date | string;
    issue_status: 'ISSUED' | 'RENEWED' | 'REISSUED';
    renewed_from_id: number | null;
    remarks: string | null;

    created_at: Date | string;
    updated_at: Date | string;

    name: string;
    sportsQuota: null | string;
    phoneMobileNo: string;
    bloodGroupName: string;
    courseName: string;
}