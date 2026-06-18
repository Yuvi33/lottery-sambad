const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function updateResults() {
  console.log('🔍 Fetching all data from Lottery Sambad...');
  try {
    const response = await axios.get('https://lottery.sambad.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const match = response.data.match(/var datesCards = (\{[\s\S]*?\});/);
    if (!match) throw new Error('Could not find data pattern');

    const fullData = JSON.parse(match[1]);
    const dataDir = path.join(__dirname, '../../data');
    fs.mkdirSync(dataDir, { recursive: true });

    // 1. Save ALL data to latest.json
    fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(fullData, null, 2));
    console.log('✅ Saved 1PM, 6PM, and 8PM data!');

    // 2. Save History Manifest & Daily Files
    const manifestPath = path.join(dataDir, 'history.json');
    let manifest = [];
    if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    const historyDir = path.join(dataDir, 'history');
    fs.mkdirSync(historyDir, { recursive: true });

    // 3. Create Summary for "Last 10 Results" Tables
    const summary = { "1pm": [], "6pm": [], "8pm": [] };
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Sort dates from newest to oldest
    const sortedDates = Object.keys(fullData).sort((a, b) => {
        const da = a.split('-').reverse().join('');
        const db = b.split('-').reverse().join('');
        return db.localeCompare(da);
    });

    sortedDates.forEach(dateKey => {
      // Add to manifest
      if (!manifest.includes(dateKey)) manifest.unshift(dateKey);
      
      // Save individual date file
      fs.writeFileSync(path.join(historyDir, `${dateKey}.json`), JSON.stringify(fullData[dateKey], null, 2));

      // Add to summary tables
      const parts = dateKey.split('-');
      const formattedDate = `${parts[0]} ${months[parseInt(parts[1])-1]} ${parts[2]}`;
      
      fullData[dateKey].forEach(r => {
        if (summary[r.slotkey] && summary[r.slotkey].length < 10) {
          summary[r.slotkey].push({ date: formattedDate, num: r.num });
        }
      });
    });

    manifest.sort((a, b) => new Date(b.split('-').reverse().join('-')) - new Date(a.split('-').reverse().join('-')));
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    fs.writeFileSync(path.join(dataDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('✅ Saved summary tables (Last 10 results) and history!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateResults();
