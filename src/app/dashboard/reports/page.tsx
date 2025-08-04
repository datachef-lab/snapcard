"use client";
import { saveAs } from 'file-saver';
import { format } from "date-fns";
import React, { useState, useEffect } from 'react';
// import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Download as DownloadIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { fetchAdmissionYears, fetchDatesByAdmissionYear } from './action';
import { Spinner } from '@/components/ui/spinner';

// interface User {
//   name: string;
//   email: string;
//   type: 'Admin' | 'Member';
// }

const BASE_URL = process.env.NEXT_PUBLIC_BASE_PATH!;

export default function ReportsPage() {
  const { user } = useAuth();
  const setAdmissionYears = useState<string[]>([])[1];
  const setAdmissionYear = useState<string | null>(null)[1];
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [remountKey] = useState(0);

  useEffect(() => {
    fetchAdmissionYears()
      .then(data =>  {
        setAdmissionYear(data[0]);
        setAdmissionYears(data);
      })
  }, [setAdmissionYear, setAdmissionYears]);

  // Use authenticated user info
  // const currentUser = useMemo(() => (
  //   user
  //     ? { name: user.name, email: user.email, type: user.isAdmin ? 'Admin' : 'Member' }
  //     : { name: 'Unknown', email: 'unknown@example.com', type: 'Member' }
  // ), [user]);

  // Fetch dates when admissionYear changes
  useEffect(() => {
    // if (!admissionYear) return;
    
    // console.log('Fetching dates for admission year:', admissionYear);
    
    fetchDatesByAdmissionYear()
      .then(data => {
        console.log('Raw dates from DB:', data);
        const formattedDates = data.map(ele =>
          format(new Date(ele.date), "dd-MM-yyyy")
        );
        console.log('Formatted dates:', formattedDates);
        setDates(formattedDates);
        // Only set the most recent date if none is selected or the current date is not in the list
        if (!selectedDate || !formattedDates.includes(selectedDate)) {
          setSelectedDate(formattedDates[formattedDates.length - 1]);
        }
      })
      .catch(error => {
        console.error('Error fetching dates:', error);
        setDates([]);
        setSelectedDate(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadByDate = async () => {
    if (!selectedDate) return;
    
    setDownloading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/reports/id-card-download?date=${selectedDate}`);
      const blob = await res.blob();
      saveAs(blob, `id-cards-${selectedDate}.xlsx`);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadZipByDate = async () => {
    if (!selectedDate) return;
    
    setDownloading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/reports/id-cards-zip?date=${selectedDate}`);
      const blob = await res.blob();
      saveAs(blob, `id-cards-${selectedDate}.zip`);
    } catch (error) {
      console.error('ZIP download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (user?.isAdmin ? (
    <div key={remountKey} className="flex flex-col min-h-screen h-screen overflow-hidden p-2">
      {/* Heading */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2 overflow-hidden border-b border-gray-200 mb-6 bg-white" style={{flex: '0 0 auto'}}>
        <h1 className="text-3xl font-bold tracking-tight">Reports Dashboard</h1>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden px-6">
        <div className="bg-white rounded-lg">
          {/* <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Download ID Cards</h2>
              </div> */}
          <div className="flex gap-2  items-center">
            
            
            <div className="w-2/3 gap-6">
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admission Year
                </label>
                <Select value={admissionYear ?? ""} onValueChange={setAdmissionYear}>
                  <SelectTrigger className="w-full h-11 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Select Admission Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {admissionYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}
              
              <div>
                {/* <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label> */}
                <Select value={selectedDate ?? ""} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-full h-11 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Select Date" />
                  </SelectTrigger>
                  <SelectContent>
                    {dates.map((date) => (
                      <SelectItem key={date} value={date}>{date}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-center gap-4 ">
              <Button 
                onClick={handleDownloadByDate}
                disabled={!selectedDate || downloading}
                className="px-8 h-12 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-center">
                  {downloading ? (
                    <>
                      <Spinner className="w-5 h-5 mr-3 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-5 h-5 mr-3" />
                      <span>Download Excel</span>
                    </>
                  )}
                </div>
              </Button>
              
              <Button 
                onClick={handleDownloadZipByDate}
                disabled={!selectedDate || downloading}
                className="px-8 h-12 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-center">
                  {downloading ? (
                    <>
                      <Spinner className="w-5 h-5 mr-3 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-5 h-5 mr-3" />
                      <span>Download ZIP</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div>
      <h1>You are not authorized to access this page</h1>
    </div>
  ));
}
