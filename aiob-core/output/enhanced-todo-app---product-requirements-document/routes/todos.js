const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const router = express.Router();
let todos = require('../data/todos.json');
const { v4: uuidv4 } = require('uuid');

// GET /api/todos
router.get('/', (req, res, next) => {
   try {
       res.json({
           success: true,
           data: todos
       });
   } catch (err) {
       next(err);
   }
});

// POST /api/todos
router.post(
   '/',
   body('text').notEmpty().withMessage('Text field is required'),
   (req, res, next) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
           return res.status(400).json({
               success: false,
               errors: errors.array().map(error => error.msg)
           });
       }

       try {
           const todo = {
               id: uuidv4(),
               text: req.body.text,
               completed: false,
               createdAt: new Date().toISOString()
           };
           todos.unshift(todo);
           fs.writeFile('./data/todos.json', JSON.stringify(todos), err => {
               if (err) throw err;
               res.json({
                   success: true,
                   data: todo
               });
           });
       } catch (err) {
           next(err);
       }
   }
);

// PATCH /todos/:id
router.patch(
   '/:id',
   body('completed').isBoolean().withMessage('Completed field must be a boolean'),
   (req, res, next) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
           return res.status(400).json({
               success: false,
               errors: errors.array().map(error => error.msg)
           });
       }

       try {
           todos = todos.map(todo =>
               todo.id === req.params.id ? { ...todo, completed: req.body.completed } : todo
           );
           fs.writeFile('./data/todos.json', JSON.stringify(todos), err => {
               if (err) throw err;
               res.json({
                   success: true,
                   data: todos.find(todo => todo.id === req.params.id)
               });
           });
       } catch (err) {
           next(err);
       }
   }
);

// DELETE /todos/:id
router.delete('/:id', (req, res, next) => {
   try {
       todos = todos.filter(todo => todo.id !== req.params.id);
       fs.writeFile('./data/todos.json', JSON.stringify(todos), err => {
           if (err) throw err;
           res.json({
               success: true,
               message: 'Todo deleted'
           });
       });
   } catch (err) {
       next(err);
   }
});

module.exports = router;