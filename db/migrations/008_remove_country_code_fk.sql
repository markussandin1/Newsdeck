-- Migration: Ta bort FK-constraint på country_code i news_items
-- country_code är informativt och ska kunna innehålla valfri sträng
-- (t.ex. okända länder, multi-country-händelser hanteras på appnivå)
-- Den faktiska geo-filtreringen sker via region_country_code/region_code (FK finns kvar)

ALTER TABLE news_items
  DROP CONSTRAINT IF EXISTS news_items_country_code_fkey;
