const API_BASE = '/api';

const cache = new Map();
const CACHE_DURATION = 5000;
const pendingRequests = new Map();

class ApiService {
  async cachedFetch(key, fetchFn, duration = CACHE_DURATION) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < duration) {
      return cached.data;
    }
    
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key);
    }
    
    const promise = fetchFn().then(data => {
      cache.set(key, { data, timestamp: Date.now() });
      pendingRequests.delete(key);
      return data;
    }).catch(err => {
      pendingRequests.delete(key);
      throw err;
    });
    
    pendingRequests.set(key, promise);
    return promise;
  }

  invalidateCache(prefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  }

  async fetchMembers() {
    return this.cachedFetch('members', async () => {
      const response = await fetch(`${API_BASE}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    });
  }

  async createMember(memberData) {
    const response = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 409 && errorData.error === 'DUPLICATE_PHONE') {
        const error = new Error(errorData.message);
        error.code = 'DUPLICATE_PHONE';
        error.nickname = errorData.nickname;
        throw error;
      }
      throw new Error('Failed to create member');
    }
    this.invalidateCache('members');
    return response.json();
  }

  async updateMember(id, memberData) {
    const response = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberData)
    });
    if (!response.ok) throw new Error('Failed to update member');
    this.invalidateCache('members');
    return response.json();
  }

  async deleteMember(id) {
    const response = await fetch(`${API_BASE}/members/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete member');
    this.invalidateCache('members');
    return response.json();
  }

  async toggleMemberAdmin(id) {
    const response = await fetch(`${API_BASE}/members/${id}/toggle-admin`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to toggle admin status');
    this.invalidateCache('members');
    return response.json();
  }

  async toggleMemberActive(id) {
    const response = await fetch(`${API_BASE}/members/${id}/toggle-active`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to toggle active status');
    this.invalidateCache('members');
    return response.json();
  }

  async toggleFeesPermission(id) {
    const response = await fetch(`${API_BASE}/members/${id}/toggle-fees-permission`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to toggle fees permission');
    this.invalidateCache('members');
    return response.json();
  }

  async updateMemberRole(id, role) {
    const response = await fetch(`${API_BASE}/members/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error('Failed to update member role');
    this.invalidateCache('members');
    return response.json();
  }

  async fetchPosts() {
    return this.cachedFetch('posts', async () => {
      const response = await fetch(`${API_BASE}/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    });
  }

  async createPost(postData) {
    const response = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    if (!response.ok) throw new Error('Failed to create post');
    this.invalidateCache('posts');
    return response.json();
  }

  async updatePost(id, postData) {
    const response = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    if (!response.ok) throw new Error('Failed to update post');
    this.invalidateCache('posts');
    return response.json();
  }

  async deletePost(id) {
    const response = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete post');
    this.invalidateCache('posts');
    return response.json();
  }

  async fetchBookings() {
    return this.cachedFetch('bookings', async () => {
      const response = await fetch(`${API_BASE}/bookings`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      return response.json();
    });
  }

  async createBooking(bookingData) {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    if (!response.ok) throw new Error('Failed to create booking');
    this.invalidateCache('bookings');
    return response.json();
  }

  async updateBooking(id, bookingData) {
    const response = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    if (!response.ok) throw new Error('Failed to update booking');
    this.invalidateCache('bookings');
    return response.json();
  }

  async deleteBooking(id) {
    const response = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete booking');
    this.invalidateCache('bookings');
    return response.json();
  }

  async toggleBookingAnnounce(id) {
    const response = await fetch(`${API_BASE}/bookings/${id}/toggle-announce`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to toggle booking announce status');
    this.invalidateCache('bookings');
    return response.json();
  }

  async togglePlayEnabled(id) {
    const response = await fetch(`${API_BASE}/bookings/${id}/toggle-play`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to toggle play status');
    this.invalidateCache('bookings');
    return response.json();
  }

  async toggleNumberRental(id, userPhone) {
    const response = await fetch(`${API_BASE}/bookings/${id}/toggle-number-rental`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPhone })
    });
    if (!response.ok) throw new Error('Failed to toggle number rental');
    return response.json();
  }

  async updateBookingGradeSettings(id, gradeSettings) {
    const response = await fetch(`${API_BASE}/bookings/${id}/grade-settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gradeSettings })
    });
    if (!response.ok) throw new Error('Failed to update booking grade settings');
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

  async fetchBookingScores(date, courseName) {
    const response = await fetch(`${API_BASE}/scores/booking/${encodeURIComponent(date)}/${encodeURIComponent(courseName)}`);
    if (!response.ok) throw new Error('Failed to fetch booking scores');
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

  async deleteBookingScores(date, courseName) {
    const response = await fetch(`${API_BASE}/scores/booking/${encodeURIComponent(date)}/${encodeURIComponent(courseName)}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete booking scores');
    return response.json();
  }

  async fetchCourses() {
    return this.cachedFetch('courses', async () => {
      const response = await fetch(`${API_BASE}/courses`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    }, 30000);
  }

  async createCourse(courseData) {
    const response = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to create course');
    this.invalidateCache('courses');
    return response.json();
  }

  async updateCourse(id, courseData) {
    const response = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to update course');
    this.invalidateCache('courses');
    return response.json();
  }

  async deleteCourse(id) {
    const response = await fetch(`${API_BASE}/courses/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete course');
    this.invalidateCache('courses');
    return response.json();
  }

  async fetchSettings() {
    return this.cachedFetch('settings', async () => {
      const response = await fetch(`${API_BASE}/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    }, 10000);
  }

  async updateSetting(feature, data) {
    const response = await fetch(`${API_BASE}/settings/${feature}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update setting');
    this.invalidateCache('settings');
    return response.json();
  }

  async approveMember(id) {
    const response = await fetch(`${API_BASE}/members/${id}/approve`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to approve member');
    return response.json();
  }

  async rejectMember(id) {
    const response = await fetch(`${API_BASE}/members/${id}/reject`, {
      method: 'PATCH'
    });
    if (!response.ok) throw new Error('Failed to reject member');
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

  async fetchTransactions(limit) {
    const url = limit ? `${API_BASE}/transactions?limit=${limit}` : `${API_BASE}/transactions`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  }

  async fetchMemberTransactions(memberId) {
    const response = await fetch(`${API_BASE}/transactions/member/${memberId}`);
    if (!response.ok) throw new Error('Failed to fetch member transactions');
    return response.json();
  }

  async fetchMemberBalance(memberId) {
    const response = await fetch(`${API_BASE}/transactions/balance/${memberId}`);
    if (!response.ok) throw new Error('Failed to fetch member balance');
    return response.json();
  }

  async fetchClubBalance() {
    const response = await fetch(`${API_BASE}/transactions/club-balance`);
    if (!response.ok) throw new Error('Failed to fetch club balance');
    return response.json();
  }

  async fetchOutstandingBalances() {
    const response = await fetch(`${API_BASE}/transactions/outstanding`);
    if (!response.ok) throw new Error('Failed to fetch outstanding balances');
    return response.json();
  }

  async createTransaction(transactionData) {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    });
    if (!response.ok) throw new Error('Failed to create transaction');
    return response.json();
  }

  async deleteTransaction(id) {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete transaction');
    return response.json();
  }

  async updateTransaction(id, data) {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update transaction');
    return response.json();
  }

  async deleteChargeTransaction(memberId, bookingId) {
    const response = await fetch(`${API_BASE}/transactions/charge/${memberId}/${bookingId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete charge transaction');
    return response.json();
  }

  async fetchIncomeCategories() {
    const response = await fetch(`${API_BASE}/income-categories`);
    if (!response.ok) throw new Error('Failed to fetch income categories');
    return response.json();
  }

  async createIncomeCategory(name) {
    const response = await fetch(`${API_BASE}/income-categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!response.ok) throw new Error('Failed to create income category');
    return response.json();
  }

  async deleteIncomeCategory(id) {
    const response = await fetch(`${API_BASE}/income-categories/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete income category');
    return response.json();
  }

  async fetchExpenseCategories() {
    const response = await fetch(`${API_BASE}/expense-categories`);
    if (!response.ok) throw new Error('Failed to fetch expense categories');
    return response.json();
  }

  async createExpenseCategory(name) {
    const response = await fetch(`${API_BASE}/expense-categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!response.ok) throw new Error('Failed to create expense category');
    return response.json();
  }

  async deleteExpenseCategory(id) {
    const response = await fetch(`${API_BASE}/expense-categories/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete expense category');
    return response.json();
  }
}

export default new ApiService();
