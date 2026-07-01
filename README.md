# Techzon LMS System

An enterprise-grade, secure, and production-ready **Private Learning Management System (LMS)** built for **Techzon Wide**.

---

## Architecture & Integration Flow

This is a **private LMS** system. There is no public registration API or signup page. Access is dynamically provisioned via payment events.

```
Student purchases Course on primary site 
  ↓
Razorpay processes payment
  ↓
Razorpay triggers webhook event (payment.captured)
  ↓
LMS API captures Webhook & verifies HMAC signature
  ↓
Automatically creates Student account & Enrollment
  ↓
Generates welcome email with access details & temp credentials
  ↓
Student signs in and gains course portal access
```

---

## Folder Directory Structure

```
d:/project/Lms-System-Techzone/
├── backend/                  # Node.js + Express + TypeScript
│   ├── config/              # Winston log and MongoDB Atlas connectors
│   ├── controllers/         # Webhook capture, OTP, Grades, and Certificates logic
│   ├── models/              # Mongoose DB Schemas
│   ├── middleware/          # JWT checks and dynamic plan access validations
│   ├── services/            # Nodemailer transport integrations
│   ├── routes/              # Mounted paths
│   └── jobs/                # Daily cron deactivators for expired plans
└── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS
    ├── src/
    │   ├── layouts/         # Collapsible responsive drawers
    │   ├── redux/           # Auth credentials state slices
    │   ├── routes/          # Role guard routes
    │   ├── utils/           # Axios interceptors with automatic session renewal
    │   └── pages/           # Admin, Mentor, and Student dashboards
```

---

## Local Development Guide

### Prerequisites
- Node.js (v18+)
- MongoDB connection string (or local docker container)

### Step 1: Run Backend
1. Go to `backend/` folder:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env` and fill details.
3. Install modules:
   ```bash
   npm install
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```

### Step 2: Run Frontend
1. Go to `frontend/` folder:
   ```bash
   cd ../frontend
   ```
2. Install modules:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```

---

## Production Deployment

### Frontend (Vercel)
Set these env variables:
- `VITE_API_URL`: `https://your-backend-render.onrender.com/api/v1`

### Backend (Render / Docker)
Set these env variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_USER` / `SMTP_PASS`
