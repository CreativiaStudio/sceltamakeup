import {
  calculateJitter,
  formatWhatsAppTemplate,
  enqueueWhatsAppMessage,
  getWhatsAppQueueState,
  clearWhatsAppQueue,
  clearWhatsAppHistory,
} from "../lib/whatsappQueueService";
import { NotificationTemplateType } from "../types/notification";

interface ChallengerSummary {
  jitterTest: {
    passed: boolean;
    iterations: number;
    min: number;
    max: number;
    mean: number;
    stdDev: number;
    chiSquare: number;
    allIntegers: boolean;
    uniform: boolean;
    frequencyTable: Record<number, number>;
  };
  checksumTest: {
    passed: boolean;
    totalRuns: number;
    withFixedBookingCode: {
      distinctTexts: number;
      distinctChecksums: number;
      collisions: number;
      sampleChecksums: string[];
    };
    withDynamicBookingCode: {
      distinctTexts: number;
      distinctChecksums: number;
      collisions: number;
      sampleChecksums: string[];
    };
  };
  fifoBurstTest: {
    passed: boolean;
    burstSize: number;
    isProcessingLocked: boolean;
    activeItemPreserved: boolean;
    fifoOrderMaintained: boolean;
    queueLengthMatches: boolean;
    enqueuedIds: string[];
    observedQueueOrder: string[];
  };
  phoneSanitizationTest: {
    totalTested: number;
    passedStrictE164: number;
    flaggedCases: Array<{
      input: string;
      output: string;
      category: string;
      issue?: string;
    }>;
  };
}

async function runAdversarialHarness(): Promise<ChallengerSummary> {
  console.log("================================================================================");
  console.log("🕵️  SCELTA MAKEUP — EMPIRICAL ADVERSARIAL CHALLENGER (FASE 3 GATE)");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. STATISTICAL JITTER DISTRIBUTION TEST (10,000 Iterations)
  // ---------------------------------------------------------------------------
  console.log(">>> [1/4] STRESS TEST: 10,000 Iterations of calculateJitter()...");
  const JITTER_ITERATIONS = 10000;
  let jitterMin = Infinity;
  let jitterMax = -Infinity;
  let jitterSum = 0;
  let allIntegers = true;
  const frequencies: Record<number, number> = {};

  for (let i = 20; i <= 45; i++) {
    frequencies[i] = 0;
  }

  for (let i = 0; i < JITTER_ITERATIONS; i++) {
    const val = calculateJitter();
    if (!Number.isInteger(val)) {
      allIntegers = false;
    }
    if (val < jitterMin) jitterMin = val;
    if (val > jitterMax) jitterMax = val;
    jitterSum += val;
    frequencies[val] = (frequencies[val] || 0) + 1;
  }

  const mean = jitterSum / JITTER_ITERATIONS;
  let varianceSum = 0;
  for (let i = 20; i <= 45; i++) {
    const count = frequencies[i] || 0;
    const diff = i - mean;
    varianceSum += count * diff * diff;
  }
  const variance = varianceSum / JITTER_ITERATIONS;
  const stdDev = Math.sqrt(variance);

  // Chi-squared test for uniformity across 26 discrete buckets
  const expectedFreq = JITTER_ITERATIONS / 26; // ~384.615
  let chiSquare = 0;
  let allBucketsHit = true;
  for (let i = 20; i <= 45; i++) {
    const obs = frequencies[i] || 0;
    if (obs === 0) allBucketsHit = false;
    const diff = obs - expectedFreq;
    chiSquare += (diff * diff) / expectedFreq;
  }

  // Degrees of freedom = 25. Critical value at alpha=0.01 is 44.31, alpha=0.001 is 52.62
  const isUniform = chiSquare < 55.0 && allBucketsHit;
  const jitterPassed =
    allIntegers &&
    jitterMin >= 20 &&
    jitterMax <= 45 &&
    jitterMin === 20 &&
    jitterMax === 45 &&
    isUniform;

  console.log(`    - Min observed: ${jitterMin} (Expected: 20)`);
  console.log(`    - Max observed: ${jitterMax} (Expected: 45)`);
  console.log(`    - Mean: ${mean.toFixed(2)} (Expected ~32.50)`);
  console.log(`    - StdDev: ${stdDev.toFixed(2)} (Theoretical uniform: ~7.50)`);
  console.log(`    - Chi-Square statistic: ${chiSquare.toFixed(2)} (df=25, critical p=0.01: 44.31)`);
  console.log(`    - All discrete seconds [20..45] populated: ${allBucketsHit ? "YES" : "NO"}`);
  console.log(`    - Verdict: ${jitterPassed ? "✅ PASS" : "❌ FAIL"}\n`);

  // ---------------------------------------------------------------------------
  // 2. DYNAMIC VARIATION & SHA-256 CHECKSUM COLLISION TEST (100 Consecutive Runs)
  // ---------------------------------------------------------------------------
  console.log(">>> [2/4] STRESS TEST: 100 Consecutive Generations for Identical Booking Inputs...");

  // Scenario A: With explicit fixed bookingCode
  const fixedBookingInput = {
    customerName: "Chiara Rossi",
    serviceName: "Make-up Evento & Cerimonia",
    bookingDate: "2026-09-15",
    bookingTime: "13:30",
    operatorName: "Federica Cesiano",
    bookingCode: "SC-FIXED-BOOKING-001",
    priceList: 50.0,
    discountOnline: 5.0,
    depositPaid: 9.0,
    balanceDue: 36.0,
  };

  const textsA = new Set<string>();
  const checksumsA = new Set<string>();
  const checksumListA: string[] = [];

  for (let i = 0; i < 100; i++) {
    const res = formatWhatsAppTemplate("booking_confirmation", fixedBookingInput);
    textsA.add(res.text);
    checksumsA.add(res.checksum);
    checksumListA.push(res.checksum);
  }

  const collisionsA = 100 - checksumsA.size;

  // Scenario B: With dynamic default bookingCode
  const dynamicBookingInput = {
    customerName: "Chiara Rossi",
    serviceName: "Make-up Evento & Cerimonia",
    bookingDate: "2026-09-15",
    bookingTime: "13:30",
    operatorName: "Federica Cesiano",
    priceList: 50.0,
    discountOnline: 5.0,
    depositPaid: 9.0,
    balanceDue: 36.0,
  };

  const textsB = new Set<string>();
  const checksumsB = new Set<string>();
  const checksumListB: string[] = [];

  for (let i = 0; i < 100; i++) {
    const res = formatWhatsAppTemplate("booking_confirmation", dynamicBookingInput);
    textsB.add(res.text);
    checksumsB.add(res.checksum);
    checksumListB.push(res.checksum);
  }

  const collisionsB = 100 - checksumsB.size;
  const checksumPassed = collisionsA === 0 && collisionsB === 0;

  console.log(`    Scenario A (Fixed bookingCode):`);
  console.log(`      - Distinct Texts generated: ${textsA.size} / 100`);
  console.log(`      - Unique Checksums generated: ${checksumsA.size} / 100`);
  console.log(`      - Checksum Collisions: ${collisionsA}`);
  console.log(`    Scenario B (Dynamic bookingCode):`);
  console.log(`      - Distinct Texts generated: ${textsB.size} / 100`);
  console.log(`      - Unique Checksums generated: ${checksumsB.size} / 100`);
  console.log(`      - Checksum Collisions: ${collisionsB}`);
  console.log(`    - Verdict: ${checksumPassed ? "✅ PASS (0 Collisions)" : "❌ FAIL (Collisions Detected)"}\n`);

  // ---------------------------------------------------------------------------
  // 3. BURST ENQUEUE & SEQUENTIAL FIFO EXECUTION LOCK (10 Messages)
  // ---------------------------------------------------------------------------
  console.log(">>> [3/4] STRESS TEST: Burst Enqueue of 10 Messages & FIFO Order...");
  clearWhatsAppQueue();
  clearWhatsAppHistory();

  const BURST_SIZE = 10;
  const burstInputs = Array.from({ length: BURST_SIZE }, (_, idx) => ({
    name: `Customer Burst ${idx + 1}`,
    phone: `+39 348 000 ${idx.toString().padStart(4, "0")}`,
    template: (idx % 2 === 0 ? "booking_confirmation" : "booking_reminder_24h") as NotificationTemplateType,
  }));

  const enqueuedMessages = burstInputs.map((item) =>
    enqueueWhatsAppMessage({
      recipientPhone: item.phone,
      recipientName: item.name,
      templateType: item.template,
      context: { serviceName: "Make-up Evento & Cerimonia", priceList: 50.0 },
    })
  );

  const burstState = getWhatsAppQueueState();
  const isLocked = burstState.isProcessing === true;
  const activeIsFirst = burstState.activeItem?.id === enqueuedMessages[0].id;
  const queueLengthMatches = burstState.queue.length === BURST_SIZE - 1;

  // Check FIFO ordering of remaining 9 messages
  let fifoMatches = true;
  const observedQueueOrder: string[] = [];
  for (let i = 0; i < burstState.queue.length; i++) {
    const queuedMsg = burstState.queue[i];
    const expectedMsg = enqueuedMessages[i + 1];
    observedQueueOrder.push(queuedMsg.id);
    if (queuedMsg.id !== expectedMsg.id || queuedMsg.recipientName !== expectedMsg.recipientName) {
      fifoMatches = false;
    }
  }

  const burstPassed = isLocked && activeIsFirst && queueLengthMatches && fifoMatches;

  console.log(`    - Burst Count: ${BURST_SIZE}`);
  console.log(`    - Sequential Lock Active: ${isLocked ? "YES (isProcessing=true)" : "NO"}`);
  console.log(`    - Active Item is Message #1 (FIFO head): ${activeIsFirst ? "YES" : "NO"} (${burstState.activeItem?.id})`);
  console.log(`    - Pending Queue Length: ${burstState.queue.length} (Expected: ${BURST_SIZE - 1})`);
  console.log(`    - Strict FIFO sequence preserved across all 9 waiting items: ${fifoMatches ? "YES" : "NO"}`);
  console.log(`    - Verdict: ${burstPassed ? "✅ PASS" : "❌ FAIL"}\n`);

  // Clean up queue after test
  clearWhatsAppQueue();
  clearWhatsAppHistory();

  // ---------------------------------------------------------------------------
  // 4. PHONE SANITIZATION STRESS TEST ACROSS MALFORMED INTERNATIONAL NUMBERS
  // ---------------------------------------------------------------------------
  console.log(">>> [4/4] STRESS TEST: Phone Sanitization Across Malformed & Foreign Numbers...");

  const phoneTestCases = [
    // Standard Italian formats
    { input: "3481234567", category: "IT standard without prefix" },
    { input: "348 123 4567", category: "IT with spaces" },
    { input: "+39 348 123 4567", category: "IT with +39 and spaces" },
    { input: "+39 (348) 123-4567", category: "IT with brackets & dashes" },
    { input: "0039 348 123 4567", category: "IT with 0039 international prefix" },
    { input: "00393481234567", category: "IT with 0039 continuous" },
    { input: "393481234567", category: "IT with 39 continuous (12 digits)" },
    { input: "348.123.4567", category: "IT with dots" },
    { input: "02 1234567", category: "IT Milan landline" },
    { input: "081 1234567", category: "IT Naples landline" },

    // Valid International formats with standard E.164 (+)
    { input: "+1 555 234 5678", category: "US international (+1)" },
    { input: "+44 7911 123456", category: "UK international (+44)" },
    { input: "+33 6 12 34 56 78", category: "FR international (+33)" },
    { input: "+49 151 12345678", category: "DE international (+49)" },
    { input: "+34 612 34 56 78", category: "ES international (+34)" },
    { input: "+41 79 123 45 67", category: "CH international (+41)" },

    // International formats with 00 exit code
    { input: "001 555 234 5678", category: "US with 00 exit code" },
    { input: "0044 7911 123456", category: "UK with 00 exit code" },
    { input: "0033 612345678", category: "FR with 00 exit code" },

    // Adversarial & Malformed cases
    { input: "", category: "Empty string" },
    { input: "   ", category: "Whitespace only" },
    { input: "+39/348/1234567", category: "Slashes inside number" },
    { input: "++393481234567", category: "Double plus prefix" },
    { input: "447911123456", category: "UK without + or 00" },
    { input: "15552345678", category: "US without + or 00" },
    { input: "+39 348 123 4567 ext 12", category: "Extension text" },
    { input: "tel:+393481234567", category: "URI schema prefix" },
    { input: "invalid_phone", category: "Alphabetic junk" },
  ];

  let strictE164PassCount = 0;
  const flaggedCases: Array<{
    input: string;
    output: string;
    category: string;
    issue?: string;
  }> = [];

  for (const tc of phoneTestCases) {
    const msg = enqueueWhatsAppMessage({
      recipientPhone: tc.input,
      recipientName: "Adversarial Phone Target",
      templateType: "manual_test",
    });

    const out = msg.recipientPhone;
    clearWhatsAppQueue();
    clearWhatsAppHistory();

    // Strict E.164 regex: starts with +, followed by 7-15 digits only
    const isStrictE164 = /^\+[1-9]\d{6,14}$/.test(out);
    if (isStrictE164) {
      strictE164PassCount++;
    }

    let issue: string | undefined;
    if (!out.startsWith("+")) {
      issue = "Missing '+' international prefix";
    } else if (/[^+\d]/.test(out)) {
      issue = `Contains non-numeric characters: '${out.replace(/\d/g, "")}'`;
    } else if (tc.input === "447911123456" && out.startsWith("+39")) {
      issue = "Foreign UK number without '+' was misidentified and prepended with +39";
    } else if (tc.input === "15552345678" && out.startsWith("+39")) {
      issue = "Foreign US number without '+' was misidentified and prepended with +39";
    } else if (tc.input === "+39/348/1234567" && out.includes("/")) {
      issue = "Slashes '/' not stripped by regex";
    } else if (tc.input === "++393481234567" && out.startsWith("++")) {
      issue = "Double plus '++' preserved";
    } else if (tc.input === "invalid_phone" && !isStrictE164) {
      issue = `Invalid alpha text converted to '${out}' instead of falling back to store default or validation rejection`;
    }

    flaggedCases.push({
      input: tc.input,
      output: out,
      category: tc.category,
      issue,
    });
  }

  console.log(`    - Total phone patterns tested: ${phoneTestCases.length}`);
  console.log(`    - Strictly valid E.164 (+[1-9]digits{7,15}): ${strictE164PassCount} / ${phoneTestCases.length}`);

  const issuesFound = flaggedCases.filter((f) => f.issue !== undefined);
  console.log(`    - Malformed Edge Cases Flagged for Review: ${issuesFound.length}`);
  for (const item of issuesFound) {
    console.log(`      ⚠️  [${item.category}] In: "${item.input}" -> Out: "${item.output}" | Note: ${item.issue}`);
  }

  return {
    jitterTest: {
      passed: jitterPassed,
      iterations: JITTER_ITERATIONS,
      min: jitterMin,
      max: jitterMax,
      mean,
      stdDev,
      chiSquare,
      allIntegers,
      uniform: isUniform,
      frequencyTable: frequencies,
    },
    checksumTest: {
      passed: checksumPassed,
      totalRuns: 100,
      withFixedBookingCode: {
        distinctTexts: textsA.size,
        distinctChecksums: checksumsA.size,
        collisions: collisionsA,
        sampleChecksums: checksumListA.slice(0, 5),
      },
      withDynamicBookingCode: {
        distinctTexts: textsB.size,
        distinctChecksums: checksumsB.size,
        collisions: collisionsB,
        sampleChecksums: checksumListB.slice(0, 5),
      },
    },
    fifoBurstTest: {
      passed: burstPassed,
      burstSize: BURST_SIZE,
      isProcessingLocked: isLocked,
      activeItemPreserved: activeIsFirst,
      fifoOrderMaintained: fifoMatches,
      queueLengthMatches,
      enqueuedIds: enqueuedMessages.map((m) => m.id),
      observedQueueOrder,
    },
    phoneSanitizationTest: {
      totalTested: phoneTestCases.length,
      passedStrictE164: strictE164PassCount,
      flaggedCases,
    },
  };
}

runAdversarialHarness()
  .then(() => {
    console.log("\n================================================================================");
    console.log("🏁 EMPIRICAL TEST EXECUTION COMPLETE — ADVERSARIAL METRICS EXTRACTED");
    console.log("================================================================================");
  })
  .catch((err) => {
    console.error("💥 FATAL ERROR during empirical harness execution:", err);
    process.exit(1);
  });
