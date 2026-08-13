import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Actions from "./pages/Actions";
import Home from "./pages/Home";
import Intake from "./pages/Intake";
import NotFound from "./pages/NotFound";
import OfficerAccess from "./pages/OfficerAccess";
import Queue from "./pages/Queue";
import ReviewRecord from "./pages/ReviewRecord";
import TestMode from "./pages/TestMode";

function Router() { return <DashboardLayout><Switch><Route path="/" component={Home} /><Route path="/intake" component={Intake} /><Route path="/queue" component={Queue} /><Route path="/actions" component={Actions} /><Route path="/test-mode" component={TestMode} /><Route path="/officer-access" component={OfficerAccess} /><Route path="/review/:id" component={ReviewRecord} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></DashboardLayout>; }
export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
