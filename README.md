<!-- HEADER SECTION -->

<div align="center">
<br />
<h1>💎 S T E R L I N G</h1>
<h3>The Pixel-Perfect, AI-Powered Financial Operating System</h3>
<br />

<!-- NAVIGATION -->

<p>
<a href="#-overview"><b>Overview</b></a> •
<a href="#-features"><b>Features</b></a> •
<a href="#-setup"><b>Setup</b></a> •
<a href="#-support"><b>Support</b></a>
</p>
<br />
</div>

<!-- OVERVIEW -->

<h2 id="-overview">👾 Overview</h2>
<p align="center">
<b>Sterling</b> is a "Bring Your Own Backend" (BYOB) finance app. It combines the aesthetics of <b>Pixel Material You</b> with the power of <b>Google Gemini AI</b>. The code runs in your browser. The data lives in <i>your</i> Firebase. You own everything.
</p>
<br />

<!-- FEATURE CARDS (HTML TABLE) -->

<h2 id="-features">🍱 Features</h2>
<table width="100%">
<tr>
<td width="50%" valign="top">
<h3 align="center">🤖 AI Receipt Scanning</h3>
<p align="center">
Upload receipts or paychecks. <b>Gemini AI</b> extracts merchants, dates, amounts, and detects tax-deductible expenses automatically.
</p>
</td>
<td width="50%" valign="top">
<h3 align="center">📈 Net Worth Pulse</h3>
<p align="center">
Track real wealth. Manage <b>Index Funds, ISAs, Crypto, and Savings</b> alongside your daily cash flow in a unified dashboard.
</p>
</td>
</tr>
<tr>
<td width="50%" valign="top">
<h3 align="center">🛡️ Zero-Key Security</h3>
<p align="center">
<b>No hardcoded keys.</b> Credentials are injected via the Settings UI and stored in your browser's <code>LocalStorage</code>.
</p>
</td>
<td width="50%" valign="top">
<h3 align="center">🇬🇧 UK Native</h3>
<p align="center">
Built for the UK. Defaults to <b>GBP (£)</b>, handles Tax Year logic, and includes specific asset classes like Pensions and ISAs.
</p>
</td>
</tr>
</table>

<br />

<!-- SETUP GUIDE (COLLAPSIBLE HTML) -->

<h2 id="-setup">🚀 Setup Guide</h2>

<b>1. Clone & Run</b>

<pre>
git clone https://github.com/drhaseeb/sterling.git
cd sterling
npm install
npm start
</pre>

<br />

<h3>⚙️ Configuration (Required)</h3>
<p>Sterling needs a backend. Follow these steps to link your own Firebase.</p>

<details>
<summary><b>🔥 Step 1: Create Firebase Project (Click to expand)</b></summary>
<br />
<ol>
<li>Go to <a href="https://console.firebase.google.com/">Firebase Console</a> and create project <b>"Sterling"</b>.</li>
<li><b>Build > Firestore Database</b>: Create in Production Mode.</li>
<li><b>Build > Authentication</b>: Enable <b>Email/Password</b> sign-in.</li>
<li><b>Project Settings</b>: Copy the <code>firebaseConfig</code> JSON object.</li>
</ol>
</details>

<details>
<summary><b>🔒 Step 2: Set Security Rules (Click to expand)</b></summary>
<br />
Paste this into your Firestore <b>Rules</b> tab to strictly lock data to the owner:
<pre>
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if isSignedIn() && isOwner(userId);
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
</pre>
</details>

<details>
<summary><b>🧠 Step 3: Activate AI (Click to expand)</b></summary>
<br />
<ol>
<li>Get a free API Key from <a href="https://aistudio.google.com/">Google AI Studio</a>.</li>
<li>Open your deployed Sterling app.</li>
<li>Go to <b>Settings</b> > Paste Config & Keys > <b>Save</b>.</li>
</ol>
</details>

<br />
<br />

<!-- DONATION CARD -->

<div align="center" id="-support">
<table width="60%">
<tr>
<td align="center">
<h3>❤️ Support the Project</h3>
<p>If Sterling helps you build wealth, consider buying me a coffee.</p>
<a href="https://www.buymeacoffee.com/drhaseeb" target"_blank">
<img src="https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
</a>
</td>
</tr>
</table>
<br />
<p>MIT License © drhaseeb</p>
<br />
</div>
