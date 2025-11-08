const API_BASE = '/api';

class ApiService {
  async fetchMembers() {
    const response = await fetch(`${API_BASE}/members`);
    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  }

  async createMember(memberData) {
    const response = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });
    if (!response.ok) throw new Error('Failed to create member');
    return response.json();
  }

  async updateMember(id, memberData) {
    const response = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });
    if (!response.ok) throw new Error('Failed to update member');
    return response.json();
  }

  async deleteMember(id) {
    const response = await fetch(`${API_BASE}/members/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete member');
    return response.json();
  }

  async toggleMemberAdmin(id) {
    const response = await fetch(`${API_BASE}/members/${id}/toggle-admin`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to toggle admin status');
    return response.json();
  }

  async toggleMemberActive(id) {
    const response = await fetch(`${API_BASE}/members/${id}/toggle-active`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to toggle active status');
    return response.json();
  }

  async updateMemberRole(id, role) {
    const response = await fetch(`${API_BASE}/members/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error('Failed to update member role');
    return response.json();
  }

  async fetchPosts() {
    const response = await fetch(`${API_BASE}/posts`);
    if (!response.ok) throw new Error('Failed to fetch posts');
    return response.json();
  }

  async createPost(postData) {
    const response = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    if (!response.ok) throw new Error('Failed to create post');
    return response.json();
  }

  async updatePost(id, postData) {
    const response = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    if (!response.ok) throw new Error('Failed to update post');
    return response.json();
  }

  async deletePost(id) {
    const response = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete post');
    return response.json();
  }

  async fetchBookings() {
    const response = await fetch(`${API_BASE}/bookings`);
    if (!response.ok) throw new Error('Failed to fetch bookings');
    return response.json();
  }

  async createBooking(bookingData) {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    if (!response.ok) throw new Error('Failed to create booking');
    return response.json();
  }

  async updateBooking(id, bookingData) {
    const response = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    if (!response.ok) throw new Error('Failed to update booking');
    return response.json();
  }

  async deleteBooking(id) {
    const response = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete booking');
    return response.json();
  }

  async toggleBookingAnnounce(id) {
    const response = await fetch(`${API_BASE}/bookings/${id}/toggle-announce`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to toggle booking announce status');
    return response.json();
  }

  async fetchFees() {
    const response = await fetch(`${API_BASE}/fees`);
    if (!response.ok) throw new Error('Failed to fetch fees');
    return response.json();
  }

  async createFee(feeData) {
    const response = await fetch(`${API_BASE}/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feeData)
    });
    if (!response.ok) throw new Error('Failed to create fee');
    return response.json();
  }

  async updateFee(id, feeData) {
    const response = await fetch(`${API_BASE}/fees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feeData)
    });
    if (!response.ok) throw new Error('Failed to update fee');
    return response.json();
  }

  async deleteFee(id) {
    const response = await fetch(`${API_BASE}/fees/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete fee');
    return response.json();
  }

  async fetchScores(userId) {
    const response = await fetch(`${API_BASE}/scores/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch scores');
    return response.json();
  }

  async createScore(scoreData) {
    const response = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreData)
    });
    if (!response.ok) throw new Error('Failed to create score');
    return response.json();
  }

  async updateScore(id, scoreData) {
    const response = await fetch(`${API_BASE}/scores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreData)
    });
    if (!response.ok) throw new Error('Failed to update score');
    return response.json();
  }

  async deleteScore(id) {
    const response = await fetch(`${API_BASE}/scores/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete score');
    return response.json();
  }

  async fetchCourses() {
    const response = await fetch(`${API_BASE}/courses`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  }

  async createCourse(courseData) {
    const response = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to create course');
    return response.json();
  }

  async updateCourse(id, courseData) {
    const response = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to update course');
    return response.json();
  }

  async deleteCourse(id) {
    const response = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete course');
    return response.json();
  }

  async fetchSettings() {
    const response = await fetch(`${API_BASE}/settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  }

  async updateSetting(feature, minRole) {
    const response = await fetch(`${API_BASE}/settings/${feature}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minRole })
    });
    if (!response.ok) throw new Error('Failed to update setting');
    return response.json();
  }

  async fetchScores(memberId) {
    const response = await fetch(`${API_BASE}/scores/${memberId}`);
    if (!response.ok) throw new Error('Failed to fetch scores');
    return response.json();
  }

  async createScore(scoreData) {
    const response = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreData)
    });
    if (!response.ok) throw new Error('Failed to create score');
    return response.json();
  }
}

export default new ApiService();
