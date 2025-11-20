<div align="center">

✦ S T E R L I N G

The Pixel-Perfect, AI-Powered Financial Operating System

<p align="center">
<a href="#-features">Features</a> •
<a href="#-setup-guide">Setup Guide</a> •
<a href="#-firebase-configuration">Firebase Config</a> •
<a href="#-privacy--terms">Privacy</a>
</p>
</div>

💎 Overview

Sterling is an open-source, all-in-one finance application designed for the modern era. It combines wealth tracking, budgeting, and investment monitoring into a single, elegant interface inspired by the "Material You" Pixel aesthetic.

Unlike traditional apps, Sterling is "Bring Your Own Backend" (BYOB). The code is public, but the data lives in your personal Firebase. You own your data. You own your keys.

✨ Features

<table>
<tr>
<td width="50%">
<h3 align="center">🤖 AI Receipt Scanning</h3>
<p align="center">Upload a photo of a receipt or paycheck. <b>Google Gemini AI</b> extracts the merchant, date, amount, and detects tax-deductible status automatically.</p>
</td>
<td width="50%">
<h3 align="center">📈 Wealth & Assets</h3>
<p align="center">Track not just cash flow, but <b>Net Worth</b>. Manage Index Funds, Savings Accounts (with APY), Real Estate, and Crypto in one portfolio view.</p>
</td>
</tr>
<tr>
<td width="50%">
<h3 align="center">🛡️ Zero-Key Security</h3>
<p align="center">No API keys are hardcoded. The app checks your browser's <b>LocalStorage</b> for credentials. You paste them in once, and they stay on your device.</p>
</td>
<td width="50%">
<h3 align="center">🇬🇧 UK Localization</h3>
<p align="center">Built for the UK market. Defaults to <b>GBP (£)</b>, includes ISA/Pension asset classes, and follows UK date formats.</p>
</td>
</tr>
</table>

🏗 Architecture

Sterling runs entirely in the browser. It connects directly to Firebase Firestore using credentials you provide at runtime.

🚀 Setup Guide

1. Clone & Install

git clone [https://github.com/drhaseeb/sterling.git](https://github.com/drhaseeb/sterling.git)
cd sterling
npm install


2. Run Locally

npm start


The app will open. It will look empty or show connection errors until you configure the Keys (see below).

3. Deployment (GitHub Pages)

You can host this for free on GitHub Pages.

Open package.json and add: "homepage": "https://drhaseeb.github.io/sterling"

Run:

npm run build
npm install --save-dev gh-pages
npm run deploy


Your app is now live! But it needs a backend.

🔥 Firebase Configuration

To use Sterling, you need a free Firebase project.

Step 1: Create Project

Go to console.firebase.google.com.

Click Add Project and name it "Sterling".

Disable Google Analytics (optional).

Step 2: Enable Database

Go to Build > Firestore Database.

Click Create Database.

Select a location (e.g., eur3 for UK).

Start in Production Mode.

Step 3: Set Security Rules (CRITICAL)

Go to the Rules tab in Firestore and paste this to ensure only you can access your data:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow authenticated users to read/write their OWN data
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}


Step 4: Enable Authentication

Go to Build > Authentication.

Click Get Started.

Select Anonymous and enable it. (Or enable Google Sign-In if you prefer).

Step 5: Get Your Keys

Go to Project Settings (Gear icon).

Scroll to "Your apps" -> Web App (</>).

Copy the firebaseConfig object (the part inside {...}).

Keep this safe.

Step 6: Get Gemini AI Key (Optional)

Go to aistudio.google.com.

Click Get API Key.

🔑 Launching the App

Open your deployed Sterling app (or localhost).

Go to the Settings (Config) tab.

Paste your Firebase Config JSON and your Gemini API Key.

Click Save.

Reload the page. You are now live!

⚖️ Privacy & Terms

Privacy Policy

Sterling does not collect your data.

This is a "Bring Your Own Backend" application.

Your financial data is stored exclusively in the Firebase project you control.

The developer of this repository has zero access to your data.

AI processing is sent to Google Gemini APIs but is not stored by this application.

Terms of Use

No Financial Advice: Sterling is a tracking tool. It does not provide financial advice.

Liability: The software is provided "as is". The creators are not responsible for data loss or financial discrepancies.

License

This project is licensed under the MIT License - you are free to use, modify, and distribute it.

<div align="center">

❤️ Support the Project

If Sterling helps you build wealth, consider buying me a coffee.

<a href="https://www.buymeacoffee.com/drhaseeb">
<img src="https://img.shields.io/badge/Donate-Buy%2520Me%2520A%2520Coffee-orange.svg%3Fstyle%3Dfor-the-badge%26logo%3Dbuy-me-a-coffee" alt="Buy Me A Coffee" />
</a>

<br />
<br />

<i>Built with pixel-perfect love.</i>

</div>
