const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const dateFns = require('date-fns');

// Updated configuration with better headers and longer timeout
const LOTTERY_SOURCES = {
  nagaland: {
    name: 'Nagaland State Lottery',
    // Using a more reliable Google search-friendly URL structure if the main site blocks bots
    // You may need to update this to the exact, current official URL
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
  console.log(`🔍 Scraping ${source.name} from ${source.url}...`);
  
  try {
    const response = await axios.get(source.url, {
      headers: {
        // Pretending to be a normal desktop browser to avoid bot blocks
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 30000 // Increased timeout to 30 seconds
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // NOTE: The classes below (.result-item, .time, etc.) are examples.
    // You will need to inspect the actual live website to get the correct HTML tags!
    $('.result-item, .lottery-result').each((index, element) => {
      const time = $(element).find('.time, .draw-time').text().trim();
      const drawName = $(element).find('.draw-name, .lottery-name').text().trim();
      const winningNumbers = [];
      
      $(element).find('.winning-number, .result-number').each((i, num) => {
        winningNumbers.push($(num).text().trim());
      });
      
      if (time || drawName) {
        results.push({
          date: dateFns.format(new Date(), 'yyyy-MM-dd'),
          time: time || source.schedule,
          drawName: drawName || 'Daily Draw',
          winningNumbers: winningNumbers,
          prize: '1 Crore',
          source: source.name
        });
      }
    });
    
    if (results.length === 0) {
      console.log(`⚠️ No results found for ${source.name}. The website HTML structure might have changed.`);
    }
    
    return results;
    
  } catch (error) {
    console.error(`❌ Error scraping ${source.name}:`, error.message);
    return [];
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
