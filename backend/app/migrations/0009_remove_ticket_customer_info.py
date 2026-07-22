# backend/app/migrations/0009_remove_ticket_customer_info.py

from django.db import migrations

DROP_OLD_TICKET_TRIGGER_SQL = """
DROP TRIGGER IF EXISTS ticket_search_vector_update ON app_ticket;
DROP FUNCTION IF EXISTS app_ticket_search_vector_trigger() CASCADE;
"""

MESSAGE_TRIGGER_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION app_message_search_vector_trigger() RETURNS trigger AS $$
DECLARE
    affected_ticket_id bigint;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_ticket_id := OLD.ticket_id;
    ELSE
        affected_ticket_id := NEW.ticket_id;
    END IF;

    UPDATE app_ticket
    SET search_vector =
        (
            SELECT coalesce(
                setweight(
                    to_tsvector('english', string_agg(body, ' ')),
                    'A'
                ),
                ''::tsvector
            )
            FROM app_message
            WHERE ticket_id = affected_ticket_id
        )
    WHERE id = affected_ticket_id;

    RETURN NULL;
END
$$ LANGUAGE plpgsql;
"""

BACKFILL_SQL = """
UPDATE app_ticket t
SET search_vector = (
    SELECT coalesce(
        setweight(to_tsvector('english', string_agg(m.body, ' ')), 'A'),
        ''::tsvector
    )
    FROM app_message m
    WHERE m.ticket_id = t.id
);
"""


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0008_aiusagelog_cost_aiusagelog_message"),
    ]

    operations = [
        migrations.RunSQL(
            sql=DROP_OLD_TICKET_TRIGGER_SQL,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql=MESSAGE_TRIGGER_FUNCTION_SQL,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RemoveField(
            model_name="ticket",
            name="customer_name",
        ),
        migrations.RemoveField(
            model_name="ticket",
            name="customer_email",
        ),
        migrations.RunSQL(
            sql=BACKFILL_SQL,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
