# 🏙️ Hostel Buddy — Complete Core Architecture & Flow Blueprint
> **Creator & Lead Developer:** Raunak Sharma  
> **Type:** Full-Stack Enterprise Architecture Document  

This blueprint outlines the exact end-to-end operational flow of every single module, database schema interaction, and feature built into the Hostel Buddy ecosystem. **Nothing has been left out.**

---

## 🔐 1. Global Infrastructure & Security Layer
*The foundational layer handling sessions, security, and global utilities across all roles.*

```mermaid
flowchart TD
    A([User Access]) --> B[Global UI / Landing Page]
    B --> C(Dark Mode / Light Mode Engine)
    
    A --> D{Authentication System}
    D -->|Register| E[Create Pending User]
    E --> F[Generate 6-Digit OTP]
    F --> G[NodeMailer Dispatch HTML Email]
    G --> H[OTP Verification Modal]
    H -->|Success| I[Generate JWT & Set Role]
    
    D -->|Forgot Password| J[Generate Password Reset OTP]
    J --> K[Verify & Update bcrypt Hash]
    
    D -->|Login| L[Validate Hash & JWT]
    
    L --> M{XSS & Security Tunnel}
    M -.->|escapeHtml filtering| N[Sanitize All Inputs]
    M -.->|helmet.js / CORS| O[Secure Headers]
    
    I --> P(Role-Based Dashboard Routing)
    L --> P
```
**Covered Features:** Global Theme Toggles, OTP Registration, Forgot Password Recovery, Email Dispatching, JWT Sessons, Password Encryption, Global XSS Protection, Tour.js User Onboarding.

---

## 🎒 2. Student Ecosystem (The Consumer Flow)
*End-to-end journey of a student discovering and interacting with properties.*

```mermaid
flowchart TD
    S([Student Dashboard]) --> A[Live Sidebar Avatar & Profile]
    
    A --> B{Core Modules}
    B -->|Search| C[Discover Hostels Engine]
    C --> D[Advanced Map/Text Query]
    D --> E[Sort: Price, Rating, Views]
    E -->|No Results| F[Empty State City Suggestions]
    E -->|Results| G[3D Glassmorphism Cards]
    
    G --> H[Hostel Detail Modal]
    H --> I(View Amenities & Rules)
    H --> J(Categorized Image Gallery: Room, Mess, Washroom)
    H --> GM(Google Maps Integration 🌍)
    H --> K[Like / Save Property to 'My Hostels']
    H --> L[Write Review & Give Star Rating]
    H --> M[Star Rating & Comment Engine]
    M -.->|Recalculates| N[MongoDB Average Rating Auto-Update]
    
    H --> O[Send Direct Enquiry]
    O --> P[Database sets `isReadByOwner: false`]
    
    B -->|My Profile| Q[Update Personal/Parent Info]
    B -->|Saved Hostels| R[View & Unsave Bookmarks]
    B -->|Enquiries Tab| T[Real-Time Badge Sync]
    
    T -->|Auto-triggers| U[API `mark-read`]
    U --> V[View Owner/Admin Replies]
    
    B --> W[Leave Global Platform Feedback]
```
**Covered Features:** Advanced Sorting & Searching, Empty States, Glassmorphism UI, Save/Bookmark, Dynamic Ratings Calculation, Real-Time Badges, Full Photo Galleries, Feedback Engine, Profile Management, Atomic View Counting.

---

## 🏢 3. Owner Ecosystem (The Provider Flow)
*Property onboarding, Razorpay monetization, and bulk operational flows.*

```mermaid
flowchart TD
    O([Owner Dashboard]) --> A{KYC Verification Engine}
    A -->|Pending| B[Upload Aadhaar/Doc to Cloudinary]
    B --> C[Await Admin Approval]
    
    A -->|Verified| D[Dashboard KPIs & Revenue]
    
    D --> E{Property Management}
    E --> F[Add New Hostel]
    F --> G[Upload Parallel Images to Cloudinary]
    G --> H[Live Visual Progress Bar]
    H --> I[Listing Stored in Database]
    
    I --> J{Monetization Gateway}
    J --> K[Razorpay Subscription Prompt]
    K -->|Pay ₹259/mo| L[Signature Verification via crypto-hmac]
    L --> M[Listing Activated & Pending Admin Review]
    
    E --> N[View Live Expiry Dates]
    N -->|Dynamic Badges| O[Yellow: Expires Soon | Red: Expired]
    O --> P[1-Click Renew Button]
    
    D --> Q{Enquiry Management}
    Q --> R[Badge Driven Unread System]
    R -->|Open Tab| S[API `mark-read` clears badge]
    S --> T[Mass Operations: Bulk Delete 🗑️]
    S --> U[Granular: Reply to Student]
    U --> V[Backend sets `isReadByStudent: false`]
```
**Covered Features:** Aadhaar KYC Verification, Parallel Cloudinary Uploads with UI Progress, Razorpay ₹259/mo Gateway, Crypto-Signature Validation, Dynamic Expiration Badging, Bulk-Delete Enquiries, Live Responsive Chat Replier.

---

## 👑 4. Admin Ecosystem (The Controller Flow)
*System-wide God-Mode for managing users, finances, and data moderation.*

```mermaid
flowchart TD
    Ad([Admin Panel]) --> Z[Platform Global Analytics]
    
    Z --> A{Modular God-Mode Commands}
    
    A -->|1. Data Liquidation| B[Review 'Danger Zone' Requests]
    B -->|Approve Deactivation| C[Mongoose Cascading Cleanse]
    C -.->|Wipe Data| D[Wipe Hostels+Images+Enquiries+User]
    C -.->|Cleanse DB| E[Remove IDs from Student Bookmarks]
    
    A -->|2. Financial Oversight| F[Monitor Razorpay Pipelines]
    F -->|Manual Override| G[Grant/Revoke Listing Accessibility]
    
    A -->|3. Listing Approval| H[Review New Hostel Uploads]
    H -->|Approve| I[Listing Goes Public]
    
    A -->|4. Surveillance| J[Monitor Global Enquiries]
    J --> K[Inject Official 'Platform Response']
    
    A -->|5. Broadcasts| L[Create Platform Updates]
    L --> M[Push Megaphone Badge to Target Role]
    
    A -->|6. Review Moderation| N[Moderate/Delete Hostel Reviews]
    A -->|7. Local Alerts| O[Issue Custom Warnings to Specific Owners]
```
**Covered Features:** Comprehensive Cascade Deletions, Financial Real-Time Tracking, Manual Subscription Overrides, KYC Moderation, Listing Approval Pipeline, Global Enquiry Sniffing & Intervention, Platform-wide Updates Broadcast, Granular Target Notifications, Review Moderation.

---

## ⚙️ 5. Automated Background Workers (The Invisible Engine)
*Features that run automatically without human intervention to keep the system clean.*

```mermaid
flowchart LR
    SYS((Backend Node Engine)) --> A[Time-To-Live MongoDB Indexes]
    SYS --> B[Node-Cron Temporal Scheduler]
    
    A -.->|Auto-Purge 10 Days| C[Read/Unread Notifications]
    A -.->|Auto-Purge 30 Days| D[Closed Student-Owner Enquiries]
    A -.->|Auto-Purge 30 Days| E[Expired Platform Updates]
    
    B -.->|Triggers 8AM & 8PM| F[Global Expiration Scanner]
    F --> G{Is Hostel Expiring in ≤ 3 Days?}
    G -->|Yes| H[Auto-Dispatch Warning Email to Owner]
    G -->|Expired| I[Auto-Demote Listing Visibility]
```
**Covered Features:** MongoDB Native TTL Document Purging (Self-cleaning database), Node-Cron Automated Job Scheduling, Auto-Warning Dispatches, and Memory/Storage Optimization without external load.

---
> *Platform Architecture completely modeled and realized under the vision of **Raunak Sharma**.* 🚀
