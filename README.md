# 🎉 KudosWall — Internal Team Feedback & Peer Kudos Wall

> A modern full-stack MERN platform for internal peer recognition, points economy, and core company values celebration.

---

## ✨ Features

- **🛡️ Secure Dual-Token Authentication**:
  - Short-lived Access JWT (15m) + Long-lived Refresh Token (7d) in `httpOnly`, `SameSite=Lax` cookies.
  - Token rotation on refresh to guard against token replay attacks.
  - Email verification simulation & password reset flows.

- **🤝 Peer Recognition & "Give Kudos" Workflow**:
  - Modal with user autocomplete and real-time validation.
  - Custom point tiers (10, 20, 50 pts).
  - Company value tags (`#Teamwork`, `#CustomerObsession`, `#Innovation`, `#BiasForAction`, `#Ownership`).
  - Strict transaction safety: server-side balance verification, anti-self-gifting prevention, and atomic double-entry ledger.

- **📱 Social Kudos Feed**:
  - Rich interactive cards featuring sender/receiver details, department badges, and value tags.
  - Live emoji reactions (`👍`, `❤️`, `🔥`, `🚀`, `👏`, `💡`) with optimistic UI updates.
  - Real-time search, department filtering, and pagination.

- **🏆 Leaderboard & Analytics**:
  - High-performance MongoDB aggregation pipelines (`$group`, `$sort`, `$limit`) ranking top-recognized team members.
  - Department filtering (Engineering, Design, Marketing, Sales, Operations, Product).
  - Monthly allowance refresh mechanism (100 giving points/month).

- **🎖️ Recognition Badges & User Profiles**:
  - Milestone badges based on received recognition.
  - Profile statistics showing given vs. received kudos history.

---

## 🛠️ Tech Stack

- **Frontend**:
  - React 18
  - Vite
  - Lucide Icons
  - Coss UI design patterns & responsive glassmorphism CSS
- **Backend**:
  - Node.js & Express.js
  - MongoDB & Mongoose ODM
  - JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
  - Cookie Parser, CORS, Helmet
- **Testing & Tooling**:
  - Jest & Supertest
  - Concurrently (for unified monorepo development)

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) running locally on port 27017 (or MongoDB Atlas connection string)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/yashsonar1807/kudos-wall.git
cd kudos-wall

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Return to root
cd ..
```

### 2. Environment Variables

Create `.env` in both `backend` and `frontend` based on their respective `.env.example`:

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/kudos_wall
CLIENT_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=your_super_secret_access_token_min_32_chars
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_min_32_chars
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

**Frontend (`frontend/.env`):**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Run Development Servers

From the root directory:
```bash
# Run both backend (port 5000) and frontend (port 5173) concurrently
npm run dev
```

Or run them individually:
```bash
# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend
```

---

## 🧪 Testing

```bash
# Run backend test suite
npm run test
```

---

## 📂 Project Structure

```
kudos-wall/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & environment configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, error, rate-limiting middleware
│   │   ├── models/          # Mongoose models (User, Kudos, Reaction, etc.)
│   │   ├── routes/          # Express route definitions
│   │   └── app.js           # Express app setup
│   └── tests/               # Backend Jest & Supertest suites
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── assets/          # Icons & styles
│   │   ├── components/      # UI components (Feed, Modal, Leaderboard, etc.)
│   │   ├── context/         # Auth & global state context
│   │   └── App.jsx          # Main client application
│   ├── index.html
│   └── vite.config.js
├── PROJECT_BRIEF_03.txt     # Requirements specification
└── package.json             # Root monorepo configuration
```

---

## 📄 License
MIT
