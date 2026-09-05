-- Populates blogs.search_vector automatically on insert/update — Prisma's
-- Unsupported("tsvector") type means the client can never write this column
-- directly (see schema.prisma's comment on Blog.searchVector).
--
-- Weighted: a title hit outranks a coincidental hit inside the body text.
CREATE OR REPLACE FUNCTION blogs_search_vector_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.excerpt, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blogs_search_vector_update ON "blogs";
CREATE TRIGGER blogs_search_vector_update
    BEFORE INSERT OR UPDATE ON "blogs"
    FOR EACH ROW
    EXECUTE FUNCTION blogs_search_vector_trigger();

-- Without this GIN index, `search_vector @@ ...` sequential-scans the table.
CREATE INDEX IF NOT EXISTS blog_search_vector_idx ON "blogs" USING GIN (search_vector);

-- The trigger only fires on future INSERT/UPDATE — every row that already
-- exists (including anything left over from earlier manual testing) needs
-- this run once, here, or it stays unsearchable forever.
UPDATE "blogs" SET
    search_vector =
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'C');