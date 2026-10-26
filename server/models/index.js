// All MongoDB collections (Mongoose schemas) in one file.
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const options = {
  timestamps: true,
  toJSON: { versionKey: false, transform: (doc, ret) => { delete ret.passwordHash; return ret; } }
};
// Every user-owned document stores which user it belongs to.
const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };

const User = model('User', new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 40, match: [/^[a-z0-9_.-]+$/, 'Username can only contain letters, numbers, _ . -'] },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  passwordHash: { type: String, required: true },
  targetRole: { type: String, default: 'fullstack' },
  college: { type: String, default: '', maxlength: 120 },
  skills: { type: [String], default: [] },
  resetHash: { type: String, default: '', select: false },
  resetExpires: { type: Date, default: null, select: false }
}, options));

const Company = model('Company', new Schema({
  user: owner,
  name: { type: String, required: [true, 'Company name is required'], trim: true, maxlength: 120 },
  role: { type: String, default: '', trim: true, maxlength: 120 },
  status: { type: String, enum: ['Applied', 'Interview', 'Offer', 'Rejected'], default: 'Applied' },
  date: { type: String, default: '' },
  notes: { type: String, default: '', maxlength: 2000 }
}, options));

const Progress = model('Progress', new Schema({
  user: owner,
  date: { type: String, required: true },
  topic: { type: String, required: [true, 'Topic is required'], trim: true, maxlength: 200 },
  category: { type: String, default: 'General', maxlength: 50 },
  hours: { type: Number, default: 0, min: 0, max: 24 },
  notes: { type: String, default: '', maxlength: 2000 },
  done: { type: Boolean, default: false }
}, options));

const Experience = model('Experience', new Schema({
  user: owner,
  company: { type: String, required: [true, 'Company is required'], trim: true, maxlength: 120 },
  role: { type: String, default: '', maxlength: 120 },
  round: { type: String, default: 'Technical', maxlength: 60 },
  date: { type: String, default: '' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  questions: { type: String, default: '', maxlength: 5000 },
  experience: { type: String, default: '', maxlength: 8000 },
  outcome: { type: String, enum: ['Pending', 'Selected', 'Rejected'], default: 'Pending' }
}, options));

const Note = model('Note', new Schema({
  user: owner,
  title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 200 },
  category: { type: String, default: 'General', maxlength: 50 },
  content: { type: String, default: '', maxlength: 20000 },
  pinned: { type: Boolean, default: false }
}, options));

const Goal = model('Goal', new Schema({
  user: owner,
  title: { type: String, required: [true, 'Goal title is required'], trim: true, maxlength: 200 },
  company: { type: String, default: '', maxlength: 120 },
  targetDate: { type: String, default: '' },
  done: { type: Boolean, default: false }
}, options));

const Opportunity = model('Opportunity', new Schema({
  user: owner,
  title: { type: String, required: [true, 'Job title is required'], trim: true, maxlength: 160 },
  company: { type: String, default: '', maxlength: 120 },
  link: { type: String, default: '', maxlength: 500 },
  jd: { type: String, default: '', maxlength: 10000 },
  matchPercent: { type: Number, default: 0, min: 0, max: 100 },
  matchedSkills: { type: [String], default: [] },
  missingSkills: { type: [String], default: [] },
  status: { type: String, enum: ['Saved', 'Applied'], default: 'Saved' },
  // Filled only for jobs saved from the live feed (all of it comes from the provider, labelled as external in the UI)
  source: { type: String, default: '', maxlength: 40 },
  externalId: { type: String, default: '', maxlength: 120 },
  location: { type: String, default: '', maxlength: 160 },
  jobType: { type: String, default: '', maxlength: 30 },
  experience: { type: String, default: '', maxlength: 120 },
  eligibility: { type: String, default: '', maxlength: 300 },
  deadline: { type: String, default: '', maxlength: 40 },
  postedAt: { type: Date, default: null },
  fetchedAt: { type: Date, default: null },
  listingCheck: { type: String, default: '', maxlength: 200 },
  listingCheckedAt: { type: Date, default: null }
}, options));

const MockSession = model('MockSession', new Schema({
  user: owner,
  category: { type: String, default: '' },
  avgScore: { type: Number, default: 0 },
  durationSec: { type: Number, default: 0 },
  communication: { type: Schema.Types.Mixed, default: null },
  answers: { type: [Schema.Types.Mixed], default: [] }
}, options));

const AptitudeResult = model('AptitudeResult', new Schema({
  user: owner,
  section: { type: String, default: 'All' },
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  durationSec: { type: Number, default: 0 },
  mode: { type: String, default: 'practice', maxlength: 20 },
  details: { type: [Schema.Types.Mixed], default: [] }   // [{ id, section, topic, level, correct, choice, timeSec }]
}, options));

const ChatThread = model('ChatThread', new Schema({
  user: owner,
  title: { type: String, default: 'New chat', maxlength: 100 },
  messages: [new Schema({
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, default: '' },
    attachments: [new Schema({ name: String, kind: String, size: Number }, { _id: false })],
    sources: { type: [String], default: [] },
    mode: { type: String, default: '' },          // ai | basic | basic-fallback
    at: { type: Date, default: Date.now }
  }, { _id: false })]
}, options));

const ResumeAnalysis = model('ResumeAnalysis', new Schema({
  user: owner,
  fileName: { type: String, default: 'Pasted text' },
  role: { type: String, default: '' },
  hasJD: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  text: { type: String, default: '', maxlength: 30000 },
  result: { type: Schema.Types.Mixed }
}, options));

const BuilderResume = model('BuilderResume', new Schema({
  user: { ...owner, unique: true },
  template: { type: String, default: 'modern' },
  data: { type: Schema.Types.Mixed, default: {} }
}, options));

const ContactMessage = model('ContactMessage', new Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 3000 }
}, options));


// ---- Coding practice ----
const CodeSubmission = model('CodeSubmission', new Schema({
  user: owner,
  problemId: { type: String, required: true, index: true },
  code: { type: String, default: '', maxlength: 20000 },
  verdict: { type: String, enum: ['AC', 'WA', 'TLE', 'RE', 'MLE', 'CE'], required: true },
  passed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  timeMs: { type: Number, default: null },
  memoryKb: { type: Number, default: null }
}, options));

const CodeProgress = model('CodeProgress', new Schema({
  user: owner,
  problemId: { type: String, required: true },
  status: { type: String, enum: ['untouched', 'attempted', 'solved'], default: 'untouched' },
  attempts: { type: Number, default: 0 },
  wrongAttempts: { type: Number, default: 0 },
  solvedAt: { type: Date, default: null },
  bookmarked: { type: Boolean, default: false },
  revise: { type: Boolean, default: false },
  note: { type: String, default: '', maxlength: 4000 },
  savedCode: { type: String, default: '', maxlength: 20000 },
  hintsRevealed: { type: Number, default: 0, min: 0, max: 10 },
  editorialViewed: { type: Boolean, default: false },
  bestTimeMs: { type: Number, default: null }
}, options).index({ user: 1, problemId: 1 }, { unique: true }));

// ---- Planner / sharing / job feed cache ----
const StudySetting = model('StudySetting', new Schema({
  user: { ...owner, unique: true },
  targetCompany: { type: String, default: '', maxlength: 60 },
  targetRole: { type: String, default: '', maxlength: 60 },
  hoursPerDay: { type: Number, default: 2, min: 0.5, max: 12 },
  studyDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },      // 0 = Sunday ... 6 = Saturday; other days are rest days
  placementDate: { type: String, default: '' },
  reminderEmail: { type: Boolean, default: false },
  lastReminderDay: { type: String, default: '' }
}, options));

const PlanTask = model('PlanTask', new Schema({
  user: owner,
  date: { type: String, required: true },
  title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: 200 },
  kind: { type: String, enum: ['coding', 'aptitude', 'revision', 'mock', 'cs', 'behavioral', 'resume', 'other'], default: 'other' },
  topic: { type: String, default: '', maxlength: 80 },
  minutes: { type: Number, default: 30, min: 5, max: 600 },
  link: { type: String, default: '', maxlength: 200 },       // in-app link, e.g. /app/code/two-sum
  ref: { type: String, default: '', maxlength: 80 },         // what a revision task is about (problem id or aptitude question id)
  step: { type: Number, default: 0 },                        // spaced-revision step: 0, 1, 2
  reason: { type: String, default: '', maxlength: 240 },     // why the planner suggested it
  auto: { type: Boolean, default: false },                   // generated by the planner (manual tasks are never deleted by regenerate)
  done: { type: Boolean, default: false },
  doneAt: { type: Date, default: null },
  movedFrom: { type: String, default: '' }
}, options));
PlanTask.schema.index({ user: 1, date: 1 });

const ShareSetting = model('ShareSetting', new Schema({
  user: { ...owner, unique: true },
  enabled: { type: Boolean, default: false },
  token: { type: String, default: '', index: true },
  displayName: { type: String, default: '', maxlength: 40 },
  tagline: { type: String, default: '', maxlength: 140 },
  show: { type: Schema.Types.Mixed, default: {} }            // { streak, hours, coding, aptitude, mock, milestones, readiness }
}, options));

const JobCache = model('JobCache', new Schema({
  key: { type: String, required: true, unique: true },
  fetchedAt: { type: Date, required: true },
  triedAt: { type: Date, default: null },
  ok: { type: Boolean, default: true },
  error: { type: String, default: '' },
  items: { type: [Schema.Types.Mixed], default: [] }
}, { timestamps: false }));

// A student's showcase projects (GitHub / live demo links). `showPublic` controls the optional public share page only.
const Project = model('Project', new Schema({
  user: owner,
  title: { type: String, required: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 2000 },
  role: { type: String, default: '', maxlength: 120 },
  techStack: { type: [String], default: [] },
  highlights: { type: [String], default: [] },
  githubUrl: { type: String, default: '', maxlength: 300 },
  liveUrl: { type: String, default: '', maxlength: 300 },
  status: { type: String, enum: ['idea', 'building', 'completed'], default: 'completed' },
  featured: { type: Boolean, default: false },
  showPublic: { type: Boolean, default: false }
}, options));

// Saved snapshots of the resume builder content ("versions").
const ResumeVersion = model('ResumeVersion', new Schema({
  user: owner,
  name: { type: String, default: '', maxlength: 80 },
  template: { type: String, default: 'modern' },
  data: { type: Schema.Types.Mixed, default: {} }
}, options));

// Company preparation tracks live in the database (global, not per user). `verifiedAt` stays null until a maintainer has
// actually checked the track against the company's official pages.
const CompanyTrack = model('CompanyTrack', new Schema({
  trackId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  seedVersion: { type: Number, default: 1 },
  authoredAt: { type: String, default: '' },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: '' },
  sourceNote: { type: String, default: '' }
}, options));

// CS Fundamentals: quiz attempts (per question, graded on the server) and "I have read this lesson" marks.
const CsAttempt = model('CsAttempt', new Schema({
  user: owner,
  mode: { type: String, default: 'lesson' },
  lessonId: { type: String, default: '' },
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  details: { type: [Schema.Types.Mixed], default: [] }      // [{ id, lessonId, subject, choice, correct, timeSec }]
}, options));

const CsProgress = model('CsProgress', new Schema({
  user: owner,
  lessonId: { type: String, required: true },
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null }
}, options));
CsProgress.schema.index({ user: 1, lessonId: 1 }, { unique: true });

// Timed coding assessment. The server owns the clock: `deadline` is checked on every submission.
const Assessment = model('Assessment', new Schema({
  user: owner,
  status: { type: String, enum: ['active', 'submitted', 'expired'], default: 'active' },
  durationMin: { type: Number, required: true },
  startedAt: { type: Date, required: true },
  deadline: { type: Date, required: true },
  finishedAt: { type: Date, default: null },
  problemIds: { type: [String], default: [] },
  results: { type: [Schema.Types.Mixed], default: [] },   // [{ problemId, verdict, passed, total, attempts, submittedAt }]
  score: { type: Number, default: 0 },
  solved: { type: Number, default: 0 }
}, options));

const DebugProgress = model('DebugProgress', new Schema({
  user: owner,
  exerciseId: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  fixed: { type: Boolean, default: false },
  fixedAt: { type: Date, default: null },
  lastCode: { type: String, default: '', maxlength: 20000 }
}, options));

module.exports = { Assessment, DebugProgress, CsAttempt, CsProgress, Project, ResumeVersion, CompanyTrack, StudySetting, PlanTask, ShareSetting, JobCache, CodeSubmission, CodeProgress, User, Company, Progress, Experience, Note, Goal, Opportunity, MockSession, AptitudeResult, ChatThread, ResumeAnalysis, BuilderResume, ContactMessage };
