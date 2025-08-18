const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('.'));

app.get('/proxy', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        console.log(`Fetching: ${url}`);
        
        // Threads 특별 처리 - GraphQL API 시도
        if (url.includes('threads.net') || url.includes('threads.com')) {
            const username = url.split('@').pop().replace('/', '');
            console.log(`Threads 사용자: ${username}`);
            
            // Threads는 인스타그램 기반이므로 인스타그램 API 시도
            const instagramUrl = `https://www.instagram.com/${username}/`;
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
            };
            
            try {
                const response = await axios.get(instagramUrl, { headers, timeout: 10000 });
                res.send(response.data);
                return;
            } catch (e) {
                console.log('인스타그램 접근 실패, Threads 직접 시도');
            }
        }
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        const response = await axios.get(url, {
            headers,
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: function (status) {
                return status < 500;
            }
        });

        res.send(response.data);
    } catch (error) {
        console.error('Proxy error:', error.message);
        
        if (error.response) {
            res.status(error.response.status).json({ 
                error: 'Failed to fetch content',
                details: error.message 
            });
        } else if (error.request) {
            res.status(503).json({ 
                error: 'No response from target server',
                details: error.message 
            });
        } else {
            res.status(500).json({ 
                error: 'Proxy server error',
                details: error.message 
            });
        }
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   SNS 팔로워 체크 서버가 시작되었습니다!   ║
    ╠════════════════════════════════════════╣
    ║   서버 주소: http://localhost:${PORT}     ║
    ║   브라우저에서 위 주소로 접속하세요        ║
    ╚════════════════════════════════════════╝
    `);
});