const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();

// Create project
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: req.user.userId
      }
    });

    res.status(201).json({
      status: 'success',
      data: { project }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get all projects for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: req.user.userId
      },
      include: {
        _count: {
          select: { todos: true }
        }
      }
    });

    res.json({
      status: 'success',
      data: { projects }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update project
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updates
    });

    res.json({
      status: 'success',
      data: { project: updatedProject }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    await prisma.project.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;