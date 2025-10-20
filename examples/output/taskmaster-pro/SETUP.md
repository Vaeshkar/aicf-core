# FullStackApp Setup Instructions

## Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation Steps

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

## Running Tests

1. Backend tests:
```bash
cd backend
npm test
```

2. Frontend tests:
```bash
cd frontend
npm test
```

## Common Issues & Solutions

- If API calls fail, ensure the backend server is running on port 3000
- If frontend won't start, check if port 3000 is already in use
- Clear browser cache if seeing stale data

## Environment Variables
Create a .env file in both frontend and backend directories:

Backend .env:
```
PORT=3000
NODE_ENV=development
```

Frontend .env:
```
REACT_APP_API_URL=http://localhost:3000/api
```
```

These additions provide:
- Comprehensive API endpoint testing
- Frontend integration testing
- Error boundary for graceful error handling
- Clear setup instructions

To implement these changes:
1. Add test scripts to package.json in both frontend and backend
2. Wrap the App component with ErrorBoundary
3. Add data-testid attributes to components for testing
4. Ensure proper error handling in API calls
5. Add environment variable support

Let me know if you need any clarification or additional enhancements!