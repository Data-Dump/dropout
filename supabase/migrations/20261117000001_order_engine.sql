-- ==============================================================================
-- DROPOUT CAFE & RESTRO - ORDER ENGINE ATOMIC TRANSACTION & IMMUTABLE SNAPSHOTS
-- ==============================================================================

-- 1. Add idempotency_key to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);

-- 2. Add selected_variant to order_items for immutable variant snapshot
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS selected_variant JSONB DEFAULT NULL;

-- 3. Update default statuses to canonical uppercase standards
ALTER TABLE public.orders 
ALTER COLUMN status SET DEFAULT 'NEW',
ALTER COLUMN payment_status SET DEFAULT 'PENDING';

-- 4. Atomic PostgreSQL Order Transaction Stored Procedure
CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_order_number VARCHAR,
    p_table_number VARCHAR,
    p_payment_method VARCHAR,
    p_payment_status VARCHAR DEFAULT 'PENDING',
    p_subtotal_paise BIGINT DEFAULT 0,
    p_tax_paise BIGINT DEFAULT 0,
    p_total_paise BIGINT DEFAULT 0,
    p_customer_name VARCHAR DEFAULT NULL,
    p_customer_phone VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_order_status VARCHAR DEFAULT 'NEW'
)
RETURNS JSONB AS $$
DECLARE
    v_table_id UUID;
    v_order_id UUID;
    v_item RECORD;
    v_existing_order_id UUID;
BEGIN
    -- Duplicate submission protection via idempotency check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_order_id
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing_order_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'status', 'duplicate',
                'order_id', v_existing_order_id
            );
        END IF;
    END IF;

    -- Lookup table_id from restaurant_tables
    SELECT id INTO v_table_id
    FROM public.restaurant_tables
    WHERE table_number = p_table_number
    LIMIT 1;

    -- Insert order
    INSERT INTO public.orders (
        order_number,
        table_id,
        table_number,
        status,
        payment_method,
        payment_status,
        subtotal_paise,
        tax_paise,
        total_paise,
        customer_name,
        customer_phone,
        notes,
        idempotency_key
    ) VALUES (
        p_order_number,
        v_table_id,
        p_table_number,
        COALESCE(p_order_status, 'NEW'),
        p_payment_method,
        COALESCE(p_payment_status, 'PENDING'),
        p_subtotal_paise,
        p_tax_paise,
        p_total_paise,
        p_customer_name,
        p_customer_phone,
        p_notes,
        p_idempotency_key
    )
    RETURNING id INTO v_order_id;

    -- Insert immutable line items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        menu_item_id UUID,
        item_name VARCHAR,
        unit_price_paise BIGINT,
        quantity INT,
        diet_type VARCHAR,
        selected_variant JSONB,
        selected_addons JSONB,
        special_instructions TEXT,
        total_price_paise BIGINT
    )
    LOOP
        INSERT INTO public.order_items (
            order_id,
            menu_item_id,
            item_name,
            unit_price_paise,
            quantity,
            diet_type,
            selected_variant,
            selected_addons,
            special_instructions,
            total_price_paise
        ) VALUES (
            v_order_id,
            v_item.menu_item_id,
            v_item.item_name,
            v_item.unit_price_paise,
            v_item.quantity,
            COALESCE(v_item.diet_type, 'veg'),
            v_item.selected_variant,
            COALESCE(v_item.selected_addons, '[]'::jsonb),
            v_item.special_instructions,
            v_item.total_price_paise
        );
    END LOOP;

    -- Insert payment ledger entry
    INSERT INTO public.payments (
        order_id,
        payment_method,
        amount_paise,
        status,
        provider
    ) VALUES (
        v_order_id,
        p_payment_method,
        p_total_paise,
        COALESCE(p_payment_status, 'PENDING'),
        'phonepe'
    );

    -- Mark dining table occupied
    IF v_table_id IS NOT NULL THEN
        UPDATE public.restaurant_tables
        SET status = 'occupied', updated_at = NOW()
        WHERE id = v_table_id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'created',
        'order_id', v_order_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
