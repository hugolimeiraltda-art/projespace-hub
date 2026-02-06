import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Bell, Check, FileText, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  project_id: string;
  read: boolean;
  created_at: string;
}

export function NotificationsSidebarItem() {
  const { user } = useAuth();
  const { refreshProjects } = useProjects();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;

    // Admins see all notifications, others see only their own
    let query = supabase
      .from('project_notifications')
      .select('*');
    
    if (user.role !== 'admin') {
      query = query.or(`for_user_id.eq.${user.id},for_role.eq.${user.role}`);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    await supabase
      .from('project_notifications')
      .update({ read: true })
      .eq('id', id);
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('project_notifications')
      .update({ read: true })
      .in('id', unreadIds);
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    refreshProjects();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PROJECT_RESUBMITTED':
        return <RefreshCw className="w-4 h-4 text-primary" />;
      default:
        return <FileText className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left',
            'text-muted-foreground hover:bg-accent hover:text-foreground',
            unreadCount > 0 && 'bg-primary/10'
          )}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-destructive rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>
            {unreadCount > 0 
              ? `${unreadCount} notificação${unreadCount > 1 ? '(ões)' : ''}` 
              : 'Notificações'}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-96 sm:w-[400px] p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificações
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                <Check className="w-3 h-3 mr-1" />
                Marcar todas lidas
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <Link
                  key={notification.id}
                  to={`/projetos/${notification.project_id}`}
                  onClick={() => {
                    markAsRead(notification.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex items-start gap-3 px-4 py-4 cursor-pointer hover:bg-accent transition-colors',
                    !notification.read && 'bg-primary/5'
                  )}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm', !notification.read && 'font-medium')}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {format(parseISO(notification.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}