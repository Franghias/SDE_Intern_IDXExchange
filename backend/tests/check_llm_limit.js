const path = require('path');
const fs = require('fs');

// Try loading .env from backend directory or relative locations
const envPaths = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, './.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || 'inclusionai/ling-3.0-flash:free';

async function checkLLMLimit() {
  console.log('\n==================================================');
  console.log('       OpenRouter LLM Daily Limit & Usage Check');
  console.log('==================================================\n');

  console.log(`Configured Model : ${LLM_MODEL}`);

  if (!LLM_API_KEY || LLM_API_KEY === 'your_openrouter_api_key_here') {
    console.error('❌ ERROR: LLM_API_KEY is not configured in backend/.env file.');
    console.log('   Please set a valid OpenRouter API key in backend/.env:');
    console.log('   LLM_API_KEY=sk-or-v1-...\n');
    process.exit(1);
  }

  // Mask API key for display
  const maskedKey = LLM_API_KEY.length > 12
    ? `${LLM_API_KEY.substring(0, 8)}...${LLM_API_KEY.substring(LLM_API_KEY.length - 4)}`
    : '********';
  console.log(`API Key          : ${maskedKey}`);

  try {
    console.log('\nFetching key status and limits from OpenRouter API...\n');
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Request Failed (HTTP ${response.status}):`, errorText);
      process.exit(1);
    }

    const data = await response.json();
    const info = data.data || {};

    console.log('--------------------------------------------------');
    console.log('              API KEY STATUS & LIMITS             ');
    console.log('--------------------------------------------------');
    console.log(`Label            : ${info.label || 'Default Key'}`);
    console.log(`Free Tier        : ${info.is_free_tier ? 'Yes (Free Account)' : 'No (Paid/Paid Credits)'}`);
    console.log(`Total Usage      : $${(info.usage || 0).toFixed(4)} USD`);
    
    if (info.limit !== null && info.limit !== undefined) {
      console.log(`Credit Limit     : $${info.limit.toFixed(4)} USD`);
      console.log(`Remaining        : $${(info.limit_remaining || 0).toFixed(4)} USD`);
    } else {
      console.log(`Credit Limit     : Unlimited / Free Tier`);
    }

    if (info.rate_limit) {
      console.log(`Rate Limit       : ${info.rate_limit.requests} requests per ${info.rate_limit.interval}`);
    }

    console.log('--------------------------------------------------');
    console.log('          FREE MODEL DAILY LIMIT INFORMATION      ');
    console.log('--------------------------------------------------');
    console.log('• OpenRouter Free Models (ending in :free):');
    console.log('  - Standard Daily Limit : 200 requests / day per key');
    console.log('  - Rate Limit           : 20 requests / minute');
    console.log('• If you hit the limit, OpenRouter responds with HTTP 429.');
    console.log('• Free quota resets daily at 00:00 UTC.');
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Failed to check OpenRouter API key limits:', error.message);
  }
}

checkLLMLimit();
