import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';
import { db } from './db';
import {
  auditLogs,
  availabilityExceptions,
  availabilityWindows,
  locations,
  managerLocations,
  notifications,
  shifts,
  shiftAssignments,
  skills,
  staffLocations,
  staffSkills,
  swapRequests,
  timeEntries,
  users,
} from './schema';

const now = new Date();

const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 3600 * 1000);
const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 3600 * 1000);

async function seed() {
  const passwordHash = hashSync('Password123!', 10);

  const locationRows = [
    {
      id: randomUUID(),
      name: 'Coastal Eats - Seattle',
      timezone: 'America/Los_Angeles',
    },
    {
      id: randomUUID(),
      name: 'Coastal Eats - Portland',
      timezone: 'America/Los_Angeles',
    },
    {
      id: randomUUID(),
      name: 'Coastal Eats - Miami',
      timezone: 'America/New_York',
    },
    {
      id: randomUUID(),
      name: 'Coastal Eats - Boston',
      timezone: 'America/New_York',
    },
  ];

  const skillRows = [
    { id: randomUUID(), name: 'bartender' },
    { id: randomUUID(), name: 'line cook' },
    { id: randomUUID(), name: 'server' },
    { id: randomUUID(), name: 'host' },
  ];

  const admin = {
    id: randomUUID(),
    email: 'admin@coastaleats.com',
    name: 'Avery Admin',
    role: 'admin' as const,
    homeTimezone: 'America/Los_Angeles',
    desiredWeeklyHours: null,
    passwordHash,
  };

  const managerSeattle = {
    id: randomUUID(),
    email: 'mia.manager@coastaleats.com',
    name: 'Mia Manager',
    role: 'manager' as const,
    homeTimezone: 'America/Los_Angeles',
    desiredWeeklyHours: null,
    passwordHash,
  };

  const managerMiami = {
    id: randomUUID(),
    email: 'logan.manager@coastaleats.com',
    name: 'Logan Manager',
    role: 'manager' as const,
    homeTimezone: 'America/New_York',
    desiredWeeklyHours: null,
    passwordHash,
  };

  const staff = [
    {
      id: randomUUID(),
      email: 'sarah@coastaleats.com',
      name: 'Sarah Chen',
      role: 'staff' as const,
      homeTimezone: 'America/Los_Angeles',
      desiredWeeklyHours: 32,
      passwordHash,
    },
    {
      id: randomUUID(),
      email: 'john@coastaleats.com',
      name: 'John Rivera',
      role: 'staff' as const,
      homeTimezone: 'America/Los_Angeles',
      desiredWeeklyHours: 38,
      passwordHash,
    },
    {
      id: randomUUID(),
      email: 'maria@coastaleats.com',
      name: 'Maria Santos',
      role: 'staff' as const,
      homeTimezone: 'America/New_York',
      desiredWeeklyHours: 36,
      passwordHash,
    },
    {
      id: randomUUID(),
      email: 'devon@coastaleats.com',
      name: 'Devon Blake',
      role: 'staff' as const,
      homeTimezone: 'America/New_York',
      desiredWeeklyHours: 28,
      passwordHash,
    },
  ];

  await db.insert(locations).values(locationRows);
  await db.insert(skills).values(skillRows);
  await db
    .insert(users)
    .values([admin, managerSeattle, managerMiami, ...staff]);

  await db.insert(managerLocations).values([
    {
      id: randomUUID(),
      managerId: managerSeattle.id,
      locationId: locationRows[0].id,
    },
    {
      id: randomUUID(),
      managerId: managerSeattle.id,
      locationId: locationRows[1].id,
    },
    {
      id: randomUUID(),
      managerId: managerMiami.id,
      locationId: locationRows[2].id,
    },
    {
      id: randomUUID(),
      managerId: managerMiami.id,
      locationId: locationRows[3].id,
    },
  ]);

  await db.insert(staffLocations).values([
    {
      id: randomUUID(),
      staffId: staff[0].id,
      locationId: locationRows[0].id,
      certifiedAt: now,
    },
    {
      id: randomUUID(),
      staffId: staff[0].id,
      locationId: locationRows[2].id,
      certifiedAt: now,
    },
    {
      id: randomUUID(),
      staffId: staff[1].id,
      locationId: locationRows[0].id,
      certifiedAt: now,
    },
    {
      id: randomUUID(),
      staffId: staff[2].id,
      locationId: locationRows[2].id,
      certifiedAt: now,
    },
    {
      id: randomUUID(),
      staffId: staff[3].id,
      locationId: locationRows[3].id,
      certifiedAt: now,
    },
  ]);

  await db.insert(staffSkills).values([
    {
      id: randomUUID(),
      staffId: staff[0].id,
      skillId: skillRows[0].id,
    },
    {
      id: randomUUID(),
      staffId: staff[0].id,
      skillId: skillRows[2].id,
    },
    {
      id: randomUUID(),
      staffId: staff[1].id,
      skillId: skillRows[1].id,
    },
    {
      id: randomUUID(),
      staffId: staff[1].id,
      skillId: skillRows[3].id,
    },
    {
      id: randomUUID(),
      staffId: staff[2].id,
      skillId: skillRows[2].id,
    },
    {
      id: randomUUID(),
      staffId: staff[3].id,
      skillId: skillRows[0].id,
    },
  ]);

  await db.insert(availabilityWindows).values([
    {
      id: randomUUID(),
      staffId: staff[0].id,
      dayOfWeek: 1,
      startTime: '09:00:00',
      endTime: '17:00:00',
      timezone: 'America/Los_Angeles',
    },
    {
      id: randomUUID(),
      staffId: staff[1].id,
      dayOfWeek: 5,
      startTime: '12:00:00',
      endTime: '21:00:00',
      timezone: 'America/Los_Angeles',
    },
    {
      id: randomUUID(),
      staffId: staff[2].id,
      dayOfWeek: 6,
      startTime: '10:00:00',
      endTime: '18:00:00',
      timezone: 'America/New_York',
    },
  ]);

  await db.insert(availabilityExceptions).values([
    {
      id: randomUUID(),
      staffId: staff[0].id,
      date: addDays(now, 1),
      startTime: '13:00:00',
      endTime: '18:00:00',
      timezone: 'America/Los_Angeles',
      type: 'available',
    },
    {
      id: randomUUID(),
      staffId: staff[2].id,
      date: addDays(now, 2),
      startTime: '00:00:00',
      endTime: '23:59:59',
      timezone: 'America/New_York',
      type: 'unavailable',
    },
  ]);

  const shiftRows = [
    {
      id: randomUUID(),
      locationId: locationRows[0].id,
      startAt: addDays(now, 3),
      endAt: addHours(addDays(now, 3), 8),
      requiredSkillId: skillRows[2].id,
      headcount: 2,
      status: 'published' as const,
      notes: 'Friday evening service',
      publishedAt: now,
      createdBy: managerSeattle.id,
      updatedBy: managerSeattle.id,
    },
    {
      id: randomUUID(),
      locationId: locationRows[2].id,
      startAt: addDays(now, 3),
      endAt: addHours(addDays(now, 3), 6),
      requiredSkillId: skillRows[0].id,
      headcount: 1,
      status: 'draft' as const,
      notes: 'Sunday callout risk',
      publishedAt: null,
      createdBy: managerMiami.id,
      updatedBy: managerMiami.id,
    },
    {
      id: randomUUID(),
      locationId: locationRows[3].id,
      startAt: addDays(now, 4),
      endAt: addHours(addDays(now, 4), 10),
      requiredSkillId: skillRows[1].id,
      headcount: 1,
      status: 'published' as const,
      notes: 'Overtime edge case',
      publishedAt: now,
      createdBy: managerMiami.id,
      updatedBy: managerMiami.id,
    },
  ];

  await db.insert(shifts).values(shiftRows);

  await db.insert(shiftAssignments).values([
    {
      id: randomUUID(),
      shiftId: shiftRows[0].id,
      staffId: staff[0].id,
      status: 'assigned',
      assignedBy: managerSeattle.id,
      assignedAt: now,
    },
    {
      id: randomUUID(),
      shiftId: shiftRows[0].id,
      staffId: staff[1].id,
      status: 'assigned',
      assignedBy: managerSeattle.id,
      assignedAt: now,
    },
  ]);

  await db.insert(swapRequests).values([
    {
      id: randomUUID(),
      shiftId: shiftRows[0].id,
      requesterId: staff[0].id,
      targetStaffId: staff[1].id,
      type: 'swap',
      status: 'pending',
      managerId: managerSeattle.id,
      reason: 'Doctor appointment',
      expiresAt: addHours(addDays(now, 2), 12),
    },
  ]);

  await db.insert(notifications).values([
    {
      id: randomUUID(),
      userId: staff[0].id,
      type: 'swap_request',
      title: 'Swap request submitted',
      body: 'Your swap request is pending manager approval.',
      data: { shiftId: shiftRows[0].id },
    },
    {
      id: randomUUID(),
      userId: managerSeattle.id,
      type: 'swap_request',
      title: 'Swap request needs approval',
      body: 'Sarah Chen requested a swap.',
      data: { shiftId: shiftRows[0].id },
    },
  ]);

  await db.insert(auditLogs).values([
    {
      id: randomUUID(),
      entityType: 'shift',
      entityId: shiftRows[0].id,
      action: 'publish',
      actorId: managerSeattle.id,
      before: null,
      after: { status: 'published' },
    },
  ]);

  await db.insert(timeEntries).values([
    {
      id: randomUUID(),
      staffId: staff[0].id,
      shiftId: shiftRows[0].id,
      locationId: locationRows[0].id,
      clockInAt: addHours(addDays(now, 3), 0),
      clockOutAt: addHours(addDays(now, 3), 8),
      isManual: false,
    },
  ]);
}

seed()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  });
