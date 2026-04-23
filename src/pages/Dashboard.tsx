import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";
import {
  Users, Building2, Truck, Cpu, AlertCircle, CheckCircle, 
  TrendingUp, TrendingDown, Sun, Moon, Filter, Bell, 
  PlusCircle, Search, Calendar, Download, Loader2,
  Ticket, ClipboardList, Boxes, UserPlus
} from "lucide-react";
import { format } from "date-fns";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------- Types ----------
interface DashboardSummary {
  counts: {
    total_users: number;
    total_companies: number;
    total_dealers: number;
    total_machines: number;
    open_tickets: number;
    active_tasks: number;
  };
  task_stats: { name: string; count: number }[];
  ticket_stats: { name: string; count: number }[];
  machine_stats: { name: string; count: number }[];
  tasks_per_user: { name: string; tasks: number }[];
  tickets_per_user: { name: string; tickets: number }[];
  machines_per_dealer: { name: string; machines: number }[];
  monthly_tasks: { month: string; count: number }[];
  monthly_tickets: { month: string; count: number }[];
  top_employee: { name: string; tasks_completed: number };
  top_dealer: { name: string; machines_handled: number };
  recent_activity: {
    tickets: any[];
    tasks: any[];
    installations: any[];
  };
  role: string;
}

// ---------- Helper: Sparkline component ----------
const Sparkline = ({ data, color }: { data: number[]; color: string }) => (
  <ResponsiveContainer width="100%" height={30}>
    <AreaChart data={data.map((v, i) => ({ i, v }))}>
      <Area type="monotone" dataKey="v" stroke={color} fill={`${color}20`} strokeWidth={1.5} />
    </AreaChart>
  </ResponsiveContainer>
);

// ---------- Main Dashboard ----------
export default function Dashboard() {
  const { user } = useAuth();
  const token = user?.token || localStorage.getItem("token");
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("6m");

  // Fetch dashboard data
  useEffect(() => {
    if (!token) return;
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/dashboard/summary/", {
          headers: { Authorization: `Token ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSummary(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [token]);

  // Dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // KPI cards with mock trends (replace with real trend data if available)
  const kpis = useMemo(() => {
    if (!summary) return [];
    return [
      { title: "Total Users", value: summary.counts.total_users, icon: Users, color: "blue", trend: 12, sparkline: [10, 15, 12, 18, 22, 25] },
      { title: "Total Companies", value: summary.counts.total_companies, icon: Building2, color: "purple", trend: 5, sparkline: [4, 7, 6, 9, 10, 12] },
      { title: "Total Dealers", value: summary.counts.total_dealers, icon: Truck, color: "green", trend: 8, sparkline: [12, 14, 13, 17, 20, 22] },
      { title: "Total Machines", value: summary.counts.total_machines, icon: Cpu, color: "orange", trend: -2, sparkline: [45, 48, 52, 50, 55, 53] },
      { title: "Open Tickets", value: summary.counts.open_tickets, icon: AlertCircle, color: "red", trend: 20, sparkline: [5, 8, 7, 12, 15, 18] },
      { title: "Active Tasks", value: summary.counts.active_tasks, icon: CheckCircle, color: "teal", trend: -5, sparkline: [20, 22, 18, 15, 14, 13] },
    ];
  }, [summary]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec489a"];

  // Quick action handlers
  const quickActions = [
    { label: "Create New Ticket", icon: Ticket, path: "/tickets/new", color: "bg-blue-500" },
    { label: "Add Machine", icon: Boxes, path: "/machines/new", color: "bg-green-500" },
    { label: "Assign Task", icon: ClipboardList, path: "/tasks/new", color: "bg-purple-500" },
    { label: "Search Dashboard", icon: Search, path: "/search", color: "bg-slate-500" },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !summary) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error loading dashboard: {error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header with filters and actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-2 font-semibold">Notifications</div>
                <DropdownMenuItem>New ticket #123 opened</DropdownMenuItem>
                <DropdownMenuItem>Task "Install machine" completed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2" variant="outline">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          {kpis.map((kpi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">{kpi.title}</p>
                      <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                      <div className="flex items-center mt-1 text-xs">
                        {kpi.trend > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span className={kpi.trend > 0 ? "text-green-500" : "text-red-500"}>
                          {Math.abs(kpi.trend)}%
                        </span>
                        <span className="text-muted-foreground ml-1">vs last month</span>
                      </div>
                    </div>
                    <div className={`p-2 rounded-full bg-${kpi.color}-100 dark:bg-${kpi.color}-900/30`}>
                      <kpi.icon className={`h-5 w-5 text-${kpi.color}-600`} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Sparkline data={kpi.sparkline} color={`var(--${kpi.color}-500)`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Section */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="tasks">📋 Tasks</TabsTrigger>
            <TabsTrigger value="tickets">🎫 Tickets</TabsTrigger>
            <TabsTrigger value="machines">⚙️ Machines</TabsTrigger>
            <TabsTrigger value="growth">📈 Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary.task_stats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[8,8,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tasks per User</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary.tasks_per_user} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip />
                      <Bar dataKey="tasks" fill="#10b981" radius={[0,8,8,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={summary.ticket_stats} cx="50%" cy="50%" outerRadius={80} dataKey="count" label>
                        {summary.ticket_stats.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tickets per User</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.tickets_per_user.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={summary.tickets_per_user}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="tickets" fill="#f59e0b" radius={[8,8,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="machines" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Machine Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.machine_stats.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No status data available (add 'status' field to MachineInstallation)
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={summary.machine_stats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[8,8,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Machines per Dealer</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={summary.machines_per_dealer}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="machines" fill="#ec489a" radius={[8,8,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Tasks Created</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={summary.monthly_tasks}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Tickets Created</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={summary.monthly_tickets}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom Section: Top Performers + Recent Activity + Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Top Performers */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>🏆 Top Performers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{summary.top_employee.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{summary.top_employee.name}</p>
                  <p className="text-xs text-muted-foreground">Most tasks completed</p>
                </div>
                <Badge>{summary.top_employee.tasks_completed} tasks</Badge>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{summary.top_dealer.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{summary.top_dealer.name}</p>
                  <p className="text-xs text-muted-foreground">Most machines handled</p>
                </div>
                <Badge>{summary.top_dealer.machines_handled} machines</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>🕒 Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {summary.recent_activity.tickets.slice(0, 3).map((ticket: any) => (
                <div key={ticket.id} className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 mt-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="font-medium">Ticket #{ticket.id}</p>
                    <p className="text-muted-foreground text-xs">{ticket.title}</p>
                  </div>
                </div>
              ))}
              {summary.recent_activity.tasks.slice(0, 3).map((task: any) => (
                <div key={task.id} className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 mt-2 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium">Task: {task.title}</p>
                    <p className="text-muted-foreground text-xs">{task.status}</p>
                  </div>
                </div>
              ))}
              {summary.recent_activity.installations.slice(0, 3).map((inst: any) => (
                <div key={inst.id} className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 mt-2 rounded-full bg-purple-500" />
                  <div>
                    <p className="font-medium">Installation #{inst.batch_number}</p>
                    <p className="text-muted-foreground text-xs">{format(new Date(inst.created_at), 'PP')}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>⚡ Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  className="w-full justify-start gap-2"
                  variant="outline"
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}