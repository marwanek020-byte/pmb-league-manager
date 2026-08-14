-- Change the default budget for newly created clubs.
-- Existing Club.budget values are NOT modified.

ALTER TABLE "Club"
ALTER COLUMN "budget" SET DEFAULT 0;