-- Ensure idempotency for payment webhooks by deduplicating on computed event hash
-- Creates a partial unique index on JSON field request_data->>'event_hash'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_payment_logs_event_hash'
  ) THEN
    EXECUTE $sql$
      CREATE UNIQUE INDEX uq_payment_logs_event_hash
      ON public.payment_logs ((request_data->>'event_hash'))
      WHERE request_data ? 'event_hash'
    $sql$;
  END IF;
END $$;

