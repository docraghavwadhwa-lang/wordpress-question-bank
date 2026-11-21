import { describe, expect, it } from "vitest";
import { DAILY_REMINDERS, reminderNotifications, reminderIds } from "./reminders";
describe("Android daily reminders", () => {
 it("schedules five reminders", () => expect(reminderNotifications()).toHaveLength(5));
 it("schedules QOTD at 8 AM", () => expect(DAILY_REMINDERS[0]?.hour).toBe(8));
 it("schedules bookmarks at noon", () => expect(DAILY_REMINDERS[1]?.hour).toBe(12));
 it("schedules Blitz at 4 PM", () => expect(DAILY_REMINDERS[2]?.hour).toBe(16));
 it("schedules streaks at 8 PM", () => expect(DAILY_REMINDERS[3]?.hour).toBe(20));
 it("schedules Mistake Vault at 9 PM", () => expect(DAILY_REMINDERS[4]?.hour).toBe(21));
 it("cancels every scheduled reminder", () => expect(reminderIds().map(r => r.id)).toEqual([8,12,16,20,21]));
});