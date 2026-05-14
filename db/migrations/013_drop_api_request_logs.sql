-- Drop api_request_logs table.
--
-- Tabellen har inte fått några nya rader sedan 2025-10-15 (P1-11 slutade
-- persistera API-loggar; sedan dess går loggning bara till Cloud Logging).
-- Tabellen och dess /admin/api-logs-läsare togs bort i PR #90.
--
-- Eftersom datan är obsolet och inte används av någon kodvägg droppar vi
-- tabellen för att minska disk- och underhållskostnad. Cloud Logging är
-- enda kvarvarande sökväg för API-trafik.

DROP TABLE IF EXISTS api_request_logs;
