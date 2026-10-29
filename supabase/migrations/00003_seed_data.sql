-- =============================================================
-- Migration: 00003_seed_data.sql
-- Description: Production-safe seed data
--              - Problem categories with multilingual translations (EN, TE, HI)
--              - App settings with platform defaults
--              - Service region for Andhra Pradesh pilot (Guntur)
-- =============================================================

-- -------------------------------------------------------------
-- 1. PROBLEM CATEGORIES
-- -------------------------------------------------------------
INSERT INTO public.problem_categories (id, name_en, name_te, name_hi, icon, sort_order, is_active)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'Engine',
    'ఇంజిన్',
    'इंजन',
    'engine',
    1,
    true
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'Hydraulics',
    'హైడ్రాలిక్స్',
    'हाइड्रोलिक्स',
    'hydraulic',
    2,
    true
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'Clutch / Gearbox',
    'క్లచ్ / గేర్‌బాక్స్',
    'क्लच / गियरबॉक्स',
    'gearbox',
    3,
    true
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'Tyres',
    'టైర్లు',
    'टायर',
    'tire',
    4,
    true
  ),
  (
    'c1000000-0000-0000-0000-000000000005',
    'Electrical',
    'ఎలక్ట్రికల్',
    'इलेक्ट्रिकल',
    'battery',
    5,
    true
  ),
  (
    'c1000000-0000-0000-0000-000000000006',
    'Other',
    'ఇతర సమస్యలు',
    'अन्य समस्याएं',
    'wrench',
    6,
    true
  )
ON CONFLICT (name_en) DO UPDATE SET
  name_te = EXCLUDED.name_te,
  name_hi = EXCLUDED.name_hi,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- -------------------------------------------------------------
-- 2. APP SETTINGS
-- -------------------------------------------------------------
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('commission_rate', '10.00', 'Platform commission percentage charged on mechanic service labor'),
  ('default_visit_charge', '200.00', 'Standard mechanic visit and diagnostic charge in INR'),
  ('default_service_radius_km', '25', 'Default mechanic search and notification radius in kilometers'),
  ('assignment_timeout_seconds', '30', 'Mechanic match notification response timeout in seconds')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- -------------------------------------------------------------
-- 3. SERVICE REGIONS (Andhra Pradesh Pilot - Guntur District)
-- -------------------------------------------------------------
INSERT INTO public.service_regions (id, name, state, district, is_active, boundary)
VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'Guntur Pilot Region',
    'Andhra Pradesh',
    'Guntur',
    true,
    ST_GeogFromText('SRID=4326;POLYGON((80.0000 15.9000, 80.7500 15.9000, 80.7500 16.6500, 80.0000 16.6500, 80.0000 15.9000))')
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'Krishna Pilot Region',
    'Andhra Pradesh',
    'Krishna',
    true,
    ST_GeogFromText('SRID=4326;POLYGON((80.5000 16.1000, 81.3000 16.1000, 81.3000 16.8500, 80.5000 16.8500, 80.5000 16.1000))')
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  state = EXCLUDED.state,
  district = EXCLUDED.district,
  is_active = EXCLUDED.is_active,
  boundary = EXCLUDED.boundary,
  updated_at = now();
