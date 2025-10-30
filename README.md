MY GROCERY BUDDY
A Full-Stack Grocery List Web Application

Repository: Grocery Buddy

PROJECT OVERVIEW

My Grocery Buddy is a full-stack web application that allows users to create accounts, log in securely, and manage their personal grocery lists.
Each user can add, edit, mark complete, or delete grocery items — all stored securely in a MongoDB database and only accessible to the authenticated user.

This project demonstrates the use of Node.js, Express, MongoDB, and Frontend JavaScript to build a complete CRUD and authentication-based web app.

 Feature
 USER AUTHENTICATION

Register new users with validation

Login with email/username and password

Passwords securely hashed using bcrypt

Session management for logged-in users

Protected routes (only accessible when authenticated)

 GROCERYLIAT MANAGEMENT

Add new grocery items with name, quantity, and category

Edit or delete existing items

Mark items as completed or active

Display items grouped by category

Show total, completed, and remaining item counts

ENHANCED FUNCTIONALITY

Filter items by All, Active, or Completed

Bulk actions:

Clear all completed items

Clear all items (with confirmation)

Responsive design for both mobile and desktop

Real-time feedback for success and error messages

TECH STACK
Layer	Technology
Frontend	HTML, CSS, JavaScript
Backend	Node.js, Express.js
Database	MongoDB (Mongoose)
Authentication	bcrypt, express-session
HTTP Requests	Fetch API / Axios
Environment Config	dotenv
PROJECT STRUCTURE
my-grocery-buddy/
│
├── server.js                 # Main application file
├── package.json              # Project dependencies and scripts
├── .env                      # Environment variables (not committed)
│
├── /public                   # Static files (CSS, JS, images)
│   
│   ├── /js
│   └── /images
│
├── /views                    # Pug templates / HTML pages
│   ├── register.pug
│   ├── login.pug
│   └── dashboard.pug
│
├── /models                   # Database schemas (User, GroceryItem)
├── /routes                   # Application routes (auth, grocery)
            

 INSTALLATION AND SETUP

Follow these steps to run the project locally:

CLONE THE REPOSITORY
git clone https://github.com/Desire-coder-wq/Grocery-buddy.git
cd Grocery-buddy

Install Dependencies
npm install

SETUP ENVIRONMENT VARIABLES

Create a .env file in the root directory and include:

PORT=5000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_secret_key
RUN THE SERVER
npm start


Then visit:
http://localhost:5000

 HOW IT WORKS
1. Registration Page

Users sign up with username, email, and password.

Validation ensures all inputs are correct and unique.

Passwords are hashed before being stored in MongoDB.

2. Login Page

Users log in with credentials.

A session is created to maintain the logged-in state.

On success, the user is redirected to their grocery list.

GROCERYLIST PAGE

Displays all items belonging to the logged-in user.

Items can be created, updated, marked complete, or deleted.

Filters and statistics provide insights into user activity.

 EXAMPLE CATEGORIES

Produce

Dairy

Meat

Bakery

Pantry

Frozen

Beverages

Snacks

Other



 TEAM

Desire Rose Asingura
Kasande Emily

🔗 GitHub Profile

💬 Acknowledgements

Special thanks to our instructors and mentors for their guidance throughout the development of this project.
My Grocery Buddy was built to demonstrate practical full-stack development skills, covering authentication, CRUD operations, and database integration with a focus on clean design and user experience.
