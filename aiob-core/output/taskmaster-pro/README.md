# fullStackApp - Todo Application

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd fullStackApp
```

2. Backend Setup
```bash
cd backend
npm install
npm start
```

3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

4. Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## API Endpoints

- GET /api/todos - Get all todos
- POST /api/todos - Create new todo
- PUT /api/todos/:id - Update todo
- DELETE /api/todos/:id - Delete todo

## Error Handling

The application includes comprehensive error handling for:
- Invalid API requests
- Database errors
- Network issues
- Frontend validation

## Known Issues & Solutions

- If CORS errors occur, ensure backend is running on port 5000
- If database doesn't update, check file permissions on data/todos.json
```

These files provide:
- Comprehensive API testing
- Frontend component testing
- Error handling middleware
- Clear setup instructions
- Integration testing between frontend and backend

The tests will verify:
- API endpoint functionality
- Frontend-backend connection
- Data persistence
- Error handling
- Component rendering

To implement these changes:
1. Install required dependencies:
   ```bash
   npm install --save-dev jest supertest @testing-library/react @testing-library/jest-dom
   ```
2. Add test scripts to package.json in both frontend and backend
3. Run the tests to verify everything works correctly

Would you like me to provide any additional tests or specific error handling implementations?