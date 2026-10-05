-- Reference seed for the Baho database.
-- The backend seeds the full demo content automatically on start-up from
-- backend/src/config/seedData.js (10 lessons in 6 categories and 6 FAQs).
-- This file only creates the categories for a manual setup.

INSERT INTO categories (id, name, slug) VALUES
  (1, 'Imirire', 'nutrition'),
  (2, 'Umuvuduko w''amaraso', 'blood-pressure'),
  (3, 'Diyabete', 'diabetes'),
  (4, 'Ubuzima bw''umutima', 'heart-health'),
  (5, 'Kanseri', 'cancer'),
  (6, 'Imyitozo ngororamubiri', 'exercise')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
