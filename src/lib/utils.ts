import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isWeekend, eachDayOfInterval, isSameDay } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Namibian Public Holidays 2024-2025
const NAMIBIAN_HOLIDAYS = [
  "2024-01-01", // New Year's Day
  "2024-03-21", // Independence Day
  "2024-03-29", // Good Friday
  "2024-04-01", // Easter Monday
  "2024-05-01", // Workers' Day
  "2024-05-04", // Cassinga Day
  "2024-05-09", // Ascension Day
  "2024-05-25", // Africa Day
  "2024-08-26", // Heroes' Day
  "2024-12-10", // Human Rights Day / Women's Day
  "2024-12-25", // Christmas Day
  "2024-12-26", // Family Day
  "2025-01-01",
  "2025-03-21",
  "2025-04-18", // Good Friday 2025
  "2025-04-21", // Easter Monday 2025
  "2025-05-01",
  "2025-05-04",
  "2025-05-25",
  "2025-05-29", // Ascension Day 2025
  "2025-08-26",
  "2025-12-10",
  "2025-12-25",
  "2025-12-26",
];

export function isPublicHoliday(date: Date) {
  const formattedDate = format(date, "yyyy-MM-dd");
  return NAMIBIAN_HOLIDAYS.includes(formattedDate);
}

export function calculateWorkDays(startDate: Date, endDate: Date) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.filter(day => !isWeekend(day) && !isPublicHoliday(day)).length;
}
