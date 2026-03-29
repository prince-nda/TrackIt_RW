# TrackIt_RW
# ️ TrackIt Rw

> **TrackIt Rw** means *"Report an Issue"* in Kinyarwanda.
> A web-based urban infrastructure reporting and tracking platform for Kigali, Rwanda.

---

## Overview

TrackIt Rw connects Kigali residents with local government authorities. Citizens report infrastructure issues — potholes, drainage problems, waste management failures, broken street lights — and authorities manage and resolve them through a dedicated admin dashboard. Every report is tracked, timestamped, and visible to the citizen who submitted it.

---

## Planned Features

| Feature | Description |
|---|---|
| Issue Reporting | Citizens submit reports with title, description, category, photo and GPS location |
| Interactive Map | All reported issues displayed as pins on a live Leaflet.js map of Kigali |
| Real-Time Status Tracking | Reports move through Pending → In Progress → Resolved or Rejected |
| Status History | Full audit trail of every status change — who changed it, when, and why |
| ️ Admin Dashboard | Government officials manage, assign, and respond to reports |
| Comments & Discussion | Citizens and admins discuss reports with threaded replies |
| Notifications | In-app alerts when report status changes or admin comments |
| Email Alerts | Automatic email via Gmail SMTP when report is resolved or rejected |
| Anonymous Reporting | Citizens can hide their identity while still submitting reports |
| Role-Based Access | Citizen, Admin, and Moderator roles enforced through JWT authentication |

---

## ️ Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React.js | Component-based UI framework |
| Tailwind CSS | Responsive styling |
| Axios | HTTP requests to Flask API |
| React Router | Client-side page navigation |
| Leaflet.js + OpenStreetMap | Free interactive map — no API key needed |

### Backend
| Tool | Purpose |
|---|---|
| Python Flask | Lightweight REST API server |
| Flask Blueprints | Organises routes by feature area |
| Flask-SQLAlchemy | ORM — Python classes instead of raw SQL |
| Flask-JWT-Extended | JWT token generation and verification |
| Flask-Bcrypt | Password hashing |
| Flask-Mail | Email notifications via Gmail SMTP |
| Flask-CORS | Allows React to communicate with Flask |

### Database
| Tool | Purpose |
|---|---|
| MySQL | Relational database — all 7 tables |
| Flask-SQLAlchemy ORM | Translates Python models to SQL automatically |

### External Services
| Service | Purpose |
|---|---|
| Cloudinary | Photo storage — saves URL in database not the file |
| Gmail SMTP | Email alerts on status change |
| Leaflet.js + OSM | Free map tiles — no billing required |

### Deployment
| Tool | Purpose |
|---|---|
| NGINX | Serves React, reverse proxies Flask API |
| Vercel | React frontend hosting |
| Railway | Flask backend hosting |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | /api/auth/register | Register new Citizen or Admin account | No |
| POST | /api/auth/login | Login and receive JWT token | No |
| POST | /api/auth/logout | Logout | Yes |

### Reports
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | /api/reports | Submit a new infrastructure report | Citizen |
| GET | /api/reports | Get all reports for map and admin | Yes |
| GET | /api/reports/\<id\> | Get single report full details | Yes |
| PUT | /api/reports/\<id\>/status | Admin updates report status | Admin |

### Categories
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | /api/categories | Get all categories for dropdown | Yes |

### Comments
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | /api/reports/\<id\>/comments | Post a comment on a report | Yes |
| GET | /api/reports/\<id\>/comments | Get all comments on a report | Yes |

### Notifications
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | /api/notifications | Get all notifications for logged in user | Yes |
| PUT | /api/notifications/\<id\>/read | Mark a notification as read | Yes |

---

## ️ Getting Started

### Prerequisites

Make sure you have these installed on your machine:

- Python 3.10+
- Node.js 18+
- MySQL
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/prince-nda/trackit-rw.git
cd trackit-rw
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate # Mac/Linux
venv\Scripts\activate # Windows

# Install all dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Open .env and fill in your credentials
```

Your `.env` file should contain:

```
DATABASE_URL=mysql+pymysql://username:password@localhost/trackit_rw
JWT_SECRET_KEY=your_secret_key_here
MAIL_USERNAME=yourgmail@gmail.com
MAIL_PASSWORD=your_gmail_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
# Start Flask — automatically creates all database tables
python app.py
```

Flask will be running at `http://localhost:5000`

---

### 3. Database Setup

```bash
# Start MySQL
sudo service mysql start

# Run the database setup script
sudo mysql < database/database_setup.sql
```

---

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start React development server
npm start
```

React will be running at `http://localhost:3000`

---

### 5. Test the API

Open Postman and test your first request:

```json
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
"full_name": "Amina Uwimana",
"email": "amina@gmail.com",
"password": "test1234",
"role": "Citizen",
"district": "Gasabo",
"sector": "Kimironko"
}
```

Expected response:

```json
{
"message": "Account created successfully",
"user_id": 1
}
```

---

## Team

| Member | Role | Responsibility |
|---|---|---|
| Member 1 | Backend Lead | Flask setup, database models, JWT authentication |
| Member 2 | Backend Developer | Reports API, Cloudinary, status history, notifications |
| Member 3 | Frontend Lead | React setup, auth UI, routing, JWT token management |
| Member 4 | Frontend Developer | Report submission form, citizen dashboard |
| Member 5 | Frontend Developer | Leaflet.js map, admin dashboard |

---

## Security

- Passwords hashed with **bcrypt** — never stored in plain text
- All API routes protected with **JWT tokens**
- Role-based access — Citizens cannot access Admin routes
- **Flask-SQLAlchemy** prevents SQL injection by default
- Sensitive credentials stored in **environment variables** — never hardcoded
- Anonymous reporting hides citizen identity from all public-facing views

---

## Sprint Progress

| Sprint | Focus | Status |
|---|---|---|
| Sprint 1 | Design — ERD, architecture, database schema | Completed |
| Sprint 2 | Authentication — register, login, JWT, roles | Completed |
| Sprint 3 | Report submission, photo upload, GPS, map | In Progress |
| Sprint 4 | Admin dashboard, status management, history | Planned |
| Sprint 5 | Comments, notifications, email alerts | Planned |
| Sprint 6 | Testing, bug fixing, deployment | Planned |

---

> Built for Kigali, Rwanda
