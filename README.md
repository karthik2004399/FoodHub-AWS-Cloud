# FoodHub – Cloud-Based Food Ordering Application

[![AWS Serverless](https://img.shields.io/badge/AWS-Serverless-orange.svg?logo=amazon-aws)](https://aws.amazon.com/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions_OIDC-2088FF.svg?logo=github-actions)](https://github.com/features/actions)

> **Website Name:** FoodHub
> **Tagline:** *"Fresh Bites, Happy Moments."*
> **Description:** Discover delicious meals, explore exciting flavours, and enjoy convenient food ordering with FoodHub.

FoodHub is a cloud-native, full-stack food ordering platform built using **React.js (Vite)**, **Tailwind CSS**, and **Amazon Web Services (AWS)** serverless infrastructure. The platform features an end-to-end customer dining experience, role-based customer authentication, a dedicated Admin Dashboard, real-time dynamic menu and order management backed by **Amazon DynamoDB**, and automated continuous deployment via **GitHub Actions** with keyless **AWS OIDC federation**.

---

## 1. Project Architecture

```
[ End User / Mobile / Desktop Browser ]
                  |
                  v
       Amazon CloudFront (CDN)
       Distribution: E19KJACSDBYGC5
       Domain: d2i0pdn8zaqggl.cloudfront.net
                  |
                  v
       Amazon S3 (Private Static Web Bucket)
       Bucket: foodhub-karthik-2026-0927
                  |
                  v
       Amazon API Gateway (REST API: p58iopju3f)
       Region: ap-south-1 (Mumbai)
                  |
  +---------------+---------------+--------------------+---------------------+
  |               |               |                    |                     |
GET /menu     POST /orders   POST /contact       /admin/menu/*        /admin/orders/*
  |               |               |                    |                     |
FoodHubGetMenu FoodHubCreateOrder FoodHubContact  FoodHubAdminMenu    FoodHubAdminOrders
  |               |               |                    |                     |
  +-------+-------+               |                    v                     v
          |                       v             Amazon DynamoDB        Amazon DynamoDB
          v                 [Support Log]         FoodHubMenu           FoodHubOrders
   Amazon DynamoDB                               (PK: itemId)           (PK: orderId)
   - FoodHubMenu (PK: itemId)
   - FoodHubOrders (PK: orderId)
```

---

## 2. Key Features

### A. Customer Website Pages
- **Home Page:**
  - Hero carousel featuring mouth-watering food photography and rapid 30-minute delivery badges.
  - Interactive Category selector ("What are you craving?").
  - Popular Dishes showcase.
  - "Why Choose FoodHub" section and verified customer testimonials.
  - Comprehensive Footer with branding, quick links, and cloud kitchen details.
- **Dedicated Menu Page (`/menu`):**
  - Live search across dish names, ingredients, and categories.
  - Category pill filtering (All, Pizza, Burgers, Pasta, Asian, Desserts, Healthy).
  - Real-time availability badges ("In Stock" vs "Sold Out").
  - Unavailable dishes cannot be ordered.
- **About Us Page (`/about`):**
  - Our Story: Designed to make ordering delicious meals convenient and simple.
  - Our Mission, Vision, and Core Values (Quality, Customer Satisfaction, Convenience, Reliability, Freshness).
  - Highlights on transparent pricing and cloud uptime.
- **Contact Us Page (`/contact`):**
  - Contact form with client-side validation (Full Name, valid Email, 10-digit Phone, Subject, Message).
  - Submits to backend Lambda handler `POST /contact`.
  - Configurable official support channels: email (`contact@foodhub.com`), phone (`+91 98765 43210`), and kitchen address in Mumbai.
- **Customer Authentication & Route Protection:**
  - Guests can freely browse the menu catalog.
  - Clicking "Add to Cart" as a guest redirects to the Login/Register page.
  - Upon logging in, the previously clicked item is **automatically added to the cart**.
  - Protected checkout flow ensures only authenticated users can place orders.
  - Session persistence via structured local storage.

### B. Admin Dashboard (`/admin`)
- Accessible by logging in with administrator credentials (`admin@foodhub.com` or toggling the Admin tab).
- **Sidebar Navigation:** Dashboard, Manage Menu, Add Food Item, Manage Orders, Customers, Logout.
- **Dashboard Overview Metrics:**
  - Total Food Items
  - Available Items
  - Unavailable / Out of Stock Items
  - Total Orders
  - Pending Orders
  - Completed Orders
- **Admin Menu Management:**
  - Add Food Item (Name, Description, Category, Price, Image URL, Availability).
  - Edit Food Item details and server-side prices.
  - Quick Availability toggle (instantly reflects on customer menu).
  - Delete Food Item with confirmation modal dialog.
  - Search and filter inventory.
- **Admin Order Management:**
  - Live table of placed orders showing Order ID, Customer Name, Phone, Delivery Address, Items Breakdown, Subtotal, Delivery Fee, and Total.
  - Status management dropdown: `Placed` → `Confirmed` → `Preparing` → `Out for Delivery` → `Delivered` → `Cancelled`.
- **Customer Roster:**
  - Automatically compiles registered diners and lifetime spend from DynamoDB order history.

---

## 3. Technology Stack & AWS Resources

| Layer | Service / Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS | Single-page application with responsive layouts |
| **Hosting & CDN** | Amazon S3 + CloudFront | S3: `foodhub-karthik-2026-0927`<br>CloudFront: `E19KJACSDBYGC5`<br>Domain: `https://d2i0pdn8zaqggl.cloudfront.net` |
| **API Management** | Amazon API Gateway | API: `FoodHub-Order-API` (`p58iopju3f`) in region `ap-south-1` |
| **Serverless Compute** | AWS Lambda (Node.js 20+) | `FoodHubGetMenu`, `FoodHubCreateOrder`, `FoodHubAdminMenu`, `FoodHubAdminOrders`, `FoodHubContact` |
| **Database** | Amazon DynamoDB | `FoodHubOrders` (PK: `orderId` String)<br>`FoodHubMenu` (PK: `itemId` String) |
| **DevOps & CI/CD** | GitHub Actions & AWS OIDC | Passwordless role assumption: `FoodHubGitHubActionsRole` |

---

## 4. API Endpoint Specifications

### Public Endpoints
- `GET /menu`: Retrieves food dishes from `FoodHubMenu` (with fallback to default catalog).
- `POST /orders`: Validates customer details, verifies item prices and availability server-side, calculates subtotal + ₹40 delivery fee, and stores order in `FoodHubOrders`.
- `POST /contact`: Validates inquiry details and records customer support submissions.

### Administrative Endpoints (Requires `Authorization: Bearer <admin-token>`)
- `POST /admin/menu`: Adds a new food item to `FoodHubMenu`.
- `PUT /admin/menu/{itemId}`: Updates item details, price, and availability in `FoodHubMenu`.
- `DELETE /admin/menu/{itemId}`: Deletes an item from `FoodHubMenu`.
- `GET /admin/orders`: Retrieves all customer orders from `FoodHubOrders`.
- `PATCH /admin/orders/{orderId}`: Updates status (`Placed`, `Confirmed`, `Preparing`, `Out for Delivery`, `Delivered`, `Cancelled`) in `FoodHubOrders`.

---

## 5. Local Development & Testing Instructions

### 1. Install Dependencies
```powershell
npm install
```

### 2. Run Local Automated Test Suite
Executes 19 comprehensive automated tests verifying all Lambda handlers, error handling, price calculations, and admin authorization:
```powershell
npm test
```

### 3. Run ESLint Code Analysis
```powershell
npm run lint
```

### 4. Build Production Bundle
```powershell
npm run build
```

### 5. Run Local Full-Stack Server
**Terminal 1 (Backend API on port 3000):**
```powershell
node backend/server.mjs
```

**Terminal 2 (Frontend with Vite HMR):**
```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. AWS Console Deployment Guide

To deploy the new DynamoDB table, API Gateway routes, and Lambda functions in your AWS Account (`576174294043` in `ap-south-1`):

### Step 1: Create the `FoodHubMenu` DynamoDB Table
1. Open the **Amazon DynamoDB Console** in `ap-south-1`.
2. Click **Create table**.
3. **Table name:** `FoodHubMenu`
4. **Partition key:** `itemId` (Type: `String`).
5. Table settings: **Default settings** (On-demand capacity).
6. Click **Create table**.

### Step 2: Update Lambda IAM Execution Permissions
Ensure the Lambda execution role (e.g., `FoodHubCreateOrder-role-oze5rx3f`) has permission to access `FoodHubMenu`:
Attach the following inline policy statement:
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem",
    "dynamodb:DeleteItem",
    "dynamodb:Scan"
  ],
  "Resource": [
    "arn:aws:dynamodb:ap-south-1:576174294043:table/FoodHubOrders",
    "arn:aws:dynamodb:ap-south-1:576174294043:table/FoodHubMenu"
  ]
}
```

### Step 3: Deploy Backend Lambda Functions
In the **AWS Lambda Console**:
- **FoodHubGetMenu:** Upload `backend/menu.mjs` (Runtime: Node.js 20.x, Handler: `menu.handler`). Set environment variable `MENU_TABLE_NAME=FoodHubMenu`.
- **FoodHubCreateOrder:** Upload `backend/order.mjs` and `backend/menu.mjs` (Runtime: Node.js 20.x, Handler: `order.handler`).
- **FoodHubContact (Optional new Lambda):** Upload `backend/contact.mjs` (Handler: `contact.handler`).
- **FoodHubAdminAPI (Optional new Lambda):** Upload `backend/adminMenu.mjs`, `backend/adminOrders.mjs`, and `backend/authHelper.mjs`.

### Step 4: Configure API Gateway Routes & Enable CORS
In the **Amazon API Gateway Console** (`FoodHub-Order-API`: `p58iopju3f`):
1. **GET `/menu`** -> Integrate with `FoodHubGetMenu`.
2. **POST `/orders`** -> Integrate with `FoodHubCreateOrder`.
3. **POST `/contact`** -> Integrate with `FoodHubContact`.
4. **`/admin/menu` & `/admin/orders`** -> Integrate with `FoodHubAdminAPI`.
5. For each route, click **Enable CORS** (Allow Origin: `*`, Allow Headers: `Content-Type,Authorization`).
6. Click **Deploy API** to deployment stage.

### Step 5: Frontend Deployment to CloudFront/S3
Push your commits to branch `main` on GitHub:
```powershell
git add .
git commit -m "Upgrade FoodHub to complete cloud food ordering platform"
git push origin main
```
The GitHub Actions workflow will automatically run `npm run lint`, compile production assets with `npm run build`, synchronize files to S3 bucket `foodhub-karthik-2026-0927`, and invalidate CloudFront distribution `E19KJACSDBYGC5`.

---

## 7. Developer & Academic Credentials
- **Student Name:** Karthik Siri
- **Degree:** B.Tech in Computer Science & Engineering (Cloud Computing & DevOps)
- **Project Title:** FoodHub – Cloud-Based Food Ordering Application
- **Repository:** [https://github.com/karthik2004399/FoodHub-AWS-Cloud](https://github.com/karthik2004399/FoodHub-AWS-Cloud)
