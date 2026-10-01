# MERN JWT Authentication System

A simple, beginner-friendly JWT authentication system built with the MERN stack.

## Features

- User registration with password hashing (bcryptjs)
- User login with JWT generation
- Protected dashboard accessible only to authenticated users
- Protected backend API endpoint (`GET /api/auth/profile`)
- Logout clears token from localStorage
- Clean, minimal UI with plain CSS

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 19 + Vite, React Router, Axios |
| Backend    | Node.js, Express.js                 |
| Database   | MongoDB + Mongoose                  |
| Auth       | JSON Web Token (JWT), bcryptjs      |

## Prerequisites

- Node.js >= 18
- npm >= 9
- A MongoDB database (local or [MongoDB Atlas](https://cloud.mongodb.com))

## Project Structure

```
mern-jwt-auth/
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── controllers/authController.js
│   ├── middleware/authMiddleware.js
│   ├── models/User.js
│   ├── routes/authRoutes.js
│   ├── .env                      # Environment variables
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/ProtectedRoute.jsx
    │   ├── pages/Login.jsx
    │   ├── pages/Register.jsx
    │   ├── pages/Dashboard.jsx
    │   ├── services/authService.js
    │   ├── App.jsx
    │   └── index.css
    └── .env
```

## Environment Variables

### backend/.env

See `backend/.env.example` for the full list of required variables.

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=1d
EMAIL_HOST=your_smtp_host
EMAIL_PORT=your_smtp_port
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
EMAIL_TIMEOUT_MS=10000
```

### frontend/.env

```
VITE_API_URL=http://localhost:5000/api
```

## Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Running the App

### Start the backend

```bash
cd backend
npm run dev      # uses nodemon for auto-reload
# or
npm start
```

Backend runs on: `http://localhost:5000`

### Start the frontend

```bash
cd frontend
npm run dev
```

Frontend runs on: `http://localhost:5173`

## API Endpoints

| Method | Endpoint              | Access    | Description              |
|--------|-----------------------|-----------|--------------------------|
| POST   | /api/auth/register    | Public    | Register a new user      |
| POST   | /api/auth/login       | Public    | Login and receive token  |
| GET    | /api/auth/profile     | Protected | Get logged-in user info  |
| POST   | /api/auth/otp/send    | Public    | Send a 4-digit OTP to a registered user's email (rate-limited to 3 requests / 10 min per email) |
| POST   | /api/auth/otp/verify  | Public    | Verify the OTP and receive a JWT token, identical in shape to the password-login response |

### Example Requests (Postman / REST Client)

**Register**
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Login**
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Get Profile (protected)**
```
GET http://localhost:5000/api/auth/profile
Authorization: Bearer <your_jwt_token>
```

## Frontend Routes

| Path        | Component | Access    |
|-------------|-----------|-----------|
| /login      | Login     | Public    |
| /register   | Register  | Public    |
| /dashboard  | Dashboard | Protected |

## Screenshots

> _Add screenshots here after running the app._

## License

MIT
