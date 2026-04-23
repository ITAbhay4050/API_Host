import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { UserRole } from "@/types";

const fetchWithAuth = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
  return res.json();
};

const groupByStatus = <T extends { status?: string }>(
  items: T[],
  statusMap: Record<string, string>
) => {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    const rawStatus = item.status?.toLowerCase() || "unknown";
    const displayName = statusMap[rawStatus] || rawStatus;
    counts[displayName] = (counts[displayName] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
};

const Dashboard = () => {
  const { user } = useAuth();
  // Try to get token from user object first (if your AuthContext attaches it), else localStorage
  const token = user?.token || localStorage.getItem("token");
  const hasFetched = useRef(false);

  const [greeting, setGreeting] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stat cards
  const [companiesCount, setCompaniesCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [dealersCount, setDealersCount] = useState(0);
  const [machinesCount, setMachinesCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);

  // Chart data
  const [taskStats, setTaskStats] = useState<{ name: string; count: number }[]>([]);
  const [ticketStats, setTicketStats] = useState<{ name: string; count: number }[]>([]);
  const [machineStats, setMachineStats] = useState<{ name: string; count: number }[]>([]);

  // Greeting
  useEffect(() => {
    const hour = new Date().getHours();
    const text =
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    setGreeting(text);
  }, []);

  // Fetch data – runs only once when user.id and token are available
  useEffect(() => {
    if (!user?.id || !token) {
      if (!user?.id) console.warn("Dashboard: user not loaded yet");
      if (!token) console.warn("Dashboard: token missing");
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Fetching dashboard data with token:", token);

        // 1. Companies (only for APP_ADMIN)
        if (user.role === UserRole.APPLICATION_ADMIN) {
          const companies = await fetchWithAuth("http://127.0.0.1:8000/api/companies/", token);
          setCompaniesCount(companies.length);
        }

        // 2. Users
        const users = await fetchWithAuth("http://127.0.0.1:8000/api/users/", token);
        setUsersCount(users.length);

        // 3. Dealers count
        let dealerCountUrl = "http://127.0.0.1:8000/api/dealers/count/";
        if (
          user.role === UserRole.COMPANY_ADMIN ||
          user.role === UserRole.COMPANY_EMPLOYEE
        ) {
          dealerCountUrl += `?company_id=${user.companyId}`;
        }
        const dealerData = await fetchWithAuth(dealerCountUrl, token);
        setDealersCount(dealerData.dealer_count);

        // 4. Machines
        let machinesUrl = "http://127.0.0.1:8000/api/installations/list/";
        if (user.role === UserRole.DEALER_ADMIN || user.role === UserRole.DEALER_EMPLOYEE) {
          machinesUrl += `?dealer_id=${user.dealerId}`;
        } else if (user.role === UserRole.COMPANY_ADMIN || user.role === UserRole.COMPANY_EMPLOYEE) {
          machinesUrl += `?company_id=${user.companyId}`;
        }
        const machines = await fetchWithAuth(machinesUrl, token);
        setMachinesCount(machines.length);

        // 5. Employees
        if (
          user.role === UserRole.COMPANY_ADMIN ||
          user.role === UserRole.DEALER_ADMIN
        ) {
          const employees = await fetchWithAuth("http://127.0.0.1:8000/api/employees/", token);
          setEmployeesCount(employees.length);
        }

        // 6. Tasks
        const tasks = await fetchWithAuth("http://127.0.0.1:8000/api/tasks/", token);
        const taskStatusMap: Record<string, string> = {
          pending: "Pending",
          in_progress: "In Progress",
          completed: "Completed",
        };
        setTaskStats(groupByStatus(tasks, taskStatusMap));

        // 7. Tickets
        const tickets = await fetchWithAuth("http://127.0.0.1:8000/api/tickets/", token);
        const ticketStatusMap: Record<string, string> = {
          open: "Open",
          in_progress: "In Progress",
          resolved: "Resolved",
          closed: "Closed",
        };
        setTicketStats(groupByStatus(tickets, ticketStatusMap));

        const openCount = tickets.filter(
          (t: any) =>
            t.status?.toLowerCase() === "open" ||
            t.status?.toLowerCase() === "in_progress"
        ).length;
        setOpenTicketsCount(openCount);

        // 8. Machine status
        const machineStatusMap: Record<string, string> = {
          installed: "Installed",
          pending: "Pending",
          servicing: "Servicing",
        };
        setMachineStats(groupByStatus(machines, machineStatusMap));
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user?.id, user?.role, token]); // only re-run if these change

  const getRoleSpecificStats = () => {
    switch (user?.role) {
      case UserRole.APPLICATION_ADMIN:
        return [
          { title: "Total Users", value: usersCount.toString() },
          { title: "Total Companies", value: companiesCount.toString() },
          { title: "Total Dealers", value: dealersCount.toString() },
          { title: "Total Machines", value: machinesCount.toString() },
        ];
      case UserRole.COMPANY_ADMIN:
        return [
          { title: "Total Employees", value: employeesCount.toString() },
          { title: "Active Dealers", value: dealersCount.toString() },
          { title: "Active Machines", value: machinesCount.toString() },
          { title: "Open Tickets", value: openTicketsCount.toString() },
        ];
      case UserRole.COMPANY_EMPLOYEE:
        const assignedTasks = taskStats.find((s) => s.name === "Pending")?.count || 0;
        const pendingMachines = machineStats.find((s) => s.name === "Pending")?.count || 0;
        return [
          { title: "Assigned Tasks", value: assignedTasks.toString() },
          { title: "Machines Installed", value: machinesCount.toString() },
          { title: "Open Tickets", value: openTicketsCount.toString() },
          { title: "Pending Installation", value: pendingMachines.toString() },
        ];
      case UserRole.DEALER_ADMIN:
        const dealerTasks = taskStats.reduce((sum, s) => sum + s.count, 0);
        return [
          { title: "Total Employees", value: employeesCount.toString() },
          { title: "Managed Machines", value: machinesCount.toString() },
          { title: "Open Tasks", value: dealerTasks.toString() },
          { title: "Active Tickets", value: openTicketsCount.toString() },
        ];
      case UserRole.DEALER_EMPLOYEE:
        const myTasks = taskStats.find((s) => s.name === "Pending")?.count || 0;
        const myTickets = openTicketsCount;
        const myPending = machineStats.find((s) => s.name === "Pending")?.count || 0;
        return [
          { title: "Assigned Tasks", value: myTasks.toString() },
          { title: "Installations Assisted", value: machinesCount.toString() },
          { title: "Open Tickets", value: myTickets.toString() },
          { title: "Pending Tasks", value: myPending.toString() },
        ];
      default:
        return [
          { title: "Tasks", value: "0" },
          { title: "Machines", value: "0" },
          { title: "Tickets", value: "0" },
          { title: "Users", value: "0" },
        ];
    }
  };

  const stats = getRoleSpecificStats();
  const title = user?.role
    ? user.role.replace(/_/g, " ").toLowerCase()
    : "dashboard";

  // Show error if token is missing and user is logged in
  if (user?.id && !token) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">
            Authentication error: No access token found. Please log out and log in again.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error: {error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {greeting}
            {user?.name ? `, ${user.name}` : ""}
          </h2>
          <p className="text-muted-foreground">
            Here’s an overview of your {title}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, idx) => (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="machines">Machines</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Task Statistics</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                {taskStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No task data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={taskStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="Tasks" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {ticketStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No ticket data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ticketStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {ticketStats.map((_, i) => (
                          <Cell key={i} fill={["#0088FE", "#00C49F", "#FFBB28", "#FF8042"][i % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="machines">
            <Card>
              <CardHeader>
                <CardTitle>Machine Status</CardTitle>
              </CardHeader>
              <CardContent>
                {machineStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No machine data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={machineStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#22c55e" name="Machines" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;