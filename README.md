# Your Hostel Buddy - Full Stack Web Application

## Overview
**Your Hostel Buddy** is a comprehensive platform designed to bridge the gap between students looking for accommodation and hostel/PG owners looking to list their properties. It provides a seamless discovery, filtering, enquiry, and dynamic notification system with built-in role-based access control. The platform also offers a dedicated **Android Application (APK)** for an enhanced native mobile experience.

## User Roles
The application is structured around three primary roles, each with a unique dashboard and feature set:

1. **Student**: 
   - Profiles with personal, college, and contact info.
   - Can dynamically search, sort (Price, Rating, Views), and discover nearby hostels with "Empty State" city suggestions.
   - Can view detailed property pages including various photos, amenities, and rules.
   - **Enquiry & Real-Time Badges**: Can send enquiries and receive flawlessly synchronized badge notifications when owners reply or close the enquiry.

2. **Hostel / PG Owner**:
   - Profiles with identity verification and contact details.
   - **Monetization & Subscriptions**: Must pay a ₹259/mo subscription fee via Razorpay to activate property visibility on the platform, with expiration warnings and automated tracking.
   - **Bulk Enquiry Management**: Track, reply, or "Bulk Clear" hundreds of student enquiries via single optimized API calls.
   - Experience fast, parallelized image uploading with a live visual progress bar.

3. **Admin (Super Administrator)**:
   - Full system oversight and monetization pipeline management.
   - **Financial Dashboard**: Tracks active subscriptions, expired properties, and real-time revenue pipeline.
   - Manages and approves/removes owner listings and oversees public platform updates and community feedback.

## Key Design & Security Features
- **Zero XSS Execution**: 100% fortified against Cross-Site Scripting (XSS). Every user input (hostel names, reviews, chat messages, notifications) is escaped before DOM injection.
- **Enterprise Notification System**: Perfect `isReadByOwner` and `isReadByStudent` database-level tracking ensures real-time badge polling is 100% accurate, similar to WhatsApp's unread logic logic.
- **Atomic MongoDB Operations**: Highly optimized using MongoDB TTL indexes for auto-deleting notifications/enquiries, and `$inc` for atomic view counter updates.
- **Premium Responsive UI**: Mobile-first glassmorphism design with `Lucide` SVG iconography, GSAP animations, dynamic 44px touch-targets for mobile chat inputs, and responsive full-screen modals.
- **Secure Email Verification & OTP Flow**: Accounts are secured with a mandatory 6-digit OTP verification flow sent via NodeMailer using HTML-branded emails.
- **Dynamic Sidebar Avatars**: Real-time fetched user uploaded Profile Photos embedded globally across all dashboard navigation components.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS3 (CSS Variables, Flexbox/Grid, Glassmorphism), Vanilla JavaScript, Lucide Icons.
- **Backend API**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose ODMs) with TTL & Atomic indexing.
- **Image Storage**: Cloudinary (integrated via Multer middleware).

## Execution Flow
1. **Frontend (HTML/CSS/JS)** handles the UI logic, role selection (Admin/Student/Owner), and visually rich presentation.
2. **Backend API (Node.js + Express)** handles authentication (JWT), Razorpay subscriptions, unread message tracking logic, and database operations.
3. **Database (MongoDB)** stores user profiles, property listings, and heavily-indexed enquiries/notifications.
4. **Cloudinary** stores images securely and returns URLs to be saved in MongoDB.

## Project Structure
- `frontend/` - Contains all HTML pages, CSS styles, Icons, JS logic files, and the `hostelbuddy.apk` Android application download release.
- `backend/` - Contains the Express server, Razorpay config, Mongoose models, mailers, routing logic, and controllers.

---
*Maintained and constantly improved to ensure enterprise-grade security and UI/UX.*
