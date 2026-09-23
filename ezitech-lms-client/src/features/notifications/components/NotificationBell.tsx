import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '../notificationsApi';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        className="focus-ring relative flex size-10 items-center justify-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100"
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="animate-pulse-ring absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="glass fixed inset-x-4 top-16 z-20 w-auto overflow-hidden rounded-2xl border border-ink-100 shadow-lift sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-80"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <strong className="font-display text-sm text-ink-800">Notifications</strong>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {data?.items.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Inbox className="size-8 text-ink-300" />
                  <p className="text-sm text-ink-400">No notifications yet.</p>
                </div>
              )}
              {data?.items.map((n) => (
                <motion.div
                  key={n._id}
                  whileHover={{ x: n.isRead ? 0 : 2 }}
                  onClick={() => !n.isRead && markRead.mutate(n._id)}
                  className={`cursor-pointer border-t border-ink-100 px-4 py-3 transition-colors first:border-t-0 ${
                    n.isRead ? 'bg-surface' : 'bg-brand-50/60 hover:bg-brand-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-800" title={n.title}>{n.title}</div>
                      <div className="truncate text-xs text-ink-500" title={n.message}>{n.message}</div>
                      <div className="mt-0.5 text-[11px] text-ink-400">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
