-- Undo 0036. Drops the record of reminders already sent (a reminder could then be sent again).
drop table if exists public.reminder_sends;
