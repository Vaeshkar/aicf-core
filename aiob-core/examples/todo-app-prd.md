# Todo List App - Product Requirements Document (PRD)

## Project Overview
Build a simple, working todo list web application that demonstrates AIOB's ability to create real, functional software from a PRD.

## Technical Requirements

### Technology Stack
- **Frontend**: HTML, CSS, vanilla JavaScript
- **Backend**: Node.js with Express
- **Database**: JSON file (simple storage)
- **No frameworks**: Keep it simple and dependency-light

### Project Structure
```
todo-app/
├── package.json
├── server.js
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── data/
    └── todos.json
```

## Functional Requirements

### Core Features
1. **Add Todo**: User can create new todo items
2. **View Todos**: Display all todos in a list
3. **Mark Complete**: Toggle todo completion status
4. **Delete Todo**: Remove todos permanently
5. **Persist Data**: Save todos to file system

### User Interface
- Clean, minimal design
- Responsive layout
- Add new todo input field
- Todo list with checkboxes
- Delete buttons for each item
- Visual distinction for completed items

### API Endpoints
- `GET /api/todos` - Get all todos
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo (toggle complete)
- `DELETE /api/todos/:id` - Delete todo

## Success Criteria
- [ ] Application runs with `npm start`
- [ ] Frontend loads in browser
- [ ] Can add new todos
- [ ] Can mark todos as complete/incomplete
- [ ] Can delete todos
- [ ] Data persists across server restarts
- [ ] Clean, usable interface

## File Specifications

### package.json
```json
{
  "name": "aiob-todo-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

### server.js Requirements
- Express server on port 3000
- Serve static files from public/
- JSON file-based storage in data/todos.json
- All CRUD API endpoints
- Error handling

### Frontend Requirements
- Single page application
- No external dependencies
- Modern JavaScript (ES6+)
- Responsive CSS
- Accessible HTML structure

## Delegation Strategy for AIOB

### Step 1: Project Setup (Infrastructure AI)
- Create project directory structure
- Generate package.json
- Initialize data/todos.json

### Step 2: Backend Development (Backend AI) 
- Build Express server (server.js)
- Implement all API endpoints
- Add file-based data persistence
- Error handling and validation

### Step 3: Frontend Development (Frontend AI)
- Create HTML structure (index.html)
- Style the interface (style.css) 
- Implement JavaScript functionality (script.js)
- API integration and DOM manipulation

### Step 4: Integration & Testing (QA AI)
- Test all functionality end-to-end
- Fix any integration issues
- Verify success criteria are met
- Document final setup instructions

## Expected Deliverables
1. Complete working todo application
2. All files created in specified structure
3. Application passes all success criteria
4. Ready-to-run with simple `npm start`

---

**AIOB Instructions:**
This PRD should be read and executed by AIOB to create a real, working todo application. Each AI should focus on their delegated area while ensuring integration works seamlessly.