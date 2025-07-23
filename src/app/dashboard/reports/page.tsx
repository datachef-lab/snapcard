"use client";
import { saveAs } from 'file-saver';
import { format } from "date-fns";
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Download as DownloadIcon } from 'lucide-react';
import { User, IdCard, Clock } from 'lucide-react';
import { pusherClient } from '@/lib/pusher-client';
import Pusher from 'pusher-js';
import { useAuth } from '@/hooks/use-auth';
import { fetchAdmissionYears, fetchDatesByAdmissionYear } from './action';
import { Spinner } from '@/components/ui/spinner';

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

const BASE_URL = process.env.NEXT_PUBLIC_BASE_PATH!;

// const ADMISSION_YEARS = ['2021', '2022', '2023', '2024'];
// const DATES_BY_YEAR: Record<string, string[]> = {
//   '2021': ['2025-07-21', '2025-07-20', '2025-07-19'],
//   '2022': ['2025-07-18', '2025-07-17'],
//   '2023': ['2025-07-16', '2025-07-15'],
//   '2024': ['2025-07-14', '2025-07-13'],
// };

// const HOUR_LABELS = [
//   { from: 9, to: 10 },
//   { from: 10, to: 11 },
//   { from: 11, to: 12 },
//   { from: 12, to: 13 },
//   { from: 13, to: 14 },
//   { from: 14, to: 15 },
//   { from: 15, to: 16 },
// ];

function formatHourRange(from: number, to: number) {
  const format = (h: number) => {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 || h === 24 ? 'AM' : 'PM';
    return `${hour}.00 ${ampm}`;
  };
  return `${format(from)} - ${format(to)}`;
}

// function getMockStats(admissionYear: string, date: string): Stats {
//   return {
//     totalStudents: 1200,
//     totalIdCards: 900,
//     remaining: 300,
//     todayIdCards: 45,
//   };
// }

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

// function getMockActiveUsers(): User[] {
//   return [
//     { name: 'Alice Johnson', email: 'alice@example.com', type: 'Admin' },
//     { name: 'Bob Smith', email: 'bob@example.com', type: 'Member' },
//     { name: 'Charlie Brown', email: 'charlie@example.com', type: 'Member' },
//     { name: 'David Lee', email: 'david@example.com', type: 'Member' },
//     { name: 'Eva Green', email: 'eva@example.com', type: 'Member' },
//     { name: 'Frank Ocean', email: 'frank@example.com', type: 'Member' },
//     { name: 'Grace Hopper', email: 'grace@example.com', type: 'Member' },
//     { name: 'Helen Carter', email: 'helen@example.com', type: 'Member' },
//     { name: 'Ian Wright', email: 'ian@example.com', type: 'Member' },
//     { name: 'Julia Stone', email: 'julia@example.com', type: 'Member' },
//     { name: 'Kevin Hart', email: 'kevin@example.com', type: 'Member' },
//     { name: 'Linda Park', email: 'linda@example.com', type: 'Member' },
//     { name: 'Mike Ross', email: 'mike@example.com', type: 'Member' },
//     { name: 'Nina Simone', email: 'nina@example.com', type: 'Member' },
//     { name: 'Oscar Wilde', email: 'oscar@example.com', type: 'Member' },
//   ];
// }

// function getMockStudentsForHour(hour: string): Student[] {
//   return [
//     { name: 'John Doe', uid: '123', time: `${hour}:15` },
//     { name: 'Jane Smith', uid: '456', time: `${hour}:42` },
//   ];
// }
// const formatHourSlot = (hour: number) => {
//   const start = `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
//   const endHour = (hour + 1) % 24;
//   const end = `${endHour % 12 || 12}:00 ${endHour < 12 ? 'AM' : 'PM'}`;
//   return `${start} - ${end}`;
// };


// function getInitials(name: string) {
//   return name
//     .split(' ')
//     .map((n) => n[0])
//     .join('')
//     .toUpperCase();
// }

export default function ReportsPage() {
  const { user } = useAuth();
  const [admissionYears, setAdmissionYears] = useState<string[]>([]);
  const [admissionYear, setAdmissionYear] = useState<string | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
  const  setActiveUsers = useState<User[]>([])[1];
  const [remountKey, setRemountKey] = useState(0);
  const [downloadingHour, setDownloadingHour] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmissionYears()
      .then(data =>  {
        setAdmissionYear(data[0]);
        setAdmissionYears(data);
      })
  }, []);

  // Use authenticated user info
  const currentUser = useMemo(() => (
    user
      ? { name: user.name, email: user.email, type: user.isAdmin ? 'Admin' : 'Member' }
      : { name: 'Unknown', email: 'unknown@example.com', type: 'Member' }
  ), [user]);

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
    channel.bind('pusher:subscription_succeeded', (members: { members: Record<string, User> }) => {
      console.log('[Pusher] subscription_succeeded', members);
      setActiveUsers(Object.values(members.members) as User[]);
    });
    channel.bind('pusher:member_added', (member: { info: User }) => {
      console.log('[Pusher] member_added', member);
      setActiveUsers(prev => {
        const newUser = member.info as User;
        // Avoid adding duplicates
        if (prev.some(u => u.email === newUser.email)) {
          return prev;
        }
        return [...prev, newUser];
      });
    });
    channel.bind('pusher:member_removed', (member: { id: string }) => {
      console.log('[Pusher] member_removed', member);
      setActiveUsers(prev => prev.filter(u => u.email !== member.id));
    });
    channel.bind('pusher:subscription_error', (err: unknown) => {
      console.error('[Pusher] subscription_error', err);
    });
    pusher.connection.bind('error', (err: unknown) => {
      console.error('[Pusher] connection error', err);
    });
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [currentUser.email, currentUser.name, currentUser, currentUser.type, setActiveUsers]);

  // Fetch stats and hourly on mount and when year/date changes
  useEffect(() => {
    if (!admissionYear || !date) return;
    async function fetchStats() {
      const res = await fetch(`${BASE_URL}/api/reports/stats?year=${admissionYear}&date=${date}`);
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
    // Only set the most recent date if none is selected or the current date is not in the list
    if (!date || !formattedDates.includes(date)) {
      const newDate = formattedDates[formattedDates.length - 1];
      if (date !== newDate) {
        setDate(newDate);
      }
    }
  });
}, [admissionYear]);


  // Subscribe to Pusher for real-time stats updates
  useEffect(() => {
    // Function to fetch stats and hourly stats from your API
    async function fetchStatsAndHourly() {
      if (!admissionYear || !date) return;
      const res = await fetch(`${BASE_URL}/api/reports/stats?year=${admissionYear}&date=${date}&t=${Date.now()}`); // cache-busting param
      const data = await res.json();
      console.log('[ReportsPage] Fetched stats:', data);
      if (data.success) {
        setStats(data.stats);
        setHourlyStats(data.hourly);
      }
    }
    async function fetchDates() {
      if (!admissionYear) return;
      const data = await fetchDatesByAdmissionYear(admissionYear);
      const dateStrings = data.map(d => {
        if (typeof d.date === 'string') return d.date;
        if (Object.prototype.toString.call(d.date) === '[object Date]') return (d.date as Date).toISOString().slice(0, 10);
        return String(d.date);
      });
      if (Array.isArray(dateStrings) && dateStrings.length > 0) {
        setDates(dateStrings);
        // Only set the most recent date if none is selected or the current date is not in the list
        if (!date || !dateStrings.includes(date)) {
          setDate(dateStrings[dateStrings.length - 1]);
        }
      }
    }
    fetchStatsAndHourly();
    fetchDates();
    const channel = pusherClient.subscribe('reports');
    const handleStatsUpdate = () => {
      console.log('[ReportsPage] Received stats-update event');
      fetchStatsAndHourly();
      fetchDates();
      setRemountKey(prev => prev + 1); // force remount
    };
    channel.bind('stats-update', handleStatsUpdate);
    return () => {
      channel.unbind('stats-update', handleStatsUpdate);
      pusherClient.unsubscribe('reports');
    };
  }, [admissionYear, date]);

  useEffect(() => {
    // setDate(DATES_BY_YEAR[admissionYear][0]);
  }, [admissionYear]);

  const handleDownloadAllZip = async () => {
    if (!admissionYear) return;
    const res = await fetch(`${BASE_URL}/api/reports/id-cards-zip?admissionYear=${admissionYear}`);
    const blob = await res.blob();
    saveAs(blob, `id-cards-${admissionYear}-${date}.zip`);
  };
  

  // Table and users max heights (adjust as needed for your layout)
  // Filter out the current user from the active users list
  // const filteredActiveUsers = activeUsers.filter(
  //   (u) => u.email !== currentUser.email
  // );

  return (user?.isAdmin ? (
    <div key={remountKey} className="flex flex-col min-h-screen h-screen overflow-hidden p-2">
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
          <Select value={date ?? ""} onValueChange={setDate}>
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
        
        </div>
        {/* Table Section - now full width */}
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
                    {hourlyStats.map(({ from, to }, idx) => {
                      if (!from || !to) return null; // skip this row if data is missing
                      return (
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
                              disabled={downloadingHour === from}
                              onClick={async () => {
                                setDownloadingHour(from);
                                try {
                                  const res = await fetch(`/api/reports/id-card-download?date=${date}&hour=${from.substring(0, 2)}`);
                                  const blob = await res.blob();
                                  saveAs(blob, `id-cards-${date}-${from.substring(0, 2)}.xlsx`);
                                } finally {
                                  setDownloadingHour(null);
                                }
                              }}
                              aria-label="Download"
                            >
                              {downloadingHour === from ? <Spinner className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Removed Average Stats and Active Users sections */}
      </div>
    </div>
  ) : (
    <div>
      <h1>You are not authorized to access this page</h1>
    </div>
  ));
}
