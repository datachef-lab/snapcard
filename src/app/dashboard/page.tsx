"use client";

import { AppSidebar } from "@/components/app-sidebar"
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Student } from "@/types";
import { useEffect, useState } from "react"
import { useStudents } from "@/hooks/use-students";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const columns: ColumnDef<Student>[] = [
  {
    accessorKey: "name",
    header: () => <span>Name</span>,
    cell: info => {
      const row = info.row.original as Student;
      const codeNumber = row.codeNumber;
      const name = String(info.getValue());
      const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`${process.env.NEXT_PUBLIC_STUDENT_PROFILE_URL}/Student_Image_${codeNumber}.jpg`} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate" title={name}>{name}</span>
        </div>
      );
    },
    meta: { className: "w-[260px] max-w-[260px]" },
  },
  { accessorKey: "codeNumber", header: "Code Number" },
  { accessorKey: "rfidno", header: "RFID", cell: info => info.getValue() ?? "-" },
  { accessorKey: "courseName", header: "Course", cell: info => info.getValue() ?? "-" },
  { accessorKey: "sectionName", header: "Section", cell: info => info.getValue() ?? "-" },
  { accessorKey: "shiftName", header: "Shift", cell: info => info.getValue() ?? "-" },
  { accessorKey: "sessionName", header: "Session", cell: info => info.getValue() ?? "-" },
  { accessorKey: "bloodGroupName", header: "Blood Group", cell: info => info.getValue() ?? "-" },
  { accessorKey: "coursetype", header: "Course Type", cell: info => info.getValue() ?? "-" },
];

export default function Page() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Reset page to 1 when search or pageSize changes
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const { data, isPending, isFetching, isError, error } = useStudents(page, pageSize, search);

  const handleDownload = () => {
    if (!data?.content?.length) return;
    const ws = XLSX.utils.json_to_sheet(data.content);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students.xlsx");
  };

  return (
    <div className="p-">
      <div className="flex items-center justify-between mb-2">
        <Input
          placeholder="Search by name or code number..."
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={handleDownload}
          disabled={!data?.content?.length}
        >
          Download Excel
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data?.content ?? []}
        page={page}
        pageSize={pageSize}
        pageCount={data?.totalPages ?? 1}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        search={search}
        onSearchChange={setSearch}
        loading={isPending || isFetching}
        error={isError ? error?.message : undefined}
      />
    </div>
  );
}

