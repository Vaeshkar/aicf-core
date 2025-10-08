# FullStackApp Setup Instructions

## Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation Steps

1. Clone the repository
```bash
git clone [repository-url]
cd fullStackApp
```

2. Install Backend Dependencies
```bash
cd backend
npm install
```

3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

4. Start the Backend Server
```bash
cd ../backend
npm start
```

5. Start the Frontend Development Server
```bash
cd ../frontend
npm run dev
```

## Running Tests
```bash
npm test
```

## Common Issues & Solutions

1. CORS Issues
   - Ensure backend CORS middleware is properly configured
   - Check frontend API_BASE_URL matches backend port

2. Database Connection
   - Verify JSON file permissions
   - Check file path in configuration

3. Port Conflicts
   - Backend default port: 3000
   - Frontend default port: 5173