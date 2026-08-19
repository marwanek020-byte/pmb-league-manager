"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Contact = {
  userId: string;
  username: string;
  clubName: string;
  unread: number;
};

type NotificationItem = {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export function UnreadMessageNotifier({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [latestMsgSender, setLatestMsgSender] = useState<Contact | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationItem[]>([]);
  const [dismissedNotifId, setDismissedNotifId] = useState<string | null>(null);
  const [dismissedMsg, setDismissedMsg] = useState(false);

  const checkAlerts = useCallback(async () => {
    try {
      // 1. Check direct messages
      const msgRes = await fetch("/api/messages/contacts");
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const unreadCount = msgData.totalUnread || 0;
        setTotalUnreadMessages(unreadCount);

        if (unreadCount > 0 && msgData.contacts) {
          const senderWithUnread = msgData.contacts.find((c: Contact) => c.unread > 0);
          if (senderWithUnread) {
            setLatestMsgSender(senderWithUnread);
          }
        } else {
          setLatestMsgSender(null);
        }
      }

      // 2. Check post likes & comments notifications
      const notifRes = await fetch("/api/notifications");
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        const unreadList = (notifData.notifications || []).filter(
          (n: NotificationItem) => !n.read
        );
        setUnreadNotifications(unreadList);
      }
    } catch {}
  }, []);

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 4000);
    return () => clearInterval(interval);
  }, [checkAlerts]);

  const isOnSocialPage = pathname.includes("/social");
  const destinationHref = isAdmin ? "/admin/social" : "/manager/social";

  // Check if we have unread post notifications (comments or reactions)
  const activePostNotif = unreadNotifications.find((n) => n.id !== dismissedNotifId);

  const handleDismissNotif = async (id: string) => {
    setDismissedNotifId(id);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {}
  };

  // 1. Prioritize Post Reaction / Comment Toast
  if (activePostNotif && !isOnSocialPage) {
    const isReaction = activePostNotif.type === "POST_REACTION";
    const isComment = activePostNotif.type === "POST_COMMENT";

    return (
      <aside
        aria-label="Social notifications"
        className="fixed bottom-6 right-6 z-50 animate-bounce transition-all duration-300"
      >
        <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 border-pmb-gold bg-gradient-to-r from-[#1c1605] via-[#100d05] to-black p-4 shadow-[0_0_45px_rgba(212,175,55,0.45)] backdrop-blur-xl max-w-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pmb-gold/20 text-2xl text-pmb-gold">
            {isReaction ? "🔥" : isComment ? "💬" : "🔔"}
          </div>

          <div className="flex-1 pr-2 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">
                {isReaction ? "New Post Reaction" : isComment ? "New Reply" : "Notification"}
              </p>
            </div>
            <p className="text-xs font-bold text-white truncate">
              {activePostNotif.message}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={destinationHref}
              onClick={() => handleDismissNotif(activePostNotif.id)}
              className="rounded-xl bg-pmb-gold px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-gold transition hover:scale-105 whitespace-nowrap"
            >
              View →
            </Link>
            <button
              type="button"
              onClick={() => handleDismissNotif(activePostNotif.id)}
              className="text-gray-500 hover:text-white text-xs px-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 2. Direct Message Toast
  if (totalUnreadMessages > 0 && !isOnSocialPage && !dismissedMsg) {
    return (
      <aside
        aria-label="Direct message notifications"
        className="fixed bottom-6 right-6 z-50 animate-bounce transition-all duration-300"
      >
        <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 border-pmb-gold bg-gradient-to-r from-[#1c1605] via-[#100d05] to-black p-4 shadow-[0_0_40px_rgba(212,175,55,0.4)] backdrop-blur-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pmb-gold/20 text-xl text-pmb-gold">
            💬
          </div>

          <div className="flex-1 pr-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-[10px] font-black uppercase tracking-widest text-pmb-gold">
                New Message ({totalUnreadMessages})
              </p>
            </div>
            <p className="text-xs font-bold text-white">
              {latestMsgSender ? `${latestMsgSender.clubName}` : "A league manager"} sent you a direct message!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={destinationHref}
              className="rounded-xl bg-pmb-gold px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-gold transition hover:scale-105"
            >
              Reply →
            </Link>
            <button
              type="button"
              onClick={() => setDismissedMsg(true)}
              className="text-gray-500 hover:text-white text-xs px-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return null;
}
