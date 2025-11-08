const express = require('express');
const prisma = require('./db');

const router = express.Router();

router.get('/members', async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

router.post('/members', async (req, res) => {
  try {
    const member = await prisma.member.create({
      data: req.body
    });
    res.json(member);
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

router.put('/members/:id', async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

router.delete('/members/:id', async (req, res) => {
  try {
    await prisma.member.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

router.patch('/members/:id/toggle-admin', async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id }
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isAdmin: !member.isAdmin }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

router.patch('/members/:id/toggle-active', async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id }
    });
    
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: member.isActive === false ? true : false }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error toggling active status:', error);
    res.status(500).json({ error: 'Failed to toggle active status' });
  }
});

router.patch('/members/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'operator', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { 
        role,
        isAdmin: role === 'admin'
      }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

router.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const post = await prisma.post.create({
      data: req.body,
      include: { author: true }
    });
    res.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/posts/:id', async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: req.body,
      include: { author: true }
    });
    res.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { organizer: true },
      orderBy: { date: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const booking = await prisma.booking.create({
      data: req.body,
      include: { organizer: true }
    });
    res.json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

router.put('/bookings/:id', async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data: req.body,
      include: { organizer: true }
    });
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

router.delete('/bookings/:id', async (req, res) => {
  try {
    await prisma.booking.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

router.patch('/bookings/:id/toggle-announce', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { isAnnounced: !booking.isAnnounced },
      include: { organizer: true }
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error toggling announce status:', error);
    res.status(500).json({ error: 'Failed to toggle announce status' });
  }
});

router.get('/fees', async (req, res) => {
  try {
    const fees = await prisma.fee.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(fees);
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
});

router.post('/fees', async (req, res) => {
  try {
    const fee = await prisma.fee.create({
      data: req.body
    });
    res.json(fee);
  } catch (error) {
    console.error('Error creating fee:', error);
    res.status(500).json({ error: 'Failed to create fee' });
  }
});

router.put('/fees/:id', async (req, res) => {
  try {
    const fee = await prisma.fee.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(fee);
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ error: 'Failed to update fee' });
  }
});

router.delete('/fees/:id', async (req, res) => {
  try {
    await prisma.fee.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting fee:', error);
    res.status(500).json({ error: 'Failed to delete fee' });
  }
});

router.get('/scores/:userId', async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      where: { userId: req.params.userId },
      orderBy: { date: 'desc' }
    });
    res.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

router.post('/scores', async (req, res) => {
  try {
    const score = await prisma.score.create({
      data: req.body
    });
    res.json(score);
  } catch (error) {
    console.error('Error creating score:', error);
    res.status(500).json({ error: 'Failed to create score' });
  }
});

router.put('/scores/:id', async (req, res) => {
  try {
    const score = await prisma.score.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(score);
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

router.delete('/scores/:id', async (req, res) => {
  try {
    await prisma.score.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting score:', error);
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const course = await prisma.course.create({
      data: req.body
    });
    res.json(course);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(course);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    await prisma.course.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

module.exports = router;
