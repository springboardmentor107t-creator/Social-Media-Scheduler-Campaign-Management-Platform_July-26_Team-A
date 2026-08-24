# SocialPilot End-to-End Walkthrough Guide

This walkthrough documents the full core user flow and capabilities of the SocialPilot platform.

---

## 1. 🔑 User Onboarding & Auth Lifecycle

### Registration
1. Navigate to `http://localhost:5173/` which redirects to `/login`.
2. Click **Create an Account** to switch to Sign-up mode.
3. Fill in **Full Name**, **Work Email**, **Username**, and **Password**.
4. Select a Workspace Role:
   - 🛡️ **Administrator**: System settings, full integration authority.
   - 📢 **Marketing Manager**: Campaign planning, approvals, analytics.
   - ✍️ **Content Creator**: Drafting posts, scheduling requests.
5. Click **Create Account** to finalize registration and trigger the initial workspace setup.

### Login & Session Persistence
1. Input your registered email and password on the Login form.
2. Click **Log In**. The application issues a JWT token set (Access + Refresh tokens) stored securely in `localStorage`.
3. The platform redirects you automatically to the dashboard layout corresponding to your role via the `RoleGate` routing system.

---

## 2. 🔗 Connecting Social Accounts

1. Navigate to the **Connect Accounts** tab from the sidebar.
2. Select one of the available platform cards:
   - **Facebook / Instagram**: Connects pages or business accounts using OAuth.
   - **YouTube**: Authorizes channels to publish videos/shorts.
   - **X (Twitter) / LinkedIn**: Integrates profile/page publishing.
3. Once authenticated, the channel name and status will show as **Connected** with options to Sync or Disconnect.

---

## 3. 🎯 Campaign Control Center

1. Navigate to the **Campaigns** tab.
2. The page displays a high-level summary:
   - **Total Campaigns** & **Active Campaigns** cards.
   - A search bar for filtering campaigns by name/description.
   - A status dropdown filter (All, Active, Scheduled, Completed, Draft).
3. **Interactive Status Updates**: Change any campaign's status directly using the dropdown inline in the list table; updates are saved immediately to the backend.
4. **Create a Campaign**: Click **+ Create New Campaign**, fill in Name, Description, Budget, and Target Audience, and hit **Submit**.

---

## ✍️ 4. Post Creation, Preview, & Scheduling

1. Navigate to **Post Creator** (or click **+ Schedule Post** on a campaign).
2. Input a **Title** (real-time validation ensures title is under 255 characters).
3. Select your destination **Social Accounts** from the checkboxes.
4. Type your caption or post body.
5. Review the **Live Multi-Platform Preview Sandbox** on the right side of the editor. Toggle tabs to see mockups of how the post will look on Instagram, Facebook, YouTube, or X.
6. Check the **Best Time to Post** recommendations based on active hours.
7. Choose a scheduling mode:
   - **Save Draft**: Saves the post content for later editing.
   - **Publish Now**: Sends publishing requests to connected platforms immediately.
   - **Schedule Later**: Select a specific date/time for automated publishing.
8. Click **Schedule Post** or **Save as Draft** to submit.

---

## 📅 5. Content Calendar

1. Navigate to the **Calendar** tab.
2. Visual grid representing weeks/days of the month.
3. Any scheduled posts appear on their respective calendar day as card blocks featuring:
   - Color-coded platform icon badges.
   - Post title.
   - Current status (`Pending Approval`, `Approved`, `Published`, `Failed`).

---

## 👥 6. Team & Workspace Governance

1. Navigate to the **Team** tab.
2. View all workspace members.
3. Use the search bar to find members by name or email.
4. **Actions**:
   - Change a member's role (Administrator, Marketing, Creator).
   - Toggle **Active/Deactivated** switch (deactivating immediately revokes platform access).
5. Read the **Permissions Reference Matrix** at the bottom of the page to review role restrictions.

---

## 🔔 7. Notifications

1. Look at the top header notification bell.
2. Clicking it opens the **Notification Center** panel, showing recent alerts for:
   - Newly created campaigns.
   - Completed/published scheduled posts.
   - Actions requiring approval.
3. Click **Mark all as read** to clear unread counts.
