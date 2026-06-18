const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function updateResults() {
  console.log('🔍 Fetching data from Lottery Sambad...');
  try {
    const response = await axios.get('https://lottery.sambad.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const match = response.data.match(/var datesCards = (\{[\s\S]*?\});/);
    if (!match) throw new Error('Could not find datesCards data');

    const fullData = JSON.parse(match[1]);
    const dataDir = path.join(__dirname, '../../data');
    fs.mkdirSync(dataDir, { recursive: true });

    const slotToDrawId = { '1pm': 1, '6pm': 2, '8pm': 3 };

    // Fetch full prize tiers for each draw
    for (const dateKey of Object.keys(fullData)) {
      for (const draw of fullData[dateKey]) {
        const drawId = slotToDrawId[draw.slotkey];
        if (!drawId) continue;
        
        try {
          console.log(`Fetching full tiers for ${draw.slotkey} ${dateKey}...`);
          const apiUrl = `https://lottery.sambad.com/api/prize-search?date=${dateKey}&draw=${drawId}`;
          const apiRes = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://lottery.sambad.com/' }
          });
          if (apiRes.data && apiRes.data.tiers) {
            draw.tiers = apiRes.data.tiers;
          }
        } catch (apiError) {
          console.log(`⚠️ Could not fetch API for ${draw.slotkey}: ${apiError.message}`);
        }
      }
    }

    // 1. Save ALL data to latest.json
    fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(fullData, null, 2));
    console.log('✅ Saved latest data with full tiers!');

    // 2. PERMANENT HISTORY
    const manifestPath = path.join(dataDir, 'history.json');
    let historyArray = [];
    if (fs.existsSync(manifestPath)) {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      historyArray = existing.map(item => typeof item === 'string' ? { date: item, results: [] } : item);
    }
    
    const historyDir = path.join(dataDir, 'history');
    fs.mkdirSync(historyDir, { recursive: true });

    Object.keys(fullData).forEach(dateKey => {
      fs.writeFileSync(path.join(historyDir, `${dateKey}.json`), JSON.stringify(fullData[dateKey], null, 2));
      if (!historyArray.find(item => item.date === dateKey)) {
        historyArray.push({ date: dateKey, results: fullData[dateKey] });
      } else {
        let idx = historyArray.findIndex(item => item.date === dateKey);
        historyArray[idx].results = fullData[dateKey];
      }
    });

    historyArray.sort((a, b) => {
        const da = a.date.split('-').reverse().join('');
        const db = b.date.split('-').reverse().join('');
        return db.localeCompare(da);
    });

    fs.writeFileSync(manifestPath, JSON.stringify(historyArray, null, 2));

    // 3. Create Summary for "Last 10 Results"
    const summary = { "1pm": [], "6pm": [], "8pm": [] };
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    historyArray.slice(0, 10).forEach(item => {
      const parts = item.date.split('-');
      const formattedDate = `${parts[0]} ${months[parseInt(parts[1])-1]} ${parts[2]}`;
      if (item.results && item.results.length > 0) {
        item.results.forEach(r => {
          if (summary[r.slotkey] && summary[r.slotkey].length < 10) {
            summary[r.slotkey].push({ date: formattedDate, num: r.num });
          }
        });
      }
    });

    fs.writeFileSync(path.join(dataDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('✅ Saved permanent history and summary tables!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateResults();
