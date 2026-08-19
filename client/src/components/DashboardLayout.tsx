import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Beaker, Building2, ClipboardCheck, FilePenLine, FilePlus2, Landmark, ListChecks, LogOut, PanelLeft, ShieldCheck, UsersRound, UserRound, Waypoints } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "./ui/sidebar";

const ISEYC_LOGO = "/manus-storage/iseyc-official-logo_612c4ed8.jpg";
type MenuItem = { icon: typeof Landmark; label: string; path: string; group: "Executive" | "Development" | "Operating records" | "Communications" | "Governance"; nationalPresidentOnly?: boolean; adminOnly?: boolean };
const menuItems: MenuItem[] = [
  { icon: Landmark, label: "Command Brief", path: "/", group: "Executive", nationalPresidentOnly: true },
  { icon: UserRound, label: "My development", path: "/development", group: "Development" },
  { icon: ClipboardCheck, label: "Continuity & contribution", path: "/development-continuity", group: "Development" },
  { icon: Waypoints, label: "Community intelligence", path: "/community-intelligence", group: "Development" },
  { icon: Building2, label: "Digital Chamber", path: "/chamber", group: "Operating records" },
  { icon: ClipboardCheck, label: "Meeting & Decisions", path: "/queue", group: "Operating records" },
  { icon: FilePlus2, label: "New meeting intake", path: "/intake", group: "Operating records" },
  { icon: ListChecks, label: "Action register", path: "/actions", group: "Operating records" },
  { icon: Beaker, label: "Controlled test mode", path: "/test-mode", group: "Operating records" },
  { icon: FilePenLine, label: "Media & Content Command", path: "/media", group: "Communications" },
  { icon: UsersRound, label: "Officer access", path: "/officer-access", group: "Governance", adminOnly: true },
  { icon: ShieldCheck, label: "Development review", path: "/development-governance", group: "Governance", adminOnly: true },
];
const SIDEBAR_WIDTH_KEY = "iseyc-doc-sidebar-width";
const DEFAULT_WIDTH = 292;
const MIN_WIDTH = 228;
const MAX_WIDTH = 430;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user, logout } = useAuth();
  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); }, [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <AccessCard title="ISEYC Digital Operations Centre" description="Sign in with your authorised ISEYC account to begin a secure institutional and developmental journey." action="Sign in to continue" onClick={() => startLogin()} />;
  if (!user.isAuthorizedOfficer) return <AccessCard title="ISEYC Digital Operations Centre" description="Your account is signed in. An ISEYC administrator must confirm the appropriate institutional role before operational modules become available." action="Sign out" onClick={logout} />;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><LayoutContent setSidebarWidth={setSidebarWidth}>{children}</LayoutContent></SidebarProvider>;
}

function AccessCard({ title, description, action, onClick }: { title: string; description: string; action: string; onClick: () => void }) {
  return <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#ecfdf5,transparent_38%),#f8fafc] p-6"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_30px_80px_-40px_rgba(15,23,42,.3)]"><img src={ISEYC_LOGO} alt="Official ISEYC logo" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-sm" /><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Institutional access</p><h1 className="mt-2 font-serif text-3xl text-slate-950">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p><Button onClick={onClick} size="lg" className="mt-7 w-full bg-slate-950 text-white hover:bg-slate-800">{action}</Button><p className="mt-5 text-xs text-slate-400">Empowering Youths, Shaping Communities.</p></div></div>;
}

function LayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (value: number) => void }) {
  const { user, logout } = useAuth(); const [location, setLocation] = useLocation(); const { state, toggleSidebar } = useSidebar(); const isCollapsed = state === "collapsed"; const isMobile = useIsMobile(); const [isResizing, setIsResizing] = useState(false); const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const move = (event: MouseEvent) => { if (!isResizing) return; const left = sidebarRef.current?.getBoundingClientRect().left || 0; const width = event.clientX - left; if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width); }; const up = () => setIsResizing(false); if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.cursor = "col-resize"; } return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; }; }, [isResizing, setSidebarWidth]);
  const visible = menuItems.filter(item => (!item.nationalPresidentOnly || user?.docRole === "national_president") && (!item.adminOnly || user?.role === "admin")); const active = menuItems.find(item => item.path === location)?.label || "Digital Operations Centre"; const docRoleLabel = (user?.docRole || "officer").replaceAll("_", " ");
  return <><div ref={sidebarRef} className="relative"><Sidebar collapsible="icon" className="!border-r !border-slate-800 !bg-slate-950 text-slate-200" disableTransition={isResizing}><SidebarHeader className="h-24 justify-center !border-b !border-slate-800 !bg-slate-950"><div className="flex items-center gap-3 px-3"><button onClick={toggleSidebar} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><PanelLeft className="h-4 w-4" /></button>{!isCollapsed ? <div className="flex min-w-0 items-center gap-2"><img src={ISEYC_LOGO} alt="ISEYC" className="h-10 w-10 rounded-xl object-cover" /><div className="min-w-0"><p className="font-serif text-lg text-white">ISEYC</p><p className="truncate text-[10px] font-bold uppercase tracking-[.15em] text-emerald-300">Digital Operations Centre</p></div></div> : null}</div></SidebarHeader><SidebarContent className="!bg-slate-950 pt-5">{["Executive", "Development", "Operating records", "Communications", "Governance"].map(group => { const groupItems = visible.filter(item => item.group === group); if (!groupItems.length) return null; return <div key={group} className="mb-5"><p className="mb-2 px-5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 group-data-[collapsible=icon]:hidden">{group}</p><SidebarMenu className="px-3">{groupItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 text-slate-300 hover:bg-slate-800 hover:text-white data-[active=true]:bg-emerald-400 data-[active=true]:text-slate-950"><item.icon className="h-4 w-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></div>; })}<div className="mx-4 mt-5 border-t border-slate-800 pt-5 group-data-[collapsible=icon]:hidden"><div className="flex gap-2 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />Human authority remains final for records, actions, decisions, development guidance, and external communication.</div></div></SidebarContent><SidebarFooter className="!border-t !border-slate-800 !bg-slate-950 p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-slate-800"><Avatar className="h-9 w-9 border border-slate-700"><AvatarFallback className="bg-slate-800 text-xs text-emerald-200">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user?.name || "ISEYC Member"}</p><p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[.11em] text-emerald-300">{docRoleLabel}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setLocation("/development")}><UserRound className="mr-2 h-4 w-4" />My development</DropdownMenuItem><DropdownMenuItem onClick={logout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-emerald-400/40 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} /></div><SidebarInset className="bg-[radial-gradient(circle_at_top_right,#ecfdf5,transparent_26%),#f8fafc]">{isMobile ? <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur"><SidebarTrigger /><span className="font-serif text-lg text-slate-900">{active}</span></header> : null}<main className="min-h-screen p-5 sm:p-8">{children}</main></SidebarInset></>;
}
