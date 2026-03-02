import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'manager', 'staff']);
export const shiftStatus = pgEnum('shift_status', ['draft', 'published']);
export const assignmentStatus = pgEnum('assignment_status', [
  'assigned',
  'cancelled',
]);
export const swapType = pgEnum('swap_type', ['swap', 'drop']);
export const swapStatus = pgEnum('swap_status', [
  'pending',
  'accepted',
  'approved',
  'rejected',
  'cancelled',
  'expired',
]);
export const availabilityExceptionType = pgEnum('availability_exception_type', [
  'available',
  'unavailable',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: userRole('role').notNull(),
  homeTimezone: text('home_timezone').notNull(),
  desiredWeeklyHours: integer('desired_weekly_hours'),
  passwordHash: text('password_hash'),
  googleId: text('google_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const staffSkills = pgTable('staff_skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').notNull(),
  skillId: uuid('skill_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const staffLocations = pgTable('staff_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').notNull(),
  locationId: uuid('location_id').notNull(),
  certifiedAt: timestamp('certified_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  decertifiedAt: timestamp('decertified_at', { withTimezone: true }),
});

export const managerLocations = pgTable('manager_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  managerId: uuid('manager_id').notNull(),
  locationId: uuid('location_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const availabilityWindows = pgTable('availability_windows', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  timezone: text('timezone').notNull(),
  locationId: uuid('location_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const availabilityExceptions = pgTable('availability_exceptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  timezone: text('timezone').notNull(),
  locationId: uuid('location_id'),
  type: availabilityExceptionType('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shifts = pgTable('shifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationId: uuid('location_id').notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  requiredSkillId: uuid('required_skill_id'),
  headcount: integer('headcount').notNull(),
  status: shiftStatus('status').notNull().default('draft'),
  notes: text('notes'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const shiftAssignments = pgTable('shift_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull(),
  staffId: uuid('staff_id').notNull(),
  status: assignmentStatus('status').notNull().default('assigned'),
  assignedBy: uuid('assigned_by').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
});

export const swapRequests = pgTable('swap_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull(),
  requesterId: uuid('requester_id').notNull(),
  targetStaffId: uuid('target_staff_id'),
  type: swapType('type').notNull(),
  status: swapStatus('status').notNull().default('pending'),
  managerId: uuid('manager_id'),
  reason: text('reason'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: jsonb('data'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  actorId: uuid('actor_id').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  staffId: uuid('staff_id').notNull(),
  shiftId: uuid('shift_id'),
  locationId: uuid('location_id').notNull(),
  clockInAt: timestamp('clock_in_at', { withTimezone: true }).notNull(),
  clockOutAt: timestamp('clock_out_at', { withTimezone: true }),
  isManual: boolean('is_manual').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
