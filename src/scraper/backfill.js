const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function backfillHistory() {
  console.log('🔄 Starting History Backfill from Jan 1, 2023...');
  const startDate = new Date('2023-01-01');
  const endDate = new Date();
  const dataDir = path.join(__dirname, '../../data/history');
  fs.mkdirSync(dataDir, { recursive: true });

  let currentDate = new Date(startDate);
  
  while(currentDate <= endDate) {
    const dd = String(currentDate.getDate()).padStart(2, '0');
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const yyyy = currentDate.getFullYear();
    const dateKey = `${dd}-${mm}-${yyyy}`;
    const monthKey = `${yyyy}-${mm}`;
    
    const monthFilePath = path.join(dataDir, `${monthKey}.json`);
    let monthData = [];
    if (fs.existsSync(monthFilePath)) {
      monthData = JSON.parse(fs.readFileSync(monthFilePath, 'utf-8'));
    }
    
    // Skip if this date is already saved
    if (monthData.find(d => d.date === dateKey)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    console.log(`Fetching ${dateKey}...`);
    let dayResults = [];
    for (let draw = 1; draw <= 3; draw++) {
      try {
        const apiUrl = `https://lottery.sambad.com/api/prize-search?date=${dateKey}&draw=${draw}`;
        const res = await axios.get(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.data && res.data.tiers && res.data.tiers.length > 0) {
          const firstPrize = res.data.tiers[0];
          const slotkey = draw === 1 ? '1pm' : (draw === 2 ? '6pm' : '8pm');
          const num = firstPrize.nums[0] || 'N/A';
          dayResults.push({
            slotkey: slotkey,
            date: dateKey,
            num: num,
            amount: "1 Crore",
            drawno: draw,
            name: "Dear Lottery",
            tiers: res.data.tiers
          });
        }
      } catch(e) { console.log(`No data for draw ${draw} on ${dateKey}`); }
      await new Promise(r => setTimeout(r, 500)); // 0.5s delay to be polite to server
    }
    
    if (dayResults.length > 0) {
      monthData.push({ date: dateKey, results: dayResults });
      fs.writeFileSync(monthFilePath, JSON.stringify(monthData, null, 2));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  console.log('✅ Backfill complete!');
}

backfillHistory();
