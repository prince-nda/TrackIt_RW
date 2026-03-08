# TrackIt_RW


  
> A web-based urban infrastructure reporting and tracking platform for Kigali, Rwanda.

---

##  Overview

Trackit RW connects Kigali residents with local government authorities. Citizens report infrastructure issues — potholes, drainage problems, waste management failures, broken street lights — and authorities manage and resolve them through a dedicated admin dashboard.

> According to the World Bank (2023), over 60% of urban residents in Rwanda are affected by infrastructure challenges. Existing reporting channels lack transparency and offer no way for citizens to track whether their complaint was ever acted on.

---

## Currently Implemented

### 1. Database Schema Design
The database is built on MySQL and managed through Flask-SQLAlchemy ORM. It consists of 7 tables that together support the full lifecycle of an issue report.

| Table | Primary Key | Purpose 
|---|---|---|
| users | user_id | All registered users — Citizens, Admins, Moderators |
| categories | category_id | Predefined issue types — Road, Drainage, Waste, Lighting |
| locations | location_id | GPS coordinates for each reported issue |
| reports | report_id | Core table — all submitted infrastructure reports |
| comments | comment_id | Citizen and admin discussion with threaded replies |
| notifications | notif_id | In-app alerts generated automatically by Flask |
| status_history | history_id | Audit trail of every report status change |

---

### 2. User Authentication & Registration

**Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register a new Citizen or Admin account |
| POST | /api/auth/login | Login and receive a JWT token |
| POST | /api/auth/logout | Logout |

**How it works:**
- Passwords are hashed with **bcrypt** before being saved — never stored in plain text
- On successful login Flask generates a **JWT token** containing the user's ID and role
- Every protected route requires this token in the request header
- Role-based access enforced — Citizens and Admins see different parts of the app

**Sample Register Request:**
```json
POST /api/auth/register
{
  "full_name": "Amina Uwimana",
  "email": "amina@gmail.com",
  "password": "test1234",
  "role": "Citizen",
  "district": "Gasabo",
  "sector": "Kimironko"
}
```

**Sample Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "Citizen",
  "full_name": "Amina Uwimana",
  "user_id": 1
}
```

---

### 3. Report Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/reports | Submit a new infrastructure report |
| GET | /api/categories | Return all available categories |

**How it works:**
- A citizen submits a report with a title, description, category, and GPS coordinates
- Flask saves the location to the locations table and links it to the report via location_id
- The report is saved to the reports table with status defaulting to **Pending**
- Categories are fetched from the categories table to populate the dropdown in the frontend form

**Sample Report Request:**
```json
POST /api/reports
{
  "title": "Large pothole on KN 5 Rd",
  "description": "Dangerous pothole near Kimironko market, been there 2 months",
  "category_id": 1,
  "latitude": -1.94995,
  "longitude": 30.05885,
  "district": "Gasabo",
  "sector": "Kimironko"
}
```

**Sample Report Response:**
```json
{
  "message": "Report submitted successfully",
  "report_id": 1,
  "status": "Pending"
}
```

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Tailwind CSS |
| Backend | Python + Flask |
| Authentication | Flask-JWT-Extended + Flask-Bcrypt |
| ORM | Flask-SQLAlchemy |
| Database | MySQL |
| Password Security | bcrypt |

---

##  What Is Coming Next

| Feature | Sprint |
|---|---|
| Photo upload via Cloudinary | Sprint 3 |
| Interactive Leaflet.js map | Sprint 3 |
| Admin dashboard | Sprint 4 |
| Status update and history tracking | Sprint 4 |
| Comments and threaded replies | Sprint 5 |
| Email notifications via Gmail SMTP | Sprint 5 |
| Deployment with NGINX on Railway + Vercel | Sprint 6 |

---

##  Team

| Member | Role |
|---|---|
| Mwizerwa Keza Megane | Backend Lead — Flask setup, database models, authentication |
| Ndahiro Prince | Backend Developer — Reports API, Cloudinary, status history |
| Gasangwa Teta Duice | Frontend Lead — React setup, auth UI, routing |
| Isaro Ridah | Frontend Developer — Report form, citizen dashboard |
| Kami Pacifique | Frontend Developer — Map, admin dashboard |

---

> Built for Kigali, Rwanda 🇷🇼
team task sheet link 
https://docs.google.com/spreadsheets/d/1K8tFwi7jx18rnjIF7f--i63jmDKDtiS5r6JgADUsFns/edit?usp=sharing
