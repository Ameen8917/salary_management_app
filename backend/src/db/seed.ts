/**
 * Seed script: generates 10,000 employees with realistic distribution across
 * countries, departments, and levels, plus an initial salary record for each.
 *
 * Design notes:
 * - Salary bands are approximate, country-adjusted, and level-adjusted, with
 *   randomness layered on top — good enough to make analytics views (avg by
 *   department/country/level) look and behave like real data, without
 *   pretending to be actual market compensation data.
 * - Every employee gets exactly one initial SalaryRecord ("Initial hire").
 *   ~15% also get a second record ("Annual raise") at a later date, so the
 *   salary-history feature has real data to show, not just one row per person.
 * - Deterministic seed for faker so the dataset is reproducible across runs.
 */

import { PrismaClient, Level, EmploymentStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";

faker.seed(42);

const prisma = new PrismaClient();

const COUNTRIES: { country: string; countryCode: string; currency: string; costIndex: number }[] = [
  { country: "United States", countryCode: "US", currency: "USD", costIndex: 1.0 },
  { country: "United Kingdom", countryCode: "GB", currency: "GBP", costIndex: 0.85 },
  { country: "India", countryCode: "IN", currency: "INR", costIndex: 0.25 },
  { country: "Germany", countryCode: "DE", currency: "EUR", costIndex: 0.9 },
  { country: "Canada", countryCode: "CA", currency: "CAD", costIndex: 0.82 },
  { country: "Australia", countryCode: "AU", currency: "AUD", costIndex: 0.88 },
  { country: "Singapore", countryCode: "SG", currency: "SGD", costIndex: 0.95 },
];

// Weighted so India/US skew larger, matching a typical global org shape
const COUNTRY_WEIGHTS = [0.28, 0.12, 0.32, 0.1, 0.08, 0.06, 0.04];

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Customer Support",
  "Finance",
  "Human Resources",
  "Operations",
  "Legal",
];

const LEVELS: Level[] = ["L1", "L2", "L3", "L4", "L5", "L6", "MANAGER", "DIRECTOR"];
const LEVEL_WEIGHTS = [0.12, 0.2, 0.22, 0.18, 0.12, 0.07, 0.07, 0.02];

// Base annual salary in USD-equivalent terms, before country cost-index adjustment
const LEVEL_BASE_USD: Record<Level, number> = {
  L1: 55000,
  L2: 70000,
  L3: 90000,
  L4: 115000,
  L5: 145000,
  L6: 180000,
  MANAGER: 160000,
  DIRECTOR: 220000,
};

function weightedPick<T>(items: T[], weights: number[]): T {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

function salaryForLevelAndCountry(level: Level, costIndex: number): number {
  const base = LEVEL_BASE_USD[level] * costIndex;
  // +/- 12% variance so not every employee at a level has identical pay
  const variance = 1 + (Math.random() * 0.24 - 0.12);
  return Math.round((base * variance) / 100) * 100;
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.salaryRecord.deleteMany();
  await prisma.employee.deleteMany();

  console.log("Generating 10,000 employees...");
  const BATCH_SIZE = 500;
  const TOTAL = 10000;

  for (let batchStart = 0; batchStart < TOTAL; batchStart += BATCH_SIZE) {
    const batchEmployees = [];
    const batchNumber = batchStart / BATCH_SIZE;

    for (let i = 0; i < BATCH_SIZE; i++) {
      const idx = batchStart + i;
      const countryInfo = weightedPick(COUNTRIES, COUNTRY_WEIGHTS);
      const level = weightedPick(LEVELS, LEVEL_WEIGHTS);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const hireDate = faker.date.between({ from: "2015-01-01", to: "2026-06-01" });
      const employmentStatus: EmploymentStatus =
        Math.random() < 0.05 ? "TERMINATED" : Math.random() < 0.03 ? "INACTIVE" : "ACTIVE";

      batchEmployees.push({
        employeeCode: `EMP-${String(idx + 1).padStart(6, "0")}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${idx}@acme-corp.example`,
        department: faker.helpers.arrayElement(DEPARTMENTS),
        jobTitle: `${level} ${faker.helpers.arrayElement(DEPARTMENTS)} Specialist`,
        level,
        country: countryInfo.country,
        countryCode: countryInfo.countryCode,
        employmentStatus,
        hireDate,
        _salary: salaryForLevelAndCountry(level, countryInfo.costIndex),
        _currency: countryInfo.currency,
        _hireDate: hireDate,
      });
    }

    // Insert employees for this batch
    await prisma.$transaction(
      batchEmployees.map((e) =>
        prisma.employee.create({
          data: {
            employeeCode: e.employeeCode,
            firstName: e.firstName,
            lastName: e.lastName,
            email: e.email,
            department: e.department,
            jobTitle: e.jobTitle,
            level: e.level,
            country: e.country,
            countryCode: e.countryCode,
            employmentStatus: e.employmentStatus,
            hireDate: e.hireDate,
            salaryRecords: {
              create: [
                {
                  amount: e._salary,
                  currency: e._currency,
                  effectiveDate: e._hireDate,
                  reason: "Initial hire",
                },
                ...(Math.random() < 0.15
                  ? [
                      {
                        amount: Math.round(e._salary * (1 + Math.random() * 0.1 + 0.03)),
                        currency: e._currency,
                        effectiveDate: faker.date.between({ from: e._hireDate, to: new Date() }),
                        reason: "Annual raise",
                      },
                    ]
                  : []),
              ],
            },
          },
        })
      )
    );

    console.log(`  Inserted batch ${batchNumber + 1}/${TOTAL / BATCH_SIZE} (${batchStart + BATCH_SIZE} employees)`);
  }

  const count = await prisma.employee.count();
  console.log(`Done. Seeded ${count} employees.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
