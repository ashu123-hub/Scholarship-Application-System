# 🎓 ScholarHub: Scholarship Application System

A modern, dual-architecture **Scholarship Application System** built with **Node.js, Express.js, and MongoDB**. 

This project operates as a **2-in-1 server**:
1. **Full-Stack Application:** A beautiful frontend (HTML/CSS/JS) connected to a robust MongoDB backend, featuring user authentication, file uploads, and an Admin Panel.
2. **IP Assignment REST API:** A purely backend, in-memory REST API built specifically for I (IP) assignments, testable via Postman.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Vanilla CSS (Glassmorphism UI), JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB (Mongoose ODM) |
| **Authentication** | express-session, bcryptjs |
| **File Uploads** | multer (PDF, JPG, PNG) |

---

## ✨ Key Features

- **OTP-Less Authentication:** Instant, seamless Registration and Login.
- **Dynamic Scholarship Calculation:** Embedded business logic that calculates eligible scholarship amounts dynamically based on Annual Income and GPA/Percentage.
- **Admin Dashboard:** Approve/Reject applications, manage users, and view platform statistics in real-time.
- **MongoDB Integration:** Persistent data storage via Mongoose Schemas (User, Admin, Application, Scholarship).
- **IP Postman Testing Environment:** Dedicated endpoints (`/scholarships/...`) that bypass the database and operate in-memory for academic API testing.

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js** (v16 or higher)
- **MongoDB** running locally on your machine (or a valid MongoDB Atlas URI).

### Setup Instructions

1. **Clone or Open the Project**
   Open the `scholarship` folder in VS Code.

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional)**
   Create a `.env` file in the root directory to specify a custom MongoDB URI:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/scholarhub
   SESSION_SECRET=your_secret_key
   ```
   *(If no `.env` is provided, it defaults to `mongodb://localhost:27017/scholarhub`)*

4. **Start the Server**
   ```bash
   npm start
   ```
   *The server will automatically seed the default Admin account and 6 default scholarships into MongoDB upon the first run!*

5. **Access the Application**
   - **Main Website:** [http://localhost:3000](http://localhost:3000)
   - **Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔐 Default Admin Credentials

| Role | Username | Password |
|---|---|---|
| **Admin** | admin | ashu123 |

---

## 📡 API Endpoints

### 1. ScholarHub Full-Stack API (MongoDB)
These endpoints power the web interface.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login user and create session |
| `GET` | `/api/scholarships` | Fetch all active scholarships |
| `POST` | `/api/applications` | Submit a new scholarship application |
| `GET` | `/api/applications/track/:id` | Track the real-time status of an application |
| `PUT` | `/api/admin/applications/:id/verify`| Admin endpoint to Approve/Reject applications |

### 2. IP Assignment API (In-Memory / Postman)
These endpoints are mounted purely for testing the IP Assignment logic via Postman. They bypass MongoDB entirely.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/scholarships/apply` | Apply for scholarship (Validates Age, Income, Grade) |
| `GET` | `/scholarships` | Get all IP applications |
| `GET` | `/scholarships/:id` | Get IP application by ID |
| `PUT` | `/scholarships/verify/:id` | Approve or Reject an IP application |
| `PUT` | `/scholarships/:id` | Update an IP application |
| `DELETE` | `/scholarships/:id` | Delete an IP application |

*Note: The IP endpoints feature custom request logging (e.g., `[2026-04-22 15:30:00] POST /scholarships/apply 201 (45ms)`).*

#### Postman Testing Examples

**1. Apply for a Scholarship**
*   **Method:** `POST`
*   **URL:** `http://localhost:3000/scholarships/apply`
*   **Body (JSON):**
    ```json
    {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "9876543210",
      "dob": "2005-06-15",
      "annual_income": 250000,
      "gpa": 8.5
    }
    ```

**2. Approve/Reject Application**
*   **Method:** `PUT`
*   **URL:** `http://localhost:3000/scholarships/verify/{application_id}`
*   **Body (JSON):**
    ```json
    {
      "status": "Approved",
      "remarks": "Income and GPA verified."
    }
    ```

---

## 🧾 Business Rules (Applied to Both Systems)

- **Age Limit:** Must be between **15 and 30 years old**.
- **Academic Score:** Must possess a minimum of **60% (or 6.0 CGPA)**.
- **Income & Tier Allocation:**
  - Annual Income **≤ ₹3,00,000**: Eligible for **Full Scholarship**.
  - Annual Income **₹3,00,001 – ₹6,00,000**: Eligible for **Partial Scholarship**.
  - Annual Income **> ₹6,00,000**: **Rejected**.

---

## 📁 Project Structure

```text
scholarship/
├── public/                 # Static Frontend Assets (HTML, CSS, JS)
├── src/
│   ├── config/             # MongoDB connection and Data Seeder
│   ├── models/             # Mongoose Schemas (User, Admin, Application, Scholarship)
│   ├── routes/             # Express Routers for the ScholarHub web app
│   ├── utils/              # Shared business logic and helper functions
│   └── ip_api/             # IP Assignment specific Controllers, Routes, and Middleware
├── uploads/                # User uploaded documents (e.g., Income Proof)
├── server.js               # Application Entry Point
└── package.json            # Node.js dependencies
```
