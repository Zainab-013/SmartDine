<div align="center">

# 🍽️ SmartDine

### AI-Powered Restaurant Management System

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)

*Empowering restaurants with intelligent insights, AI-driven forecasting, and seamless operations — all in one platform.*

[🚀 Live Demo](#-live-demo) • [✨ Features](#-features) • [🛠️ Tech Stack](#️-tech-stack) • [📡 API Reference](#-api-reference) • [☁️ Deployment](#️-deployment)

---

</div>

## 📌 About SmartDine

**SmartDine** is a full-stack, AI-powered restaurant management platform built to help restaurant owners take control of their operations. From real-time dashboards and inventory tracking to machine-learning-based demand forecasting and smart dish recommendations — SmartDine brings the power of data science to your dining table.

> Built with **React + Vite** on the frontend, **Flask + SQLAlchemy** on the backend, **PostgreSQL** as the database, and **scikit-learn** for AI/ML models.

---

## ❗ Problem Statement

Restaurant owners — especially small and medium-sized businesses — face critical day-to-day challenges:

- 📉 **No visibility** into sales trends or peak demand periods
- 🗑️ **Food waste** due to over-purchasing and poor inventory tracking
- 📋 **Manual billing** errors and slow order management
- 🤷 **No data-driven decisions** — menus are managed by guesswork, not insights
- 💸 **Profit leakage** from untracked expenses and unoptimized pricing
- 🔔 **No real-time alerts** when ingredients run out mid-service

There is a clear need for an **affordable, all-in-one intelligent platform** that gives restaurant owners the tools that were previously only available to large restaurant chains.

---

## ✅ My Solution

**SmartDine** solves all of the above by providing:

| Problem | SmartDine Solution |
|---------|-------------------|
| No sales visibility | Real-time **Dashboard** with KPIs and trend charts |
| Food waste | **Inventory Management** with auto-deduction on orders |
| Manual billing errors | Digital **Billing & Sales** with order tracking |
| Guesswork-based menus | **AI Recommendations** powered by sales pattern analysis |
| Unknown future demand | **ML-based Forecasting** using historical sales data |
| No stock alerts | **Low Stock Notifications** with automatic threshold triggers |
| Surplus food waste | **Food Donation** module to manage NGO contributions |
| No profit tracking | **Profit & Loss Reports** with visual expense vs revenue charts |

SmartDine is designed to be **simple enough for any restaurant owner** to use without technical knowledge, yet **powerful enough** to deliver enterprise-grade intelligence.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 📊 **Dashboard** | Real-time KPIs — revenue, orders, top dishes, and trends |
| 🍕 **Menu & Recipes** | Add, edit, delete dishes with images and ingredient mapping |
| 📦 **Inventory Management** | Track stock levels with automatic deduction on orders |
| 🔔 **Low Stock Alerts** | Automatic notifications when stock falls below threshold |
| 🧾 **Billing & Sales** | Create orders, generate bills, track payment status |
| 🤖 **AI Forecasting** | ML-based demand prediction using historical sales data |
| 📈 **Profit & Loss** | Visual charts of revenue vs. expenses over time |
| 💡 **AI Recommendations** | Smart dish suggestions based on sales trends & patterns |
| 🌱 **Food Donation** | Manage surplus food donations to NGOs |
| 📋 **Reports** | Exportable sales and inventory reports |
| 👤 **Profile & Settings** | Restaurant profile and account management |
| 🔐 **JWT Authentication** | Secure login/register with token-based auth |

---

## 🛠️ Tech Stack

### Frontend
- **[React 19](https://react.dev/)** — UI library
- **[Vite 6](https://vitejs.dev/)** — lightning-fast build tool
- **[Tailwind CSS 4](https://tailwindcss.com/)** — utility-first styling
- **[React Router DOM v7](https://reactrouter.com/)** — client-side routing
- **[Recharts](https://recharts.org/)** — beautiful data visualizations
- **[Lucide React](https://lucide.dev/)** — icon library
- **[Sonner](https://sonner.emilkowal.ski/)** — toast notifications

### Backend
- **[Flask 3.1](https://flask.palletsprojects.com/)** — Python web framework
- **[SQLAlchemy 2.0](https://www.sqlalchemy.org/)** — ORM for database operations
- **[PyJWT](https://pyjwt.readthedocs.io/)** — JSON Web Token authentication
- **[Flask-CORS](https://flask-cors.readthedocs.io/)** — Cross-Origin Resource Sharing
- **[scikit-learn](https://scikit-learn.org/)** — machine learning models
- **[pandas](https://pandas.pydata.org/)** + **[NumPy](https://numpy.org/)** — data processing
- **[Gunicorn](https://gunicorn.org/)** — production WSGI server

### Database & Cloud
- **[PostgreSQL 18](https://www.postgresql.org/)** — relational database
- **[Neon](https://neon.tech/)** — serverless cloud PostgreSQL
- **[Render](https://render.com/)** — backend hosting
- **[Vercel](https://vercel.com/)** — frontend hosting

---

## 📁 Project Structure

```
SmartDine/
├── backend/
│   ├── app.py                    # Flask app entry point & blueprint registration
│   ├── database.py               # SQLAlchemy DB initialization
│   ├── models.py                 # All database models/tables
│   ├── auth_middleware.py        # JWT authentication decorator
│   ├── ml_model.py               # AI forecasting & ML logic
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment variable template
│   └── routes/
│       ├── auth_routes.py        # /api/auth/*
│       ├── dish_routes.py        # /api/dishes/*
│       ├── inventory_routes.py   # /api/inventory/*
│       ├── order_routes.py       # /api/orders/*
│       ├── donation_routes.py    # /api/ngo-donations/*
│       ├── recommendation_routes.py
│       ├── profile_routes.py
│       ├── report_routes.py
│       ├── dashboard_routes.py
│       └── notification_routes.py
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── tailwind.config.js
    └── src/
        ├── App.jsx               # Root component with auth & routing
        ├── api.js                # Fetch wrapper with JWT injection
        ├── main.jsx
        ├── components/
        │   ├── AuthLayout.jsx
        │   └── DashboardLayout.jsx
        └── pages/
            ├── Dashboard.jsx
            ├── MenuPage.jsx
            ├── InventoryPage.jsx
            ├── BillingPage.jsx
            ├── forecasting.jsx
            ├── ProfitLossPage.jsx
            ├── RecommendationPage.jsx
            ├── AlertPage.jsx
            ├── DonationPage.jsx
            ├── ReportPage.jsx
            ├── ProfilePage.jsx
            ├── SettingsPage.jsx
            └── auth/AuthPages.jsx
```

---

## ☁️ Deployment

SmartDine uses a 3-tier cloud deployment — all on **free plans**:

```
User Browser
     │
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│   Render    │────▶│    Neon     │
│  (Frontend) │     │  (Backend)  │     │  (Database) │
│  React/Vite │     │ Flask/Python│     │ PostgreSQL  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Deploy Database → [Neon](https://neon.tech)
1. Create a free project on Neon
2. Copy the connection string
3. Import your local DB: `pg_dump` → `psql`

### Deploy Backend → [Render](https://render.com)
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn app:app`
- Add all environment variables including `DATABASE_URL` from Neon

### Deploy Frontend → [Vercel](https://vercel.com)
- **Root Directory:** `frontend`
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- Set `VITE_API_BASE_URL` to your Render backend URL

### Prevent Cold Starts → [UptimeRobot](https://uptimerobot.com)
Render's free plan sleeps after 15 mins of inactivity.
Use UptimeRobot to ping your backend every 5 minutes — keeps it awake 24/7 for free!

---

## 🤖 AI & ML Features

SmartDine's intelligence layer is powered by **scikit-learn**:

- **Demand Forecasting** — Predicts future dish demand based on historical `sales_records` using time-series regression models
- **Smart Recommendations** — Analyzes sales patterns to suggest which dishes to promote, based on performance trends
- **Inventory Optimization** — Automatically flags items below threshold and suggests reorder quantities

---

## 🔒 Security

- Passwords are hashed using **Werkzeug's** secure hashing
- All API routes protected with **JWT Bearer tokens**
- Tokens validated on every request via `auth_middleware.py`
- Auto-logout on expired/invalid tokens (frontend detects 401 responses)
- Environment variables for all sensitive credentials (never hardcoded)

---

## 📜 License

This project is for academic and demonstration purposes.

---

<div align="center">

**Built with ❤️ by [Zainab](https://github.com/Zainab-013)**

⭐ Star this repo if you found it helpful!

</div>
