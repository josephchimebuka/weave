-- Enforce append-only immutability on AuditEvent at the database level.
-- The app only ever INSERTs, but this makes tampering impossible through
-- ordinary access: any UPDATE, DELETE or TRUNCATE raises an exception, so even
-- a stray prisma.auditEvent.delete() or a manual psql statement fails loudly.
-- (A superuser can still DROP/DISABLE the trigger via DDL — that is a far
-- higher, more deliberate and more auditable bar than a casual mutation.)

CREATE OR REPLACE FUNCTION prevent_auditevent_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only; % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auditevent_no_update_delete
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_auditevent_mutation();

CREATE TRIGGER auditevent_no_truncate
  BEFORE TRUNCATE ON "AuditEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_auditevent_mutation();
