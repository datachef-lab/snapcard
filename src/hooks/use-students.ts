import { useQuery } from '@tanstack/react-query';
import { Student } from '@/types';

interface StudentsResponse {
  page: number;
  size: number;
  content: Student[];
  totalPages: number;
  totalStudents: number;
}

async function fetchStudents({ page, pageSize, search }: { page: number; pageSize: number; search: string }) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(pageSize),
  });
  if (search) params.append('uid', search);
  const res = await fetch(`/api/students?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch students');
  return res.json() as Promise<StudentsResponse>;
}

export function useStudents(page: number, pageSize: number, search: string) {
  return useQuery({
    queryKey: ['students', page, pageSize, search],
    queryFn: () => fetchStudents({ page, pageSize, search }),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
    // gcTime: 1000 * 60 * 10, // Uncomment if you want to control garbage collection time
  });
} 