# Requirements Document: Employee Salary Management System

## Goal

Replace ACME's spreadsheet-based salary management process with a web application that lets the HR Manager view, manage, and analyze salary data for 10,000 employees across multiple countries — reliably, quickly, and without the manual errors that come with Excel.

The core value we're delivering isn't just "digitize the spreadsheet." It's giving the HR Manager the ability to *ask and answer questions* about how the org pays people (by country, department, role, level, tenure, etc.) in a way Excel makes painful at this scale.

## Primary Persona

**HR Manager** — not an engineer, not deeply technical. Needs a clean UI, fast search/filtering, and trustworthy numbers. Will use this daily to look up individuals and periodically to answer aggregate questions (e.g., for budget planning, pay equity reviews, or leadership reporting).

## Scope & Features (In)

**Employee & Salary Records**
- Store core employee data: name, employee ID, department, job title/level, country, currency, employment status, hire date
- Store compensation data: base salary, currency, effective date, pay frequency
- Support salary history (a salary is a point-in-time fact, not a mutable field — every change is recorded, not overwritten)

**CRUD & Data Management**
- Create, view, update employee and salary records
- Bulk seed of 10,000 employees via script (realistic distribution across countries, departments, levels)
- Soft-delete / deactivate rather than hard-delete, since HR data has audit implications

**Search, Filter & List Views**
- Paginated, searchable employee list (name, ID, department, country)
- Filter by department, country, level, status

**Reporting & Analytics (the "answer questions" requirement)**
- Aggregate views: average/median salary by department, country, level
- Headcount and payroll cost breakdowns
- Basic comparisons (e.g., a role's pay range vs. org average) to support the "how do we pay people" question

**Non-functional**
- Must perform acceptably with 10,000+ employee records (indexed queries, pagination — not "load everything into the browser")
- Multi-currency awareness (store currency alongside amount; no live FX conversion — see below)
- Basic input validation and error handling on all forms/APIs
