const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const dateFns = require('date-fns');

// Configuration
const LOTTERY_SOURCES = {
  nagaland: {
    name: 'Nagaland State Lottery',
    url: 'https://nagalandlotteries.com/',
    schedule: ['1:00 PM', '6:00 PM', '8:00 PM']
  },
  kerala: {
    name: 'Kerala State Lottery',
    url: 'https://keralalotteries.com/',
    schedule: ['4:00 PM']
  }
};

async function scrapeLotteryResults(sourceKey) {
  const source = LOTTERY_SOURCES[sourceKey];
  console.log(`🔍 Scraping ${source.name}...`);
  
  try {
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Adjust selectors based on actual website structure
    $('.result-item').each((index, element) => {
      const time = $(element).find('.time').text().trim();
      const drawName = $(element).find('.draw-name').text().trim();
      const winningNumbers = [];
      
      $(element).find('.winning-number').each((i, num) => {
        winningNumbers.push($(num).text().trim());
      });
      
      results.push({
        date: dateFns.format(new Date(), 'yyyy-MM-dd'),
        time: time,
        drawName: drawName,
        winningNumbers: winningNumbers,
        prize: '1 Crore',
        source: source.name
      });
    });
    
    return results;
    
  } catch (error) {
    console.error(`❌ Error scraping ${source.name}:`, error.message);
    return [];
  }
}

async function updateResults() {
  const allResults = {};
  
  // Scrape from all sources
  for (const sourceKey of Object.keys(LOTTERY_SOURCES)) {
    const results = await scrapeLotteryResults(sourceKey);
    allResults[sourceKey] = results;
  }
  
  // Save to JSON files
  const dataDir = path.join(__dirname, '../../public/data');
  fs.mkdirSync(dataDir, { recursive: true });
  
  // Save latest results
  const latestPath = path.join(dataDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(allResults, null, 2));
  
  // Save historical results by date
  const today = dateFns.format(new Date(), 'yyyy-MM-dd');
  const historyPath = path.join(dataDir, 'history', `${today}.json`);
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.writeFileSync(historyPath, JSON.stringify(allResults, null, 2));
  
  console.log('✅ Results updated successfully!');
}

// Run the scraper
updateResults().catch(console.error);
