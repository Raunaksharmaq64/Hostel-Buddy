# Hostel Buddy - System Documentation

## 1. Overview & Architecture
Hostel Buddy is a full-stack web application designed to connect Students searching for accommodation with Hostel/PG Owners. The platform also includes a comprehensive Admin panel to manage users, approve properties, and handle system requests.

- **Stack**: 
  - **Frontend**: HTML5, CSS3, Vanilla JavaScript, GSAP for animations, Lucide SVG Icons.
  - **Backend**: Node.js, Express.js.
  - **Database**: MongoDB (Mongoose Schema) with atomic `$inc` and TTL indexes.
  - **Cloud Storage**: Cloudinary (for image uploads).
  - **Authentication**: JSON Web Tokens (JWT) & bcryptjs for password hashing.
  - **Email System**: NodeMailer with Gmail SMTP, connection pooling, and 13 branded HTML email templates for transactional notifications, welcome onboarding, re-engagement, and milestone celebrations.
  - **Security**: Strict zero-trust XSS prevention architecture via global `escapeHtml()` injection sanitization (frontend DOM + backend email templates).
  - **Mobile App**: Direct Android APK distribution hosted natively via the web frontend.
  
- **Design Philosophy**: Modern glassmorphism UI with smooth, fast, responsive UX, and optimized bulk-processing workflows.

## 2. Folder Structure

```
├── backend/
│   ├── config/            # Database connection configuration (db.js)
│   ├── controllers/       # Business logic (adminController, authController, enquiryController, etc.)
│   ├── middleware/        # Express middlewares (auth.js for JWT, upload.js for Multer)
│   ├── models/            # Mongoose Schemas (User.js, Hostel.js, Enquiry.js, Notification.js)
│   ├── routes/            # Express Routers mapping endpoints to controllers
│   ├── utils/             # Email templates (9 branded HTML templates), sendEmail utility, cron jobs
│   ├── server.js          # Entry point for the backend server
│   └── .env               # Environment variables (DB URI, JWT, Cloudinary keys, Email config)
├── frontend/
│   ├── css/
│   │   └── style.css      # Single stylesheet featuring glassmorphism and modern UI tokens
│   ├── js/
│   │   ├── main.js        # Global utilities, API wrapper function, auth checks, and shared logic
│   │   ├── student.js     # Student dashboard logic (fetching hostels, inquiries, profile management)
│   │   ├── owner.js       # Owner dashboard logic (listing hostes, handling enquiries, profile)
│   │   └── admin.js       # Admin panel logic (verification, global enquiries, deactivations, analytics)
│   ├── index.html         # Landing page
│   ├── login.html         # Authentication UI (Login)
│   ├── signup.html        # Authentication UI (Registration)
│   ├── student-dashboard.html # Protected route HTML for Students
│   ├── owner-dashboard.html   # Protected route HTML for Owners
│   ├── admin-dashboard.html   # Protected route HTML for Admin
│   └── hostelbuddy.apk        # Downloadable Android application release
└── DOCUMENTATION.md       # This system documentation
```

## 3. Database Schemas

### User
Handles all three roles (`Student`, `Owner`, `Admin`).
- **Shared Fields**: `name`, `email`, `password`, `role`, `phone`, `profilePhoto`, `createdAt`.
- **Student Specific**: `fatherPhone`, `motherPhone`, `permanentAddress`, `collegeName`, `collegeAddress`, `governmentId`, `savedHostels` (Array of ObjectId references).
- **Owner Specific**: `address`, `city`, `hostelName`, `description`, `aadhaarNumber`, `identityVerification` (document URL), `isVerified` (Boolean), `verificationStatus` (Enum: 'unverified', 'pending', 'verified', 'rejected').
- **System Flags**: 
  - `deactivationStatus` (Enum: 'none', 'pending')
  - `deactivationReason` (String)
  - `notifications` (Array of objects containing `message`, `type`, `isRead`, `createdAt`)
  - `lastLoginAt` (Date) — updated on every login, used by comeback email cron
  - `comebackEmailSentAt` (Date) — prevents duplicate re-engagement emails (7-day cooldown)

### Hostel
Stores property details. Linkable to Owner.
- **Fields**: `ownerId`, `name`, `description`, `address`, `city`, `state`, `pincode`, `monthlyPrice`, `dailyPrice`, `depositAmount`, `rules`, `googleMapLink`, `keywords` (Array of strings).
- **Images**: Features a primary `thumbnailImage`, and categorized arrays `buildingPhotos`, `roomPhotos`, `messPhotos`, `washroomPhotos`.
- **Status/Metrics**: `isApproved` (Boolean, handled by Admin), `views` (Number).
- **Monetization (Razorpay)**: `subscriptionStatus` (Enum: 'pending', 'active', 'expired'), `subscriptionExpiry` (Date), `lastPaymentId` (String).
- **Amenities**: `foodAvailability` (Boolean), `foodDetails` (String).

### Enquiry
Manages messages between Students and Owners.
- **Fields**: `studentId`, `ownerId`, `hostelId`, `message`.
- **Status Tracking**: `status` (Enum: 'Pending', 'Responded', 'Closed').
- **Admin Response**: `adminResponse` (Admin can leave official replies on enquiries).
- **Badge Tracking**: `isReadByOwner` (Boolean), `isReadByStudent` (Boolean) - powers flawless real-time, 1-to-1 unread badge synchronization across dashboards.
- **Auto-Cleanup**: `closedAt` (Date mapped to a MongoDB TTL index for automatic 30-day deletion of closed conversations).

### Review
Handles hostel ratings and feedback from students.
- **Fields**: `studentId` (ref User), `hostelId` (ref Hostel), `rating` (Number, 0-5), `comment` (String), `createdAt`.
- **Automation**: Average rating of a Hostel is automatically updated upon new review creation or deletion.

## 4. Working Workflows

### 4.1. Authentication & Security Flow
1. User submits `signup.html` or `login.html`.
2. Backend `authController.js` validates credentials, hashes passwords (via Mongoose `pre('save')` hook).
3. If new, the system generates a 6-digit OTP and dispatches an HTML email via NodeMailer. The user is created with `isEmailVerified: false`.
4. Front-end triggers a dynamic, no-reload OTP modal. Upon successful `/api/auth/verify-email`, the account activates and returns the JWT token.
5. User navigates through the optional **Forgot Password** flow similarly, securely verifying OTPs before changing credentials.

### 4.2. Property Listing & Approval Flow (Owner -> Admin)
1. **Verification**: Owners must complete their profile and request verification. 
2. **Admin Verify**: Admin views pending verifications in `admin-dashboard.html` and approves them. Admin can also send custom notifications to the owner.
3. **Add Listing**: Verified Owners can upload Hostels. Upon creation, visually tracks expiration statuses.
4. **Subscription Payment (Razorpay)**: Creating a new hostel triggers a Razorpay UI popup to enforce a ₹299/mo listing fee. If unpaid, the listing cannot be broadcasted publicly.
5. **Approval**: Uploaded Hostels default to `isApproved: false`. The Admin safely reviews and approves them.
6. **Background Automation**: A `node-cron` system runs scheduled tasks:
   - **Renewal Reminders** (8 AM & 8 PM): Identifies properties approaching subscription expiration and sends branded renewal warning emails.
   - **Comeback Emails** (10 AM daily): Scans for users inactive 2+ days, aggregates their pending activity (unread enquiries, notifications, hostel views), and sends personalized re-engagement emails. Rate-limited to 50 emails/run with 7-day cooldown.
7. **Discovery**: Students exclusively see Hostels where both `isApproved: true` and `subscriptionStatus: 'active'`.

### 4.3. Enquiry & Messaging Loop
1. Student views a Hostel and clicks "Send Enquiry".
2. System sets `isReadByOwner = false`, instantly triggering an unread badge counter on the Owner's "Enquiries" tab via a 30s background poll.
3. **Email Notification**: A branded "New Enquiry" email is dispatched to the Owner's inbox with the student's name, hostel name, and message preview.
4. Owner navigates to Enquiries. A single fast `PUT /api/enquiries/mark-read` call accurately clears the badge. Owner replies or closes the thread.
5. Backend flips `isReadByStudent = false`, triggering the Student's badge, sending a formal `Notification` string, **and dispatching a "Reply" email to the Student**.
6. **Chat messages**: Every message in the enquiry thread also generates an email to the other party, ensuring no communication is missed even if the user is offline.
7. **Status changes**: When an Owner closes or responds to an enquiry, the Student receives both an in-app notification and a status-update email.
8. Owners can use an optimized "Bulk Delete" endpoint to clear hundreds of messages with one API call, significantly boosting dashboard performance.

### 4.4. Email Notification System
Every in-app notification event is mirrored with a professional, branded HTML email. The system uses **13 distinct email templates**, all featuring:
- HostelBuddy branded gradient header with logo
- Context-specific colors (purple for enquiries, green for approvals, red for closures)
- XSS-safe content rendering via `escapeHtml()` sanitization
- "Raunak Sharma — Founder & Lead" professional sign-off
- Auto-generated email disclaimer ("Do not reply")
- Non-blocking delivery (API responds instantly, emails fire in background)

| # | Email Template | Trigger Event | Recipient |
|---|---------------|---------------|----------|
| 1 | Payment Invoice | Razorpay payment verified | Owner |
| 2 | Renewal Reminder | Subscription expires ≤3 days (cron) | Owner |
| 3 | New Enquiry Alert | Student sends an enquiry | Owner |
| 4 | Enquiry Reply | Owner replies to enquiry | Student |
| 5 | Chat Message | Either party sends a message | Other party |
| 6 | Enquiry Status Change | Owner changes status (Responded/Closed) | Student |
| 7 | Admin Notification | Admin sends message or responds to enquiry | Owner/Student |
| 8 | Hostel Approval | Admin approves/unapproves listing | Owner |
| 9 | Verification Status | Admin verifies/rejects owner account | Owner |
| 10 | Platform Update | Admin broadcasts a platform announcement | Targeted role(s) |
| 11 | Welcome Email + Guide | Email verification completed (OTP verified) | Student/Owner |
| 12 | Come Back Email | User inactive 2+ days (daily cron at 10 AM) | Student/Owner |
| 13 | Milestone Celebration | Achievement reached (1st enquiry, 50 views, 1st review, etc.) | Student/Owner |

### 4.5. Review & Rating Flow
1. Student stays at or visits a hostel and submits a rating/comment.
2. Backend validates that the student hasn't already reviewed this specific hostel.
3. On success, the `Hostel` document's `rating` field is recalculated as the average of all associated `Review` documents.
4. Admin can monitor and delete inappropriate reviews via the Admin Dashboard.

### 4.6. Deactivation & Data Cascade Cleanup Flow
1. Student or Owner requests account deletion via "Danger Zone".
2. Admin reviews request in "System Requests" tab.
3. If approved:
   - If User is Owner: Backend finds all owned `Hostel` IDs, deletes the `Hostel` documents, deletes matching `Enquiry` documents, and **cascades** the deletion by stripping those `Hostel` IDs from all Student `savedHostels` arrays.
   - User account is completely wiped from the DB.

### 4.7. Guided Onboarding Tour
1. New users (Student/Owner/Admin) are greeted with a "Guided Tour" invitation (powered by `tour.js`).
2. The engine uses a spotlight effect (`tourOverlay`) to highlight key dashboard elements.
3. Completion state is tracked in `localStorage` to prevent re-triggering, though users can manually "Replay Tour" from the dashboard settings.

## 5. Coding & Naming Conventions

### Variables & Functions
- **camelCase** for standard javascript variables and functions (e.g. `const hostelName`, `function fetchAPI()`).
- **PascalCase** for object models and classes (e.g. `const User`, `const Hostel`).

### API Endpoints
RESTful conventions used aggressively. Responses standardly structured as `{ success: Boolean, data: Object/Array, message: String, error: String }`.
- **GET** `/api/resources` (Fetch all/multiple)
- **POST** `/api/resources` (Create new)
- **PUT** `/api/resources/:id` (Update completely)
- **DELETE** `/api/resources/:id` (Delete item)

### CSS & Interface Elements
- **Utility Tokens**: Global variables stored in `:root` of `style.css` (`--primary`, `--accent`, `--glass-bg`).
- **Glassmorphism**: Consistent reuse of `.glass-panel` combined with `backdrop-filter: blur()`.
- **Global Layout Elements**: 
  - `navbar`: Fixed top navigation.
  - `premium-footer`: A multi-column, responsive grid footer containing brand 'About' info, localized Quick Links tailored per role, and SVG animated social icons for a professional touch.
  - `sidebarAvatar`: Dynamically displays the user's uploaded `profilePhoto` instead of static text placeholders.
- **Forms**: Managed by `.form-group` and heavily relies on `.form-row` combined with `flex-wrap` to ensure mobile-friendly responsiveness across all profile inputs.
- **Global Pages**: 
  - `guide.html`: A comprehensive, premium user manual explaining the platform's features for students and owners with step-by-step visuals and instructions.
  - `about.html`: Detailed vision, mission, and technical highlights of the HostelBuddy ecosystem.
  - `privacy.html`: Official standard platform privacy policy and data management guidelines.
  - `safety.html`: Essential safety practices and guidelines for students and owners.
  - `terms.html`: User roles, account responsibilities, and platform facilitation rules.
- **Animations**: Handled primarily via GSAP, with native CSS transitions and `transform: preserve-3d` fallback for card hover effects (`.card-3d`).
- **Tour Engine**: `tour.js` manages step-by-step onboarding using a custom spotlight system and `localStorage` persistence.

## 6. Key API Reference Matrix

| Prefix             | Endpoint                     | Method | Role Required | Description                                  |
|--------------------|------------------------------|--------|---------------|----------------------------------------------|
| `/api/auth`        | `/register`                  | POST   | None          | Creates new User account and sends OTP       |
|                    | `/login`                     | POST   | None          | Returns JWT token (blocks unverified users)  |
|                    | `/verify-email`              | POST   | None          | Validates OTP and activates account          |
|                    | `/forgot-password`           | POST   | None          | Dispatches password reset OTP via email      |
|                    | `/reset-password`            | POST   | None          | Validates OTP and updates password           |
|                    | `/me`                        | GET    | Any matched   | Returns current logged-in user profile       |
| `/api/profiles`    | `/student` or `/owner`       | PUT    | Student/Owner | Updates respective profile details           |
|                    | `/notifications`             | GET    | Any           | Get unread messages sent by Admin/System     |
|                    | `/request-deactivation`      | POST   | Any           | Flag account for admin deletion              |
| `/api/hostels`     | `/`                          | GET    | Student       | Discover active/approved hostels             |
|                    | `/`                          | POST   | Owner         | Submit new hostel listing                    |
| `/api/enquiries`   | `/`                          | POST   | Student       | Start a conversation about a property        |
|                    | `/:id/status`                | PUT    | Owner         | Update enquiry lifecycle state               |
|                    | `/mark-read`                 | PUT    | Owner/Student | Flawless multi-document unread tracking clear|
|                    | `/owner/bulk`                | DELETE | Owner         | Optimized clearing of all owner enquiries    |
|                    | `/:id`                       | DELETE | Owner/Student | Clear specific enquiry from dashboard history|
| `/api/admin`       | `/analytics`                 | GET    | Admin         | Platform metrics                             |
|                    | `/subscriptions`             | GET    | Admin         | Financial pipeline and revenue estimations   |
|                    | `/subscriptions/:id/manage`  | PUT    | Admin         | Manually override/grant access (Cash payment)|
|                    | `/deactivations/:id`         | PUT    | Admin         | Approve (delete user + cascade) or Reject    |
|                    | `/notify-owner/:id`          | POST   | Admin         | Dispatch warning/info message to owner       |
| `/api/payments`    | `/get-key`                   | GET    | Owner         | Fetches active Razorpay ID for frontend      |
|                    | `/create-order`              | POST   | Owner         | Generates a secure Razorpay transaction      |
|                    | `/verify`                    | POST   | Owner         | Verifies signature and activates listing     |
| `/api/reviews`     | `/hostel/:hostelId`          | GET    | Public        | Get all reviews for a property               |
|                    | `/`                          | POST   | Student       | Submit a new rating and comment              |
|                    | `/`                          | GET    | Admin         | View all platform reviews                    |
|                    | `/:id`                       | DELETE | Admin         | Remove a review                              |

## 7. Deployment Considerations
When preparing to deploy (e.g., Render, Heroku, Vercel for frontend/Railway for backend):
1. **Environment Variables**: Make sure the production `.env` contains:
   - `PORT` (usually provided by host)
   - `MONGO_URI` (production MongoDB atlas link)
   - `JWT_SECRET` & `JWT_EXPIRE`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS` (for OTP delivery)
2. **CORS Configuration**: Change `server.js` cors options to only allow requests from the live frontend origin rather than `localhost`.
