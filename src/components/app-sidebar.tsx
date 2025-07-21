"use client";

import * as React from "react";
import {
  // AudioWaveform,
  // BookOpen,
  // Bot,
  // Command,
  // Frame,
  GalleryVerticalEnd,
  // Map,
  // PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "BESC | ID Card Generate",
      logo: GalleryVerticalEnd,
      plan: "#v2.0.0",
    },
  ],
  navMain: [
    {
      title: "Print ID-Card",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
      items: [],
    },
    // {
    //   title: "Print Id-Card",
    //   url: "/dashboard/print-id-card",
    //   icon: Bot,
    //   items: [],
    // },
  ],
  projects: [
    {
      name: "Reports",
      url: "/dashboard/reports",
      icon: Settings2,
    },
    {
      name: "Users",
      url: "/dashboard/users",
      icon: Settings2,
    },
    {
      name: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
