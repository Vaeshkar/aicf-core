const express = require('express');
const cors = require('cors');
const todosRouter = require('./routes/todos');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/todos', todosRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});