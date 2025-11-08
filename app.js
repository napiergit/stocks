let currentTicker = '';

// Search for ticker
function searchTicker() {
    const input = document.getElementById('tickerInput');
    const ticker = input.value.trim().toUpperCase();
    
    if (!ticker) {
        alert('Please enter a ticker symbol');
        return;
    }
    
    currentTicker = ticker;
    
    // Show dashboard
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('tickerDisplay').textContent = ticker;
    
    // Update all links
    updateLinks(ticker);
    
    // Load data
    loadCompanyInfo(ticker);
    loadTradingViewChart(ticker);
    loadEarningsData(ticker);
    
    // Scroll to dashboard
    document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
}

// Update all external links
function updateLinks(ticker) {
    // Options link
    document.getElementById('optionsLink').href = `https://dex.tradingedge.club/?ticker=${ticker}`;
    
    // Unusual Flow link
    document.getElementById('flowLink').href = `https://flow.tradingedge.club/?ticker=${ticker}`;
    
    // Tear comments link
    document.getElementById('tearLink').href = `https://tradingedge.club/search?q=${ticker}&spaces=all`;
    
    // Reddit link
    document.getElementById('redditLink').href = `https://www.reddit.com/search/?q=${ticker}`;
}

// Load TradingView chart with EMAs
function loadTradingViewChart(ticker) {
    const container = document.getElementById('tradingview-widget');
    container.innerHTML = ''; // Clear previous chart
    
    new TradingView.widget({
        "width": "100%",
        "height": 400,
        "symbol": ticker,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "studies": [
            "MAExp@tv-basicstudies", // EMA
        ],
        "container_id": "tradingview-widget"
    });
}

// Load company information using Yahoo Finance API (via proxy)
async function loadCompanyInfo(ticker) {
    try {
        // Using a free API - you may need to get an API key for production
        const response = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryProfile,defaultKeyStatistics,price`);
        const data = await response.json();
        
        if (data.quoteSummary && data.quoteSummary.result) {
            const result = data.quoteSummary.result[0];
            const profile = result.summaryProfile || {};
            const stats = result.defaultKeyStatistics || {};
            const price = result.price || {};
            
            // Update company name
            document.getElementById('companyName').textContent = price.longName || ticker;
            
            // Update company info
            document.getElementById('sector').textContent = profile.sector || 'N/A';
            document.getElementById('marketCap').textContent = formatMarketCap(price.marketCap?.raw);
            document.getElementById('peRatio').textContent = stats.trailingPE?.fmt || 'N/A';
            document.getElementById('eps').textContent = stats.trailingEps?.fmt || 'N/A';
            document.getElementById('description').textContent = profile.longBusinessSummary || 'No description available.';
        } else {
            throw new Error('No data found');
        }
    } catch (error) {
        console.error('Error loading company info:', error);
        document.getElementById('companyName').textContent = ticker;
        document.getElementById('description').textContent = 'Unable to load company information. Please check the ticker symbol.';
    }
}

// Load earnings data
async function loadEarningsData(ticker) {
    try {
        const response = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=calendarEvents,earnings`);
        const data = await response.json();
        
        if (data.quoteSummary && data.quoteSummary.result) {
            const result = data.quoteSummary.result[0];
            const calendar = result.calendarEvents || {};
            const earnings = result.earnings || {};
            
            // Next earnings date
            const nextEarningsDate = calendar.earnings?.earningsDate?.[0]?.fmt || 'Not available';
            document.getElementById('nextEarnings').textContent = nextEarningsDate;
            
            // Previous earnings
            const earningsHistory = earnings.earningsChart?.quarterly || [];
            let previousHtml = '';
            
            if (earningsHistory.length > 0) {
                earningsHistory.slice(0, 4).forEach(quarter => {
                    const date = quarter.date || 'N/A';
                    const actual = quarter.actual?.fmt || 'N/A';
                    const estimate = quarter.estimate?.fmt || 'N/A';
                    const beat = quarter.actual?.raw > quarter.estimate?.raw;
                    const color = beat ? 'text-green-600' : 'text-red-600';
                    
                    previousHtml += `
                        <div class="flex justify-between items-center py-1 border-b">
                            <span class="text-gray-600">${date}</span>
                            <span class="${color} font-semibold">
                                ${actual} vs ${estimate} ${beat ? '✓' : '✗'}
                            </span>
                        </div>
                    `;
                });
            } else {
                previousHtml = '<div class="text-xs text-gray-500">No earnings history available</div>';
            }
            
            document.getElementById('previousEarnings').innerHTML = previousHtml;
        }
    } catch (error) {
        console.error('Error loading earnings data:', error);
        document.getElementById('nextEarnings').textContent = 'N/A';
        document.getElementById('previousEarnings').innerHTML = '<div class="text-xs text-gray-500">Unable to load earnings data</div>';
    }
}

// Format market cap
function formatMarketCap(value) {
    if (!value) return 'N/A';
    
    if (value >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toFixed(2)}`;
}

// Focus input on load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tickerInput').focus();
});
