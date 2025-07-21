"use client";

import React from 'react';
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
  const currentUser = { name: 'Test User', email: getUserEmail(), type: currentUserType };

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
  }, [currentUser.email, currentUser.name, currentUser.type]);

  return (
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
  );
}
