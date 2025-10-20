const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();

// Create todo
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, priority, dueDate, projectId, tags } = req.body;

    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: req.user.userId,
        projectId,
        tags: {
          connect: tags?.map(tagId => ({ id: tagId })) || []
        }
      },
      include: {
        tags: true,
        project: true
      }
    });

    res.status(201).json({
      status: 'success',
      data: { todo }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get all todos for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, priority, projectId, search } = req.query;

    const where = {
      userId: req.user.userId,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(projectId && { projectId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const todos = await prisma.todo.findMany({
      where,
      include: {
        tags: true,
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      data: { todos }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update todo
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify ownership
    const todo = await prisma.todo.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!todo) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo not found'
      });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: {
        ...updates,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : todo.dueDate
      },
      include: {
        tags: true,
        project: true
      }
    });

    res.json({
      status: 'success',
      data: { todo: updatedTodo }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete todo
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const todo = await prisma.todo.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!todo) {
      return res.status(404).json({
        status: 'error',
        message: 'Todo not found'
      });
    }

    await prisma.todo.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;