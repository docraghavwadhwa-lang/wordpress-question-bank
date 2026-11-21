export const DAILY_REMINDERS = [
  { id: 8, hour: 8, title: "Elixir · Your daily dose", body: "Your Question of the Day is ready.", path: "/" },
  { id: 12, hour: 12, title: "Elixir · Bookmarks", body: "Return to your bookmarked questions for a quick revision.", path: "/?tool=bookmarks" },
  { id: 16, hour: 16, title: "Elixir · Daily Blitz", body: "Take today's Daily Blitz and challenge yourself.", path: "/?tool=blitz" },
  { id: 20, hour: 20, title: "Elixir · Keep your streak", body: "Meet your daily question goal to keep your streak growing.", path: "/stats" },
  { id: 21, hour: 21, title: "Elixir · Mistake Vault", body: "Revisit your mistakes before the day ends.", path: "/?tool=mistakes" },
] as const;
export const reminderIds = () => DAILY_REMINDERS.map(r => ({ id: r.id }));
export const reminderNotifications = () => DAILY_REMINDERS.map(({ hour, path, ...r }) => ({ ...r, smallIcon: "ic_stat_elixir", largeIcon: "ic_launcher", extra: { path }, schedule: { on: { hour, minute: 0 }, allowWhileIdle: true } }));