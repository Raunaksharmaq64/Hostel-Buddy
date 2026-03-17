# Hostel Buddy - System Documentation

## 1. Overview & Architecture
Hostel Buddy is a full-stack web application designed to connect Students searching for accommodation with Hostel/PG Owners. The platform also includes a comprehensive Admin panel to manage users, approve properties, and handle system requests.

- **Stack**: 
  - **Frontend**: HTML5, CSS3, Vanilla JavaScript, GSAP for animations, Cloudflare icons.
  - **Backend**: Node.js, Express.js.
  - **Database**: MongoDB (Mongoose Schema).
  - **Cloud Storage**: Cloudinary (for image uploads).
  - **Authentication**: JSON Web Tokens (JWT) & bcryptjs for password hashing.
  
- **Design Philosophy**: Modern glassmorphism UI with smooth, fast, and responsive user experience. 

## 2. Folder Structure

```
├── backend/
│   ├── config/            # Database connection configuration (db.js)
│   ├── controllers/       # Business logic (adminController, authController, etc.)
│   ├── middleware/        # Express middlewares (auth.js for JWT, upload.js for Multer)
│   ├── models/            # Mongoose Schemas (User.js, Hostel.js, Enquiry.js)
│   ├── routes/            # Express Routers mapping endpoints to controllers
│   ├── server.js          # Entry point for the backend server
│   └── .env               # Environment variables (DB URI, JWT secret, Cloudinary keys)
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
│   └── admin-dashboard.html   # Protected route HTML for Admin
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

### Hostel
Stores property details. Linkable to Owner.
- **Fields**: `ownerId`, `name`, `description`, `address`, `city`, `state`, `pincode`, `monthlyPrice`, `dailyPrice`, `depositAmount`, `rules`, `googleMapLink`, `keywords` (Array of strings).
- **Images**: Sorted into arrays `buildingPhotos`, `roomPhotos`, `messPhotos`, `washroomPhotos`.
- **Status/Metrics**: `isApproved` (Boolean, handled by Admin), `views` (Number).
- **Amenities**: `foodAvailability` (Boolean), `foodDetails` (String).

### Enquiry
Manages messages between Students and Owners.
- **Fields**: `studentId`, `ownerId`, `hostelId`, `message`.
- **Status Tracking**: `status` (Enum: 'Pending', 'Responded', 'Closed').
- **Admin Response**: `adminResponse` (Admin can leave official replies on enquiries).

## 4. Working Workflows

### 4.1. Authentication Flow
1. User submits `signup.html` or `login.html`.
2. Backend `authController.js` validates credentials, hashes passwords (via Mongoose `pre('save')` hook), and returns a User object along with a JWT token.
3. Frontend saves JWT to `localStorage` and redirects to the appropriate dashboard based on `role`.

### 4.2. Property Listing & Approval Flow (Owner -> Admin)
1. **Verification**: Owners must complete their profile and request verification. 
2. **Admin Verify**: Admin views pending verifications in `admin-dashboard.html` and approves them. Admin can also send custom notifications to the owner.
3. **Add Listing**: Verified Owners can upload Hostels (categorized images uploaded directly to Cloudinary via Buffers in RAM to avoid disk usage).
4. **Approval**: Uploaded Hostels default to `isApproved: false`. The Admin reviews and approves them.
5. **Discovery**: Students only see Hostels where `isApproved` is `true`.

### 4.3. Enquiry Loop
1. Student views a Hostel and clicks "Send Enquiry".
2. Owner receives the enquiry, reads the context, and marks it as "Responded" or "Closed".
3. Admin can view all enquiries globally and intervene by providing an `adminResponse` on the platform.

### 4.4. Deactivation & Data Cascade Cleanup Flow
1. Student or Owner requests account deletion via "Danger Zone".
2. Admin reviews request in "System Requests" tab.
3. If approved:
   - If User is Owner: Backend finds all owned `Hostel` IDs, deletes the `Hostel` documents, deletes matching `Enquiry` documents, and **cascades** the deletion by stripping those `Hostel` IDs from all Student `savedHostels` arrays.
   - User account is completely wiped from the DB.

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
- **Global Pages**: 
  - `guide.html`: A comprehensive, premium user manual explaining the platform's features for students and owners with step-by-step visuals and instructions.
  - `about.html`: Detailed vision, mission, and technical highlights of the HostelBuddy ecosystem.
  - `privacy.html`: Official standard platform privacy policy and data management guidelines.
  - `safety.html`: Essential safety practices and guidelines for students and owners.
  - `terms.html`: User roles, account responsibilities, and platform facilitation rules.
- **Animations**: Handled primarily via GSAP, with native CSS transitions and `transform: preserve-3d` fallback for card hover effects (`.card-3d`).

## 6. Key API Reference Matrix

| Prefix             | Endpoint                     | Method | Role Required | Description                                  |
|--------------------|------------------------------|--------|---------------|----------------------------------------------|
| `/api/auth`        | `/register`                  | POST   | None          | Creates new User account                     |
|                    | `/login`                     | POST   | None          | Returns JWT token                            |
|                    | `/me`                        | GET    | Any matched   | Returns current logged-in user profile       |
| `/api/profiles`    | `/student` or `/owner`       | PUT    | Student/Owner | Updates respective profile details           |
|                    | `/notifications`             | GET    | Any           | Get unread messages sent by admin            |
|                    | `/request-deactivation`      | POST   | Any           | Flag account for admin deletion              |
| `/api/hostels`     | `/`                          | GET    | Student       | Discover active/approved hostels             |
|                    | `/`                          | POST   | Owner         | Submit new hostel listing                    |
| `/api/enquiries`   | `/`                          | POST   | Student       | Start a conversation about a property        |
|                    | `/:id/status`                | PUT    | Owner         | Update enquiry lifecycle state               |
|                    | `/:id`                       | DELETE | Owner/Student | Clear enquiry from dashboard history         |
| `/api/admin`       | `/analytics`                 | GET    | Admin         | Platform metrics                             |
|                    | `/deactivations/:id`         | PUT    | Admin         | Approve (delete user + cascade) or Reject    |
|                    | `/notify-owner/:id`          | POST   | Admin         | Dispatch warning/info message to owner       |

## 7. Deployment Considerations
When preparing to deploy (e.g., Render, Heroku, Vercel for frontend/Railway for backend):
1. **Environment Variables**: Make sure the production `.env` contains:
   - `PORT` (usually provided by host)
   - `MONGO_URI` (production MongoDB atlas link)
   - `JWT_SECRET` & `JWT_EXPIRE`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
2. **CORS Configuration**: Change `server.js` cors options to only allow requests from the live frontend origin rather than `localhost`.
