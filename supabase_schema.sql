-- ==============================================================================
-- Scelta Makeup — Schema Database PostgreSQL / Supabase
-- Versione: 2.0 (Isolamento Totale — Prefisso scelta_)
--
-- File: supabase_schema.sql
-- Progetto: Scelta Makeup (Boutique Via dei Pellegrini 28/29, Napoli — Federica Cesiano)
-- Idempotente: Eseguibile con 1-click nel Supabase SQL Editor
-- VINCOLO: Totale indipendenza e isolamento assoluto di Scelta Makeup.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. ESTENSIONI & RUOLI
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    -- Role safety check
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        NULL;
    END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. FUNZIONI TRIGGER COMUNI
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION scelta_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. TABELLE CORE CON PREFISSO scelta_
-- ------------------------------------------------------------------------------

-- 2.1 Tabella Clienti & CRM Omnichannel (E-Commerce + Appuntamenti In-Store)
CREATE TABLE IF NOT EXISTS scelta_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    postal_code TEXT,
    province TEXT,
    country TEXT NOT NULL DEFAULT 'IT',
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spend NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_appointments INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    tags TEXT[] NOT NULL DEFAULT '{}',
    marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Tabella Prodotti del Catalogo Cosmetico (341 referenze)
CREATE TABLE IF NOT EXISTS scelta_products (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    original_wholesale_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    review_count INTEGER NOT NULL DEFAULT 0,
    badge TEXT,
    badges TEXT[] NOT NULL DEFAULT '{}',
    description TEXT NOT NULL DEFAULT '',
    short_description TEXT NOT NULL DEFAULT '',
    formula_benefits TEXT NOT NULL DEFAULT '',
    how_to_use TEXT NOT NULL DEFAULT '',
    inci TEXT NOT NULL DEFAULT '',
    features TEXT[] NOT NULL DEFAULT '{}',
    images TEXT[] NOT NULL DEFAULT '{}',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[] NOT NULL DEFAULT '{}',
    texture TEXT,
    coverage TEXT,
    finish TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Tabella Varianti, Tonalità & Barcode EAN-13 (659 varianti)
CREATE TABLE IF NOT EXISTS scelta_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES scelta_products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    ean TEXT NOT NULL DEFAULT '',
    color_hex TEXT,
    image TEXT NOT NULL DEFAULT '',
    texture_image TEXT,
    in_stock BOOLEAN NOT NULL DEFAULT true,
    price NUMERIC(10, 2),
    original_wholesale_price NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Tabella Giacenze di Magazzino Boutique & E-Commerce
CREATE TABLE IF NOT EXISTS scelta_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id TEXT UNIQUE NOT NULL REFERENCES scelta_variants(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES scelta_products(id) ON DELETE CASCADE,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    safety_stock INTEGER NOT NULL DEFAULT 2,
    location TEXT NOT NULL DEFAULT 'Boutique Napoli - Via dei Pellegrini 28/29',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 Tabella Log Movimenti di Magazzino (Audit Trail Completo)
CREATE TABLE IF NOT EXISTS scelta_inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id TEXT NOT NULL REFERENCES scelta_variants(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES scelta_products(id) ON DELETE CASCADE,
    change_quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK (
        movement_type IN (
            'order_online',
            'pos_instore_sale',
            'restock_supplier',
            'manual_adjustment',
            'return_damaged',
            'tester_allocated'
        )
    ),
    reference_id TEXT,
    notes TEXT,
    operator TEXT NOT NULL DEFAULT 'Federica Cesiano',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 Tabella Ordini E-Commerce (Spedizione Corriere & Ritiro in Negozio)
CREATE TABLE IF NOT EXISTS scelta_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES scelta_customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_surname TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('shipping', 'boutique')),
    shipping_address JSONB DEFAULT '{}'::jsonb,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded', 'failed')),
    status TEXT NOT NULL DEFAULT 'processing' CHECK (
        status IN (
            'pending',
            'confirmed',
            'processing',
            'shipped',
            'ready_for_pickup',
            'completed',
            'cancelled'
        )
    ),
    sample_included BOOLEAN NOT NULL DEFAULT true,
    tracking_number TEXT,
    carrier TEXT DEFAULT 'BRT Express',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 Tabella Righe Ordine (Singoli Cosmetici Acquistati)
CREATE TABLE IF NOT EXISTS scelta_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES scelta_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES scelta_products(id) ON DELETE RESTRICT,
    variant_id TEXT REFERENCES scelta_variants(id) ON DELETE SET NULL,
    product_slug TEXT NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT NOT NULL,
    shade_name TEXT,
    shade_code TEXT,
    shade_hex TEXT,
    sku TEXT,
    ean TEXT,
    image_url TEXT NOT NULL DEFAULT '',
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 Tabella Appuntamenti & Sedute Cabina (Makeup Artist & Beauty)
CREATE TABLE IF NOT EXISTS scelta_appointments (
    id TEXT PRIMARY KEY DEFAULT ('app-' || gen_random_uuid()::text),
    booking_code TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES scelta_customers(id) ON DELETE SET NULL,
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'makeup' CHECK (channel IN ('makeup', 'beauty')),
    operator_id TEXT NOT NULL DEFAULT 'op-federica-cesiano',
    operator_name TEXT NOT NULL DEFAULT 'Federica Cesiano',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_surname TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_notes TEXT,
    price_list NUMERIC(10, 2) NOT NULL,
    discount_online NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_online NUMERIC(10, 2) NOT NULL,
    deposit_paid NUMERIC(10, 2) NOT NULL,
    balance_due NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
        status IN ('confirmed', 'completed_paid', 'cancelled', 'no_show')
    ),
    payment_method_deposit TEXT NOT NULL DEFAULT 'stripe_card',
    payment_method_balance TEXT CHECK (payment_method_balance IN ('mypos_card', 'cash', 'other')),
    cassa_receipt_printed BOOLEAN NOT NULL DEFAULT false,
    cassa_receipt_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 Tabella Slot Orari Bloccati (Pausa Pranzo 13:30, Post-20:00, Ferie, Sposa)
CREATE TABLE IF NOT EXISTS scelta_blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_date DATE NOT NULL,
    slot_time TEXT NOT NULL,
    reason TEXT DEFAULT 'Riservato in boutique',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_scelta_blocked_slots UNIQUE (slot_date, slot_time)
);

-- 2.10 Tabella Log Notifiche Transazionali (WhatsApp Anti-Ban 20-45s & Resend Email)
CREATE TABLE IF NOT EXISTS scelta_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
    recipient TEXT NOT NULL,
    recipient_name TEXT,
    template_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'cancelled')
    ),
    jitter_delay_seconds INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    message_preview TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11 Tabella Override Catalogo Centralizzato Cloud (Multi-Device Real-Time)
-- Singola riga singleton contenente productOverrides + variantStocks come JSONB.
CREATE TABLE IF NOT EXISTS scelta_catalog_overrides (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. TRIGGER AUTOMATICI PER UPDATED_AT
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_scelta_customers_updated_at ON scelta_customers;
CREATE TRIGGER trg_scelta_customers_updated_at
    BEFORE UPDATE ON scelta_customers
    FOR EACH ROW EXECUTE FUNCTION scelta_set_updated_at();

DROP TRIGGER IF EXISTS trg_scelta_products_updated_at ON scelta_products;
CREATE TRIGGER trg_scelta_products_updated_at
    BEFORE UPDATE ON scelta_products
    FOR EACH ROW EXECUTE FUNCTION scelta_set_updated_at();

DROP TRIGGER IF EXISTS trg_scelta_variants_updated_at ON scelta_variants;
CREATE TRIGGER trg_scelta_variants_updated_at
    BEFORE UPDATE ON scelta_variants
    FOR EACH ROW EXECUTE FUNCTION scelta_set_updated_at();

DROP TRIGGER IF EXISTS trg_scelta_inventory_updated_at ON scelta_inventory;
CREATE TRIGGER trg_scelta_inventory_updated_at
    BEFORE UPDATE ON scelta_inventory
    FOR EACH ROW EXECUTE FUNCTION scelta_set_updated_at();

DROP TRIGGER IF EXISTS trg_scelta_orders_updated_at ON scelta_orders;
CREATE TRIGGER trg_scelta_orders_updated_at
    BEFORE UPDATE ON scelta_orders
    FOR EACH ROW EXECUTE FUNCTION scelta_set_updated_at();

DROP TRIGGER IF EXISTS trg_scelta_appointments_updated_at ON scelta_appointments;
CREATE TRIGGER trg_scelta_appointments_updated_at
    BEFORE UPDATE ON scelta_appointments
    FOR EACH ROW EXECUTE FUNCTION scelta_set_updated_at();

DROP TRIGGER IF EXISTS trg_scelta_catalog_overrides_updated_at ON scelta_catalog_overrides;
CREATE TRIGGER trg_scelta_catalog_overrides_updated_at
    BEFORE UPDATE ON scelta_catalog_overrides
    FOR EACH ROW EXECUTE FUNCTION scelta_set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. TRIGGER & STORED PROCEDURE: SCARICO AUTOMATICO GIACENZE & AUDIT
-- ------------------------------------------------------------------------------

-- Funzione Trigger per scaricare la giacenza magazzino all'inserimento di una riga ordine
CREATE OR REPLACE FUNCTION scelta_handle_order_item_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
    curr_qty INTEGER;
    new_qty INTEGER;
    v_prod_id TEXT;
BEGIN
    IF NEW.variant_id IS NOT NULL THEN
        SELECT quantity_on_hand, product_id INTO curr_qty, v_prod_id
        FROM scelta_inventory
        WHERE variant_id = NEW.variant_id
        FOR UPDATE;

        IF curr_qty IS NOT NULL THEN
            new_qty := GREATEST(0, curr_qty - NEW.quantity);

            UPDATE scelta_inventory
            SET quantity_on_hand = new_qty,
                updated_at = now()
            WHERE variant_id = NEW.variant_id;

            IF new_qty = 0 THEN
                UPDATE scelta_variants
                SET in_stock = false,
                    updated_at = now()
                WHERE id = NEW.variant_id;
            END IF;

            INSERT INTO scelta_inventory_logs (
                variant_id,
                product_id,
                change_quantity,
                previous_quantity,
                new_quantity,
                movement_type,
                reference_id,
                notes,
                operator
            ) VALUES (
                NEW.variant_id,
                COALESCE(v_prod_id, NEW.product_id),
                -NEW.quantity,
                curr_qty,
                new_qty,
                'order_online',
                NEW.order_id::text,
                'Vendita E-Commerce riga ordine ' || NEW.product_name,
                'Sistema E-Commerce'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scelta_deduct_stock_on_order_item ON scelta_order_items;
CREATE TRIGGER trg_scelta_deduct_stock_on_order_item
    AFTER INSERT ON scelta_order_items
    FOR EACH ROW EXECUTE FUNCTION scelta_handle_order_item_stock_deduction();

-- Procedura per scarico vendita rapida da Cassa Fiscale RT (Lettura Barcode EAN)
CREATE OR REPLACE FUNCTION scelta_record_pos_sale(
    p_variant_id TEXT,
    p_quantity INTEGER,
    p_receipt_number TEXT,
    p_operator TEXT DEFAULT 'Federica Cesiano'
)
RETURNS JSONB AS $$
DECLARE
    curr_qty INTEGER;
    new_qty INTEGER;
    v_prod_id TEXT;
BEGIN
    SELECT quantity_on_hand, product_id INTO curr_qty, v_prod_id
    FROM scelta_inventory
    WHERE variant_id = p_variant_id
    FOR UPDATE;

    IF curr_qty IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Variante non trovata in inventario');
    END IF;

    new_qty := GREATEST(0, curr_qty - p_quantity);

    UPDATE scelta_inventory
    SET quantity_on_hand = new_qty,
        updated_at = now()
    WHERE variant_id = p_variant_id;

    IF new_qty = 0 THEN
        UPDATE scelta_variants
        SET in_stock = false,
            updated_at = now()
        WHERE id = p_variant_id;
    END IF;

    INSERT INTO scelta_inventory_logs (
        variant_id,
        product_id,
        change_quantity,
        previous_quantity,
        new_quantity,
        movement_type,
        reference_id,
        notes,
        operator
    ) VALUES (
        p_variant_id,
        v_prod_id,
        -p_quantity,
        curr_qty,
        new_qty,
        'pos_instore_sale',
        p_receipt_number,
        'Vendita banco store - Scontrino RT ' || p_receipt_number,
        p_operator
    );

    RETURN jsonb_build_object(
        'success', true,
        'variant_id', p_variant_id,
        'previous_quantity', curr_qty,
        'new_quantity', new_qty
    );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 5. INDICI DI PERFORMANCE AD ALTA FREQUENZA
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_scelta_products_slug ON scelta_products(slug);
CREATE INDEX IF NOT EXISTS idx_scelta_products_brand ON scelta_products(brand);
CREATE INDEX IF NOT EXISTS idx_scelta_products_category ON scelta_products(category);
CREATE INDEX IF NOT EXISTS idx_scelta_products_is_featured ON scelta_products(is_featured);

CREATE INDEX IF NOT EXISTS idx_scelta_variants_product_id ON scelta_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_scelta_variants_sku ON scelta_variants(sku);
CREATE INDEX IF NOT EXISTS idx_scelta_variants_ean ON scelta_variants(ean);

CREATE INDEX IF NOT EXISTS idx_scelta_inventory_variant_id ON scelta_inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_scelta_inventory_product_id ON scelta_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_scelta_inventory_logs_variant_id ON scelta_inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_scelta_inventory_logs_created_at ON scelta_inventory_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scelta_customers_email ON scelta_customers(email);
CREATE INDEX IF NOT EXISTS idx_scelta_customers_phone ON scelta_customers(phone);

CREATE INDEX IF NOT EXISTS idx_scelta_orders_order_number ON scelta_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_scelta_orders_customer_id ON scelta_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_scelta_orders_status ON scelta_orders(status);
CREATE INDEX IF NOT EXISTS idx_scelta_orders_delivery_method ON scelta_orders(delivery_method);
CREATE INDEX IF NOT EXISTS idx_scelta_orders_created_at ON scelta_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scelta_order_items_order_id ON scelta_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_scelta_order_items_variant_id ON scelta_order_items(variant_id);

CREATE INDEX IF NOT EXISTS idx_scelta_appointments_booking_code ON scelta_appointments(booking_code);
CREATE INDEX IF NOT EXISTS idx_scelta_appointments_date_time ON scelta_appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_scelta_appointments_status ON scelta_appointments(status);
CREATE INDEX IF NOT EXISTS idx_scelta_blocked_slots_date ON scelta_blocked_slots(slot_date);

CREATE INDEX IF NOT EXISTS idx_scelta_notification_logs_status_scheduled ON scelta_notification_logs(status, scheduled_for);

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) & POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE scelta_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scelta_catalog_overrides ENABLE ROW LEVEL SECURITY;

-- Politiche Catalogo (Lettura Pubblica, Gestione Staff)
DROP POLICY IF EXISTS "Public can view scelta_products" ON scelta_products;
CREATE POLICY "Public can view scelta_products"
    ON scelta_products FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff full access on scelta_products" ON scelta_products;
CREATE POLICY "Staff full access on scelta_products"
    ON scelta_products FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view scelta_variants" ON scelta_variants;
CREATE POLICY "Public can view scelta_variants"
    ON scelta_variants FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff full access on scelta_variants" ON scelta_variants;
CREATE POLICY "Staff full access on scelta_variants"
    ON scelta_variants FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

-- Politiche Magazzino & Audit Logs (Solo Staff)
DROP POLICY IF EXISTS "Staff full access on scelta_inventory" ON scelta_inventory;
CREATE POLICY "Staff full access on scelta_inventory"
    ON scelta_inventory FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Staff full access on scelta_inventory_logs" ON scelta_inventory_logs;
CREATE POLICY "Staff full access on scelta_inventory_logs"
    ON scelta_inventory_logs FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

-- Politiche Clienti CRM (Creazione da Checkout, Gestione Staff)
DROP POLICY IF EXISTS "Public can insert customer on checkout" ON scelta_customers;
CREATE POLICY "Public can insert customer on checkout"
    ON scelta_customers FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff full access on scelta_customers" ON scelta_customers;
CREATE POLICY "Staff full access on scelta_customers"
    ON scelta_customers FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

-- Politiche Ordini & Righe (Inserimento Pubblico al Checkout, Gestione Staff)
DROP POLICY IF EXISTS "Public can insert scelta_orders" ON scelta_orders;
CREATE POLICY "Public can insert scelta_orders"
    ON scelta_orders FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff full access on scelta_orders" ON scelta_orders;
CREATE POLICY "Staff full access on scelta_orders"
    ON scelta_orders FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can insert scelta_order_items" ON scelta_order_items;
CREATE POLICY "Public can insert scelta_order_items"
    ON scelta_order_items FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff full access on scelta_order_items" ON scelta_order_items;
CREATE POLICY "Staff full access on scelta_order_items"
    ON scelta_order_items FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

-- Politiche Appuntamenti (Prenotazione Pubblica, Gestione Staff)
DROP POLICY IF EXISTS "Public can insert scelta_appointments" ON scelta_appointments;
CREATE POLICY "Public can insert scelta_appointments"
    ON scelta_appointments FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff full access on scelta_appointments" ON scelta_appointments;
CREATE POLICY "Staff full access on scelta_appointments"
    ON scelta_appointments FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

-- Politiche Slot Bloccati (Lettura Pubblica per Calendario, Gestione Staff)
DROP POLICY IF EXISTS "Public can view scelta_blocked_slots" ON scelta_blocked_slots;
CREATE POLICY "Public can view scelta_blocked_slots"
    ON scelta_blocked_slots FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Staff full access on scelta_blocked_slots" ON scelta_blocked_slots;
CREATE POLICY "Staff full access on scelta_blocked_slots"
    ON scelta_blocked_slots FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

-- Politiche Notifiche (Solo Worker & Staff)
DROP POLICY IF EXISTS "Staff full access on scelta_notification_logs" ON scelta_notification_logs;
CREATE POLICY "Staff full access on scelta_notification_logs"
    ON scelta_notification_logs FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);

-- Politica Override Catalogo Centralizzato (Solo Staff & Service Role)
DROP POLICY IF EXISTS "Staff full access on scelta_catalog_overrides" ON scelta_catalog_overrides;
CREATE POLICY "Staff full access on scelta_catalog_overrides"
    ON scelta_catalog_overrides FOR ALL
    TO authenticated, service_role
    USING (true) WITH CHECK (true);
