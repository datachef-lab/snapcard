"use client";
import { saveAs } from 'file-saver';
import { format } from "date-fns";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Download as DownloadIcon } from 'lucide-react';
import { User, IdCard, Clock, BadgeCheck } from 'lucide-react';
import { pusherClient } from '@/lib/pusher-client';
import Pusher from 'pusher-js';
import { useAuth } from '@/hooks/use-auth';
import { downloadIdCardDetails, fetchAdmissionYears, fetchDatesByAdmissionYear } from './action';

interface Stats {
  totalStudents: number;
  totalIdCards: number;
  remaining: number;
  todayIdCards: number;
}

interface HourlyStat {
  count: number;
  from: string;
  to: string;
  issue_ids: number[];
}

interface User {
  name: string;
  email: string;
  type: 'Admin' | 'Member';
}

interface Student {
  name: string;
  uid: string;
  time: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_PATH!;

// const ADMISSION_YEARS = ['2021', '2022', '2023', '2024'];
// const DATES_BY_YEAR: Record<string, string[]> = {
//   '2021': ['2025-07-21', '2025-07-20', '2025-07-19'],
//   '2022': ['2025-07-18', '2025-07-17'],
//   '2023': ['2025-07-16', '2025-07-15'],
//   '2024': ['2025-07-14', '2025-07-13'],
// };

const HOUR_LABELS = [
  { from: 9, to: 10 },
  { from: 10, to: 11 },
  { from: 11, to: 12 },
  { from: 12, to: 13 },
  { from: 13, to: 14 },
  { from: 14, to: 15 },
  { from: 15, to: 16 },
];

function formatHourRange(from: number, to: number) {
  const format = (h: number) => {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 || h === 24 ? 'AM' : 'PM';
    return `${hour}.00 ${ampm}`;
  };
  return `${format(from)} - ${format(to)}`;
}

function getMockStats(admissionYear: string, date: string): Stats {
  return {
    totalStudents: 1200,
    totalIdCards: 900,
    remaining: 300,
    todayIdCards: 45,
  };
}

// function getMockHourlyStats(date: string): HourlyStat[] {
//   return [
//     { hour: '09:00', count: 5 },
//     { hour: '10:00', count: 8 },
//     { hour: '11:00', count: 12 },
//     { hour: '12:00', count: 7 },
//     { hour: '13:00', count: 6 },
//     { hour: '14:00', count: 4 },
//     { hour: '15:00', count: 3 },
//   ];
// }

function getMockActiveUsers(): User[] {
  return [
    { name: 'Alice Johnson', email: 'alice@example.com', type: 'Admin' },
    { name: 'Bob Smith', email: 'bob@example.com', type: 'Member' },
    { name: 'Charlie Brown', email: 'charlie@example.com', type: 'Member' },
    { name: 'David Lee', email: 'david@example.com', type: 'Member' },
    { name: 'Eva Green', email: 'eva@example.com', type: 'Member' },
    { name: 'Frank Ocean', email: 'frank@example.com', type: 'Member' },
    { name: 'Grace Hopper', email: 'grace@example.com', type: 'Member' },
    { name: 'Helen Carter', email: 'helen@example.com', type: 'Member' },
    { name: 'Ian Wright', email: 'ian@example.com', type: 'Member' },
    { name: 'Julia Stone', email: 'julia@example.com', type: 'Member' },
    { name: 'Kevin Hart', email: 'kevin@example.com', type: 'Member' },
    { name: 'Linda Park', email: 'linda@example.com', type: 'Member' },
    { name: 'Mike Ross', email: 'mike@example.com', type: 'Member' },
    { name: 'Nina Simone', email: 'nina@example.com', type: 'Member' },
    { name: 'Oscar Wilde', email: 'oscar@example.com', type: 'Member' },
  ];
}

// function getMockStudentsForHour(hour: string): Student[] {
//   return [
//     { name: 'John Doe', uid: '123', time: `${hour}:15` },
//     { name: 'Jane Smith', uid: '456', time: `${hour}:42` },
//   ];
// }
const formatHourSlot = (hour: number) => {
  const start = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  const endHour = (hour + 1) % 24;
  const end = `${endHour % 12 || 12}:00 ${endHour < 12 ? 'AM' : 'PM'}`;
  return `${start} - ${end}`;
};


function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [admissionYears, setAdmissionYears] = useState<string[]>([]);
  const [admissionYear, setAdmissionYear] = useState<string | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchAdmissionYears()
      .then(data =>  {
        setAdmissionYear(data[0]);
        setAdmissionYears(data);
      })
  }, []);

  // Use authenticated user info
  const currentUser = user
    ? { name: user.name, email: user.email, type: user.isAdmin ? 'Admin' : 'Member' }
    : { name: 'Unknown', email: 'unknown@example.com', type: 'Member' };

  // Pusher presence channel for active users
  useEffect(() => {
    if (!currentUser.email || !currentUser.name) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: {
        params: {
          user_id: currentUser.email,
          user_info: JSON.stringify(currentUser)
        }
      }
    });
    const channel = pusher.subscribe('presence-reports');
    channel.bind('pusher:subscription_succeeded', (members: any) => {
      console.log('[Pusher] subscription_succeeded', members);
      setActiveUsers(Object.values(members.members));
    });
    channel.bind('pusher:member_added', (member: any) => {
      console.log('[Pusher] member_added', member);
      setActiveUsers(prev => [...prev, member.info]);
    });
    channel.bind('pusher:member_removed', (member: any) => {
      console.log('[Pusher] member_removed', member);
      setActiveUsers(prev => prev.filter(u => u.email !== member.id));
    });
    channel.bind('pusher:subscription_error', (err: any) => {
      console.error('[Pusher] subscription_error', err);
    });
    pusher.connection.bind('error', (err: any) => {
      console.error('[Pusher] connection error', err);
    });
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [currentUser.email, currentUser.name, currentUser.type]);

  // Fetch stats and hourly on mount and when year/date changes
  useEffect(() => {
    if (!admissionYear || !date) return;
    async function fetchStats() {
      const res = await fetch(`/api/reports/stats?year=${admissionYear}&date=${date}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setHourlyStats(data.hourly);
      }
    }
    fetchStats();
  }, [admissionYear, date]);

  

useEffect(() => {
  if (!admissionYear) return;

  fetchDatesByAdmissionYear(admissionYear).then(data => {
    const formattedDates = data.map(ele =>
      format(new Date(ele.date), "dd-MM-yyyy")
    );
    setDates(formattedDates);
    setDate(formattedDates[formattedDates.length - 1]);
  });
}, [admissionYear]);


  // Subscribe to Pusher for real-time stats updates
  useEffect(() => {
    const channel = pusherClient.subscribe('reports');
    const handleStatsUpdate = (data: { stats: Stats; hourly: HourlyStat[] }) => {
      setStats(data.stats);
      setHourlyStats(data.hourly);
    };
    channel.bind('stats-update', handleStatsUpdate);
    return () => {
      channel.unbind('stats-update', handleStatsUpdate);
      pusherClient.unsubscribe('reports');
    };
  }, []);

  useEffect(() => {
    // setDate(DATES_BY_YEAR[admissionYear][0]);
  }, [admissionYear]);

  const handleDownloadHour = (hour: string) => {
    // const students = getMockStudentsForHour(hour);
    // const csvRows = [
    //   'Name,UID,Time',
    //   ...students.map(s => `${s.name},${s.uid},${s.time}`)
    // ];
    // const csvContent = csvRows.join('\n');
    // const blob = new Blob([csvContent], { type: 'text/csv' });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = `id-cards-${admissionYear}-${date}-${hour}.csv`;
    // a.click();
    // URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    const res = await fetch(`${BASE_URL}/api/reports/id-cards-zip?admissionYear=${admissionYear}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `id-cards-${admissionYear}-${date}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };
  

  // Table and users max heights (adjust as needed for your layout)
  const tableMaxHeight = '260px';
  const usersMaxHeight = '260px';

  // Filter out the current user from the active users list
  const filteredActiveUsers = activeUsers.filter(
    (u) => u.email !== currentUser.email
  );

  return (
    <div className="flex flex-col min-h-screen h-screen overflow-hidden p-2">
      {/* Heading and Filters Row */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2 overflow-hidden border-b border-gray-200 mb-2 bg-white" style={{flex: '0 0 auto'}}>
        <h1 className="text-3xl font-bold tracking-tight">Reports Dashboard</h1>
        <div className="flex items-center gap-4">
          Admission Year: 
          <Select value={admissionYear ?? ""} onValueChange={setAdmissionYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Admission Year" />
            </SelectTrigger>
            <SelectContent>
              {admissionYears.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          Date: 
          <Select value={date ?? ""} onValueChange={setDate ?? ""}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              {dates.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 px-6 border-b border-gray-200 pb-4" style={{ flex: '0 0 auto' }}>
          <Card className="bg-white p-4 flex flex-row items-center gap-3 shadow-sm border rounded-lg">
            <div className="bg-blue-100 rounded-full p-2 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs text-gray-500">Total Students</span>
              <span className="text-2xl font-bold text-gray-800">{stats?.totalStudents ?? '-'}</span>
            </div>
          </Card>
          <Card className="bg-white p-4 flex flex-row items-center gap-3 shadow-sm border rounded-lg">
            <div className="bg-green-100 rounded-full p-2 flex items-center justify-center">
              <IdCard className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs text-gray-500">Total ID Cards Created</span>
              <span className="text-2xl font-bold text-gray-800">{stats?.totalIdCards ?? '-'}</span>
            </div>
          </Card>
          <Card className="bg-white p-4 flex flex-row items-center gap-3 shadow-sm border rounded-lg">
            <div className="bg-yellow-100 rounded-full p-2 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs text-gray-500">Remaining</span>
              <span className="text-2xl font-bold text-gray-800">{stats?.remaining ?? '-'}</span>
            </div>
          </Card>
          <Card className="bg-white p-4 flex flex-row items-center gap-3 shadow-sm border rounded-lg">
            <div className="bg-purple-100 rounded-full p-2 flex items-center justify-center">
              <BadgeCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs text-gray-500">ID Cards Done Today</span>
              <span className="text-2xl font-bold text-gray-800">{stats?.todayIdCards ?? '-'}</span>
            </div>
          </Card>
        </div>
        {/* Table and Active Users Side by Side */}
        <div className="flex flex-1 flex-col md:flex-row gap-8 px-6 overflow-hidden ">
          {/* Table Section */}
          <div className="flex-1 flex flex-col min-w-0 h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">ID Cards Per Hour</h3>
              <div className='flex gap-2'>

              {/* <Button onClick={handleDownloadAllZip} className="bg-blue-600 text-white hover:bg-blue-700">
                Download All 
              </Button> */}
              <Button onClick={handleDownloadAllZip} className="bg-blue-600 text-white hover:bg-blue-700">
                Download Id-Cards (ZIP)
              </Button>
              </div>
            </div>
            <Card className="p-0 flex-1 flex flex-col min-h-0 shadow rounded-lg border h-full">
              <CardContent className="p-0 flex-1 flex flex-col min-h-0 h-full">
                <div
                  className="overflow-auto flex-1 min-h-0"
                  style={{
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    background: '#fafbfc',
                  }}
                >
                  <table className="w-full text-sm border-separate" style={{ borderSpacing: 0 }}>
                    <thead className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="text-center py-2 px-2 text-xs font-semibold border-b border-gray-200">Hour</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold border-b border-gray-200">Count</th>
                        <th className="text-center py-2 px-2 text-xs font-semibold border-b border-gray-200">Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hourlyStats.map(({ from, to }, idx) => (
                        <tr
                          key={from}
                          className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                          style={{ height: '36px' }}
                        >
                          <td className="text-center font-mono py-1 px-2 text-sm whitespace-nowrap border-b border-gray-100">
                            {formatHourRange(Number(from.substring(0, 2)), Number(to.substring(0, 2)))}
                          </td>
                          <td className="text-center py-1 px-2 text-sm border-b border-gray-100">
                            {hourlyStats[idx]?.count ?? 0}
                          </td>
                          <td className="text-center py-1 px-2 text-sm border-b border-gray-100">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-blue-600 hover:bg-blue-100 h-7 w-7"
                              onClick={async () => {
                                const res = await fetch(`/api/reports/id-card-download?date=${date}&hour=${from.substring(0, 2)}`);
                                const blob = await res.blob();
                                const file = new Blob([blob], {
                                  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                });
                                saveAs(file, `id-cards-${date}-${from.substring(0, 2)}.xlsx`);
                              }}
                              // disabled={!hourlyStats[idx]?.hour}
                              aria-label="Download"
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Average Stats Section */}
          <div className="flex flex-col gap-3 justify-start min-w-[180px] max-w-[220px] h-full">
            <div className="flex flex-col items-center justify-center bg-gray-50 border rounded-lg px-4 py-3 shadow-sm">
              <span className="text-xs text-gray-500">Avg. ID Cards/Day</span>
              <span className="font-bold text-lg text-gray-800">{hourlyStats.reduce((sum, h) => sum + (h.count || 0), 0)}</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-gray-50 border rounded-lg px-4 py-3 shadow-sm">
              <span className="text-xs text-gray-500">Avg. Hours Worked</span>
              <span className="font-bold text-lg text-gray-800">{hourlyStats.filter(h => h.count > 0).length}</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-gray-50 border rounded-lg px-4 py-3 shadow-sm">
              <span className="text-xs text-gray-500">Est. Days to Finish</span>
              <span className="font-bold text-lg text-gray-800">
                {stats && stats.remaining
                  ? Math.ceil(stats.remaining / (hourlyStats.reduce((sum, h) => sum + (h.count || 0), 0) || 1))
                  : '-'}
              </span>
            </div>
          </div>
          {/* Active Users Section */}
          <div className="w-full md:w-80 flex-shrink-0 flex flex-col">
            <Card className="flex flex-col min-h-[220px] max-h-[500px]">
              <CardHeader>
                <CardTitle className="text-lg mb-3">Active Users</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <ul className="divide-y divide-gray-200">
                  {filteredActiveUsers.map((user) => (
                    <li key={user.email} className="py-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                      </div>
                      <Badge variant={user.type === 'Admin' ? 'default' : 'secondary'}>{user.type}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
