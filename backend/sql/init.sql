set timezone to 'UTC';

DO $$ BEGIN
    CREATE TYPE user_listing_status AS ENUM ('pending', 'declined', 'approved', 'completed');
    CREATE TYPE listing_trigger_mode AS ENUM ('manual', 'auto');
    CREATE TYPE listing_status AS ENUM ('draft', 'active', 'deleted');
    CREATE TYPE vc_issue_job_status AS ENUM ('pending', 'success', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION last_modified_ts_trg() RETURNS trigger AS $last_modified_ts_trg$
    BEGIN
        NEW.last_modified_ts = (now() at time zone 'utc');
        RETURN NEW;
    END;
$last_modified_ts_trg$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
    id                     uuid primary key default gen_random_uuid(),
    name			       text,
    email			       text not null unique,
    search_text            text generated always as (name || ' ' || email) stored,
    oc_id			       text not null unique,
    profile                jsonb not null default '{}'::jsonb,
    created_ts             timestamp without time zone default now(),
    last_modified_ts       timestamp without time zone default now()
);

CREATE TABLE IF NOT EXISTS listings (
    id                     uuid primary key default gen_random_uuid(),
    name                   text not null,
    description            text not null,
    published_ts           timestamp without time zone,
    deleted_ts             timestamp without time zone,
    created_ts             timestamp without time zone default now(),
    last_modified_ts       timestamp without time zone default now(),
    trigger_mode           listing_trigger_mode not null default 'manual',
    status                 listing_status not null default 'draft',
    published_by           text,
    sign_ups_limit         integer,
    vc_properties          jsonb not null default '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_listings (
    user_id                uuid not null references users(id),
    listing_id             uuid not null references listings(id),
    status                 user_listing_status not null,
    created_ts             timestamp without time zone default now(),
    last_modified_ts       timestamp without time zone default now()
);

CREATE TABLE IF NOT EXISTS tags (
    id                     uuid primary key default gen_random_uuid(),
    description            text not null,
    name                   text not null unique,
    archived_ts            timestamp without time zone,
    created_ts             timestamp without time zone default now(),
    last_modified_ts       timestamp without time zone default now(),
    can_issue_oca          boolean not null default false,
    vc_properties          jsonb not null default '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS listing_tags (
    listing_id             uuid not null references listings(id),
    tag_id                 uuid not null references tags(id),
    created_ts             timestamp without time zone default now(),
    last_modified_ts       timestamp without time zone default now()
);

CREATE TABLE IF NOT EXISTS admin_configs (
    admin_ocids            text[] not null default '{}'::text[],
    header_tag_ids         uuid[] not null default '{}'::uuid[],
    image                  text
);

CREATE TABLE IF NOT EXISTS vc_issue_jobs (
    id                     uuid primary key default gen_random_uuid(),
    user_id                uuid not null references users(id),
    listing_id             uuid not null references listings(id),
    payload                jsonb not null default '{}'::jsonb,
    created_ts             timestamp without time zone default now(),
    last_modified_ts       timestamp without time zone default now(),
    status                 vc_issue_job_status not null default 'pending',
    retry_count            integer not null default 0
);

CREATE TABLE IF NOT EXISTS vc_issue_job_logs (
    job_id                 uuid not null references vc_issue_jobs(id),
    created_ts             timestamp without time zone default now(),
    last_modified_ts       timestamp without time zone default now(),
    payload                jsonb not null default '{}'::jsonb,
    response               jsonb not null default '{}'::jsonb
);

DO $$ BEGIN
    CREATE TRIGGER users BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION last_modified_ts_trg();

    CREATE TRIGGER user_listings BEFORE UPDATE ON user_listings
        FOR EACH ROW EXECUTE FUNCTION last_modified_ts_trg();

    CREATE TRIGGER listings BEFORE UPDATE ON listings
        FOR EACH ROW EXECUTE FUNCTION last_modified_ts_trg();

    CREATE TRIGGER tags BEFORE UPDATE ON tags
        FOR EACH ROW EXECUTE FUNCTION last_modified_ts_trg();

    CREATE TRIGGER listing_tags BEFORE UPDATE ON listing_tags
        FOR EACH ROW EXECUTE FUNCTION last_modified_ts_trg();

    CREATE TRIGGER vc_issue_jobs BEFORE UPDATE ON vc_issue_jobs
        FOR EACH ROW EXECUTE FUNCTION last_modified_ts_trg();

    CREATE TRIGGER vc_issue_job_logs BEFORE UPDATE ON vc_issue_job_logs
        FOR EACH ROW EXECUTE FUNCTION last_modified_ts_trg();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;