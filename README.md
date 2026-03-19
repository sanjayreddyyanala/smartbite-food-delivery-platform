# SmartBite Food Delivery Platform

**Live Demo**: [https://smartbite-eight.vercel.app/](https://smartbite-eight.vercel.app/)

SmartBite is a comprehensive, multi-role food delivery platform designed to connect customers, restaurants, delivery partners, NGOs, and administrators in a seamless, real-time ecosystem.

## 🚀 Key Features

*   **Multi-Role System**: Dedicated interfaces and workflows for Customers, Restaurants, Delivery Partners, NGOs, and Admins.
*   **Real-time Capabilities**: Live order tracking, notifications, group cart synchronization, and delivery partner location updates powered by Socket.IO.
*   **Group Orders**: Collaborate on orders with friends using a unique invite code. Features a live shared cart, readiness checks, host controls, and locked/unlocked group permissions.
*   **NGO Food Reclamation**: Restaurants can post leftover food, and NGOs can claim and pick it up via a secure OTP-based verification flow, helping to reduce food waste.
*   **Payment Integrations**: Supports both Cash on Delivery (COD) and online payments seamlessly through Razorpay.
*   **Intelligent Recommendations**: Daily automated cron jobs to recompute customer preferences and trending food items.
*   **Secure & Robust**: OTP-verified deliveries and pickups, JWT-based authentication, password reset flows, and automated idle delivery partner revocation.

## 🛠️ Tech Stack

**Frontend**
*   **Framework**: React.js with Vite
*   **State Management**: Zustand
*   **Styling**: Tailwind CSS
*   **Routing**: React Router
*   **Maps**: Google Maps API (`@react-google-maps/api`)
*   **Real-time**: Socket.IO Client HTTP
*   **HTTP Client**: Axios

**Backend**
*   **Runtime/Framework**: Node.js & Express (ES Modules)
*   **Database**: MongoDB with Mongoose
*   **Authentication**: JSON Web Tokens (JWT) & bcryptjs
*   **File Uploads**: Multer & Cloudinary
*   **Real-time Engine**: Socket.IO
*   **Payments**: Razorpay
*   **Emailing**: Nodemailer
*   **Task Scheduling**: node-cron

## 👥 User Roles & Permissions

1.  **Customer**: Browse restaurants, place individual or group orders, track deliveries live, leave reviews, and manage profile/addresses. Auto-approved on registration.
2.  **Restaurant**: Manage food menu and categories, receive and accept orders, post leftover food, and view earnings. Requires Admin approval.
3.  **Delivery Partner**: Toggle availability, receive order assignments based on location, navigate to destinations, and verify pickups/deliveries via OTP. Requires Admin approval.
4.  **NGO**: Claim available leftover food posted by restaurants and complete the pickup process. Requires Admin approval.
5.  **Admin**: Manage users, approve pending restaurants/delivery partners/NGOs, oversee live orders, handle cancellations, and monitor platform health.

## ⚙️ Local Development Setup

### Prerequisites

*   Node.js (v18+ recommended)
*   MongoDB instance (local or Atlas)
*   Cloudinary account
*   Razorpay account
*   Google Maps API Key

### Environment Variables

You will need to set up `.env` files in both the `frontend` and `backend` directories.

**Backend (`backend/.env`)**
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
EMAIL_HOST=your_smtp_host
EMAIL_PORT=your_smtp_port
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NODE_ENV=development
```

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

### Running the App

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd smartbite-food-delivery-platform
    ```

2.  **Start the Backend:**
    ```bash
    cd backend
    npm install
    npm run dev
    ```

3.  **Start the Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

The frontend will be accessible at `http://localhost:5173` and the backend will run at `http://localhost:5000`.

## 📁 Project Structure

```text
smartbite-food-delivery-platform/
├── backend/               # Express API and Socket.IO server
│   ├── config/            # Database, Socket, and Cloudinary configurations
│   ├── controllers/       # Route logic and business operations
│   ├── middleware/        # Authentication, Error handling, and Uploads
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API endpoints
│   ├── services/          # Recommendation and Cron services
│   └── utils/             # Helpers (Email, OTPs, AppError)
└── frontend/              # React application
    ├── src/
    │   ├── api/           # Base Axios interceptors and endpoints
    │   ├── components/    # Reusable UI elements (Buttons, Nav, Maps)
    │   ├── pages/         # Dashboard and functional views per role
    │   ├── store/         # Zustand global state (Auth, Cart, Sockets, Notifications)
    │   └── utils/         # Frontend constants and helpers
```
