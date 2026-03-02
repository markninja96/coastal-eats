CREATE UNIQUE INDEX "uq_shift_staff_active" ON "shift_assignments" ("shift_id", "staff_id") WHERE "status" = 'assigned';
