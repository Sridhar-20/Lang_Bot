const fs = require('fs');
const path = require('path');

const content = [
  'MONGODB_URI=mongodb://localhost:27017/languabot',
  'JWT_SECRET=languabot_dev_secret',
  'GEMINI_API_KEY=',
  'GEMINI_INTERVIEW_KEY='
].join('\n');

fs.writeFileSync(path.join(__dirname, '.env'), content, 'utf8');
console.log('.env fixed successfully');
