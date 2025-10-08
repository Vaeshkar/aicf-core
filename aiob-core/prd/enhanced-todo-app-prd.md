# Enhanced Todo App - Product Requirements Document

## 🎯 **Executive Summary**
- **Product Name**: TaskMaster Pro
- **Version**: v2.0
- **Purpose**: A modern, fully-functional todo application with add, delete, edit, and status management capabilities
- **Target Platforms**: Web (Desktop, Tablet, Mobile responsive)
- **Tech Stack**: React 18, Node.js, Express, Tailwind CSS, JSON file storage

---

## 📱 **User Experience Requirements**

### Visual Design
- **Design Style**: Modern minimalist with subtle shadows and rounded corners
- **Color Scheme**: 
  - Primary: Blue (#3B82F6)
  - Secondary: Gray (#6B7280) 
  - Success: Green (#10B981)
  - Danger: Red (#EF4444)
  - Background: White (#FFFFFF) / Dark (#1F2937)
- **Typography**: Inter font family, 14-18px base size
- **Responsive Design**: Mobile-first, breakpoints at 768px (tablet), 1024px (desktop)
- **Theme Support**: Light and dark mode toggle in header

### User Interface Components
- **Header**: App title, theme toggle button, centered layout
- **Forms**: Rounded inputs with focus states, inline validation
- **Buttons**: Rounded with hover/active states, icon + text combinations
- **Todo Items**: Card-based layout with checkboxes, text, action buttons
- **Animations**: Smooth transitions (300ms), slide-in for new items

---

## ⚡ **Core Functionality Specifications**

### Feature 1: Add New Todo
**User Story**: As a user, I want to add new todo items so that I can track my tasks.

**Acceptance Criteria**:
- [ ] When I type in the input field and press Enter or click Add, a new todo is created
- [ ] When I submit an empty todo, I see validation error "Todo text is required"
- [ ] The input field clears after successfully adding a todo
- [ ] New todos appear at the top of the list with "pending" status

**UI/UX Details**:
- Input field: Full-width, placeholder "What needs to be done?", auto-focus
- Add button: Primary blue button with plus icon
- Success state: Brief green flash animation when todo is added
- Error state: Red border on input with error message below

**API Requirements**:
- Endpoint: `POST /api/todos`
- Request body: `{ "text": string, "priority": "low" | "medium" | "high" }`
- Response: `{ "id": number, "text": string, "completed": false, "priority": string, "created_at": string }`

### Feature 2: Display Todo List
**User Story**: As a user, I want to see all my todos in an organized list so that I can review my tasks.

**Acceptance Criteria**:
- [ ] All todos are displayed in a scrollable list
- [ ] Each todo shows: checkbox, text, priority badge, edit/delete buttons
- [ ] Completed todos have strikethrough text and grayed appearance
- [ ] Empty state shows "No todos yet. Add one above!" message

**UI/UX Details**:
- List container: Max height with scroll, subtle border
- Todo items: White cards with subtle shadow, padding, hover effects
- Priority badges: Colored pills (red=high, yellow=medium, blue=low)
- Empty state: Centered illustration or icon with helpful text

**API Requirements**:
- Endpoint: `GET /api/todos`
- Response: `Array<{ id: number, text: string, completed: boolean, priority: string, created_at: string }>`

### Feature 3: Toggle Todo Status
**User Story**: As a user, I want to mark todos as complete/incomplete so that I can track my progress.

**Acceptance Criteria**:
- [ ] When I click the checkbox, the todo status toggles
- [ ] Completed todos move to bottom of list and show strikethrough
- [ ] Status change is immediately saved and persisted
- [ ] Checkbox shows loading spinner during API call

**UI/UX Details**:
- Checkbox: Custom styled with checkmark animation
- Loading state: Small spinner replaces checkbox during save
- Completed style: Strikethrough text, reduced opacity
- Transition: Smooth animation when status changes

**API Requirements**:
- Endpoint: `PATCH /api/todos/:id`
- Request body: `{ "completed": boolean }`
- Response: `{ "id": number, "completed": boolean }`

### Feature 4: Delete Todo
**User Story**: As a user, I want to delete todos I no longer need so that I can keep my list clean.

**Acceptance Criteria**:
- [ ] When I click delete button, I see confirmation dialog
- [ ] When I confirm delete, the todo is removed from list and database
- [ ] When I cancel delete, the todo remains unchanged
- [ ] Delete action is irreversible once confirmed

**UI/UX Details**:
- Delete button: Red trash icon, appears on hover or always on mobile
- Confirmation dialog: Modal with "Are you sure?" and Cancel/Delete buttons
- Success feedback: Todo slides out with fade animation
- Error state: Show error message if delete fails

**API Requirements**:
- Endpoint: `DELETE /api/todos/:id`
- Response: `{ "success": true, "message": "Todo deleted" }`

### Feature 5: Edit Todo Text
**User Story**: As a user, I want to edit todo text so that I can update or correct my tasks.

**Acceptance Criteria**:
- [ ] When I double-click todo text, it becomes editable
- [ ] When I press Enter or click outside, changes are saved
- [ ] When I press Escape, editing is cancelled without saving
- [ ] Empty text shows validation error and prevents saving

**UI/UX Details**:
- Edit mode: Text becomes input field, auto-focus and select all
- Save indicators: Loading spinner, then brief success checkmark
- Cancel option: Escape key or click outside
- Visual feedback: Input border changes color based on state

**API Requirements**:
- Endpoint: `PATCH /api/todos/:id`
- Request body: `{ "text": string }`
- Response: `{ "id": number, "text": string }`

---

## 🔧 **Technical Implementation**

### Frontend Architecture
- **Framework**: React 18+ with functional components and hooks
- **State Management**: useState and useEffect for local state, custom hooks
- **Styling**: Tailwind CSS with custom component classes
- **UI Library**: Custom components with headless UI principles
- **Forms**: Native form handling with validation
- **HTTP Client**: Fetch API with async/await

### Backend Architecture
- **Runtime**: Node.js 18+
- **Framework**: Express.js with middleware
- **Database**: JSON file storage with fs operations
- **Validation**: Express-validator for request validation
- **Error Handling**: Custom error middleware
- **Logging**: Console logging with timestamps

### Data Models
```typescript
interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## 🎮 **User Interaction Flows**

### Flow 1: Adding a Todo
1. User opens app → sees todo list with input field at top
2. User types todo text in input field → text appears as they type
3. User presses Enter or clicks Add button → loading state shows briefly
4. On success → new todo appears at top of list, input clears, brief success animation
5. On error → error message appears below input, input keeps focus

### Flow 2: Completing a Todo
1. User sees unchecked todo in list → checkbox is empty
2. User clicks checkbox → loading spinner appears briefly
3. On success → checkbox fills with checkmark, text gets strikethrough, todo moves to bottom
4. On error → checkbox reverts to unchecked, error toast appears

### Flow 3: Deleting a Todo
1. User hovers over todo → delete button appears (red trash icon)
2. User clicks delete → confirmation modal opens with blur background
3. User clicks "Delete" → modal closes, todo slides out and disappears
4. User clicks "Cancel" → modal closes, no changes

---

## 📋 **Detailed Screen Specifications**

### Main Screen: Todo Dashboard
**Layout Description**:
- Header: "TaskMaster Pro" title (left), theme toggle button (right), 60px height
- Add Section: Input field + Add button, full width, sticky top, white background
- Todo List: Scrollable container, max-height 70vh, white cards with 8px gap
- Footer: Subtle gray text with todo count "X items remaining"

**Interactive Elements**:
- Input: `<input type="text" placeholder="What needs to be done?" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">`
- Add Button: Primary blue, rounded, with plus icon and "Add" text
- Todo Cards: White background, subtle shadow, 12px padding, hover:shadow-lg
- Checkboxes: Custom styled, 20px size, blue when checked
- Action Buttons: Edit (pencil icon), Delete (trash icon), show on hover

**Responsive Behavior**:
- Mobile (< 768px): Single column, touch-friendly 44px tap targets, full-width buttons
- Tablet (768-1024px): Same layout, larger text, hover states enabled
- Desktop (> 1024px): Max width 600px centered, full hover interactions, keyboard shortcuts

**Theme Variations**:
- Light Mode: White background, dark text, blue accents, gray borders
- Dark Mode: Dark gray background (#1F2937), light text, blue accents, darker borders

---

## 🧪 **Testing Requirements**

### Unit Tests
- [ ] POST /api/todos creates todo and returns correct response
- [ ] GET /api/todos returns all todos in correct format
- [ ] PATCH /api/todos/:id updates todo correctly
- [ ] DELETE /api/todos/:id removes todo from storage
- [ ] Input validation prevents empty todos
- [ ] Error handling works for invalid requests

### User Experience Tests
- [ ] App loads and shows empty state in < 2 seconds
- [ ] Adding todo works on first try (click Add or press Enter)
- [ ] Checking/unchecking todos updates UI immediately
- [ ] Delete confirmation prevents accidental deletions
- [ ] App works on mobile with touch interactions
- [ ] Theme toggle switches between light/dark correctly

---

## 🚀 **Success Criteria**

### MVP Definition
- [ ] Users can add new todos with text
- [ ] Users can see all todos in a scrollable list
- [ ] Users can mark todos as complete/incomplete
- [ ] Users can delete todos with confirmation
- [ ] Users can edit todo text inline
- [ ] App works on mobile, tablet, and desktop
- [ ] Data persists between page reloads

### Performance Metrics
- Page load time: < 2 seconds
- Todo operations (add/edit/delete): < 500ms response
- Smooth 60fps animations
- Works offline (uses cached data)

---

## 📤 **AI Task Delegation Strategy**

### Phase 1: Backend API (AI: Backend Developer)
**Task**: "Create Express.js server with full CRUD API for todos"
**Specific Requirements**:
- File: `server.js` - Express server setup with middleware
- File: `routes/todos.js` - All CRUD endpoints with validation
- File: `data/todos.json` - JSON file for data storage
- Endpoints: GET, POST, PATCH, DELETE /api/todos
- Error handling for all failure cases
- Request logging and validation

### Phase 2: React Frontend (AI: Frontend Developer)  
**Task**: "Create React todo app with Tailwind CSS styling"
**Specific Requirements**:
- File: `src/App.js` - Main component with state management
- File: `src/components/TodoForm.js` - Add todo form with validation
- File: `src/components/TodoList.js` - Display todos with all actions
- File: `src/components/TodoItem.js` - Individual todo with edit/delete
- File: `src/styles/globals.css` - Tailwind styles and custom animations
- All CRUD operations working with API calls

### Phase 3: Integration & Polish (AI: Full-Stack Developer)
**Task**: "Connect frontend to backend and add finishing touches"
**Specific Requirements**:
- File: `src/hooks/useTodos.js` - Custom hook for API calls
- File: `src/utils/api.js` - API utility functions with error handling  
- Loading states and error handling throughout UI
- Responsive design working on all screen sizes
- Theme toggle functionality
- Form validation and user feedback

---

## 📝 **Required File Outputs**

AIOB must create these exact files with working functionality:

### Backend Files
```
server.js                 # Express server with CORS, static files
routes/todos.js          # CRUD API endpoints
data/todos.json          # JSON storage file
package.json            # Dependencies: express, cors
```

### Frontend Files  
```
public/index.html       # HTML with Tailwind CDN
src/App.js             # Main React component
src/components/TodoForm.js    # Add todo form
src/components/TodoList.js    # Todo list display
src/components/TodoItem.js    # Individual todo item
src/styles/main.css    # Custom styles
package.json           # Dependencies: react, axios
```

### Key Requirements
- All files must be complete and functional
- No placeholder comments like "// TODO: implement"
- All API endpoints must work and handle errors
- UI must be fully responsive and styled
- Data must persist in JSON file between server restarts

This PRD provides exact specifications for AIOB to create a fully working, modern todo application.