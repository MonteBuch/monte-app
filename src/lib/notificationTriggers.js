// src/lib/notificationTriggers.js
import { StorageService } from "./storage";

/**
 * Findet alle Kinder, die HEUTE Geburtstag haben und in der Stammgruppe
 * des Team-Users sind.
 */
export function getTodayBirthdaysForUser(user) {
  if (!user || user.role !== "team" || !user.primaryGroup) return [];

  const allUsers = StorageService.get("users") || [];
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const result = [];

  allUsers.forEach((u) => {
    const kids = u.children || [];
    kids.forEach((child) => {
      if (!child.birthday || !child.group) return;

      const bd = new Date(child.birthday);
      if (Number.isNaN(bd.getTime())) return;

      const bm = bd.getMonth() + 1;
      const bdDay = bd.getDate();

      if (
        bm === todayMonth &&
        bdDay === todayDay &&
        child.group === user.primaryGroup
      ) {
        result.push({
          childName: child.name,
          groupId: child.group,
          parentName: u.name || u.username,
        });
      }
    });
  });

  return result;
}

export function hasTodayBirthdaysForUser(user) {
  return getTodayBirthdaysForUser(user).length > 0;
}