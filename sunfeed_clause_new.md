# Sunfeed PPA: Risk, Compliance and Documentation Guide (Sunfeed / SPD side)

Source: `PPA Package-18 patna sunfeed c.docx`
Agreement: Contract-cum-PPA, 6 MW(DC) / 5585 Kutir Jyoti rooftop plants (1.1 kW each), Patna Circle, CAPEX-cum-RESCO, 10 years.
Parties: Sunfeed Ecosolutions India Pvt Ltd in JV with Jai Auto Vehicles Pvt Ltd (SPD) and SBPDCL / NBPDCL (DISCOMs).

This file replaces the earlier `sunfeed_clause.md`, which was written from a vendor's point of view. This one is written for Sunfeed as the SPD. Goal: know every obligation, deadline, penalty and dispute trigger, and know what record to keep so that no claim against Sunfeed (or no payment loss) catches you unprepared.

## 0. Ground rules for reading this file

- **Clause numbers.** The .docx uses automatic numbering, so the extracted text had no numbers. Numbers here come from the agreement's own cross-references (4.4, 4.5, 9.5, 12.3.8, etc.). Anything marked `(inferred)` must be checked against the signed copy.
- **Signed or not?** The date line ("made on the __ day of __") is blank in the copy I read. If it is still unsigned, section 8 (pre-signing negotiation) is your best chance. If signed, changes need a written amendment (Art. 16.1: amendment only by written agreement) or a written clarification from the DISCOMs.
- **Not legal advice.** This is a commercial and compliance reading. Have counsel confirm before you send notices or sign anything.
- **Legend:** 🔴 high financial or termination risk, 🟠 moderate, 🟡 drafting issue or ambiguity.

---

## 1. Deal at a glance

| Item | Value | Source |
|---|---|---|
| Plants | 5,585 × 1.1 kW = 6,143.5 kWp (called "6 MW DC") | Recitals |
| Term | 10 years from COD (RESCO period) | Art. 1 (Expiry Date), Art. 2 |
| Tariff | ₹2.95/kWh, fixed, inclusive of all taxes and levies, no escalation | Art. 8, Art. 9.3 |
| CFA | ₹33,000 per plant, paid by MNRE directly to Sunfeed | Art. 8, Art. 9.1 |
| SFA | ₹10,000 per plant, paid by DISCOM on set dates | Art. 8, Art. 9.1 |
| Performance Bank Guarantee | ₹20 lakh/MW, ₹1.2 crore total, 11 BGs (1 × 50% + 10 × 5%) | Art. 1, Art. 3.2 |
| Scheduled Commissioning Date (SCD) | 9 months from Effective Date (signing) | Art. 1, Art. 4.5 |
| Outer commissioning limit | SCD + 3 months, with LD | Art. 4.5 |
| Purchase cap | DISCOM need not buy beyond 125 kWh/month/plant (about 15.5% CUF) | Art. 4.3 |
| Minimum CUF | 15% declared (floor 13.5%) | Art. 4.3 |
| Governing law / courts | Laws of India; Patna High Court; tariff-related disputes go to BERC | Art. 15 |

**Money numbers (calculated, verify against your model):**

| Item | Calculation | Result |
|---|---|---|
| CFA total | 5,585 × ₹33,000 | ₹18.43 crore |
| SFA total | 5,585 × ₹10,000 | ₹5.59 crore |
| Capex-side receipts | CFA + SFA | **₹24.01 crore** |
| Tariff revenue per plant per year (at 125 kWh/month cap) | 125 × 12 × ₹2.95 | ₹4,425 |
| Tariff revenue, all plants, per year | 5,585 × ₹4,425 | about ₹2.47 crore |
| Tariff revenue, 10 years (at cap) | | about ₹24.7 crore |
| PSM corpus fee (Sunfeed cost) | 5,585 × ₹2,000 | **₹1.117 crore** |
| Annual energy at 15% CUF | 5,585 × 1.1 kW × 8,760 h × 0.15 | about 8,072 MWh |

Tariff revenue cannot exceed the 125 kWh/month cap per plant, so your upside is capped while your downside (LDs, penalties) is not. Keep this asymmetry in view.

---

## 2. Critical dates and deadlines

| # | Event | Deadline | Clause | Consequence of missing |
|---|---|---|---|---|
| 2.1 🔴 | Performance Bank Guarantee | Within 15 days of LoA (recital says already furnished, ₹1.2 Cr in 11 parts) | Art. 3.2 | Breach; BG encashment |
| 2.2 🔴 | PBG renewal | At least **one month before** expiry; BGs must be valid for at least 2 years and renewed every year until handover | Art. 3.2 | DISCOM may encash without giving reasons |
| 2.3 🟠 | Financing documents | Art. 3.1 says "within six One Month" of LoA (garbled; see 7.16). Treat as **one month from 13.06.2026 = 13.07.2026** until clarified | Art. 3.1 | Breach of conditions subsequent |
| 2.4 🟠 | GTP and PERT chart submission | Before go-ahead for the project | Art. 4.1 | No dispatch or approval |
| 2.5 🟠 | Vendor approval | After signing, **before** DISCOM issues pre-dispatch instruction | Art. 5 | Cannot dispatch material |
| 2.6 🟠 | Authorized Service Centre in each district of the circle | Operational **before the first plant is commissioned** | Art. 4.1 | **Termination** |
| 2.7 🔴 | SCD (full capacity) | 9 months from Effective Date | Art. 4.5 | LD starts |
| 2.8 🔴 | Outer limit | SCD + 3 months | Art. 4.5 | Capacity cut; balance PPA terminated |
| 2.9 🟠 | Intimation for inspection | At least 15 days before witness inspection / performance test | Art. 4.8 | Commissioning certificate delayed |
| 2.10 🟠 | Commissioning certificate application | First week of the month following the month of commissioning | Art. 4.8 | COD slips by a month |
| 2.11 🟠 | Certificate issued by DISCOM | Within 30 days of a complete application | Art. 4.8 | Chase in writing |
| 2.12 🟠 | Import-export meter by DISCOM | Within 15 days of installation and portal submission | Art. 4.1 | Evidence for DISCOM delay |
| 2.13 🟠 | Force Majeure notice | Within **one week** of occurrence and one week of cessation | Art. 10 | FM relief can be refused |
| 2.14 🟠 | Monthly RESCO invoice | Monthly, based on RMS data on DISCOM Central Portal | Art. 9.2 | Payment delay |
| 2.15 🟠 | DISCOM payment | Within 30 days of valid invoice received by Engineer in Charge (ESE) | Art. 9.2 | Delay is not a DISCOM default until 90 days after the Due Date |
| 2.16 🟠 | Bill dispute window | DISCOM must dispute within 15 days or the bill is conclusive. SPD must reply to a Bill Dispute Notice within 15 days | Art. 9.7 | Missing the 15 days weakens your position |
| 2.17 🟠 | Quarterly reconciliation | Within 30 days of quarter end | Art. 9.8 | 20% payment withheld if verification is pending due to the developer |
| 2.18 🟠 | Annual reconciliation | Within 30 days of year end | Art. 9.8 | Adjustments in next bill |
| 2.19 🟠 | Defective solar meter | Replace within 1 month of detection | Art. 9.2 | Lower-of generation basis applies |
| 2.20 🟠 | Complaint resolution | Within 15 days of intimation (toll-free number: 72 hours) | Art. 4.1 | ₹20/consumer/week penalty |
| 2.21 🟠 | Defective equipment replacement | Within 15 working days of reporting | Art. 4.1 | Penal action |
| 2.22 🟠 | Module cleaning | Every 15 days or as needed | Art. 4.1 | O&M default |
| 2.23 🟠 | Cure period for material breach | 30 days from DISCOM's first notice | Art. 12.1 | Event of Default |
| 2.24 🟠 | Dispute notice response | 45 days to file counter-claim | Art. 15.2 | Weakened defence |
| 2.25 🟠 | Joint meter reading | Half-yearly if required | Art. 4.1 | O&M default |

**Action:** build a shared compliance calendar with owners for each row. The Effective Date is the anchor for the SCD. Record it the day the PPA is signed.

---

## 3. Exposure register: every way Sunfeed can lose money or the contract

### 3.1 Commissioning delay (Art. 4.5)

- LD formula: PBG amount × (undelivered capacity ÷ total capacity) × (days ÷ 90), with a month treated as 30 days. LD is realised by encashing the PBG.
- Calculated for this package:
  - Whole package undelivered: ₹1.2 Cr ÷ 90 = **about ₹1.33 lakh per day**.
  - Per plant: ₹1.2 Cr ÷ 5,585 = ₹2,149 per plant for 90 days, i.e. **about ₹23.87 per plant per day**.
  - Maximum LD over the 3-month window is the whole ₹1.2 Cr PBG.
- After SCD + 3 months, **the PPA capacity is reduced to what is commissioned and the rest is terminated.** You lose both the tariff stream and the CFA/SFA on the uncommissioned plants. 🔴
- Delay is excused only for DISCOM Event of Default, Force Majeure on either side (Art. 4.4.1). The extension must be a "reasonable period but not less than day-for-day".
- Extension must be agreed within 30 days of the end of the affecting event, otherwise either party may raise a dispute (Art. 4.4.3).

**What to document:** the Effective Date, the date the consumer list was received, the date each site's consent, access and meter became available, and every hindrance with DISCOM countersignature. Without this you cannot prove a day-for-day extension.

### 3.2 Generation shortfall (Art. 4.3)

- From the second Contract Year onward (the first year is excluded), shortfall below the permitted lower limit of annual CUF attracts LD at **20% of PPA tariff per kWh of shortfall = ₹0.59/kWh**.
- Two readings exist in the document (see 7.6):
  - Floor of 15% CUF: 1,445 kWh/plant/year.
  - Declared CUF minus 15%, subject to a floor of 13.5%: 1,301 kWh/plant/year.
- Exclusions: Force Majeure; grid non-availability (needs JEE/AEE-signed outage report, and "certified by consumer" for non-availability); abnormally low GHI (below 50% of the average of two years from IMD/SRRA stations).
- The CUF measure is on "the actual output", and payments depend on remote data. A data gap can look like a generation gap.

**What to document:** monthly plant-wise generation, RMS uptime, DISCOM-signed grid outage certificates, IMD/SRRA irradiance data for the year, and the consumer's certification where grid was down.

### 3.3 Complaint penalty (Art. 4.1)

- ₹20 per consumer per week (or part) after the first 15 days, until fully rectified.
- Across 5,585 plants, a 1% open backlog (56 plants) for one month costs about ₹4,500. The risk is not size but the lack of records: DISCOMs can assert delay and you cannot rebut.

**What to document:** complaint ticket with timestamp of intimation, escalation, resolution date, consumer sign-off. Mark consumer-caused delay in the hindrance register.

### 3.4 Payment holdbacks and recoveries (Art. 9.2, 9.3)

- 20% of RESCO payment is withheld if quarterly verification is not completed and the delay is attributable to the developer.
- Excess provisional payment is recovered from later invoices and **also by adjusting the consumers' billing**.
- Quarterly true-up is not required where RS-232 integrated meter data logging is implemented. Getting this in place removes the holdback risk.
- Delays from incomplete or non-compliant invoices are excluded from the DISCOM's payment timeline. 🟠
- Meter fault: generation assessed as the **lower** of inverter data or the 12-month average of solar meter readings.
- No late-payment interest is payable by the DISCOM anywhere in the agreement (see 7.8). 🔴

### 3.5 Insurance (Art. 7)

- Mandatory cover: transit-cum-storage-cum-installation, third-party liability, theft, fire / flood / natural calamity.
- Without insurance: penalty deducted from subsidy; subsidy released only against an **Indemnity Bond of ₹1,500 per plant**; a repeat violation cancels the site's sanction.
- Insurance shortfall is Sunfeed's alone: DISCOM bears no loss that is insured or insurable, and "no under-insurance" is the SPD's responsibility (Art. 7.3).
- If a Force Majeure total loss is paid by insurers, DISCOM has a claim on proceeds up to its outstanding dues (Art. 7.2).

**Action:** hold policies and endorsements on file before work starts. Make sure cover periods match "the Project period" (see 7.14).

### 3.6 Performance Bank Guarantee (Art. 3)

- ₹1.2 Cr in 11 BGs: one of 50% (₹60 lakh) and ten of 5% (₹6 lakh each).
- 50% BG is released after commissioning of **all** allocated plants, after deducting LDs. The ten 5% BGs are released one per year of tenure, again only after all plants (including the last one) have completed the year. The last BG is released after handover procedure with DISCOMs.
- Failure to furnish or maintain the PBG is itself a breach.
- BG must be renewed yearly, at least one month before expiry, or DISCOM may encash it without reason.

**Action:** a BG register with number, bank, amount, expiry, renewal due date (expiry minus 45 days), and the owner for renewal.

### 3.7 Termination and default (Art. 12)

SPD Events of Default include:
- Failure to commence supply to Contracted Capacity by the Art. 4 deadline, or failure to continue supply and O&M after COD.
- Transfer or novation contrary to the agreement.
- Insolvency or winding up uncontested for 30 days.
- Repudiation not rectified in 30 days.
- Material breach not rectified within 30 days of the DISCOM's first notice.
- Any breach the agreement calls a material breach or default (e.g. failure to set up the Authorized Service Centre).
- A JV-related default (see below).

Process: Preliminary Default Notice, then a 90-day Consultation Period, then DISCOM may terminate on 7 days after consultation ends, with a **60-day termination notice**. Lenders can step in with DISCOM's concurrence. If lenders cannot substitute, DISCOM can terminate and acquire the assets for up to 90% of the debt due.

**JV exposure (Art. 12.3.8):** if the JV defaults, DISCOMs may (a) transfer the balance work to a non-defaulting partner and debar the defaulting one, (b) terminate and complete at both partners' risk and cost, encashing the PBG, withholding payments under **any other contract with the DISCOMs**, and recovering any differential from both partners jointly and severally, (c) blacklist both partners, (d) hold both jointly and severally liable. This applies "irrespective of which partner committed the default." 🔴

**Action:** a signed internal JV agreement with back-to-back indemnities, defined roles, and a rule that either partner can cure the other's default without losing rights. Brief Jai Auto in writing on the cross-default exposure.

### 3.8 DISCOM payment default is hard to trigger (Art. 12.2)

DISCOM default for non-payment requires 90 days after the **Due Date**, and the Due Date runs only from a hard-copy bill "duly acknowledged" by the DISCOM. If the DISCOM does not acknowledge the bill, the Due Date may never arrive. Your remedy after default is a 90-day consultation, then a further 210 days, then novation, then termination after 3 more months. That is a very long runway for you to carry costs. 🔴

**Action:** always send bills in hard copy with a stamped acknowledgment copy; follow up by email on the same day; keep proof of delivery (Art. 16.6: notices deemed delivered on receipt acknowledgment).

### 3.9 Costs that sit with Sunfeed and are easy to forget

| Cost | Clause |
|---|---|
| PSM fee ₹2,000 per installation (₹1.117 Cr for 5,585) | Art. 9.6 |
| ₹1 lakh non-refundable facilitation fee per assignment / new entity / promoter substitution | Art. 14.1 |
| Re-inspection cost if the system fails inspection | Art. 4.6 |
| Solar meter purchase, testing, calibration, renewal for 10 years | Art. 6.1 |
| Water for module cleaning | Art. 4.1 |
| NABL calibration of test instruments yearly | Art. 4.1 |
| 1% minimum spare capacity at all times, aggregated at district centres | Art. 4.1 |
| 1200 mm structure clearance for 10% of capacity at no extra cost | Art. 4.1 |
| Wiring from import-export meter to distribution board | Art. 4.1 |
| Losses and charges up to the Delivery Point | Art. 1 (Delivery Point) |
| Indemnity for third-party claims from SPD breach | Art. 13.1 |
| Inverter warranty of 10 years regardless of OEM period | Art. 9.4 |
| Monitoring services, licences, software and data to DISCOMs after handover, free for the plant's life | Art. 9.5 |

---

## 4. Conditions that protect Sunfeed (preserve and invoke these)

| # | Protection | Clause | How to use it |
|---|---|---|---|
| 4.1 🔴 | DISCOMs must collect consumer consent | Art. 4.2 | Any site without consent is a DISCOM failure. Do not accept a "SPD delay" label. |
| 4.2 🔴 | Roof access 8 AM to 6 PM guaranteed by DISCOM; alternate rooftop within one week if building is demolished | Art. 4.2 | Log refusals, locked premises, demolished buildings, and send written notices. |
| 4.3 🔴 | Consumer list given only after PPA execution | Art. 4.1 | Receipt date of the list is the earliest realistic start for survey, design and dispatch. |
| 4.4 🔴 | Day-for-day extension of SCD and Expiry Date for DISCOM default or Force Majeure | Art. 4.4.1 | Send an extension request in writing for each event, with evidence, and copy the Engineer in Charge. |
| 4.5 🟠 | DISCOM supplies and installs import-export (smart) meters within 15 days | Art. 4.1 | Track every plant that waits for a meter; it also delays COD and billing. |
| 4.6 🟠 | DISCOM does grid modifications beyond the interconnection point | Art. 4.2 | Record any site where grid upgrades block connection. |
| 4.7 🟠 | Hindrance register is formally recognised | Art. 4.1 | Maintain it, get it countersigned by the Authorized Representative, and send periodic copies to the Engineer in Charge. |
| 4.8 🔴 | A bill not disputed in 15 days is conclusive; DISCOM must pay undisputed amounts even when it disputes part | Art. 9.7 | Track the 15-day clock on every bill. Chase the undisputed portion immediately. |
| 4.9 🟠 | Payments proceed during any dispute for undisputed obligations | Art. 15.4 | Do not stop performing, and do not accept non-payment of undisputed amounts. |
| 4.10 🟠 | DISCOM Event of Default also extends deadlines | Art. 4.4 | If DISCOM is in default, SCD moves with it. |
| 4.11 🟠 | CUF LD does not apply during Force Majeure, grid outage, or low GHI | Art. 4.3 | Collect JEE/AEE outage certificates and irradiance data every year. |
| 4.12 🟠 | Consequential and indirect damages excluded both ways | Art. 13.4 | Limits claims against you for lost revenue or profit. |
| 4.13 🟠 | No recourse against directors, officers or shareholders; shareholder liability limited to Companies Act, 2013 | Art. 13.4, Art. 16.8 | Useful for JV partners and promoters. |
| 4.14 🟠 | Any provision inconsistent with the Electricity Act or regulations is deemed amended to comply | Art. 16.11 | Basis to challenge a clause that conflicts with BERC regulations. |
| 4.15 🟠 | Non-waiver: DISCOM's tolerance or delay is not a waiver, and **neither is yours** | Art. 16.3 | Reserve rights in writing when you accept late performance or partial payment. |
| 4.16 🟠 | Amendments only by written agreement | Art. 16.1 | Any DISCOM instruction changing scope without a signed amendment can be challenged. |
| 4.17 🟠 | LD acknowledged as a "genuine pre-estimate" | Art. 16.12 | This weakens a later argument that LD is a penalty, so avoid relying on that argument. |
| 4.18 🟠 | Recourse to BERC for tariff disputes; DISCOM must keep paying undisputed sums | Art. 15.3 | Use BERC as the forum for tariff-affecting issues. |
| 4.19 🟠 | Lender step-in and assignment to lenders as security are permitted | Art. 12.3.5, Art. 14.1 | Needed for financing; assignment is not permitted before COD. |
| 4.20 🟠 | Final energy accounting is by BERC order of 09.07.2026 (Case 26/2026) | Art. 9.2 | That order is part of your contract terms; keep a copy and track changes. |

---

## 5. Records Sunfeed must keep (the "so I never face an issue" checklist)

### 5.1 Contract-level file

- Signed PPA (5 copies on ₹1,000 non-judicial stamp paper, Bihar jurisdiction, in Sunfeed's name only).
- RFP / NIT 92/PR/SBPDCL/2025, all corrigenda and amendments, Letter of Award No. 415 dated 13.06.2026, SPD acceptance email dated 13.06.2026.
- BERC orders dated 10.06.2026 and 09.07.2026 in Case No. 26/2026.
- MNRE OMs referenced: 28.12.2024 (PSM and CFA for RESCO/ULA), 06.10.2025 (CFA release), 24.12.2025 (RMS / M2M data logger), 07.06.2024 (technical specifications), and sanction order of 14.01.2026.
- JV agreement with Jai Auto, board resolutions, signatory authority.
- PBG register, renewals, bank confirmations.
- Insurance policies and renewals.
- Financing agreements and lender communications (Art. 3.1).

### 5.2 Per-plant file (one folder per consumer)

| Document | Why |
|---|---|
| Consumer consent (collected by DISCOM) | Proves DISCOM met Art. 4.2 and shows the right to access |
| Site survey and design | Art. 4.1 scope |
| Dispatch instruction from DISCOM, vendor approval | Art. 4.1, Art. 5 |
| DCR declaration, module serial numbers, ALMM List-I / II proof | CFA eligibility (Art. 5) |
| PDI reports for module, inverter and solar meter | Art. 4.1 |
| Installation photos (geo-tagged) | Completion documentation (Art. 4.8) |
| Project Completion Report with Annexure-I checklist | Art. 4.8 |
| Inspection intimation (15 days before) and inspection outcome | Art. 4.8 |
| PM Surya Ghar portal submission acknowledgment | Commissioning is complete only after portal steps (Art. 4.8) |
| RMS integration confirmation and first-data date | Commissioning condition and payment basis |
| Import-export meter installation date by DISCOM | Evidence for DISCOM delay, COD, billing start |
| Commissioning certificate and COD | Start of tariff (COD is always the 1st of the next month) |
| CFA and SFA receipt dates and amounts | Reconciles Art. 9.1 timelines |
| Complaint log and closures | Art. 4.1 penalty defence |
| Hindrance register entries, countersigned | Art. 4.1, Art. 4.4 |
| Joint meter reading reports | Art. 4.1 |

### 5.3 Billing and payment file

- Monthly invoices in hard copy with DISCOM acknowledgment stamp and date.
- Generation data export from the Central Portal / RMS for each invoice.
- Quarterly true-up statements, jointly signed.
- Annual reconciliation statements.
- Penalty deductions and the basis the DISCOM gave.
- Payment ledger: invoice date, acknowledgment date, Due Date, payment date, amount deducted.
- Written objections to any deduction, sent within 15 days.

### 5.4 Operational file

- Daily generation and maintenance register (Art. 4.1).
- Panel cleaning log (every 15 days).
- Spares inventory at each district centre (1% of capacity).
- NABL calibration certificates for test instruments (yearly).
- Authorized Service Centre proof for each district: lease or ownership document, photographs, commencement date (before first commissioning).
- Toll-free line records.
- Grid outage reports signed by JEE/AEE.
- IMD / SRRA irradiance data for each year (GHI test).

### 5.5 Communications discipline

- Send every notice in writing and in English (Art. 16.7). Use the notice addresses; Art. 16.6 accepts personal delivery, registered post, fax or other duly acknowledged methods. Keep acknowledgments.
- Email is useful, but follow it with an acknowledged hard copy for anything that starts a clock.
- Fill in the blank notice addresses for SPD and DISCOMs in the agreement (Art. 16.6); the form has empty fields.
- Reserve rights in every cover letter for late performance, partial payment or extensions.
- Never agree to a verbal instruction that changes scope, sequence, quantity or timing. Confirm it by letter the same day.

---

## 6. Supplier and vendor flow-down (so that Sunfeed does not carry risk alone)

Sunfeed carries the whole PPA risk to DISCOMs. Anything you do not pass down correctly stays with you. In each work order or subcontract:

1. **LD flow-down.** The PPA LD base is the whole PBG, which is out of proportion to any single vendor. Pass down only a proportionate LD, but make sure it is enough to cover your real exposure (₹23.87 per plant per day on delay, plus the risk of capacity cut).
2. **Cut-off dates.** Give vendors lot-wise milestones earlier than the SCD, with buffer for the DISCOM's 30-day certificate issue and the one-month COD roll-over.
3. **Compliance warranties.** Vendor to warrant DCR, ALMM, BIS, IEC, and OEM declarations per lot. A single non-DCR module costs ₹33,000 of CFA per affected plant. Add an indemnity for the CFA lost.
4. **Documentation duty.** Vendor to deliver, per plant: geo-tagged photos, PCR, test reports, serial numbers, RMS pairing proof, and portal data. Payment to the vendor should depend on these documents.
5. **Hindrance reporting.** Vendors must report every hindrance within a short window (for example 24 hours) with photos, so you can countersign it in the register and claim extension.
6. **O&M obligations.** If O&M is subcontracted, mirror 15-day cleaning, 72-hour response, 15-working-day replacement, 15-day complaint resolution and the ₹20/week penalty.
7. **Warranty.** Match or exceed the PPA: panels 25 years (90% at 10 years, 80% at 25 years), inverter 10 years, system and workmanship 10 years. The 10-year inverter promise is yours even if the OEM gives less, so insist on 10 years from the OEM.
8. **Insurance.** Require vendors to hold their own cover and name Sunfeed. Your cover requirement under Art. 7 is separate.
9. **Payment security.** Tie vendor payment to CFA / SFA receipt only if you can defend it commercially. Otherwise keep a clear fixed payment term. Late vendor payment can create its own disputes.
10. **Assignment.** The PPA prohibits assignment (except to lenders) and only with mutual consent; there is a ₹1 lakh facilitation fee. Do not assign the PPA to a vendor or new entity without checking Art. 14.
11. **Handover data.** Vendors must provide the software, licences and data access that Art. 9.5 expects you to hand over free of cost at the end.
12. **Right to step in.** Keep a right to take over work and charge costs when a vendor underperforms.

---

## 7. Drafting defects, ambiguities and conflicts (clarify these in writing)

| # | Where | Issue | Why it matters to Sunfeed | Suggested ask |
|---|---|---|---|---|
| 7.1 🟡 | Art. 4.4.2 | Refers to "Article 12.5". Article 12 has no clause 12.5 in this copy; FM termination is the last clause | Unclear when FM termination is available | Confirm it is 12.5 = Termination due to Force Majeure |
| 7.2 🟡 | Art. 4.4.3 | Disputes "in accordance with Article 16" | Dispute resolution is Article 15 | Confirm Article 15 |
| 7.3 🟡 | Art. 9.7 | Cross-references "Article 10.5, 10.5.2, 10.5.4"; Article 10 is Force Majeure | Bill-dispute timeline depends on these | Confirm it means Article 9.7 |
| 7.4 🟡 | Art. 12.2.1 | Refers to "subject to Article 10.5" | Same | Same |
| 7.5 🟡 | Art. 1 (Consultation Period) | Refers to Article 13 for default notices | Should be Article 12 | Confirm |
| 7.6 🔴 | Art. 4.3 | CUF floor is stated as 15%, but the worked table says minimum generation is "declared CUF minus 15%, subject to a minimum of 13.5%". Table figures also don't reconcile (1191.36 vs 1191.61 MWh; the 13.5% column shows 1182.6 MWh, which is 100% of 13.5%, not 85%). The example is for 1 MW, not 1.1 kW | Directly affects LD exposure from year 2. The difference is 1,445 vs 1,301 kWh per plant per year | Written confirmation: floor is declared CUF minus 15%, not below 13.5%, per plant or on aggregate? |
| 7.7 🔴 | Art. 4.3 | Is shortfall measured per plant or for the whole 5,585-plant portfolio? Not stated | Per-plant measurement would create LD on weak plants even if the portfolio exceeds the floor | Ask for portfolio-level (aggregate) measurement |
| 7.8 🔴 | Art. 9 | No late-payment surcharge or interest on DISCOM delays | You finance the delay at your own cost | Seek an LPS clause, or at least reference to the BERC / Electricity Rules late-payment surcharge |
| 7.9 🔴 | Art. 1 (Due Date), Art. 12.2 | Due Date requires hard-copy receipt and "duly acknowledged"; default needs 90 more days | Payment default may never crystallise | Add deemed acknowledgment after, say, 7 days from dispatch |
| 7.10 🔴 | Art. 12.1 (JV clause) | The JV default text is cut off mid-sentence. Art. 12.3.8 relies on "12.1.1(vii)" | You cannot tell exactly what triggers the severe JV remedies | Ask for the complete clause. Narrow it to material default after notice and cure |
| 7.11 🟡 | Art. 12.1 | Contains a "Void." item and broken numbering | Cross-references to 12.1.1(vii) may not match | Reissue clean numbering |
| 7.12 🔴 | Art. 2.2, 4.1, 9.5 | After 10 years, ownership goes to **consumers**, but the O&M list says "transfer of all assets along with related warranties, insurances to **DISCOM**" | Unclear who receives warranties and who can claim; unclear post-term liability | Confirm: ownership to consumers, warranty assignment to DISCOM / consumers, and end of Sunfeed's liability on handover |
| 7.13 🟠 | Art. 9.5 | Free monitoring services, licences, software and data access for "the rest of the life of the Plant" | Open-ended cost after the contract ends | Limit to a defined period, or to access to historical data and licences already in place |
| 7.14 🟠 | Art. 7 | Insurance "during the Project period" for transit, storage and installation, but theft and calamity cover "throughout the Project period" and the O&M list implies 10 years. Cross-reference "7.15.1 to 7.15.5" is to the NIT | Scope and duration unclear | Confirm period and sums insured expected |
| 7.15 🟠 | Art. 1 (Definitions) | "Insurances" refers to Article 8; "Indemnity" and others cross-refer wrongly | Interpretation risk | Reissue corrected definitions |
| 7.16 🟡 | Art. 3.1 | "within six One Month" of LoA | Deadline is unclear (6 months or 1 month) | Confirm in writing; plan to the shorter |
| 7.17 🟠 | Art. 14 | Refers to "Article 15.1" for permitted charges (Article 15.1 is governing law) and to "Article 4.1.1" | Financing security structure unclear | Confirm what the intended articles are |
| 7.18 🟡 | Recitals | PBG states ₹1.2 Cr based on 6 MW, actual capacity 6.1435 MW | LD basis uses the rounded figure | Confirm that ₹1.2 Cr is the fixed PBG amount |
| 7.19 🟠 | Recitals | BERC order of 09.07.2026 came after LoA and acceptance (13.06.2026); energy accounting is by that order | Accepted terms were not final at LoA | Keep both orders; record that terms were accepted subject to final BERC order |
| 7.20 🟠 | Art. 4.1 | Several "(deleted)" items remain in the scope list | Scope boundaries unclear | Get a conformed copy showing final text |
| 7.21 🟠 | Art. 1 (Contract Year) | Contract Year boundaries are tied to the COD and 31 March, but COD is per lot (monthly) | CUF year and reconciliation dates become complicated | Define a single reference date for the portfolio, or lot-wise years |
| 7.22 🟠 | Art. 4.3 | Grid non-availability needs consumer certification **and** JEE / AEE authenticated report | Two certifiers needed for relief | Agree on a standard format |
| 7.23 🟠 | Art. 12.3.4 and 12.4 | After DISCOM default, DISCOM may novate to a third party only with the SPD's consent, and the SPD can terminate only after 210 days + consultation + 3 months | Long runway; no interim step-in rights for SPD | Seek a shorter timeline or suspension right |
| 7.24 🟠 | Art. 4.1 | "Failure to set up an Authorized Service Centre in each Circle lead to termination" while the text elsewhere requires one in "all the districts of each circle" | Standard unclear (circle vs district) | Confirm that a district centre is the requirement |
| 7.25 🟠 | Art. 4.1 | Penalty "based following SLA" for replacement beyond 15 days, but no SLA table is given | Penalty rate for equipment replacement is undefined | Ask for the SLA or confirm that only the ₹20/week rule applies |
| 7.26 🟠 | Art. 9.8 | The article ends with "in accordance with the provisions of Article" (reference missing) | Dispute route for reconciliation unclear | Confirm Article 15 |

---

## 8. Changes to seek (priority order)

If unsigned, ask for these before signing. If signed, ask for a written amendment under Art. 16.1, or at least a written clarification from the Chief Engineer (Projects-I, Urban) and the Engineer in Charge.

### Must-have (these affect cash or termination)

1. **Late payment surcharge** on DISCOM delays (item 7.8).
2. **Deemed acknowledgment** of bills after a fixed number of days, so the Due Date and 90-day default clock can start (item 7.9).
3. **CUF measurement at portfolio level**, and clear LD formula from year 2 (items 7.6, 7.7).
4. **Complete and proportionate JV default clause**; remove cross-default against unrelated contracts, or limit to material, uncured default after notice (items 7.10, 3.7).
5. **LD base per plant**, not the whole PBG; cap total LD at a fixed share of PBG, and no capacity cut for delays attributable to DISCOM (Art. 4.5).
6. **Clear end-of-term transfer** and a defined end to Sunfeed's liability (items 7.12, 7.13).
7. **Extension of time machinery**: automatic day-for-day extension when the DISCOM-supplied consumer list, consent, access or meter is late, with the hindrance register as the agreed proof (Art. 4.4).

### Should-have

8. Shorter DISCOM-default timeline and a suspension right for non-payment (item 7.23).
9. Substitution of non-consenting or non-viable sites within the same circle without reduction of capacity, before SCD (Art. 4.2).
10. Change-in-law / change-in-MNRE-scheme protection, given fixed tariff and no escalation (Art. 9.3).
11. Confirm that the ₹1 lakh facilitation fee does not apply to internal JV re-arrangements or lender-driven changes within agreed limits (Art. 14.1).
12. Cap on the free post-handover monitoring obligation (item 7.13).
13. Corrected cross-references and a conformed copy (items 7.1 to 7.5, 7.11, 7.15, 7.17, 7.20, 7.26).
14. Define "Project period" for insurance and the required sums insured (item 7.14).

### Nice-to-have

15. Annual rather than quarterly verification where RS-232 logging is live, with no holdback (Art. 9.2).
16. Relief from the ₹20/week penalty when the delay is due to consumer non-access, recorded in the hindrance register.
17. A standard format for grid-outage certification (item 7.22).

---

## 9. Internal controls (what Sunfeed should do operationally)

1. **Name an owner** for each of: PBG register, insurance register, compliance calendar, hindrance register, RMS uptime, billing and collections, DISCOM correspondence, JV coordination, vendor documentation.
2. **Weekly dashboard** by plant: consent, access, dispatch, installation, inspection, portal, RMS, meter, certificate, COD, CFA, SFA.
3. **Monthly sign-off** on hindrance register with the DISCOM representative.
4. **Monthly invoice cycle**: data export, invoice, hard-copy delivery with acknowledgment, email follow-up, 15-day dispute watch, 30-day payment watch.
5. **Quarterly**: joint true-up, reconciliation statement, holdback check, BG expiry review.
6. **Annual**: CUF computation per plant and portfolio, GHI test, outage certificates, insurance renewal, spare stock audit, calibration certificates.
7. **Escalation path**: Engineer in Charge (ESE), then Chief Engineer (Projects-I, Urban), then Chief Engineer (Commercial) and GM Finance, then dispute notice under Art. 15.2, then BERC.
8. **Reservation of rights** language on every letter that accepts partial performance, late payment or a revised schedule.
9. **Single source of truth** for plant status. The RMS-not-entered tracking and installation register in this repo are a starting point; extend them to track the items in section 5.2.

---

## 10. Quick clause map (clause, risk to Sunfeed, protective step)

| Clause | Risk | Protective step |
|---|---|---|
| Art. 3 PBG | Encashment; release only after all plants | BG register; renew 45 days early; commission last plants on time |
| Art. 4.1 Scope and O&M | 10-year obligations at own cost | Price O&M properly; flow down to vendors; keep logs |
| Art. 4.1 Service Centre | Termination if not set up | Open district centres before the first commissioning |
| Art. 4.1 Complaints | ₹20/consumer/week | Ticketing system with timestamps |
| Art. 4.2 DISCOM scope | Delay if DISCOM fails | Hindrance register; written notices |
| Art. 4.3 CUF | 20% of tariff on shortfall | Portfolio measurement; outage certificates; RMS uptime |
| Art. 4.4 Extension | Lost if not claimed in time | Written claim per event with evidence |
| Art. 4.5 LD | ₹23.87/plant/day; capacity cut after 3 months | Early milestones; track DISCOM-caused delay |
| Art. 4.8 Commissioning | Not complete without RMS and portal | Treat RMS and portal as part of installation |
| Art. 5 DCR / vendor approval | CFA loss | Per-lot declarations; vendor approval before dispatch |
| Art. 7 Insurance | Penalty; site cancellation; uninsured loss | Policies in place before work |
| Art. 8, 9.3 Tariff | Fixed, tax-inclusive, no escalation | Price vendors and O&M on this basis |
| Art. 9.1 CFA / SFA | Timing and documents | Complete portal data; track SFA dates |
| Art. 9.2 Billing | 20% holdback; meter fault; lower-of rule | RS-232 logging; replace meters within a month |
| Art. 9.4 Warranty | 10 and 25-year promises | Back-to-back OEM warranties |
| Art. 9.5 Handover | Free data and licences; unclear transfer | Clarify in writing |
| Art. 9.6 PSM | ₹2,000 per plant | Budget ₹1.117 Cr |
| Art. 9.7 Disputes | 15-day windows | Calendar every bill |
| Art. 10 FM | One-week notice | Notice template ready |
| Art. 12 Default | JV cross-default; blacklist | JV agreement; cure rights |
| Art. 13 Indemnity | Third-party claims | Vendor indemnities; insurance |
| Art. 14 Assignment | Consent plus ₹1 lakh fee | Plan lender and promoter changes early |
| Art. 15 Disputes | BERC and Patna High Court | Written dispute notices; keep performing |
| Art. 16 Misc | Waiver, amendment, notice rules | Written, acknowledged, English |
