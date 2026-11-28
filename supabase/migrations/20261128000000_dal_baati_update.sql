-- DROPOUT CAFE & RESTRO - DAL BAATI MENU UPDATE
-- Dal Baati (3 Pieces) - Rs 100 with optional Extra Ghee (+Rs 10)

-- 1. Remove obsolete bati items
DELETE FROM public.menu_items
WHERE name IN ('Bati with Ghee', 'Bati without Ghee')
   OR id = '9d085fbb-6abe-52bb-a7b3-8cf6c1fa430a';

-- 2. Upsert Dal Baati (3 Pieces)
INSERT INTO public.menu_items (
    id,
    category_id,
    name,
    description,
    price_paise,
    diet_type,
    image_url,
    is_available,
    tags
)
VALUES (
    '474a5f1c-401c-5378-b41c-fbb6baeeebf1',
    'c28ad7f4-7c58-5236-9f31-33d3f14a8ffd',
    'Dal Baati (3 Pieces)',
    'Authentic Rajasthani Dal Baati served with rich spicy dal and 3 pieces of Baati.',
    10000,
    'veg',
    '/images/menu/dal-baati.jpg',
    TRUE,
    ARRAY[]::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_paise = EXCLUDED.price_paise,
    diet_type = EXCLUDED.diet_type,
    image_url = EXCLUDED.image_url,
    is_available = EXCLUDED.is_available;

-- 3. Add Extra Ghee add-on (+Rs 10 = 1000 paise)
DELETE FROM public.menu_addons WHERE menu_item_id = '474a5f1c-401c-5378-b41c-fbb6baeeebf1';

INSERT INTO public.menu_addons (
    menu_item_id,
    name,
    price_paise,
    is_available
)
VALUES (
    '474a5f1c-401c-5378-b41c-fbb6baeeebf1',
    'Extra Ghee',
    1000,
    TRUE
);
