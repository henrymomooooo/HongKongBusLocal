# 🚌 HK Bus Arrival Dashboard

A self-contained, high-performance local dashboard for Hong Kong bus arrivals. Directly connects to official Open Data APIs to provide real-time ETAs for KMB, Citybus, and NLB.

---

## ✨ Features

- **Multi-Operator Support**: Real-time data from **KMB/LWB**, **Citybus**, and **New Lantao Bus (NLB)**.
- **Instant Search**: Unified alphanumeric search across all operators (e.g., find "101" from both KMB and CTB simultaneously).
- **Expandable ETAs**: Click any station in a route list to reveal an inline drawer with the next 3 arrival countdowns.
- **Smart Favorites**: Save your frequent stops with persistent storage and automatic route path tracking.
- **Live Countdowns**: All arrival times are displayed in "minutes remaining" and auto-refresh every 30-60 seconds.
- **Flash Cache**: In-memory caching provides instant UI updates while fresh data fetches in the background.
- **Offline-First Routing**: Route lists are cached locally using IndexedDB for near-instant startup.

---

## 🚀 How to Use

This project is designed for maximum portability and ease of use. No installation or web server is required.

1.  **Clone or Download** this repository to your local machine.
2.  Locate the `index.html` file.
3.  **Double-click `index.html`** to open it in any modern web browser (Chrome, Edge, Safari, or Firefox).
4.  **Search** for a route (e.g., "1A", "962X", or "3M").
5.  **Select a direction** and browse the station list.
6.  **Click a station** to see live ETAs, or click the **Star Icon** to add it to your home screen favorites.

> [!TIP]
> The application stores your favorites and route cache in your browser's **IndexedDB**. Your data stays private on your machine and persists even after you close the browser.

---

## 🛠️ Technology Stack

Built with a focus on simplicity, speed, and zero dependencies:

- **HTML5 & CSS3**: Responsive Vanilla CSS layout with high-contrast, company-specific color themes.
- **Vanilla JavaScript (ES6+)**: Pure JS logic for API orchestration and DOM manipulation (no frameworks required).
- **IndexedDB API**: High-capacity local storage for route caching and user favorites.
- **Fetch API**: Direct browser-to-server communication with government and operator Open Data portals.
- **FontAwesome**: Scalable vector icons for a modern UI.

---

## 📡 APIs Integrated

This dashboard directly consumes official Hong Kong transport data:
- [DATA.GOV.HK](https://data.gov.hk/) (Consolidated Transport APIs)
- [KMB Open Data](https://data.etabus.gov.hk/)
- [Citybus Real-time ETA](https://www.citybus.com.hk/)
- [New Lantao Bus API](https://www.nlb.com.hk/)
