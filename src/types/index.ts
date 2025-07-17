export interface Student {
    readonly id: number;
    name: string;
    codeNumber: string;
    oldCodeNumber: string | null;
    rfidno: string | null;
    securityQ: number | null | string;

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
}