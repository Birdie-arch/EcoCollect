# EcoCollect — Smart Metropolitan E-Waste Collection Platform

> **A modern, responsive circular-economy web application connecting citizens, green fleet collection agents, and municipal recycling hubs.**

EcoCollect tackles the urgent urban crisis of electronic waste disposal in metropolitan cities. Informal discarding of circuit boards, cathode displays, and lithium batteries contaminates urban groundwater, pollutes air with toxic fumes, and loses metric tons of precious rare-earth metals (gold, copper, lithium, neodymium). 

EcoCollect provides an end-to-end digital lifecycle: from smart doorstep request scheduling with an AI classification helper, to dynamic collector assignment, real-time GPS telemetry tracking, calibrated digital scale verification, two-way accountability ratings, and municipal sustainability analytics.

---

## 1. Project Overview

- **Citizen / Household Portal:** Easy 4-step doorstep collection scheduling, category picker, AI image classifier prototype, interactive map location pinpointing, live tracking, eco rewards catalog, and ratings.
- **Collector Field Operations Portal:** Live availability switcher (`AVAILABLE`, `BUSY`, `OFFLINE`), turn-by-turn route directions, digital scale verification with photographic proof logging, and citizen evaluation.
- **Admin Municipal Control Center:** High-level executive KPIs, 5 Chart.js dynamic visualisations, fleet load monitoring, user ledger management, multi-criteria request filtering, and metropolitan recycling facilities topology.

---

## 2. Key Features

1. **Retro-Modern Botanical & Warm Paper Aesthetic:**
   - Inspired by contemporary warm-paper editorial design, soft sage green badges, deep forest typography, rounded pill containers, and signature lavender action accents.
2. **AI E-Waste Image Classification (Prototype Engine):**
   - Drag-and-drop or 1-click test electronics with simulated computer vision inference (`EcoVision v2.4`).
   - Automatically identifies hardware category, casing condition, toxic components (e.g. Lithium-Ion, Mercury), and recommended handling protocol.
3. **Smart Collector Assignment Algorithm:**
   - Multi-factor scoring model that dynamically matches the best available collector based on category compatibility, haversine distance, workload queue, rating score, and live status.
4. **Live Turn-by-Turn Tracking & Telemetry Simulation:**
   - 7-step visual status stepper (`REQUESTED` ➔ `ASSIGNED` ➔ `ACCEPTED` ➔ `ON_THE_WAY` ➔ `ARRIVED` ➔ `COLLECTED` ➔ `COMPLETED`).
   - Leaflet.js + OpenStreetMap integration showing user doorstep, collector vehicle, and recycling plant with animated GPS movement simulation.
5. **Two-Way Rating & Accountability Ecosystem:**
   - Citizens rate collectors across 4 dimensions: *Punctuality*, *Professionalism*, *Communication*, and *Collection Process*, alongside written feedback.
   - Collectors rate citizens on *Readiness*, *Communication*, and *Scale Cooperation*.
6. **Eco Points & Carbon Offset Economy:**
   - Dynamic algorithms calculate CO₂ averted, equivalent trees saved, and landfill toxic volume avoided.
   - Interactive rewards store to redeem points for mobility vouchers, grocery discounts, or native tree planting certificates.
7. **City Administration Analytics:**
   - 5 dynamic Chart.js charts: Monthly trends, stream composition, status distribution, collector efficiency, and regional zone density.
8. **1-Click Prototype Demo Bar:**
   - Persistent quick-switcher ribbon at the top of every screen allows instant switching between Citizen, Collector, and Administrator roles with 1 click.

---

## 3. Technology Stack

- **HTML5:** Semantic architecture, accessible forms, audio/video readiness.
- **CSS3:** Custom design system, CSS Grid, Flexbox, CSS variables, glassmorphism, responsive breakpoints (`mobile`, `tablet`, `desktop`).
- **Vanilla JavaScript (ES6+):** Pure modular JavaScript without heavyweight frontend framework dependencies (No React, Angular, or Vue).
- **Chart.js (v4.4+):** Smooth vector charts, area fills, and doughnut breakdown.
- **Leaflet.js & OpenStreetMap:** Free, open-source cartography, custom SVG pin markers, interactive location picker, and polyline route mapping.
- **Font Awesome 6:** Vector iconography for categories, statuses, and dashboard metrics.
- **HTML5 LocalStorage:** Client-side persistent data store with CRUD abstraction layer and initial seed dataset.

---

## 4. Folder Structure

```
EcoCollect/
│
├── index.html                   # High-impact landing page
├── login.html                   # Authentication with 1-click demo autofill
├── register.html                # Citizen & Collector registration wizard
│
├── user/                        # Citizen / Household Portal
│   ├── dashboard.html           # Welcome card, stats, active request highlight, recent requests
│   ├── request.html             # 4-step pickup wizard, AI classifier, map picker
│   ├── requests.html            # All requests ledger with status filters
│   ├── tracking.html            # 7-step progress stepper & animated vehicle telemetry
│   ├── rating.html              # Multi-criteria 5-star rating & review submission
│   ├── rewards.html             # Eco points balance, carbon offset, coupon claims
│   └── profile.html             # Citizen address and zone management
│
├── collector/                   # Field Operator Fleet Portal
│   ├── dashboard.html           # Availability toggle, active queue, completion metrics
│   ├── requests.html            # Assigned pickup requests list & filters
│   ├── pickup.html              # Turn-by-turn map, scale calibration, proof photo, 2-way rating
│   └── profile.html             # Fleet vehicle credentials & licensed streams
│
├── admin/                       # Municipal Control Center
│   ├── dashboard.html           # Executive KPIs, 5 Chart.js visualisations, activity feed
│   ├── users.html               # User directory, role filters, account deletion
│   ├── collectors.html          # Fleet management, status override, workload inspection
│   ├── requests.html            # City-wide ledger with multi-filters and reassign modal
│   ├── analytics.html           # In-depth municipal environmental yield reports
│   └── recycling-centers.html   # 10 recycling hubs directory & metropolitan map
│
├── css/                         # Cleanly Organized Design System
│   ├── style.css                # Variables, typography, buttons, badges, modals, toasts
│   ├── auth.css                 # Split-screen auth layout & botanical brand panel
│   ├── dashboard.css            # Sidebar, top-bar, stats cards, active request highlights
│   ├── forms.css                # Multi-step stepper, category grid, AI classifier box
│   ├── tables.css               # Responsive tables, filters, search bars, empty states
│   └── responsive.css           # Mobile & tablet media queries
│
├── js/                          # Modular Application Engines
│   ├── storage.js               # Central localStorage CRUD, seed data generator, Haversine formula
│   ├── auth.js                  # Login/registration, role route guard, demo switcher ribbon
│   ├── app.js                   # Toast notifications, modal helpers, notification dropdown
│   ├── ai-classification.js     # Prototype AI computer vision inference & auto-fill handoff
│   ├── map.js                   # Leaflet map engine, draggable pin, polyline route animator
│   ├── request.js               # Multi-step intake wizard, smart collector assignment
│   ├── tracking.js              # Live telemetry updates & vehicle motion simulator
│   ├── rating.js                # Two-way rating calculation & dynamic average updater
│   ├── rewards.js               # Environmental algorithms, points balance, voucher redeemer
│   ├── user.js                  # Citizen dashboard statistics & table renderers
│   ├── collector.js             # Collector availability, scale verification, field run actions
│   ├── analytics.js             # Chart.js initialization & dynamic data aggregation
│   └── admin.js                 # Admin management, filters, and recycling center map
│
├── assets/
│   ├── images/
│   └── icons/
│
└── README.md                    # Project documentation & integration guide
```

---

## 5. How to Run the Project

No build step, compiler, or npm installation is required.

1. **Option A (Direct File Execution):**
   - Double-click or open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Firefox, Safari).

2. **Option B (Local Web Server - Recommended):**
   - Run via Python:
     ```bash
     cd C:\Users\Welcome\.gemini\antigravity\scratch\EcoCollect
     python -m http.server 8000
     ```
   - Run via Node.js `npx serve`:
     ```bash
     npx serve .
     ```
   - Open your browser to `http://localhost:8000`.

---

## 6. Prototype Demo Credentials

The platform is pre-loaded with realistic metropolitan sample records (20 citizens, 10 collectors, 52 requests, 32 ratings, 10 recycling centers). Use the following accounts to sign in:

| Role | Email | Password | Target Dashboard |
| :--- | :--- | :--- | :--- |
| **Citizen / User** | `user@ecocollect.demo` | `demo123` | `user/dashboard.html` |
| **Collector** | `collector@ecocollect.demo` | `demo123` | `collector/dashboard.html` |
| **City Admin** | `admin@ecocollect.demo` | `demo123` | `admin/dashboard.html` |

> **Pro-Tip:** The demo bar pinned at the top of every page features 1-click quick-switch buttons (*Citizen*, *Collector*, *Admin*) to test role interactions in seconds without logging out manually.

---

## 7. How the Smart Collector Assignment Works

When a citizen confirms a collection request, the engine does **not** rely on hard-coded assignments. Instead, `findBestCollector()` evaluates all active fleet operators using a multi-factor ranking model:

$$\text{CollectorScore} = S_{\text{Category}} + S_{\text{Distance}} + S_{\text{Rating}} + S_{\text{Workload}} + S_{\text{Availability}}$$

- **Waste Category Compatibility ($S_{\text{Category}}$, 35 pts):** Checks whether the collector's fleet vehicle (e.g. E-Cargo Bike vs Heavy EV Truck) supports the specific hardware stream (e.g., small mobile phones vs large refrigerators).
- **Proximity / Distance ($S_{\text{Distance}}$, up to 25 pts):** Calculated via the Haversine formula based on the citizen's GPS coordinates and the collector's current coordinates:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
  Points decrease as distance in kilometers increases.
- **Operator Rating ($S_{\text{Rating}}$, up to 20 pts):** Scaled from the collector's historical average customer rating ($\frac{\text{Rating}}{5.0} \times 20$).
- **Active Workload Queue ($S_{\text{Workload}}$, up to 15 pts):** Collectors with lower active workloads are prioritized to balance fleet dispatch across the city.
- **Availability Modifier ($S_{\text{Availability}}$):** `AVAILABLE` (+10 pts), `BUSY` (-15 pts), `OFFLINE` (excluded from assignment).

The highest-scoring collector is assigned, their workload is incremented, and automated push notifications are generated for both parties.

---

## 8. How the Rating System Works

EcoCollect implements a **Two-Way Balanced Rating Ecosystem**:

1. **Citizen ➔ Collector Rating:**
   - **Overall Rating:** 1 to 5 stars.
   - **4 Dimension Criteria:**
     - *Pickup Punctuality* (arrival within designated window).
     - *Collector Professionalism* (uniform, demeanor).
     - *Communication* (advance call/SMS updates).
     - *Collection Process* (digital scale weighing, safe packing).
   - **Written Comments:** Persisted in `ecocollect_ratings`.
   - **Dynamic Recalculation:** Collector's overall rating is recalculated in real time:
     $$\text{NewRating} = \frac{(\text{CurrentRating} \times N) + \text{NewScore}}{N + 1}$$
2. **Collector ➔ Citizen Rating:**
   - After scale calibration, collectors evaluate citizen readiness:
     - *Pickup Readiness* (items disconnected and packaged at door).
     - *Access & Communication* (gate passcodes, elevator clearance).
     - *Cooperation with Weighing*.

---

## 9. How Analytics Are Calculated

All dashboard metrics and Chart.js graphs are calculated dynamically from localStorage datasets:

1. **Total E-Waste Weight Collected:** Sum of all `actualWeight` measurements (fallback to `estimatedWeight`) for requests with status `COLLECTED` or `COMPLETED`.
2. **CO₂ Emissions Prevented:** Evaluated at $1.44\text{ kg CO}_2$ averted per kilogram of electronic waste diverted from landfill incineration.
3. **Tree Absorption Equivalent:** Calculated using an annual absorption benchmark of $22\text{ kg CO}_2$ per native urban tree.
4. **Toxic Heavy Metals Diverted:** Estimated at $0.08\text{ kg}$ per kilogram of mixed e-waste (lead solder, mercury backlights, cadmium capacitors).
5. **Chart Visualizations:**
   - *Monthly Trend:* 6-month historical intake aggregating weights.
   - *Stream Composition:* Frequency count across 13 hardware categories.
   - *Status Funnel:* Live count of requests by lifecycle state.
   - *Collector Efficiency:* Correlation of completed pickups and rating.
   - *City Zone Distribution:* Aggregated volume in kg across North, South, East, West, and Central zones.

---

## 10. Future Backend & AI Model Integration Guide

EcoCollect is architected so that full-stack engineers can connect a production backend and machine learning pipeline without rewriting the UI or frontend logic.

### A. Replacing LocalStorage with a REST/GraphQL API

The file `js/storage.js` cleanly abstracts all data operations into standard CRUD signatures:
```javascript
// Replace local functions with async fetch calls:
async function getData(endpoint) {
  const response = await fetch(`/api/v1/${endpoint}`, { credentials: 'include' });
  return await response.json();
}

async function updateData(endpoint, id, payload) {
  const response = await fetch(`/api/v1/${endpoint}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await response.json();
}
```

### B. Connecting a Production AI Model (TensorFlow / Vision API)

The module `js/ai-classification.js` exposes a single entrypoint `classifyEwasteImage(file)`:
```javascript
// Swap the simulated prototype with a production Vision endpoint:
async function classifyEwasteImage(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch('https://api.ecocollect.city/v1/ai/classify', {
    method: 'POST',
    body: formData
  });

  return await response.json(); // returns detectedObject, confidence, hazardousComponent, etc.
}
```

---

## 11. Security Notice for Production Deployment

> **IMPORTANT SECURITY NOTE:**  
> This prototype uses browser `localStorage` and simulated authentication for demonstration purposes. **For production deployment, authentication and authorization must be implemented using a secure backend, HTTPS, hashed passwords (e.g. bcrypt/Argon2), secure sessions/JWT, and a proper relational database (e.g. PostgreSQL) with strict role-based access control (RBAC).**

---

&copy; 2026 EcoCollect Metropolitan Platform. Designed for clean, circular, and sustainable cities.

