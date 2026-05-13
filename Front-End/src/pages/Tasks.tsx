import { useState, useEffect, FormEvent } from "react";
import DashboardLayout from "@/components/Layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Task, UserRole } from "@/types";

/* UI kit */
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

/* Icons */
import {
  Plus,
  Search,
  FilterIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Config & helpers                                                   */
/* ------------------------------------------------------------------ */
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const apiFetch = async (
  path: string,
  options: RequestInit = {},
  token?: string,
) => {
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...(options.headers || {}),
  } as HeadersInit;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
};

// Normalise task – handle missing fields safely
const normaliseTask = (t: any): Task => ({
  id: String(t.id),
  title: t.title || "",
  description: t.description || "",
  created_at: t.created_at,
  deadline: t.deadline,
  priority: t.priority || "medium",
  status: t.status || "pending",
  // Map 'assignee' (the ID from Django) to 'assignee_id' for your filter
  assignee_id: t.assignee ? String(t.assignee) : null, 
  assigner_id: t.assigner ? String(t.assigner) : null,
  assignee_name: t.assignee_name || "Unassigned",
  assigner_name: t.assigner_name || "N/A",
});

/* ------------------------------------------------------------------ */
/* Badges                                                                 */
/* ------------------------------------------------------------------ */
const PriorityBadge = ({ p }: { p: Task["priority"] }) => {
  const map = {
    low: "bg-blue-100 text-blue-800 border-blue-300",
    medium: "bg-green-100 text-green-800 border-green-300",
    high: "bg-orange-100 text-orange-800 border-orange-300",
    urgent: "bg-red-100 text-red-800 border-red-300",
  } as const;
  return <Badge className={map[p]}>{p.toUpperCase()}</Badge>;
};

const StatusBadge = ({ s }: { s: Task["status"] }) => {
  const badgeMap: Record<Task["status"], JSX.Element> = {
    pending: (
      <Badge className="flex items-center gap-1 bg-amber-100 text-amber-800 border-amber-300">
        <Clock className="h-3 w-3" /> Pending
      </Badge>
    ),
    "in-progress": (
      <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-300">
        <AlertTriangle className="h-3 w-3" /> In Progress
      </Badge>
    ),
    completed: (
      <Badge className="flex items-center gap-1 bg-green-100 text-green-800 border-green-300">
        <CheckCircle className="h-3 w-3" /> Completed
      </Badge>
    ),
    cancelled: (
      <Badge className="flex items-center gap-1 bg-red-100 text-red-800 border-red-300">
        <XCircle className="h-3 w-3" /> Cancelled
      </Badge>
    ),
  };
  return badgeMap[s];
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
const Tasks = () => {
  const { user } = useAuth();
  const token = user?.token;

  /* ---------------- state --------------- */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; role: string }[]>([]);
  const [searchTerm, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Task["status"] | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const resetDraft = (): Partial<Task> => ({
    title: "",
    description: "",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    priority: "medium",
    status: "pending",
    assignee_id: "",
  });
  const [draft, setDraft] = useState<Partial<Task>>(resetDraft);

  // Permissions
  const canCreate = user?.role === UserRole.APPLICATION_ADMIN || user?.role === UserRole.COMPANY_ADMIN;
  const canDelete = user?.role === UserRole.APPLICATION_ADMIN; // or company admin can delete own tasks

  /* --------------- fetch data -------------- */
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/tasks/", {}, token);
      const list: Task[] = (Array.isArray(data) ? data : data.results || []).map(normaliseTask);
      setTasks(list);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Fetch failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!canCreate) return;
    try {
      setEmployeesLoading(true);
      const data = await apiFetch("/employees/", {}, token);
      setEmployees(Array.isArray(data) ? data : data.results || []);
    } catch (e: any) {
      console.error("Failed to fetch employees:", e);
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTasks();
      fetchEmployees();
    }
  }, [token]);
const visibleTasks = tasks.filter((t) => {
  // 1. Search Filter (Title or Description)
  const hitsSearch =
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase());

  // 2. Status Filter (Tabs)
  const hitsStatus = statusFilter ? t.status === statusFilter : true;

  // 3. User Role & Permission Logic
  if (!user) return false;

  // Since your Django backend is already filtering the querysets:
  // - Company Admins only receive their company's tasks.
  // - Company Employees only receive their assigned tasks.
  // - Dealer roles receive an empty list.
  
  // We only need to check search and status hits. 
  // Avoid checking 't.assignee_id === user.id' here to prevent ID type mismatches.
  if (user.role === UserRole.DEALER_ADMIN || user.role === UserRole.DEALER_EMPLOYEE) {
    return false;
  }

  return hitsSearch && hitsStatus;
});  /* --------------- create task ------------- */
const handleCreate = async (e: FormEvent) => {
  e.preventDefault();
  if (!draft.title || !draft.description || !draft.assignee_id || !draft.deadline) {
    toast({
      title: "Error",
      description: "Please fill all required fields",
      variant: "destructive"
    });
    return;
  }
  try {
    // Convert assignee_id to number (backend expects integer)
    const payload = {
      title: draft.title,
      description: draft.description,
      deadline: draft.deadline,
      priority: draft.priority,
      assignee: Number(draft.assignee_id)   // backend field name is 'assignee'
    };

    const newTask: Task = await apiFetch(
      "/tasks/",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    );
    setTasks((prev) => [...prev, normaliseTask(newTask)]);
    toast({ title: "Success", description: "Task created successfully." });
    setCreateDialogOpen(false);
    setDraft(resetDraft());
  } catch (e: any) {
    toast({ title: "Error", description: e.message || "Create failed", variant: "destructive" });
  }
}; /* ------------ update status ------------- */
  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const updatedTask = await apiFetch(
        `/tasks/${taskId}/`,
        { method: "PATCH", body: JSON.stringify({ status: newStatus }) },
        token,
      );
      setTasks(prev => prev.map(task =>
        task.id === taskId ? normaliseTask(updatedTask) : task
      ));
      if (selectedTask?.id === taskId) {
        setSelectedTask(normaliseTask(updatedTask));
      }
      toast({ title: "Success", description: "Status updated successfully." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Status update failed", variant: "destructive" });
    }
  };

  /* ------------ delete task -------------- */
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiFetch(`/tasks/${taskId}/`, { method: "DELETE" }, token);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      if (selectedTask?.id === taskId) {
        setDetailDialogOpen(false);
        setSelectedTask(null);
      }
      toast({ title: "Success", description: "Task deleted successfully." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Delete failed", variant: "destructive" });
    }
  };

  /* ------------ open task details ---------- */
  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  /* ---------------------------- JSX ------------------------ */
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Tasks</h2>
            <p className="text-muted-foreground">
              {user?.role === UserRole.APPLICATION_ADMIN
                ? "Manage all tasks across the system"
                : user?.role === UserRole.COMPANY_ADMIN
                ? "Manage tasks within your company"
                : "View and update your assigned tasks"
              }
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Task
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Task Management</CardTitle>
          </CardHeader>
          <CardContent>
            {/* filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <FilterIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Filter:</span>
                {['All', 'pending', 'in-progress', 'completed', 'cancelled'].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={
                      statusFilter === (s === 'All' ? null : s) ? 'secondary' : 'outline'
                    }
                    onClick={() => setStatusFilter(s === 'All' ? null : (s as any))}
                  >
                    {s.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* table */}
            <div className="rounded-md border overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    {user?.role === UserRole.APPLICATION_ADMIN && (
                      <th className="px-4 py-3 text-left">Assigned To</th>
                    )}
                    <th className="px-4 py-3 text-left">Deadline</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center">Loading...</td></tr>
                  ) : visibleTasks.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No tasks found</td></tr>
                  ) : (
                    visibleTasks.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{t.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                        </td>
                        {user?.role === UserRole.APPLICATION_ADMIN && (
                          <td className="px-4 py-3 text-sm">{t.assignee_name || `User ${t.assignee_id}`}</td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span>{new Date(t.deadline).toLocaleDateString()}</span>
                            {new Date(t.deadline) < new Date() && t.status !== 'completed' && (
                              <span className="text-xs text-red-500 font-medium">Overdue</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3"><PriorityBadge p={t.priority} /></td>
                        <td className="px-4 py-3"><StatusBadge s={t.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openTaskDetails(t)}>
                              View
                            </Button>
                            {canDelete && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Create Task Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Assign a task to a company employee.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={draft.title}
                  onChange={({ target }) => setDraft(d => ({ ...d, title: target.value }))}
                  placeholder="Enter task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description *</Label>
                <Textarea
                  id="desc"
                  rows={3}
                  value={draft.description}
                  onChange={({ target }) => setDraft(d => ({ ...d, description: target.value }))}
                  placeholder="Describe the task in detail..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={draft.deadline}
                    onChange={({ target }) => setDraft(d => ({ ...d, deadline: target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select
                    value={draft.priority}
                    onValueChange={(v) => setDraft(d => ({ ...d, priority: v as any }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      {['low', 'medium', 'high', 'urgent'].map((p) => (
                        <SelectItem key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assign To *</Label>
                <Select
                  value={draft.assignee_id}
                  onValueChange={(v) => setDraft(d => ({ ...d, assignee_id: v }))}
                  disabled={employeesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={employeesLoading ? "Loading employees..." : "Select employee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Task</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Task Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            {selectedTask && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedTask.title}
                    <PriorityBadge p={selectedTask.priority} />
                  </DialogTitle>
                  <DialogDescription>
                    Created on {new Date(selectedTask.created_at).toLocaleDateString()}
                    {selectedTask.assignee_name && ` • Assigned to ${selectedTask.assignee_name}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedTask.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Deadline</Label>
                      <p className={`text-sm ${
                        new Date(selectedTask.deadline) < new Date() && selectedTask.status !== 'completed'
                          ? 'text-red-500 font-medium'
                          : ''
                      }`}>
                        {new Date(selectedTask.deadline).toLocaleDateString()}
                        {new Date(selectedTask.deadline) < new Date() && selectedTask.status !== 'completed' && ' (Overdue)'}
                      </p>
                    </div>
                    <div>
                      <Label>Current Status</Label>
                      <StatusBadge s={selectedTask.status} />
                    </div>
                  </div>
                  {/* Status update for assignee */}
                  {selectedTask.assignee_id === String(user?.id) && (
                    <div className="space-y-2">
                      <Label>Update Status</Label>
                      <Select
                        value={selectedTask.status}
                        onValueChange={(value: Task["status"]) => handleStatusChange(selectedTask.id, value)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['pending', 'in-progress', 'completed', 'cancelled'].map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  {canDelete && (
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  )}
                  <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;