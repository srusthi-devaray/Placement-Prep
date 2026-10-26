// Optional study-reminder emails. Sent at most once a day, only to students who turned reminders on,
// only when they have unfinished tasks, and never on their rest days.
const { StudySetting, PlanTask, User } = require('../models');
const mailer = require('./mailer');
const { weekday } = require('./planner');
const { todayUTC } = require('../utils');

async function runReminders() {
  if (!mailer.isConfigured()) return { skipped: 'email not configured', sent: 0 };
  const today = todayUTC();
  const settings = await StudySetting.find({ reminderEmail: true, lastReminderDay: { $ne: today } }).limit(200);
  let sent = 0;
  for (const s of settings) {
    if (!s.studyDays.includes(weekday(today))) continue;
    const open = await PlanTask.find({ user: s.user, done: false, date: { $lte: today } }).sort({ date: 1 }).limit(8).lean();
    if (!open.length) continue;
    const user = await User.findById(s.user).select('email username');
    if (!user) continue;
    const list = open.map((t) => `<li>${String(t.title).replace(/[<>&]/g, '')}${t.date < today ? ' <em>(carried over)</em>' : ''}</li>`).join('');
    try {
      await mailer.send({ to: user.email, subject: `Today's study plan: ${open.length} task${open.length === 1 ? '' : 's'} waiting`, html: `<p>Hi ${user.username},</p><ul>${list}</ul><p>Open the Planner to tick them off or move them to another day. You can switch these emails off in Planner settings.</p>` });
      s.lastReminderDay = today; await s.save(); sent++;
    } catch (e) { console.error('Reminder email failed:', e.message); }
  }
  return { sent, considered: settings.length };
}

module.exports = { runReminders };
