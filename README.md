# Smart Reports System

Smart Reports is a mobile application that allows citizens to report incidents to government departments such as police, traffic, municipality, and sanitation.

The system provides a structured workflow where reports are submitted, reviewed, processed, and resolved by the responsible departments.

This project was developed as a Graduation Project in the Information Technology program.

---

# System Architecture

The system consists of two main components:

Mobile Application (Frontend)
- Built with React Native using Expo

Backend API
- Built with Node.js and Express

Database
- Microsoft SQL Server

---

# Features

### User
- Create account
- Login
- Submit reports with location
- Attach images or videos
- Track report status

### Employee
- View department reports
- Change report status
- View reporter information

### Manager
- Manage employees
- Monitor department reports

### Admin
- Manage departments
- Manage managers
- View system statistics

---

# Technologies Used

Frontend
- React Native
- Expo
- AsyncStorage
- Expo Location
- Expo Image Picker

Backend
- Node.js
- Express.js
- bcryptjs
- JWT Authentication

Database
- Microsoft SQL Server

---

---

# Installation

Clone the repository
git clone https://github.com/Muhanad705/project.git


#Install frontend dependencies

npm install

#Install backend dependencies

cd backend

npm install
# Environment Setup

Create a `.env` file inside the backend folder:


PORT=4000

DB_USER=sa

DB_PASSWORD=123456

DB_SERVER=localhost

DB_NAME=SmartReports

# Running the Project

Start backend server


cd backend

npm run dev

# Future Improvements

- Push Notifications
- Real-time report updates
- Map visualization
- Admin web dashboard
