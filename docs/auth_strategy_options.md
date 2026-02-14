# Authorization Strategy Options

## The Problem
Your users log in with **Firebase Auth**, but your database is **Supabase (PostgreSQL)**.
- Supabase expects a **Supabase Token** to know "who is asking."
- Firebase gives a **Firebase Token**.
- Result: Supabase thinks everyone is **Anonymous**.

Currently, we bypass this by manually passing the `user_id` to special "Safety Deposit Box" functions (RPCs). This works, but it means we can't use standard Supabase features like "Row Level Security" easily.

---

## Option 1: The "Big Switch" (Migrate to Supabase Auth)
**Stop using Firebase Auth and move everything to Supabase Auth.**

- **Pros:**
    - **Native Integration:** `auth.uid()` works instantly in database policies. No more custom RPCs needed for basic reads/writes.
    - **Less Code:** Deletes all the manual "user ID passing" logic in the frontend.
    - **Cheaper/Simpler:** One less service to pay for/manage (Firebase).
- **Cons:**
    - **Migration Effort:** Users would need to reset passwords (unless we export hashes, which is hard).
    - **Code Change:** Rewrite `Login.tsx`, `Signup.tsx`, and `AuthContext.tsx`.
- **Verdict:** **Best Long-Term Strategy.** Ideally done before you have thousands of users.

## Option 2: The "Bridge" (Custom JWT)
**Keep Firebase Login, but "teach" Supabase to trust it.**

- **How it works:**
    1. User logs in with Firebase.
    2. Frontend sends Firebase Token to a backend function (Edge Function).
    3. Backend verifies Firebase Token -> Signs a new **Supabase Token** (JWT) with the same User ID.
    4. Frontend uses this *new* token to talk to the database.
- **Pros:**
    - **No User Impact:** Users keep their existing accounts/passwords.
    - **Native RLS:** Supabase will "see" the correct User ID, so standard policies work again.
- **Cons:**
    - **High Complexity:** You must maintain a sensitive "Token Minting" service. If this breaks, nobody can log in.
    - **Double Tokens:** Frontend has to juggle two different session tokens.
- **Verdict:** Good if you are *stuck* with Firebase (e.g., you use other Firebase features like Firestore/Analytics heavily).

## Option 3: The "Status Quo" (RPC Pattern)
**Keep doing what we just did today.**

- **How it works:**
    - Every time we need to read/write data, we write a specific SQL Function (RPC) that takes a `user_id` argument.
    - We secure these functions individually.
- **Pros:**
    - **Zero Migration:** No changes to login or existing users.
    - **Granular Control:** We know exactly what every query does.
- **Cons:**
    - **Tedious:** You cannot just say `supabase.from('table').select()`. You must write a function for *everything* (filtering, pagination, sorting).
    - **Tech Debt:** Your database fills up with hundreds of small functions.
- **Verdict:** Acceptable for a Pilot/MVP, but painful to scale.

---

## Recommendation
Since you are still in **Pilot Phase**:
1.  **If you have very few real users:** **Option 1 (Migrate)** is the cleanest way forward. It simplifies your architecture significantly.
2.  **If you cannot migrate:** **Option 3** is fine for now, but we should standardize how we write these RPCs to keep them organized.
