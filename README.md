# Your Hostel Buddy - Full Stack Web Application

## Overview
**Your Hostel Buddy** is a comprehensive platform designed to bridge the gap between students looking for accommodation and hostel/PG owners looking to list their properties. It provides a seamless discovery, filtering, and enquiry system with built-in role-based access control.

## User Roles
The application is structured around three primary roles, each with a unique dashboard and feature set:

1. **Student**: 
   - Profiles with personal, college, and contact info.
   - Can search, filter (price, room type, food availability, rating), and discover nearby hostels.
   - Can view detailed property pages including various photos (building, room, washroom, mess), amenities, and rules.
   - **Review & Rating System**: Can leave feedback and ratings for hostels they've visited.
   - Can send enquiries to hostel owners and save favorite hostels.

2. **Hostel / PG Owner**:
   - Profiles with identity verification and contact details.
   - Can create, edit, and manage multiple property listings.
   - Can upload category-specific photos (building, rooms, mess).
   - Dedicated enquiry management section to track and respond to student messages.

3. **Admin (Super Administrator)**:
   - Full system oversight.
   - Monitors student behavior and limits suspicious activity.
   - Manages and approves/removes owner listings.
   - **Enquiry Management**: Can view and respond to student enquiries directly.
   - Accesses platform analytics (most searched hostels, active users, response rates, etc.).

## Key Design Features
- **Platform Feedback System**: A transparent, robust feedback engine where students and owners can review the platform itself. Admins have full moderation control (approve/reject/delete), and approved feedbacks are dynamically displayed on user dashboards and the signup page to build trust.
- **Premium Glassmorphism UI**: High-end user interface utilizing GSAP animations, 3D card tilt effects, dynamic tooltips, and responsive glass panels.
- **Guided Onboarding Tour**: A premium, spotlight-driven interactive tour for new users to quickly learn the platform's features (powered by `tour.js`).
- **Global Footer Navigation**: A premium, responsive footer loaded with quick links and informative "About" details integrated across all views, including dashboards.
- **Resource Pages**: Specialized pages for **Safety Guidelines**, **Privacy Policy**, **Terms of Service**, and a comprehensive **User Guide**.
- **Security & Data Handling**: Fast JWT authentication and safe Mongoose cascade deletions to ensure a flawlessly clean database.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS3 (with premium styling, CSS variables, 3D hover effects, and modern fonts), Vanilla JavaScript.
- **Backend API**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose ODMs).
- **Image Storage**: Cloudinary (integrated via Multer middleware).

## Execution Flow
1. **Frontend (HTML/CSS/JS)** handles the UI logic, role selection (Admin/Student/Owner), and visually rich presentation.
2. **Backend API (Node.js + Express)** handles authentication (JWT), routing, business logic, and database operations.
3. **Database (MongoDB)** stores user profiles, property listings, and enquiries.
4. **Cloudinary** stores images securely and returns URLs to be saved in MongoDB.

## Project Structure
The project will be split into:
- `frontend/` - Contains all HTML pages, CSS styles, and JS files.
- `backend/` - Contains the Express server, Mongoose models, routing logic, and controllers.

---
*Generated as part of the initial project setup.*
