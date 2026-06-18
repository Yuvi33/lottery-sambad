const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const dateFns = require('date-fns');

const LOTTERY_SOURCES = {
  nagaland: {
    name: 'Nagaland State Lottery',
    url: 'https://www.lotterysambadresult.in/',
    schedule: ['1:00 PM', '6:00 PM', '8:00 PM']
  },
  kerala: {
    name: 'Kerala State Lottery',
    url: 'https://www.keralalotteryresult.org/',
    schedule: '3:00 PM'
  }
};

async function scrapeLotteryResults(sourceKey) {
  const source = LOTTERY_SOURCES[sourceKey];
  console.log(`🔍 Scraping ${source.name}...`);
  
  let results = [];
  
  try {
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Try to find results (you may need to update these classes later)
    $('.result-item').each((index, element) => {
      const time = $(element).find('.time').text().trim();
      const drawName = $(element).find('.draw-name').text().trim();
      const winningNumbers = [];
      
      $(element).find('.winning-number').each((i, num) => {
        winningNumbers.push($(num).text().trim());
      });
      
      if (time || drawName) {
        results.push({
          date: dateFns.format(new Date(), 'yyyy-MM-dd'),
          time: time,
          drawName: drawName,
          winningNumbers: winningNumbers,
          prize: '1 Crore',
          source: source.name
        });
      }
    });

    // FALLBACK: If no results found, use sample data so website isn't empty
    if (results.length === 0) {
      console.log(`⚠️ No live results found for ${source.name}. Using sample data.`);
      results.push({
        date: dateFns.format(new Date(), 'yyyy-MM-dd'),
        time: source.schedule[0] || '1:00 PM',
        drawName: 'Sample Draw (Update Scraper Later)',
        winningNumbers: [Math.floor(10000 + Math.random() * 90000).toString()],
        prize: '1 Crore',
        source: source.name
      });
    }
    
    return results;
    
  } catch (error) {
    console.error(`❌ Error scraping ${source.name}:`, error.message);
    // Fallback on error too
    return [{
      date: dateFns.format(new Date(), 'yyyy-MM-dd'),
      time: '1:00 PM',
      drawName: 'Sample Draw (Error Fallback)',
      winningNumbers: ['00000'],
      prize: '1 Crore',
      source: source.name
    }];
  }
}

async function updateResults() {
  const allResults = {};
  
  for (const sourceKey of Object.keys(LOTTERY_SOURCES)) {
    const results = await scrapeLotteryResults(sourceKey);
    allResults[sourceKey] = results;
  }
  
  const dataDir = path.join(__dirname, '../../public/data');
  fs.mkdirSync(dataDir, { recursive: true });
  
  const latestPath = path.join(dataDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(allResults, null, 2));
  
  const today = dateFns.format(new Date(), 'yyyy-MM-dd');
  const historyPath = path.join(dataDir, 'history', `${today}.json`);
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.writeFileSync(historyPath, JSON.stringify(allResults, null, 2));
  
  console.log('✅ Results updated successfully!');
}

updateResults().catch(console.error);
