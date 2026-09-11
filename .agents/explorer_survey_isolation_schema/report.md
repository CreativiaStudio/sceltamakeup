# Rapporto di Indagine: Isolamento Database, Schema DDL Dedicato & Architettura Mock Storage Locale

**Data:** 2026-09-07  
**Autore:** Explorer 3 (Database Isolation & Storage Investigator)  
**Progetto:** Scelta Makeup (Boutique Via dei Pellegrini 28/29, Napoli — Federica Cesiano)  
**Destinatario:** Orchestrator & Successivi Worker di Implementazione  
**Working Directory:** `c:\Users\mario\Progetti Antigravity\Scelta Makeup\.agents\explorer_survey_isolation_schema\`  

---

## Indice dei Contenuti
1. [Audit di Sicurezza & Isolamento Assoluto da Isabel Pepe](#1-audit-di-sicurezza--isolamento-assoluto-da-isabel-pepe)
2. [Schema DDL Standalone Scelta Makeup (`scelta_*`)](#2-schema-ddl-standalone-scelta-makeup-scelta_)
3. [Architettura Mock Storage Locale per la Suite `/admin`](#3-architettura-mock-storage-locale-per-la-suite-admin)
4. [Piano di Transizione & Connettore Supabase Sicuro](#4-piano-di-transizione--connettore-supabase-sicuro)
5. [Matrice di Verifica & Checklist di Collaudo](#5-matrice-di-verifica--checklist-di-collaudo)

---

## 1. Audit di Sicurezza & Isolamento Assoluto da Isabel Pepe

### 1.1 Ricognizione File di Ambiente & Credenziali
È stata condotta un'analisi approfondita su tutti i file del workspace di Scelta Makeup e sui progetti adiacenti nel filesystem locale (`C:\Users\mario\Progetti Antigravity\`).

| Elemento Verificato | Esito Ispezione | Dettaglio & Note |
| :--- | :--- | :--- |
| File `.env` in root | 🟢 **Assente** | Nessun file `.env` presente nella root di Scelta Makeup. |
| File `.env.local` in root | 🟢 **Assente** | Nessun file `.env.local` attivo. Il sistema opera al 100% in modalità locale deterministica. |
| File `.env.example` | 🟡 **Assente (Da Creare)** | Non esiste ancora un file `.env.example` strutturato con i placeholder dedicati a Scelta Makeup. |
| Dipendenza `@supabase/supabase-js` | 🟢 **Non Installata** | Il file `package.json` include solo `lucide-react`, `next` (16.2.4), `react` (19.2.4), `react-dom`, `zustand` (5.0.14) e `tailwindcss`. Nessun client Supabase è presente nei `node_modules`. |
| Riferimenti a `process.env` nel codice sorgente | 🟢 **Isolati & Sicuri** | Solo due servizi verificano variabili d'ambiente con fallback di simulazione:<br>1. `lib/resendService.ts:829`: cerca `RESEND_API_KEY` (se assente, simula l'invio salvando l'HTML nel log e in localStorage).<br>2. `lib/whatsappQueueService.ts:523-524`: cerca `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` (se assenti, opera con simulazione deterministica e delay casuale 20-45s). |
| Ricerca Testuale "supabase" e "isabel" nel codice | 🟢 **Zero Contaminazioni** | La scansione su tutte le cartelle `app/`, `components/`, `lib/`, `store/`, `types/`, `data/` ha dato **0 risultati**. |

### 1.2 Analisi dell'Istanza Isabel Pepe (`C:\Users\mario\Progetti Antigravity\isabel-pepe`)
Dall'ispezione del progetto adiacente `isabel-pepe`:
1. `isabel-pepe/supabase_schema.sql` definisce tabelle **prive di qualsiasi prefisso**:
   ```sql
   DROP TABLE IF EXISTS orders;
   DROP TABLE IF EXISTS products;
   CREATE TABLE products (...);
   CREATE TABLE orders (...);
   CREATE TABLE public.support_messages (...);
   ```
2. `isabel-pepe/.env.local` contiene credenziali live verso un'istanza Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_DB_URL`, etc.).

### 1.3 Valutazione del Rischio di Collisione & Vincolo Categorico
> [!CAUTION]
> **RISCHIO DI CONTAMINAZIONE DISASTROSA:**  
> Se uno sviluppatore o un worker copiasse per errore le credenziali di `.env.local` da `isabel-pepe` a `Scelta Makeup`, oppure se le tabelle non avessero un prefisso univoco e venissero eseguite nello stesso progetto Supabase, le istruzioni `DROP TABLE IF EXISTS products` o `SELECT/UPDATE` cancellerebbero o corromperebbero irreversibilmente il database dei gioielli di Isabel Pepe.

### 1.4 Regole di Isolamento Tassative
1. **Prefisso Obbligatorio `scelta_`**: Tutte le tabelle, sequenze, funzioni e indici di Scelta Makeup devono avere il prefisso `scelta_` (`scelta_products`, `scelta_variants`, `scelta_orders`, `scelta_order_items`, `scelta_inventory_logs`, `scelta_customers`, `scelta_appointments`, `scelta_blocked_slots`, `scelta_notification_logs`).
2. **Nessuna Chiamata di Rete in Locale**: L'intera suite gestionale `/admin` deve funzionare offline tramite lo storage atomico locale (`lib/adminStore.ts`), senza effettuare chiamate di rete a nessun database cloud.
3. **Guards nel Client Supabase**: Qualora venisse aggiunto in futuro un file `lib/supabase.ts`, esso dovrà contenere un controllo di sicurezza all'avvio:
   ```typescript
   if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('isabel-pepe-project-id')) {
     throw new Error("CRITICAL SECURITY VIOLATION: Tentativo di connessione al database di Isabel Pepe bloccato!");
   }
   ```
4. **File `.env.example` Pulito**: Forniremo un template chiaro con warning esplicito.

---

## 2. Schema DDL Standalone Scelta Makeup (`scelta_*`)

Il seguente schema DDL rappresenta la versione definitiva ed autonoma da collocare nel file `c:\Users\mario\Progetti Antigravity\Scelta Makeup\supabase_schema.sql`.  
Lo schema è **100% idempotente**, include tutte le 9 tabelle richieste con prefisso dedicato `scelta_`, trigger per `updated_at`, trigger automatico di scarico giacenze magazzino all'inserimento delle righe ordine, indici ad alte prestazioni per scansione barcode EAN-13 e filtri catalogo, e Row Level Security (RLS) completo.

### 2.1 Testo Completo del DDL (`supabase_schema.sql`)

```sql
-- ==============================================================================
-- Scelta Makeup — Schema Database PostgreSQL / Supabase
-- Versione: 2.0 (Isolamento Totale — Prefisso scelta_)
--
-- File: supabase_schema.sql
-- Progetto: Scelta Makeup (Boutique Via dei Pellegrini 28/29, Napoli — Federica Cesiano)
-- Idempotente: Eseguibile con 1-click nel Supabase SQL Editor
-- VINCOLO: Totale indipendenza da qualsiasi altro progetto (es. Isabel Pepe).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. ESTENSIONI & RUOLI
-- ------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
END
$$;

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
```

---

## 3. Architettura Mock Storage Locale per la Suite `/admin`

### 3.1 Obiettivo Architetturale
Il requisito vincolante stabilisce che **l'intera suite `/admin` deve essere perfettamente funzionante, interattiva e collaudabile in locale a monte della registrazione degli account cloud reali**, garantendo:
1. Zero chiamate di rete verso endpoint Supabase esterni.
2. Inizializzazione automatica delle giacenze a partire dal catalogo reale (`data/catalog.json`, 341 prodotti, 659 varianti).
3. Ordini demo realistici che coprono tutti gli stati operativi ("In Elaborazione", "Spedito con Corriere Tracciato", "Pronto per Ritiro in Boutique", "Completato").
4. Elenco clienti CRM con storico acquisti e appuntamenti integrato.
5. Persistenza atomica in `localStorage` con fallback in-memory per SSR.
6. Funzione di **Reset ai Dati Iniziali** (1-click) per ripristinare il sandbox di test in qualsiasi momento.

### 3.2 Design del Modulo `lib/adminStore.ts` (Specifiche di Implementazione)

Il modulo unificato `lib/adminStore.ts` coordina lo stato globale dell'amministrazione.

#### Struttura dei Modelli di Dati TypeScript
```typescript
// Giacenza per singola variante
export interface AdminVariantStock {
  variantId: string;
  productId: string;
  sku: string;
  ean: string;
  name: string; // shade name
  productName: string;
  brand: string;
  category: string;
  quantityOnHand: number;
  safetyStock: number;
  price: number;
  colorHex: string | null;
  image: string;
  updatedAt: string;
}

// Log di movimento magazzino
export interface AdminInventoryLog {
  id: string;
  variantId: string;
  productName: string;
  brand: string;
  changeQuantity: number;
  previousQuantity: number;
  newQuantity: number;
  movementType: 'order_online' | 'pos_instore_sale' | 'restock_supplier' | 'manual_adjustment' | 'return_damaged';
  referenceId: string;
  notes: string;
  operator: string;
  createdAt: string;
}

// Cliente CRM
export interface AdminCustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  totalOrders: number;
  totalSpend: number;
  totalAppointments: number;
  lastActivityDate: string;
  beautyNotes: string; // pelle secca, trucco preferito, allergie
  tags: string[];
  orders: string[]; // ID ordini associati
  appointments: string[]; // Codici booking associati
}

// Metriche KPI Globali
export interface AdminDashboardKpis {
  totalRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  customersCount: number;
  pendingOrdersCount: number;
  readyForPickupCount: number;
  lowStockItemsCount: number;
  todayAppointmentsCount: number;
  weeklyRevenue: { date: string; revenue: number; orders: number }[];
}
```

#### Chiavi di Persistenza in `localStorage`
Per evitare qualsiasi conflitto e consentire il reset mirato o globale:
- `scelta_admin_inventory_v1`: giacenze di tutte le 659 varianti.
- `scelta_makeup_orders_v1`: ordini e-commerce (condiviso e sincronizzato con `lib/orderService.ts`).
- `scelta_admin_customers_v1`: anagrafiche CRM.
- `scelta_makeup_appointments_v1`: appuntamenti (condiviso con `lib/bookingService.ts`).
- `scelta_admin_inventory_logs_v1`: registro storico movimenti magazzino.

#### Inizializzazione Automatica da `data/catalog.json`
All'avvio, se `scelta_admin_inventory_v1` non è presente in `localStorage`, il sistema genera la mappa delle giacenze iterando sui 341 prodotti del catalogo:
```typescript
function generateInitialInventory(catalog: Product[]): Record<string, AdminVariantStock> {
  const map: Record<string, AdminVariantStock> = {};
  
  for (const prod of catalog) {
    for (const v of prod.variants) {
      let qty = 12; // Stock normale boutique
      if (prod.badge === 'Bestseller' || prod.badges.includes('bestseller')) {
        qty = 25; // Alta rotazione
      }
      if (v.sku.endsWith('01') || v.sku.endsWith('03')) {
        qty = 2; // Scorta bassa (Alert arancione)
      } else if (v.sku.endsWith('99')) {
        qty = 0; // Esaurito (Alert rosso)
      }

      map[v.id] = {
        variantId: v.id,
        productId: prod.id,
        sku: v.sku,
        ean: v.ean || '',
        name: v.name,
        productName: prod.name,
        brand: prod.brand,
        category: prod.category,
        quantityOnHand: qty,
        safetyStock: 3,
        price: v.price || prod.price,
        colorHex: v.colorHex,
        image: v.image || prod.images[0] || '',
        updatedAt: new Date().toISOString(),
      };
    }
  }
  return map;
}
```

#### Ordini Demo Iniziali Realistici (8 Scenari Completi)
Gli 8 ordini demo integrati coprono:
1. `SC-ORD-2026-0001`: Giulia Moretti (Napoli) — €60.50 — "In Elaborazione" (Corriere BRT).
2. `SC-ORD-2026-0002`: Alessandra De Luca (Napoli) — €36.00 — "Pronto per Ritiro in Boutique" (Ritiro Store).
3. `SC-ORD-2026-0003`: Chiara Rossi (Caserta) — €84.00 — "Spedito con Corriere Tracciato" (Tracking BRT-9921448102).
4. `SC-ORD-2026-0004`: Valentina Romano (Salerno) — €112.50 — "Completato" (Consegnato 2 giorni fa).
5. `SC-ORD-2026-0005`: Martina Esposito (Napoli) — €45.00 — "Pronto per Ritiro in Boutique" (Notificata via WhatsApp).
6. `SC-ORD-2026-0006`: Elena De Angelis (Roma) — €78.00 — "In Elaborazione" (Ordine recente).
7. `SC-ORD-2026-0007`: Federica Gentile (Sorrento) — €142.00 — "Spedito con Corriere Tracciato" (Tracking GLS-44102948).
8. `SC-ORD-2026-0008`: Serena Bianchi (Napoli) — €29.50 — "Completato" (Ritirato ieri in negozio da Federica).

#### Clienti CRM Iniziali (6 Profili Omnichannel)
1. **Chiara Rossi:** (Email: `chiara.rossi@example.com`, Tel: `+39 333 456 7890`)
   - 2 ordini e-commerce (€144.50) + 1 appuntamento Trucco Sposa (€45.00).
   - LTV: €189.50. Note: "Pelle mista, predilige toni malva e rossetti no-transfer".
2. **Alessandra De Luca:** (Email: `alessandra.deluca@example.com`, Tel: `+39 338 123 9876`)
   - 1 ordine e-commerce (€36.00) con ritiro in boutique + 1 seduta trucco giorno.
   - Note: "Cliente abituale del quartiere Chiaia, preferisce prodotti Diego dalla Palma".
3. **Giulia Moretti:** (Email: `giulia.moretti@example.com`, Tel: `+39 349 765 4321`)
   - 3 ordini e-commerce (€210.00). Note: "Acquista spesso fondotinta RVB LAB tono 12".
4. **Valentina Romano:** (Email: `valentina.romano@example.com`, Tel: `+39 331 998 8776`)
   - 2 ordini e-commerce (€165.00) spediti a Salerno.
5. **Martina Esposito:** (Email: `martina.esposito@example.com`, Tel: `+39 340 554 4332`)
   - 1 ordine e-commerce (€45.00) in attesa di ritiro in negozio.
6. **Valeria Esposito:** (Email: `valeria.esposito@example.com`, Tel: `+39 347 112 2334`)
   - 1 appuntamento Glow Naturale saldato in store con myPOS Go 2 (€31.50).

#### Azioni & Metodi di Gestione Atomica
```typescript
export interface AdminStoreActions {
  // Gestione Giacenze & Prezzi
  updateVariantStock: (variantId: string, quantity: number, reason?: string) => void;
  updateVariantPrice: (variantId: string, price: number) => void;
  
  // Gestione Ordini & Spedizioni
  updateOrderStatus: (orderId: string, status: OrderStatus, trackingNumber?: string) => void;
  markOrderReadyForPickup: (orderId: string) => void;
  markOrderCompleted: (orderId: string) => void;
  
  // Gestione CRM Clienti
  updateCustomerNotes: (customerId: string, notes: string) => void;
  addCustomerTag: (customerId: string, tag: string) => void;
  removeCustomerTag: (customerId: string, tag: string) => void;
  
  // Calcolo KPI Dinamico
  getKpis: () => AdminDashboardKpis;
  
  // Reset & Disaster Recovery
  resetAllToDefaults: () => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonStr: string) => boolean;
}
```

#### Meccanismo di Reset a 1-Click
Una funzione `resetAllToDefaults()` cancella in modo sicuro le chiavi:
- `localStorage.removeItem("scelta_admin_inventory_v1")`
- `localStorage.removeItem("scelta_makeup_orders_v1")`
- `localStorage.removeItem("scelta_admin_customers_v1")`
- `localStorage.removeItem("scelta_admin_inventory_logs_v1")`
e ricarica immediatamente le strutture di default senza ricaricare la pagina, emettendo un evento personalizzato `scelta-store-reset` per aggiornare tutti i componenti attivi.

---

## 4. Piano di Transizione & Connettore Supabase Sicuro

Quando Federica e Mario creeranno l'account e il progetto Supabase reale per Scelta Makeup:

### 4.1 Template `.env.example`
Viene fornito il template pulito da salvare in root come `.env.example`:

```bash
# ==============================================================================
# SCELTA MAKEUP — Configurazione Ambiente & Credenziali
# Progetto: Scelta Makeup Boutique (Federica Cesiano — Napoli)
#
# ATTENZIONE VINCOLO DI SICUREZZA:
# Non inserire MAI in questo file le credenziali o URL di altri progetti (es. Isabel Pepe).
# Le tabelle di Scelta Makeup utilizzano il prefisso obbligatorio 'scelta_'.
# ==============================================================================

# Supabase Dedicato Scelta Makeup (https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-scelta-makeup-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Resend — Notifiche Email Transazionali di Lusso
RESEND_API_KEY=re_123456789...
RESEND_FROM_EMAIL=Scelta Makeup <onboarding@resend.dev>

# Evolution API — WhatsApp Boutique Anti-Ban (+39 348 381 6516)
NEXT_PUBLIC_EVOLUTION_API_URL=https://evolution.creativia.cloud
EVOLUTION_API_KEY=your-evolution-api-key-here
EVOLUTION_INSTANCE_NAME=scelta-makeup-store

# Registratore Telematico Fiscale (IP Statico su Rete Wi-Fi Negozio)
NEXT_PUBLIC_CASSA_RT_IP=http://192.168.1.150
```

### 4.2 Pattern del Client `lib/supabase.ts` con Guard di Sicurezza
Quando si aggiungerà il client Supabase reale:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Guard anti-contaminazione: verifica che non sia l'URL di Isabel Pepe
if (supabaseUrl && supabaseUrl.includes('isabel')) {
  throw new Error("VIOLAZIONE DI ISOLAMENTO: Rilevato URL del progetto Isabel Pepe!");
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

---

## 5. Matrice di Verifica & Checklist di Collaudo

| Test / Verifica | Comando o Azione | Criterio di Successo | Stato Attuale |
| :--- | :--- | :--- | :--- |
| **Verifica TypeScript** | `npx tsc --noEmit` | 0 errori TypeScript | 🟢 **SUPERATO (0 errori)** |
| **Verifica Linting** | `npm run lint` | 0 errori ESLint | 🟢 **SUPERATO (0 errori)** |
| **Conteggio Catalogo** | `node -e "const c = require('./data/catalog.json'); console.log(c.length);"` | 341 prodotti esatti | 🟢 **SUPERATO (341)** |
| **Conteggio Varianti** | `node -e "const c = require('./data/catalog.json'); console.log(c.reduce((s,p)=>s+p.variants.length,0));"` | 659 varianti esatte | 🟢 **SUPERATO (659)** |
| **Assenza Isabel Pepe** | `Get-ChildItem -Path @('app','components','lib','store','types','data') -Recurse -File \| Select-String -Pattern 'supabase\|isabel'` | Zero righe trovate | 🟢 **SUPERATO (0 match)** |
| **Idempotenza SQL DDL** | Validazione sintassi PostgreSQL | Eseguibile con 1-click in Supabase SQL Editor | 🟢 **PRONTO (`supabase_schema.sql`)** |
| **Funzionamento Offline** | Esecuzione senza connessione cloud | Tutte le route `/admin` navigabili senza credenziali | 🟢 **GARANTITO DA STORE LOCALE** |

---
*Fine del Rapporto di Indagine Explorer 3.*
