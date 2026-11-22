# Walker Crew Hours — Setup

One file (`index.html`). Opens in demo mode with sample crews, jobs, and two weeks of hours so you can pitch it right away. Add Firebase later to make it live.

## 1. Host it (GitHub Pages)
QR codes need a real web address, so a local file won't work for posters.

Upload these to the root of your repo (keep the `icons` folder as a folder):
```
index.html
manifest.json
sw.js
icons/icon-192.png
icons/icon-512.png
icons/icon-maskable-512.png
icons/apple-touch-icon.png
```
Repo **Settings → Pages → Deploy from branch → main / root**. App lives at `https://timothybrinkman.github.io/<repo>/`.

### Install it on a phone
- **iPhone / iPad:** open the link in **Safari** → **Share** → **Add to Home Screen** → **Add**.
- **Android:** open in **Chrome** → **⋮** menu → **Install app**. (Office users: Settings tab has an **Install** button when Chrome offers it.)

Open it once with signal after installing. After that it opens with no signal, and QR poster links work offline too.

### Pushing an update
Change `VERSION` at the top of `sw.js` (e.g. `crew-hours-v1.1.1`) every time you upload a new `index.html`. Installed phones grab the new version the next time they open with signal and show "App updated — reopen to see changes." Saved hours are never touched by an update.

## 2. Demo mode (for the pitch)
- First screen asks "Who's using this phone?" — pick a worker, a foreman, or **Jill Hansen (office)** to show each view. Tap the name chip at top right to switch.
- **Settings → Reset demo** restores the sample data anytime.

## 3. How crews use it
1. Office creates a job → **QR poster** → Print. Tape it in the job trailer/gang box.
2. Worker points their phone camera at the poster → app opens on that job → picks a task (Footings, Walls, Pour…) → **Clock in**. GPS is checked against the job pin; clock-ins farther than the on-site radius get flagged for the office.
3. Scanning another job's poster switches jobs automatically. Scanning the same poster again = clock out.
4. At clock-out: lunch/break minutes, notes, and optional machine hour-meter readings + problems for the shop.
5. Foremen see who's on the clock, can clock out someone who forgot, and add/fix entries for their crew.
6. Office: Dashboard, Timesheets (weekly grid, OT over 40), **Payroll CSV** and **Detail CSV**, Jobs with hours/cost breakdowns, Crew, Equipment service tracking.

## 4. Turn on crew sync (Firebase) — for the customer, later
Not needed for the demo. Without it, each phone keeps its own data.

1. https://console.firebase.google.com → **Add project** (Analytics off is fine).
2. **Build → Authentication → Get started → Google** → Enable.
   Authentication → **Settings → Authorized domains** → add `timothybrinkman.github.io`.
3. **Build → Firestore Database → Create database** (production mode, `us-central`).
4. **Rules** tab → paste the rules below → Publish.
5. **Data** tab → Start collection `roles` → Document ID = **your Google email, all lowercase** → field `role` (string) = `office`. This makes you the first admin.
6. **Project settings (gear) → Your apps → Web (</>)** → register app → copy the `firebaseConfig = { … }` block.
7. In the app: **Settings → Crew sync** → paste → **Connect crew sync** → sign in with Google.
8. Add each person under **Crew** with their Google email. That email is what lets them sign in.

Each phone connects once (step 7). Demo data stays on the demo device and isn't uploaded.

### Firestore security rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function email()  { return request.auth.token.email.lower(); }
    function roleDoc(){ return get(/databases/$(database)/documents/roles/$(email())).data; }
    function member() { return request.auth != null && exists(/databases/$(database)/documents/roles/$(email())); }
    function office() { return member() && roleDoc().role == 'office'; }
    function lead()   { return member() && roleDoc().role in ['office','foreman']; }

    match /roles/{e}      { allow read: if request.auth != null && (e == email() || office()); allow write: if office(); }
    match /employees/{id} { allow read: if member(); allow write: if office(); }
    match /jobs/{id}      { allow read: if member(); allow write: if office(); }
    match /config/{id}    { allow read: if member(); allow write: if office(); }
    match /equipment/{id} { allow read, write: if member(); }
    match /equiplogs/{id} { allow read, write: if member(); }
    match /entries/{id} {
      allow read: if member();
      allow create, update: if lead() || (member() && request.resource.data.empId == roleDoc().empId);
      allow delete: if lead();
    }
  }
}
```
Workers can only create/edit their own time. Foremen and office can edit anyone's. Only office manages crew, jobs, and settings.

## 5. Before printing posters
**Settings → App link** — set it to the GitHub Pages address if you're printing from another copy. Every QR encodes `<app link>?job=<job id>`, so posters never need reprinting unless the address changes.

## Known limits (v1)
- Crew sync needs a signal to open the app the first time each day; entries made with a weak signal queue and sync later.
- Pay week and OT threshold are one setting for everyone (default Mon–Sun, 40 hrs).
- Job labor cost uses straight-time rates; the OT premium shows on Timesheets/payroll.
