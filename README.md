# Project Title: AllergyPal

## Team DTC-11:

Adam Kenny, Shinyoung You, Derek Jang, Ryan Song

## Project Description

A summary of the app’s aim and the context that inspired its creation.

We created an allergy scanning app that allows users to quickly check products if they contain specific ingredients by scanning a product's label or barcode. This app is designed for people with allergies or health-conscious consumers so that they can save time and reduce the potential for user error when checking ingredients.

## Project Technologies

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

## List of Files

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

```

## Installation

Follow these steps to set up the project on your machine:

1. **Install tools**  
   - [Node.js 18.17.0](https://nodejs.org/) (includes npm)  
   - [MongoDB Community 6.0](https://www.mongodb.com/try/download/community)  

2. **Clone repository**  
   ```bash
   git clone https://github.com/your-org/allergypal.git
   cd allergypal
3. **How to run the project**
    ```
    cd backend
    npm install
    npm start
    ```
    then create a `.env` file and add a Gemini API key.

## Usage

1. Open http://localhost:3000 on your phone or browser.
2. Scan a barcode or enter one manually.
3. View allergens, get safe alternative suggestions, and save scans to your history.

## Features

The functions or tasks that the app can perform to deliver value to its users.

- Barcode scanning
- Allergen highlighting
- Alternative product recommendations
- Personalized history of previous scans

### Credits
- OpenFoodFacts API — product data.
- Gemini AI API — missing allergen checks.
- Tailwind Labs — Tailwind CSS framework.
- Zxing Library — scanning barcodes.
- 14 EU allergens — the list of allergens that manufacturers of food sold in the European Union must label under EU law