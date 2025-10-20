class Todo {
  constructor(id, text, completed, priority) {
    this.id = id;
    this.text = text;
    this.completed = completed;
    this.priority = priority;
  }

  static fromJSON(json) {
    return new Todo(json.id, json.text, json.completed, json.priority);
  }

  toJSON() {
    return {
      id: this.id,
      text: this.text,
      completed: this.completed,
      priority: this.priority,
    };
  }
}

module.exports = Todo;