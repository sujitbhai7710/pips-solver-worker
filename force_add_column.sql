-- Force add the explanation column. 
-- Running this will fix the "table pips has no column named explanation" error.
ALTER TABLE pips ADD COLUMN explanation TEXT;
