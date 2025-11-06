const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

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
    if (!this.isConfigured) {
      console.warn('Google Sheets not configured. Using local storage.');
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/values/${sheetName}:append?valueInputOption=RAW&key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [values]
          })
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
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
