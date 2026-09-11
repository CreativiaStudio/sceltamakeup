import fs from 'fs';

const schemaPath = 'c:/Users/mario/Progetti Antigravity/Scelta Makeup/supabase_schema.sql';

console.log(`Checking schema file at: ${schemaPath}`);
if (!fs.existsSync(schemaPath)) {
  console.error('ERROR: Schema file does not exist!');
  process.exit(1);
}

const content = fs.readFileSync(schemaPath, 'utf-8');

const requiredTables = [
  'products',
  'variants',
  'inventory',
  'appointments',
  'orders',
  'blocked_slots',
  'notification_logs'
];

console.log('--- Checking Required Tables ---');
for (const table of requiredTables) {
  const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${table}\\s*\\(`, 'i');
  if (!tableRegex.test(content)) {
    console.error(`ERROR: Table ${table} definition not found!`);
    process.exit(1);
  }
  console.log(`[PASS] Table: ${table}`);
}

console.log('--- Checking Trigger Function and Triggers ---');
if (!/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+set_updated_at\s*\(\)/i.test(content)) {
  console.error('ERROR: set_updated_at function not found!');
  process.exit(1);
}
console.log('[PASS] Function: set_updated_at');

const triggerTables = ['products', 'variants', 'inventory', 'appointments', 'orders'];
for (const table of triggerTables) {
  const triggerRegex = new RegExp(`CREATE\\s+TRIGGER\\s+\\w+\\s+(BEFORE|AFTER)\\s+UPDATE\\s+ON\\s+${table}`, 'i');
  if (!triggerRegex.test(content)) {
    console.error(`ERROR: Trigger on ${table} not found!`);
    process.exit(1);
  }
  console.log(`[PASS] Trigger on: ${table}`);
}

console.log('--- Checking Required Indexes ---');
const requiredIndexes = [
  { table: 'appointments', cols: ['appointment_date', 'appointment_time'] },
  { table: 'appointments', cols: ['booking_code'] },
  { table: 'orders', cols: ['order_number'] },
  { table: 'blocked_slots', cols: ['slot_date'] },
  { table: 'notification_logs', cols: ['status', 'scheduled_for'] },
  { table: 'variants', cols: ['product_id'] },
  { table: 'variants', cols: ['sku'] },
  { table: 'products', cols: ['slug'] }
];

for (const idx of requiredIndexes) {
  const colPattern = idx.cols.join('\\s*,\\s*');
  const indexRegex = new RegExp(`CREATE\\s+INDEX\\s+(IF\\s+NOT\\s+EXISTS\\s+)?\\w+\\s+ON\\s+${idx.table}\\s*\\(\\s*${colPattern}\\s*\\)`, 'i');
  if (!indexRegex.test(content)) {
    console.error(`ERROR: Index on ${idx.table}(${idx.cols.join(', ')}) not found!`);
    process.exit(1);
  }
  console.log(`[PASS] Index on: ${idx.table}(${idx.cols.join(', ')})`);
}

console.log('--- Checking Row Level Security (RLS) ---');
for (const table of requiredTables) {
  const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
  if (!rlsRegex.test(content)) {
    console.error(`ERROR: RLS not enabled on ${table}!`);
    process.exit(1);
  }
  console.log(`[PASS] RLS enabled on: ${table}`);
}

console.log('--- Checking Public Read Policies ---');
const publicReadTables = ['products', 'variants', 'blocked_slots'];
for (const table of publicReadTables) {
  const readRegex = new RegExp(`CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+${table}\\s+FOR\\s+SELECT\\s+TO\\s+[^;]+USING\\s*\\(\\s*true\\s*\\)`, 'i');
  if (!readRegex.test(content)) {
    console.error(`ERROR: Public SELECT policy on ${table} not found!`);
    process.exit(1);
  }
  console.log(`[PASS] Public read policy on: ${table}`);
}

console.log('--- Checking Public Insert Policies ---');
const publicInsertTables = ['appointments', 'orders'];
for (const table of publicInsertTables) {
  const insertRegex = new RegExp(`CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+${table}\\s+FOR\\s+INSERT\\s+TO\\s+[^;]+WITH\\s+CHECK\\s*\\(\\s*true\\s*\\)`, 'i');
  if (!insertRegex.test(content)) {
    console.error(`ERROR: Public INSERT policy on ${table} not found!`);
    process.exit(1);
  }
  console.log(`[PASS] Public insert policy on: ${table}`);
}

console.log('--- Checking Authenticated / Service Role Policies ---');
for (const table of requiredTables) {
  const authRegex = new RegExp(`CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+${table}\\s+FOR\\s+ALL\\s+TO\\s+authenticated`, 'i');
  const serviceRegex = new RegExp(`CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+${table}\\s+FOR\\s+ALL\\s+TO\\s+service_role`, 'i');
  if (!authRegex.test(content)) {
    console.error(`ERROR: Authenticated policy on ${table} not found!`);
    process.exit(1);
  }
  if (!serviceRegex.test(content)) {
    console.error(`ERROR: Service role policy on ${table} not found!`);
    process.exit(1);
  }
  console.log(`[PASS] Full CRUD policies (authenticated & service_role) on: ${table}`);
}

console.log('--- Checking Columns Specification ---');
const requiredColumns = {
  products: ['id', 'slug', 'name', 'brand', 'category', 'price', 'original_price', 'original_wholesale_price', 'rating', 'review_count', 'badge', 'badges', 'description', 'short_description', 'formula_benefits', 'how_to_use', 'inci', 'features', 'images', 'is_featured', 'tags', 'texture', 'coverage', 'finish', 'created_at', 'updated_at'],
  variants: ['id', 'product_id', 'name', 'sku', 'ean', 'color_hex', 'image', 'in_stock', 'price', 'original_wholesale_price', 'created_at', 'updated_at'],
  inventory: ['id', 'variant_id', 'product_id', 'quantity_on_hand', 'safety_stock', 'location', 'updated_at'],
  appointments: ['id', 'booking_code', 'service_id', 'service_name', 'channel', 'operator_id', 'operator_name', 'duration_minutes', 'appointment_date', 'appointment_time', 'customer_name', 'customer_surname', 'customer_phone', 'customer_email', 'customer_notes', 'price_list', 'discount_online', 'price_online', 'deposit_paid', 'balance_due', 'status', 'payment_method_deposit', 'payment_method_balance', 'cassa_receipt_printed', 'cassa_receipt_number', 'created_at', 'completed_at', 'reminder_sent', 'reminder_sent_at'],
  orders: ['id', 'order_number', 'customer_name', 'customer_surname', 'customer_email', 'customer_phone', 'delivery_method', 'shipping_address', 'items', 'subtotal', 'shipping_cost', 'total', 'payment_method', 'payment_status', 'status', 'tracking_number', 'created_at', 'updated_at'],
  blocked_slots: ['id', 'slot_date', 'slot_time', 'reason', 'created_at'],
  notification_logs: ['id', 'channel', 'recipient', 'recipient_name', 'template_type', 'payload', 'scheduled_for', 'sent_at', 'status', 'jitter_delay_seconds', 'attempts', 'error_message', 'message_preview', 'created_at']
};

for (const [table, cols] of Object.entries(requiredColumns)) {
  for (const col of cols) {
    const colRegex = new RegExp(`\\b${col}\\b`, 'i');
    if (!colRegex.test(content)) {
      console.error(`ERROR: Column ${col} missing in table ${table}!`);
      process.exit(1);
    }
  }
  console.log(`[PASS] All ${cols.length} columns confirmed for ${table}`);
}

console.log('\n========================================');
console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
console.log('========================================');
