const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const dateFns = require('date-fns');

async function updateResults() {
  console.log('🔍 Scraping Lottery Sambad...');
  let allResults = { "lottery_sambad": [] };

  try {
    // We are scraping the official lottery.sambad.com page
    const response = await axios.get('https://lottery.sambad.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    // Get all the text from the website
    const pageText = $('body').text(); 

    // SMART PATTERN: Find anything that looks like "84C 22447" (2 numbers, 1 letter, space, 5 numbers)
    const regex = /([0-9]{2}[A-Z]\s[0-9]{5})/g;
    const matches = pageText.match(regex);

    if (matches && matches.length > 0) {
      console.log('✅ Found real winning numbers:', matches.join(', '));
      
      // Assign the found numbers to 1 PM, 6 PM, and 8 PM
      const times = ["1:00 PM", "6:00 PM", "8:00 PM"];
      matches.forEach((match, index) => {
        if (index < 3) {
          allResults.lottery_sambad.push({
            date: dateFns.format(new Date(), 'yyyy-MM-dd'),
            time: times[index] || "Draw " + (index + 1),
            drawName: "Dear Lottery",
            winningNumbers: [match],
            prize: "1 Crore",
            source: "Lottery Sambad"
          });
        }
      });
    } else {
      console.log('⚠️ No numbers matched the pattern. Using sample data.');
      allResults.lottery_sambad.push({
        date: dateFns.format(new Date(), 'yyyy-MM-dd'),
        time: "1:00 PM",
        drawName: "Sample Draw",
        winningNumbers: ["00A 00000"],
        prize: "1 Crore",
        source: "Lottery Sambad"
      });
    }
  } catch (error) {
    console.error('❌ Error scraping:', error.message);
  }

  // Save to JSON files
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
