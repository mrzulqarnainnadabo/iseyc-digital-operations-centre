import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Beaker, ClipboardCheck, FilePlus2, LayoutDashboard, ListChecks, LogOut, PanelLeft, ShieldCheck, UsersRound } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "./ui/sidebar";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: FilePlus2, label: "New intake", path: "/intake" },
  { icon: ClipboardCheck, label: "Intake queue", path: "/queue" },
  { icon: ListChecks, label: "Action register", path: "/actions" },
  { icon: Beaker, label: "Test mode", path: "/test-mode" },
  { icon: UsersRound, label: "Officer access", path: "/officer-access", adminOnly: true },
];
const SIDEBAR_WIDTH_KEY = "ise yc-sidebar-width".replace(" ", "");
const DEFAULT_WIDTH = 278;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || DEFAULT_WIDTH);
  const { loading, user, logout } = useAuth();
  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)), [sidebarWidth]);
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user || !user.isAuthorizedOfficer) return <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#ecfdf5,transparent_38%),#f8fafc] p-6"><div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_30px_80px_-40px_rgba(15,23,42,.3)]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 font-serif text-xl text-emerald-300">I</div><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">ISEYC Officer Access</p><h1 className="mt-2 font-serif text-3xl text-slate-950">Meeting & Decision Tracker</h1><p className="mt-3 text-sm leading-6 text-slate-600">This controlled workspace is available only to authorised ISEYC officers. {user ? "Your officer access has not yet been authorised." : "Sign in to request access."}</p>{user ? <Button onClick={logout} size="lg" className="mt-7 w-full bg-slate-950 text-white hover:bg-slate-800">Sign out</Button> : <Button onClick={() => startLogin()} size="lg" className="mt-7 w-full bg-slate-950 text-white hover:bg-slate-800">Sign in to continue</Button>}<p className="mt-5 text-xs text-slate-400">Empowering Youths, Shaping Communities.</p></div></div>;
  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><LayoutContent setSidebarWidth={setSidebarWidth}>{children}</LayoutContent></SidebarProvider>;
}
function LayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (value: number) => void }) {
  const { user, logout } = useAuth(); const [location, setLocation] = useLocation(); const { state, toggleSidebar } = useSidebar(); const isCollapsed = state === "collapsed"; const isMobile = useIsMobile(); const [isResizing, setIsResizing] = useState(false); const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const move = (event: MouseEvent) => { if (!isResizing) return; const left = sidebarRef.current?.getBoundingClientRect().left || 0; const width = event.clientX - left; if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width); }; const up = () => setIsResizing(false); if (isResizing) { document.addEventListener("mousemove", move); document.addEventListener("mouseup", up); document.body.style.cursor = "col-resize"; } return () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.body.style.cursor = ""; }; }, [isResizing, setSidebarWidth]);
  const active = menuItems.find(item => item.path === location)?.label || "Record review";
  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || user?.role === "admin");
  return <><div ref={sidebarRef} className="relative"><Sidebar collapsible="icon" className="!border-r !border-slate-800 !bg-slate-950 text-slate-200" disableTransition={isResizing}><SidebarHeader className="h-20 justify-center !border-b !border-slate-800 !bg-slate-950"><div className="flex items-center gap-3 px-3"><button onClick={toggleSidebar} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><PanelLeft className="h-4 w-4" /></button>{!isCollapsed ? <div className="min-w-0"><p className="font-serif text-lg text-white">ISEYC</p><p className="truncate text-[10px] font-bold uppercase tracking-[.13em] text-emerald-300">Records Control</p></div> : null}</div></SidebarHeader><SidebarContent className="!bg-slate-950 pt-5"><SidebarMenu className="px-3">{visibleMenuItems.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 text-slate-300 hover:bg-slate-800 hover:text-white data-[active=true]:bg-emerald-400 data-[active=true]:text-slate-950"><item.icon className="h-4 w-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu><div className="mx-4 mt-7 border-t border-slate-800 pt-5 group-data-[collapsible=icon]:hidden"><div className="flex gap-2 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />Human approval is mandatory before authority is granted.</div></div></SidebarContent><SidebarFooter className="!border-t !border-slate-800 !bg-slate-950 p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-slate-800"><Avatar className="h-9 w-9 border border-slate-700"><AvatarFallback className="bg-slate-800 text-xs text-emerald-200">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user?.name || "Officer"}</p><p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[.11em] text-slate-500">{user?.role || "user"} access</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={logout} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-emerald-400/40 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => setIsResizing(true)} /></div><SidebarInset className="bg-[radial-gradient(circle_at_top_right,#ecfdf5,transparent_26%),#f8fafc]">{isMobile ? <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur"><SidebarTrigger /><span className="font-serif text-lg text-slate-900">{active}</span></header> : null}<main className="min-h-screen p-5 sm:p-8">{children}</main></SidebarInset></>;
}
