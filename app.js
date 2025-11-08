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
    
    // Update URL with ticker
    const url = new URL(window.location);
    url.searchParams.set('ticker', ticker);
    window.history.pushState({}, '', url);
    
    // Show dashboard
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Update all links
    updateLinks(ticker);
    
    // Load data
    loadCompanyInfo(ticker);
    loadEarningsData(ticker);
    
    // Load TradingView chart after a short delay to ensure container is visible
    setTimeout(() => {
        loadTradingViewChart(ticker);
    }, 100);
}

// Update all external links
function updateLinks(ticker) {
    // Options link
    document.getElementById('optionsLink').href = `https://dex.tradingedge.club/?ticker=${ticker}`;
    
    // Unusual Flow link (updated structure)
    document.getElementById('flowLink').href = `https://flow.tradingedge.club/Symbol.aspx?Id=${ticker}&Days=90`;
    
    // Tear comments link (updated format)
    document.getElementById('tearLink').href = `https://tradingedge.club/search?term=${ticker}&sort=created_at&sort_order=desc`;
    
    // Reddit link
    document.getElementById('redditLink').href = `https://www.reddit.com/search/?q=${ticker}`;
    
    // Google link
    document.getElementById('googleLink').href = `https://www.google.com/search?q=${ticker}+share+price`;
}

// Load TradingView chart with 3 EMAs
function loadTradingViewChart(ticker) {
    const container = document.getElementById('tradingview-widget');
    
    if (!container) {
        console.error('TradingView container not found');
        return;
    }
    
    if (typeof TradingView === 'undefined') {
        console.error('TradingView library not loaded');
        container.innerHTML = '<div class="text-red-500 text-xs p-4">TradingView failed to load</div>';
        return;
    }
    
    container.innerHTML = ''; // Clear previous chart
    
    try {
        new TradingView.widget({
            "autosize": true,
            "symbol": ticker,
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "light",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "withdateranges": true,
            "range": "12M",
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "save_image": false,
            "studies": [
                "MAExp@tv-basicstudies"
            ],
            "container_id": "tradingview-widget"
        });
        console.log('TradingView chart loaded for', ticker);
    } catch (error) {
        console.error('Error loading TradingView chart:', error);
        container.innerHTML = '<div class="text-red-500 text-xs p-4">Chart failed to load</div>';
    }
}

// Load company information using Yahoo Finance via CORS proxy
async function loadCompanyInfo(ticker) {
    console.log('Loading company info for:', ticker);
    try {
        // Using CORS proxy to access Yahoo Finance
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryProfile,price,defaultKeyStatistics`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        console.log('Fetching from:', proxyUrl);
        const response = await fetch(proxyUrl);
        
        console.log('Response status:', response.status);
        const data = await response.json();
        
        console.log('Company data:', data);
        
        if (data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result[0]) {
            const result = data.quoteSummary.result[0];
            const profile = result.summaryProfile || {};
            const price = result.price || {};
            const stats = result.defaultKeyStatistics || {};
            
            // Update company info
            document.getElementById('sector').textContent = profile.sector || 'N/A';
            document.getElementById('marketCap').textContent = formatMarketCap(price.marketCap?.raw);
            document.getElementById('peRatio').textContent = stats.trailingPE?.fmt || 'N/A';
            document.getElementById('eps').textContent = stats.trailingEps?.fmt || 'N/A';
            document.getElementById('description').textContent = profile.longBusinessSummary || `${price.longName || ticker} - No description available.`;
            
            console.log('Company info loaded successfully');
        } else {
            throw new Error('No data in response');
        }
    } catch (error) {
        console.error('Error loading company info:', error);
        document.getElementById('sector').textContent = 'N/A';
        document.getElementById('marketCap').textContent = 'N/A';
        document.getElementById('peRatio').textContent = 'N/A';
        document.getElementById('eps').textContent = 'N/A';
        document.getElementById('description').textContent = `Unable to load data for ${ticker}. Check ticker symbol.`;
    }
}

// Load earnings data using Yahoo Finance via CORS proxy
async function loadEarningsData(ticker) {
    console.log('Loading earnings for:', ticker);
    try {
        // Get earnings calendar
        const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=calendarEvents,earnings`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        console.log('Earnings data:', data);
        
        if (data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result[0]) {
            const result = data.quoteSummary.result[0];
            const calendar = result.calendarEvents || {};
            const earnings = result.earnings || {};
            
            // Next earnings date
            if (calendar.earnings && calendar.earnings.earningsDate && calendar.earnings.earningsDate[0]) {
                const date = new Date(calendar.earnings.earningsDate[0].raw * 1000);
                document.getElementById('nextEarnings').textContent = date.toLocaleDateString();
            } else {
                document.getElementById('nextEarnings').textContent = 'N/A';
            }
            
            // Previous earnings
            let previousHtml = '';
            const quarters = earnings.earningsChart?.quarterly || [];
            
            if (quarters.length > 0) {
                quarters.slice(0, 4).forEach(quarter => {
                    const date = quarter.date || 'N/A';
                    const actual = quarter.actual?.raw;
                    const estimate = quarter.estimate?.raw;
                    
                    if (actual !== undefined && estimate !== undefined) {
                        const beat = actual > estimate;
                        const color = beat ? 'text-green-600' : 'text-red-600';
                        
                        previousHtml += `
                            <div class="flex justify-between items-center py-1 border-b">
                                <span class="text-gray-600">${date}</span>
                                <span class="${color} font-semibold text-xs">
                                    $${actual.toFixed(2)} vs $${estimate.toFixed(2)} ${beat ? '✓' : '✗'}
                                </span>
                            </div>
                        `;
                    }
                });
            }
            
            if (previousHtml) {
                document.getElementById('previousEarnings').innerHTML = previousHtml;
            } else {
                document.getElementById('previousEarnings').innerHTML = '<div class="text-xs text-gray-500">No earnings history</div>';
            }
            
            console.log('Earnings loaded successfully');
        } else {
            throw new Error('No data in response');
        }
    } catch (error) {
        console.error('Error loading earnings data:', error);
        document.getElementById('nextEarnings').textContent = 'N/A';
        document.getElementById('previousEarnings').innerHTML = '<div class="text-xs text-gray-500">Unable to load earnings</div>';
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

// Check URL for ticker on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticker = urlParams.get('ticker');
    
    if (ticker) {
        // Populate input and search
        document.getElementById('tickerInput').value = ticker;
        searchTicker();
    } else {
        // Focus input if no ticker in URL
        document.getElementById('tickerInput').focus();
    }
});
