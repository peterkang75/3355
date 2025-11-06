const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';

const SHEETS = {
  MEMBERS: 'Members',
  POSTS: 'Posts',
  COMMENTS: 'Comments',
  BOOKINGS: 'Bookings',
  SCORES: 'Scores',
  FEES: 'Fees',
  COURSES: 'Courses'
};

class GoogleSheetsService {
  constructor() {
    this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;
    this.isConfigured = SHEET_ID && API_KEY;
    this.scriptUrl = SCRIPT_URL;
  }

  async getRange(range) {
    if (!this.isConfigured) {
      console.warn('Google Sheets not configured. Using local storage.');
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/values/${range}?key=${API_KEY}`
      );
      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error('Error fetching from Google Sheets:', error);
      return null;
    }
  }

  async appendRow(sheetName, values) {
    if (!this.scriptUrl) {
      console.warn('Google Apps Script URL not configured. Using local storage.');
      return null;
    }

    try {
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetName: sheetName,
          values: values
        })
      });
      console.log('Data sent to Google Sheets:', sheetName, values);
      return { success: true };
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      return null;
    }
  }

  async updateRow(sheetName, rowIndex, values) {
    if (!this.scriptUrl) {
      console.warn('Google Apps Script URL not configured.');
      return null;
    }

    try {
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          sheetName: sheetName,
          rowIndex: rowIndex,
          values: values
        })
      });
      console.log('Data updated in Google Sheets:', sheetName, rowIndex);
      return { success: true };
    } catch (error) {
      console.error('Error updating Google Sheets:', error);
      return null;
    }
  }

  async getMembers() {
    const data = await this.getRange(SHEETS.MEMBERS);
    if (!data) return this.getMembersFromLocal();
    
    return data.slice(1).map(row => ({
      id: row[0],
      name: row[1],
      phone: row[2],
      isAdmin: row[3] === 'TRUE',
      handicap: parseInt(row[4]) || 18,
      balance: parseInt(row[5]) || 0
    }));
  }

  async getPosts() {
    const data = await this.getRange(SHEETS.POSTS);
    if (!data) return this.getPostsFromLocal();
    
    return data.slice(1).map(row => ({
      id: row[0],
      title: row[1],
      content: row[2],
      author: row[3],
      date: row[4],
      comments: []
    }));
  }

  async getScores(userId) {
    const data = await this.getRange(SHEETS.SCORES);
    if (!data) return this.getScoresFromLocal(userId);
    
    return data.slice(1)
      .filter(row => row[0] === userId)
      .map(row => ({
        id: row[1],
        userId: row[0],
        date: row[2],
        courseName: row[3],
        totalScore: parseInt(row[4]),
        coursePar: parseInt(row[5]) || 72,
        holes: JSON.parse(row[6] || '[]')
      }));
  }

  async saveScore(scoreData) {
    const values = [
      scoreData.userId,
      scoreData.id || Date.now().toString(),
      scoreData.date || new Date().toISOString(),
      scoreData.courseName,
      scoreData.totalScore,
      scoreData.coursePar || 72,
      JSON.stringify(scoreData.holes)
    ];

    const result = await this.appendRow(SHEETS.SCORES, values);
    if (!result) {
      this.saveScoreToLocal(scoreData);
    }
    return result;
  }

  async saveMember(memberData) {
    const values = [
      memberData.id,
      memberData.name || '',
      memberData.phone || '',
      memberData.nickname || '',
      memberData.gender || '',
      memberData.birthYear || '',
      memberData.region || '',
      memberData.isClubMember || '',
      memberData.club || '',
      memberData.handicap || '',
      memberData.golflinkNumber || '',
      memberData.clubMemberNumber || '',
      memberData.isAdmin ? 'TRUE' : 'FALSE',
      memberData.balance || 0,
      memberData.photo || ''
    ];

    const result = await this.appendRow(SHEETS.MEMBERS, values);
    console.log('Member saved to Google Sheets:', memberData.name);
    return result;
  }

  async savePost(postData) {
    const values = [
      postData.id,
      postData.title,
      postData.content,
      postData.author,
      postData.date || new Date().toISOString()
    ];

    const result = await this.appendRow(SHEETS.POSTS, values);
    console.log('Post saved to Google Sheets:', postData.title);
    return result;
  }

  async saveBooking(bookingData) {
    const values = [
      bookingData.id,
      bookingData.courseName,
      bookingData.date,
      bookingData.time,
      bookingData.organizer,
      JSON.stringify(bookingData.participants || []),
      bookingData.status || 'pending',
      bookingData.notes || ''
    ];

    const result = await this.appendRow(SHEETS.BOOKINGS, values);
    console.log('Booking saved to Google Sheets:', bookingData.courseName);
    return result;
  }

  async saveFee(feeData) {
    const values = [
      feeData.id,
      feeData.title,
      feeData.amount,
      feeData.type,
      feeData.date || new Date().toISOString(),
      feeData.dueDate || '',
      JSON.stringify(feeData.appliesTo || 'all'),
      feeData.status || 'pending',
      feeData.description || ''
    ];

    const result = await this.appendRow(SHEETS.FEES, values);
    console.log('Fee saved to Google Sheets:', feeData.title);
    return result;
  }

  getMembersFromLocal() {
    const data = localStorage.getItem('golfMembers');
    return data ? JSON.parse(data) : [];
  }

  getPostsFromLocal() {
    const data = localStorage.getItem('golfPosts');
    return data ? JSON.parse(data) : [];
  }

  getScoresFromLocal(userId) {
    const data = localStorage.getItem(`golfScores_${userId}`);
    return data ? JSON.parse(data) : [];
  }

  saveScoreToLocal(scoreData) {
    const existing = this.getScoresFromLocal(scoreData.userId);
    existing.push(scoreData);
    localStorage.setItem(`golfScores_${scoreData.userId}`, JSON.stringify(existing));
  }
}

export default new GoogleSheetsService();
export { SHEETS };
