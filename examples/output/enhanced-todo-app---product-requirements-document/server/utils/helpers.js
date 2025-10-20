const helpers = {
  getNextId: () => {
    const todos = require('../data/todos.json');
    return todos.length + 1;
  },
};

module.exports = helpers;