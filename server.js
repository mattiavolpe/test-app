
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy per bypassare CORS sulle webcam
app.use('/proxy', createProxyMiddleware({
    target: 'https://',
    changeOrigin: true,
    pathRewrite: (pathReq) => {
        const targetUrl = pathReq.replace(/^\/proxy\//, '');
        return targetUrl;
    },
    router: (req) => {
        const url = req.url.replace(/^\/proxy\//, '');
        return url.split('/')[0];
    }
}));

// Servire i file statici
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Server avviato su porta ${PORT}`);
});
