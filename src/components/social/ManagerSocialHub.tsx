"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ClubBadge } from "@/components/ClubBadge";

type User = {
  id: string;
  username: string;
  role: string;
};

type Club = {
  id: string;
  name: string;
  logo: string | null;
};

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: User;
  club: Club | null;
};

type Reaction = {
  id: string;
  reaction: string; // "GOAL", "FIRE", "TROPHY", "CLAP", "POPCORN"
  userId: string;
};

type Post = {
  id: string;
  content: string;
  tag: "STATEMENT" | "TRANSFER" | "BANTER" | "VICTORY" | "GENERAL";
  mediaUrl: string | null;
  createdAt: string;
  user: User;
  club: Club | null;
  comments: Comment[];
  reactions: Reaction[];
};

type Contact = {
  userId: string;
  username: string;
  role: string;
  clubName: string;
  clubLogo: string | null;
  leagueId: string;
  leagueName: string;
  leagueLogo: string | null;
  unread: number;
};

type LeagueGroup = {
  id: string;
  name: string;
  unread: number;
  count: number;
};

type DirectMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
};

const TAG_CONFIG = {
  STATEMENT: { label: "📢 Official Statement", bg: "bg-red-500/15 text-red-400 border-red-500/30" },
  TRANSFER: { label: "🔄 Transfer Rumor / Deal", bg: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  BANTER: { label: "⚔️ Matchday Banter", bg: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  VICTORY: { label: "🏆 Victory Celebration", bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  GENERAL: { label: "⚽ Manager Thought", bg: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
};

const REACTION_CONFIG = [
  { type: "GOAL", icon: "⚽", label: "Golazo" },
  { type: "FIRE", icon: "🔥", label: "Fire" },
  { type: "TROPHY", icon: "🏆", label: "Champion" },
  { type: "CLAP", icon: "👏", label: "Respect" },
  { type: "POPCORN", icon: "🍿", label: "Drama" },
];

export function ManagerSocialHub({
  myUserId,
  myUsername,
  myClubName,
  myClubLogo,
  myBudget,
}: {
  myUserId: string;
  myUsername: string;
  myClubName: string;
  myClubLogo?: string | null;
  myBudget: number;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [postContent, setPostContent] = useState("");
  const [postTag, setPostTag] = useState<"STATEMENT" | "TRANSFER" | "BANTER" | "VICTORY" | "GENERAL">("GENERAL");
  const [postMediaUrl, setPostMediaUrl] = useState<string>("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openComments, setOpenComments] = useState<{ [postId: string]: boolean }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Direct Messaging & Hierarchy State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leagues, setLeagues] = useState<LeagueGroup[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<Contact | null>(null);
  const [chatMessages, setChatMessages] = useState<DirectMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [expandedLeagues, setExpandedLeagues] = useState<{ [leagueId: string]: boolean }>({
    hq: true,
  });

  // Fetch Posts
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Error loading posts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Chat Contacts
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/contacts");
      if (!res.ok) return;
      const data = await res.json();
      setContacts(data.contacts || []);
      setLeagues(data.leagues || []);

      if (data.leagues && data.leagues.length > 0) {
        setExpandedLeagues((prev) => {
          const next = { ...prev };
          data.leagues.forEach((l: LeagueGroup) => {
            if (next[l.id] === undefined) {
              next[l.id] = true;
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error("Error loading contacts:", err);
    }
  }, []);

  // Fetch Chat Messages
  const fetchChatMessages = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/messages?withUserId=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchContacts();
    const interval = setInterval(() => {
      fetchPosts();
      fetchContacts();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchPosts, fetchContacts]);

  useEffect(() => {
    if (activeChatUser) {
      fetchChatMessages(activeChatUser.userId);
      const interval = setInterval(() => fetchChatMessages(activeChatUser.userId), 2500);
      return () => clearInterval(interval);
    }
  }, [activeChatUser, fetchChatMessages]);

  // Handle Local Image Upload with Client Compression
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Compress to max width 1200
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setPostMediaUrl(compressedDataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  // Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postContent,
          tag: postTag,
          mediaUrl: postMediaUrl || null,
        }),
      });
      if (res.ok) {
        setPostContent("");
        setPostMediaUrl("");
        setShowUrlInput(false);
        fetchPosts();
      }
    } catch (err) {
      console.error("Error posting:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (postId: string, reactionType: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: reactionType }),
      });
      if (res.ok) {
        fetchPosts();
      }
    } catch (err) {
      console.error("Error reacting:", err);
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        fetchPosts();
      }
    } catch (err) {
      console.error("Error commenting:", err);
    }
  };

  // Send Direct Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatUser || !chatInput.trim() || sendingMsg) return;

    setSendingMsg(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeChatUser.userId,
          content: chatInput,
        }),
      });
      if (res.ok) {
        setChatInput("");
        fetchChatMessages(activeChatUser.userId);
        fetchContacts();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMsg(false);
    }
  };

  const filteredPosts =
    selectedTag === "ALL"
      ? posts
      : posts.filter((p) => p.tag === selectedTag);

  // Group contacts by League and apply Search
  const searchLower = contactSearch.toLowerCase().trim();
  const filteredContacts = useMemo(() => {
    if (!searchLower) return contacts;
    return contacts.filter(
      (c) =>
        c.clubName.toLowerCase().includes(searchLower) ||
        c.username.toLowerCase().includes(searchLower) ||
        c.leagueName.toLowerCase().includes(searchLower)
    );
  }, [contacts, searchLower]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_340px]">
      {/* ─── FULLSCREEN LIGHTBOX MODAL ─────────────────────────────── */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={lightboxImage}
              alt="Enlarged media"
              className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-4 -right-4 flex h-9 w-9 items-center justify-center rounded-full bg-pmb-gold font-black text-black shadow-lg hover:scale-110 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── LEFT COLUMN: Profile & Category Filters ─────────────────── */}
      <div className="space-y-4">
        {/* Manager Profile Card */}
        <div className="pmb-card p-5 border-pmb-gold/30 bg-gradient-to-b from-pmb-gold/10 via-black to-black">
          <div className="flex items-center gap-3">
            <ClubBadge name={myClubName} logo={myClubLogo} size="md" />
            <div>
              <h3 className="font-black text-white text-base leading-tight">
                {myClubName}
              </h3>
              <p className="text-xs text-pmb-gold font-bold">
                @{myUsername}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3 flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {myClubName.includes("Headquarters") ? "Authority" : "Club Treasury"}
            </span>
            <span className="font-black text-pmb-gold">
              {myClubName.includes("Headquarters")
                ? "🛡️ League Commissioner"
                : `€${myBudget.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Global Category Filters */}
        <div className="pmb-card p-3 space-y-1">
          <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            Global Dugout Feed
          </p>
          {[
            { id: "ALL", label: "🌐 Global All Activity", icon: "🔥" },
            { id: "STATEMENT", label: "📢 Official Press", icon: "📢" },
            { id: "TRANSFER", label: "🔄 Transfer Rumors", icon: "🔄" },
            { id: "BANTER", label: "⚔️ Match Banter", icon: "⚔️" },
            { id: "VICTORY", label: "🏆 Celebrations", icon: "🏆" },
            { id: "GENERAL", label: "⚽ Manager Thoughts", icon: "⚽" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedTag(cat.id)}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition text-left ${
                selectedTag === cat.id
                  ? "bg-pmb-gold text-black shadow-gold"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── CENTER COLUMN: Create Post & Feed Wall ─────────────────── */}
      <div className="space-y-6">
        {/* Create Post Box */}
        <div className="pmb-card p-5 border-white/15">
          <form onSubmit={handleCreatePost}>
            <div className="flex items-start gap-3">
              <ClubBadge name={myClubName} logo={myClubLogo} size="sm" />
              <div className="flex-1 space-y-3">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder={`What's happening at ${myClubName}, Manager? Post news, photo highlights, or transfer talk...`}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white placeholder-gray-500 focus:border-pmb-gold/70 focus:outline-none"
                  maxLength={2000}
                />

                {/* Photo Preview inside Create Box */}
                {postMediaUrl && (
                  <div className="relative inline-block overflow-hidden rounded-xl border border-white/20">
                    <img
                      src={postMediaUrl}
                      alt="Attachment preview"
                      className="max-h-48 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPostMediaUrl("")}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 font-bold text-white shadow-lg hover:bg-red-700 transition"
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Image URL Input Box (if toggled) */}
                {showUrlInput && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste image link (e.g. https://.../photo.jpg)"
                      value={postMediaUrl}
                      onChange={(e) => setPostMediaUrl(e.target.value)}
                      className="pmb-input flex-1 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="text-xs text-gray-400 hover:text-white px-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden File Input for Image Upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />

            {/* Tag & Media Attachment Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              {/* Left: Tag selection pills */}
              <div className="flex flex-wrap gap-1.5">
                {(["STATEMENT", "TRANSFER", "BANTER", "VICTORY", "GENERAL"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostTag(t)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-black uppercase transition ${
                      postTag === t
                        ? "bg-pmb-gold text-black shadow-sm"
                        : "border border-white/10 bg-black/40 text-gray-400 hover:text-white"
                    }`}
                  >
                    {TAG_CONFIG[t].label}
                  </button>
                ))}
              </div>

              {/* Right: Media Buttons & Submit */}
              <div className="flex items-center gap-2">
                {/* Upload Image Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10 hover:text-white transition"
                  title="Upload image from your device"
                >
                  <span>📷</span>
                  <span className="hidden sm:inline">Add Photo</span>
                </button>

                {/* Paste URL Button */}
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-gray-300 hover:bg-white/10 hover:text-white transition"
                  title="Paste image URL link"
                >
                  <span>🔗</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || !postContent.trim()}
                  className="pmb-btn-primary px-5 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-40"
                >
                  {submitting ? "Publishing..." : "Publish Post →"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="pmb-card p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-pmb-gold border-t-transparent"></div>
            <p className="mt-3 text-xs text-gray-400">Loading global Dugout feed...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPosts.length === 0 && (
          <div className="pmb-card p-12 text-center">
            <span className="text-4xl">📢</span>
            <h3 className="mt-3 text-lg font-bold text-white">No posts in this category yet</h3>
            <p className="mt-1 text-xs text-gray-400">
              Be the first manager to publish a post and kick off the conversation!
            </p>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const isCommentsOpen = openComments[post.id];
            const commentsCount = post.comments?.length || 0;
            const tagCfg = TAG_CONFIG[post.tag] || TAG_CONFIG.GENERAL;

            return (
              <div
                key={post.id}
                className="pmb-card overflow-hidden transition-all duration-300 hover:border-white/20"
              >
                {/* Post Header */}
                <div className="p-5 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ClubBadge
                      name={post.club?.name || post.user.username}
                      logo={post.club?.logo}
                      size="sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {post.club?.name || post.user.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          @{post.user.username}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {new Date(post.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Post Tag Pill */}
                  <span
                    className={`rounded-full border px-3 py-0.5 text-[9px] font-black uppercase tracking-wider ${tagCfg.bg}`}
                  >
                    {tagCfg.label}
                  </span>
                </div>

                {/* Post Text Content */}
                <div className="px-5 pb-3">
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>

                {/* Post Media Photo / Picture */}
                {post.mediaUrl && (
                  <div className="px-5 pb-4">
                    <div
                      onClick={() => setLightboxImage(post.mediaUrl)}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 cursor-zoom-in max-h-[420px] flex items-center justify-center"
                    >
                      <img
                        src={post.mediaUrl}
                        alt="Post media"
                        className="w-full max-h-[420px] object-cover transition-transform duration-500 group-hover:scale-102"
                      />
                      <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
                        🔍 Click to enlarge
                      </div>
                    </div>
                  </div>
                )}

                {/* Reactions Bar */}
                <div className="border-t border-white/10 bg-black/40 px-5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {REACTION_CONFIG.map((r) => {
                      const count = post.reactions.filter((rx) => rx.reaction === r.type).length;
                      const hasReacted = post.reactions.some(
                        (rx) => rx.reaction === r.type && rx.userId === myUserId
                      );

                      return (
                        <button
                          key={r.type}
                          type="button"
                          onClick={() => handleToggleReaction(post.id, r.type)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition ${
                            hasReacted
                              ? "bg-pmb-gold/25 text-pmb-gold border border-pmb-gold/40 scale-105"
                              : "hover:bg-white/10 text-gray-400"
                          }`}
                          title={r.label}
                        >
                          <span>{r.icon}</span>
                          {count > 0 && <span className="font-bold text-[11px]">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Comment Trigger */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                    }
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white font-semibold"
                  >
                    <span>💬</span>
                    <span>{commentsCount} {commentsCount === 1 ? "Comment" : "Comments"}</span>
                  </button>
                </div>

                {/* Comment Section (Expanded) */}
                {isCommentsOpen && (
                  <div className="border-t border-white/10 bg-black/60 p-4 space-y-3">
                    {/* Add Comment Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a reply as manager..."
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment(post.id);
                        }}
                        className="pmb-input flex-1 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        className="pmb-btn-primary px-4 text-xs font-bold"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-2 pt-2">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((cmt) => (
                          <div
                            key={cmt.id}
                            className="rounded-xl border border-white/5 bg-black/40 p-3 flex items-start gap-2.5 text-xs"
                          >
                            <ClubBadge
                              name={cmt.club?.name || cmt.user.username}
                              logo={cmt.club?.logo}
                              size="xs"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white">
                                  {cmt.club?.name || cmt.user.username}
                                </span>
                                <span className="text-[9px] text-gray-500">
                                  {new Date(cmt.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="mt-1 text-gray-300">{cmt.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-xs text-gray-500 py-2">
                          No replies yet. Join the discussion!
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT COLUMN: Hierarchical League Manager Messenger ────── */}
      <div className="space-y-4">
        <div className="pmb-card overflow-hidden border-white/15">
          {/* Header */}
          <div className="border-b border-pmb-border bg-black/60 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <div>
                <h3 className="font-bold text-sm text-white">Manager Direct Chat</h3>
                <span className="text-[10px] text-gray-400">100+ Accounts Divided by League</span>
              </div>
            </div>
            {activeChatUser && (
              <button
                type="button"
                onClick={() => setActiveChatUser(null)}
                className="text-xs text-gray-400 hover:text-white rounded-lg bg-white/5 px-2 py-1"
              >
                ← Back to Leagues
              </button>
            )}
          </div>

          {!activeChatUser ? (
            <div className="p-3 space-y-3">
              {/* Search Bar for 100+ Accounts */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search manager, club or league..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/60 py-2 pl-3 pr-3 text-xs text-white placeholder-gray-500 focus:border-pmb-gold/70 focus:outline-none"
                />
                {contactSearch && (
                  <button
                    type="button"
                    onClick={() => setContactSearch("")}
                    className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Hierarchical League Folders */}
              <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                {leagues.map((league) => {
                  const leagueContacts = filteredContacts.filter((c) => c.leagueId === league.id);
                  if (leagueContacts.length === 0 && searchLower) return null;

                  const isExpanded = expandedLeagues[league.id];
                  const leagueUnread = leagueContacts.reduce((sum, c) => sum + c.unread, 0);

                  return (
                    <div
                      key={league.id}
                      className="rounded-xl border border-white/10 bg-black/40 overflow-hidden"
                    >
                      {/* League Accordion Header */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLeagues((prev) => ({
                            ...prev,
                            [league.id]: !prev[league.id],
                          }))
                        }
                        className="w-full flex items-center justify-between p-2.5 text-left bg-white/5 hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-xs">{isExpanded ? "📂" : "📁"}</span>
                          <span className="font-black text-xs text-white truncate">
                            {league.name}
                          </span>
                          <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] font-bold text-gray-400">
                            {leagueContacts.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {leagueUnread > 0 && (
                            <span className="rounded-full bg-pmb-gold px-1.5 py-0.2 text-[9px] font-black text-black animate-pulse">
                              {leagueUnread}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </button>

                      {/* League Teams List */}
                      {isExpanded && (
                        <div className="divide-y divide-white/5 p-1">
                          {leagueContacts.map((c) => (
                            <button
                              key={c.userId}
                              type="button"
                              onClick={() => setActiveChatUser(c)}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition text-left"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <ClubBadge name={c.clubName} logo={c.clubLogo} size="xs" />
                                <div className="truncate">
                                  <span className="block font-bold text-xs text-white truncate">
                                    {c.clubName}
                                  </span>
                                  <span className="text-[10px] text-gray-400">@{c.username}</span>
                                </div>
                              </div>

                              {c.unread > 0 && (
                                <span className="rounded-full bg-pmb-gold px-2 py-0.5 text-[9px] font-black text-black animate-pulse">
                                  {c.unread}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 1-on-1 Chat Interface */
            <div className="flex flex-col h-[480px]">
              {/* Chat Header */}
              <div className="border-b border-white/10 bg-black/40 px-4 py-2.5 flex items-center gap-2.5">
                <ClubBadge
                  name={activeChatUser.clubName}
                  logo={activeChatUser.clubLogo}
                  size="xs"
                />
                <div className="overflow-hidden">
                  <span className="font-bold text-xs text-white block truncate">
                    {activeChatUser.clubName}
                  </span>
                  <span className="text-[9px] text-gray-400 block truncate">
                    {activeChatUser.leagueName}
                  </span>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-8">
                    Send a direct message to {activeChatUser.clubName} to discuss transfers or match tactics!
                  </p>
                ) : (
                  chatMessages.map((m) => {
                    const isMe = m.senderId === myUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs ${
                            isMe
                              ? "bg-pmb-gold text-black font-semibold rounded-br-none shadow-gold"
                              : "bg-[#18181c] text-white rounded-bl-none border border-white/10"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <span
                            className={`block text-[8px] mt-1 text-right ${
                              isMe ? "text-black/60 font-bold" : "text-gray-500"
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <form
                onSubmit={handleSendMessage}
                className="border-t border-white/10 bg-black/60 p-2 flex gap-1.5"
              >
                <input
                  type="text"
                  placeholder={`Message ${activeChatUser.clubName}...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="pmb-input flex-1 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !chatInput.trim()}
                  className="pmb-btn-primary px-3 py-1.5 text-xs font-black disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
