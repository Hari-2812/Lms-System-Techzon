# Deployment Guide - Techzon LMS System

Follow these steps to deploy the Techzon LMS System in a production environment.

---

## 1. Database Setup: MongoDB Atlas
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database cluster.
3. Under **Database Access**, create a user with read/write credentials.
4. Under **Network Access**, whitelist `0.0.0.0/0` (or add target server IPs).
5. Copy the connection URI connection string:
   `mongodb+srv://<username>:<password>@cluster0.mongodb.net/techzon-lms`

---

## 2. Media Library Setup: Cloudinary
1. Sign in to [Cloudinary](https://cloudinary.com).
2. Note your Cloud Name, API Key, and API Secret from the Dashboard.
3. Configure folders to support student attachments and course video streams.

---

## 3. Backend Deployment: Render
1. Sign in to [Render](https://render.com).
2. Create a new **Web Service** and link your Git repository.
3. Set the following build configurations:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/server.js`
4. Set the following environment variables in Render's configuration:
   - `PORT`: `5000`
   - `MONGODB_URI`: `<Your MongoDB Connection URI>`
   - `JWT_SECRET`: `<Secure Random String>`
   - `JWT_REFRESH_SECRET`: `<Secure Random String>`
   - `JWT_EXPIRE`: `15m`
   - `JWT_REFRESH_EXPIRE`: `7d`
   - `RAZORPAY_KEY_ID`: `<Your Razorpay Key ID>`
   - `RAZORPAY_KEY_SECRET`: `<Your Razorpay Key Secret>`
   - `RAZORPAY_WEBHOOK_SECRET`: `<Your Razorpay Webhook Secret>`
   - `CLOUDINARY_CLOUD_NAME`: `<Your Cloudinary Name>`
   - `CLOUDINARY_API_KEY`: `<Your API Key>`
   - `CLOUDINARY_API_SECRET`: `<Your API Secret>`
   - `SMTP_HOST`: `<Your SMTP Host>`
   - `SMTP_PORT`: `<Your SMTP Port>`
   - `SMTP_USER`: `<Your SMTP User>`
   - `SMTP_PASS`: `<Your SMTP Password>`
   - `SMTP_FROM`: `noreply@techzonwide.com`
   - `FRONTEND_URL`: `https://your-app-vercel.vercel.app`
   - `NODE_ENV`: `production`

---

## 4. Frontend Deployment: Vercel
1. Sign in to [Vercel](https://vercel.com).
2. Create a **New Project** and link your Git repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
4. Set the following environment variables in Vercel's settings:
   - `VITE_API_URL`: `https://your-backend-render.onrender.com/api/v1`
5. Click **Deploy**. Vercel will build and host your frontend assets.

---

## 5. Webhook Integration: Razorpay Dashboard
1. Sign in to your [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Go to **Settings** > **Webhooks** > **Add New Webhook**.
3. Set the Webhook details:
   - **URL**: `https://your-backend-render.onrender.com/api/v1/payments/webhook`
   - **Secret**: `<Your Webhook Secret matching RAZORPAY_WEBHOOK_SECRET>`
   - **Active Events**: Check `payment.captured`
4. Save the Webhook.
