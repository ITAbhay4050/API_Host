// src/context/NotificationContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/sonner";

interface DealerPayload {
  id: number;
  name: string;
  email: string;
}

interface Ctx {
  unread: DealerPayload[];
  markAllRead: () => void;
}

const NotificationContext = createContext<Ctx | null>(null);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();            // assumes user.company_id
  const [unread, setUnread] = useState<DealerPayload[]>([]);

  useEffect(() => {
    if (!user?.company_id) return;

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/notifications/company/${user.company_id}/`
    );

    ws.onmessage = (e) => {
      const payload: DealerPayload = JSON.parse(e.data);
      setUnread((prev) => [payload, ...prev]);
      toast(
        `${payload.name} ने अभी-अभी रजिस्टर किया!`,
        { description: payload.email, duration: 6000 }
      );
    };

    return () => ws.close();
  }, [user?.company_id]);

  return (
    <NotificationContext.Provider
      value={{ unread, markAllRead: () => setUnread([]) }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext)!;
