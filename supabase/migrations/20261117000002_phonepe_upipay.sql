-- ==============================================================================
-- DROPOUT CAFE & RESTRO - PHONEPE UPIPAY INTEGRATION & AUDIT LEDGER
-- ==============================================================================

-- 1. Ensure indexes for merchant_transaction_id and order_id on payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_txn_id ON public.payments(merchant_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 2. Add idempotency_key to payments table if not exists
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

-- 3. Stored Procedure to atomically mark payment and order as PAID
CREATE OR REPLACE FUNCTION public.settle_phonepe_payment(
    p_merchant_transaction_id VARCHAR,
    p_provider_reference_id VARCHAR,
    p_amount_paise BIGINT,
    p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
BEGIN
    -- 1. Locate the payment attempt by unique merchant transaction ID
    SELECT * INTO v_payment
    FROM public.payments
    WHERE merchant_transaction_id = p_merchant_transaction_id
    LIMIT 1;

    IF v_payment IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PAYMENT_NOT_FOUND',
            'message', 'No payment record matching merchant transaction ID'
        );
    END IF;

    -- 2. Duplicate protection / Replay guard: If already settled, return idempotent success
    IF UPPER(v_payment.status) = 'PAID' THEN
        RETURN jsonb_build_object(
            'success', true,
            'code', 'ALREADY_PAID',
            'message', 'Payment already settled previously',
            'order_id', v_payment.order_id
        );
    END IF;

    -- 3. Update payment record to PAID
    UPDATE public.payments
    SET status = 'PAID',
        provider_reference_id = COALESCE(p_provider_reference_id, provider_reference_id),
        raw_payload = COALESCE(p_raw_payload, raw_payload),
        settled_at = NOW(),
        updated_at = NOW()
    WHERE id = v_payment.id;

    -- 4. Update parent order payment_status to PAID
    UPDATE public.orders
    SET payment_status = 'PAID',
        updated_at = NOW()
    WHERE id = v_payment.order_id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'SETTLED',
        'order_id', v_payment.order_id,
        'payment_id', v_payment.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
