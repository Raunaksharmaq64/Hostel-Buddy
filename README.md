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
   - **Monetization & Subscriptions**: Must pay a ₹299/mo subscription fee via Razorpay to activate property visibility on the platform.
   - Can create, edit, and manage multiple property listings with real-time UI tracking of expiration dates.
   - Can upload a primary **Thumbnail Image** alongside category-specific photos (building, rooms, mess).
   - Experience fast, parallelized image uploading with a live visual **Progress Bar**.
   - Dedicated enquiry management section to track and respond to student messages.

3. **Admin (Super Administrator)**:
   - Full system oversight and monetization pipeline management.
   - **Financial Dashboard**: Tracks active subscriptions, expired properties, and real-time revenue pipeline. Can manually "Grant" or "Revoke" listing access.
   - Monitors student behavior and limits suspicious activity.
   - Manages and approves/removes owner listings.
   - **Enquiry Management**: Can view and respond to student enquiries directly.
   - Accesses platform analytics (most searched hostels, active users, response rates, etc.).

## Key Design Features
- **Secure Email Verification & OTP Flow**: Accounts are secured with a mandatory 6-digit OTP verification flow sent via NodeMailer using HTML-branded emails. Complete "Forgot Password" integration is cleanly built-in to prevent unauthorized access.
- **Platform Notification System**: An advanced system allowing the Admin to broadcast updates platform-wide or dispatch localized warning/information alerts explicitly to specific Owners or Students.
- **Platform Feedback System**: A transparent, robust feedback engine where students and owners can review the platform itself. Admins have full moderation control to display these on the public landing page.
- **Dynamic Sidebar Avatars**: The application dynamically fetches and seamlessly integrates the user's uploaded Profile Photo into the navigation sidebar across all dashboards.
- **Premium Responsive UI**: Mobile-first glassmorphism user interface utilizing GSAP animations, 3D card tilt effects, dynamic tooltips, stacking grid layouts, and an animated hidden mobile navigation side-menu.
- **Guided Onboarding Tour**: A premium, spotlight-driven interactive tour for new users to quickly learn the platform's features (powered by `tour.js`).
- **Global Footer Navigation**: A premium, responsive footer loaded with quick links and informative "About" details integrated across all views.
- **Security & Data Handling**: Fast JWT authentication, strict unverified-user login blocking, safe Mongoose cascade deletions, and concurrent `Promise.all` backend image processing to ensure a flawlessly clean and fast experience.

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
