"use client";

import React, { useMemo } from 'react';
import { AppSidebar } from "@/components/app-sidebar"
// import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  // SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/use-auth";
// import { useRouter } from "next/navigation";
// import { useEffect } from "react";
import Pusher from 'pusher-js';

// Inactivity logout provider
function InactivityLogoutProvider({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_LIMIT = 60 * 30 * 1000; // 30 minutes
  // const INACTIVITY_LIMIT = 60 * 1 * 1000; // 1 minute

  // Reset timer function
  const resetTimer = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_LIMIT);
  }, [logout, INACTIVITY_LIMIT]);

  React.useEffect(() => {
    // Patch fetch to reset timer on any API call
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      resetTimer();
      return origFetch(...args);
    };
    // Listen for user events
    const events = ["mousemove", "keydown", "mousedown", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer));
    // Start timer on mount
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.fetch = origFetch;
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [resetTimer]);
  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Mock current user type
  const currentUserType: 'Admin' | 'Member' = 'Admin';
  // Replace with real user info in production
  const getUserEmail = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userEmail') || 'test@gmail.com';
    }
    return 'test@gmail.com';
  };
  const currentUser = useMemo(() => ({ name: 'Test User', email: getUserEmail(), type: currentUserType }), [getUserEmail, currentUserType]);

  React.useEffect(() => {
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
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [currentUser.email, currentUser.name, currentUser.type, currentUser]);

  return (
    <InactivityLogoutProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header> */}
          <div className="flex flex-1 flex-col gap-4 pt-0">
           {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </InactivityLogoutProvider>
  );
}
