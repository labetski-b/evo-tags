-- DropIndex - Remove unique constraint to allow multiple reviews from same author to same target
DROP INDEX IF EXISTS "reviews_authorId_targetId_key";

-- Alternative names the index might have
DROP INDEX IF EXISTS "Review_authorId_targetId_key";
DROP INDEX IF EXISTS "reviews_author_id_target_id_key";