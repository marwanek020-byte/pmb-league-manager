SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Transfer'
ORDER BY ordinal_position;

SELECT migration_name, checksum, applied_steps_count, finished_at
FROM _prisma_migrations
ORDER BY finished_at NULLS FIRST, migration_name;
