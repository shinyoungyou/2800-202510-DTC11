# AllergyPal

## Team DTC-11:

Adam Kenny, Shinyoung You, Derek Jang, Ryan Song

## Overview

A summary of the app’s aim and the context that inspired its creation.

We created an allergy scanning app that allows users to quickly check products if they contain specific ingredients by scanning a product's label or barcode. This app is designed for people with allergies or health-conscious consumers so that they can save time and reduce the potential for user error when checking ingredients.

## Setup

The basic setup instructions to prepare your device to use the app.

Install Visual Studio Code, clone the repository from GitHub, navigate to the backend directory, run `npm install` to fetch dependencies, then create a `.env` file and add a Gemini API key.

## Usage

The typical workflow or commands required to use the app.

Run the backend server, open the app on your mobile device, and scan or search a product to see real-time allergen insights.

## Features

The functions or tasks that the app can perform to deliver value to its users.

- Barcode scanning
- Allergen highlighting
- Alternative product recommendations
- Personalized history of previous scans

## Technology Stack

The collection of front-end, back-end, and database tools used to build and run the application.

### Front-end

- HTML
- Tailwind CSS
- Vanilla JavaScript

### Back-end

- Node.js
- Express.js
- Mongoose
- Gemini AI

### Databases

- MongoDB
- External data from OpenFoodFacts and Allergen datasets

## Files

Content of the project folder:

```
Top level of project folder:
├── README.md               # Documentation for the project
├── backend                 # Folder containing backend logic and server-side routes
│   ├── package-lock.json   # Lock file for backend dependencies
│   ├── package.json        # Lists backend dependencies and scripts
│   ├── product.js          # API route for handling product-related data
│   ├── scan.js             # API route for processing barcode scans and allergens
│   ├── server.js           # Main Express server configuration and entry point
│   └── testGemini.js       # Script to test Gemini AI functionality
├── frontend                # Folder containing all frontend pages, scripts, and UI assets
│   ├── alternative-details.html  # Page for showing alternative product suggestions
│   ├── history.js                # Displays and manages scan history on the frontend
│   ├── home_page.html            # Main homepage after login
│   ├── icons                     # Folder of allergen and UI-related icons
│   │   ├── celery.png            # Celery allergen icon
│   │   ├── egg.png               # Egg allergen icon
│   │   ├── fish.png              # Fish allergen icon
│   │   ├── history-fill.png      # Filled version of the history icon
│   │   ├── history-outlined.png  # Outlined version of the history icon
│   │   ├── lupin.png             # Lupin allergen icon
│   │   ├── milk.png              # Milk allergen icon
│   │   ├── mussel.png            # Mussel allergen icon
│   │   ├── mustard.png           # Mustard allergen icon
│   │   ├── nut.png               # Tree nut allergen icon
│   │   ├── peanut.png            # Peanut allergen icon
│   │   ├── profile-fill.png      # Filled profile icon
│   │   ├── profile-outlined.png  # Outlined profile icon
│   │   ├── scan-fill.png         # Filled scan icon
│   │   ├── scan-outlined.png     # Outlined scan icon
│   │   ├── sesame.png            # Sesame allergen icon
│   │   ├── shrimp.png            # Shrimp allergen icon
│   │   ├── soy.png               # Soy allergen icon
│   │   ├── sulphite.png          # Sulphite allergen icon
│   │   └── wheat.png             # Wheat allergen icon
│   ├── index.html                # Main HTML file or entry page
│   ├── product_page.html         # Product detail page with allergen breakdown
│   ├── scan.html                 # Camera-based barcode scanning interface
│   └── scan.js                   # JavaScript logic for scanning and UI rendering
├── images                 # Folder containing shared navigation and UI icons
│   ├── back-button.svg    # Icon for going back to previous page
│   ├── home-button.svg    # Icon for navigating to homepage
│   ├── menu-button.svg    # Icon for opening navigation menu
│   ├── profile-button.svg # Icon for accessing user profile
│   └── scanner-button.svg # Icon to open or start scanning
├── package-lock.json      # Top-level project lock file for dependencies
└── style.css              # Global stylesheet applied across frontend pages

