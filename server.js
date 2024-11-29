const express = require('express');
const path = require('path');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');
const fs = require('fs');

const app = express();
const port = 80;

// Configure live reload server
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, 'whirling'));

// Add live reload middleware before other middleware
app.use(connectLivereload());
// Optional: Trigger refresh when server restarts
liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100);
});

// Serve static files from the 'public' directory
app.use('/static', express.static('whirling/static'));
app.use('/aframe', express.static('aframe'));

// Basic route for the home page
app.get('/', (req, res) => {
    fs.readdir('whirling/demo', (err, files) => {
        if (err) {
            res.status(500).send('Error reading directory');
            return;
        }

        // Filter out non-HTML files and hidden files
        const htmlFiles = files.filter(file => 
            file.endsWith('.html') && !file.startsWith('.')
        );

        // Create a more styled HTML response
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Whirling Interface Demos-Testing</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 40px auto;
                        padding: 0 20px;
                    }
                    h1 { color: #333; }
                    ul { list-style-type: none; padding: 0; }
                    li { 
                        margin: 10px 0;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    }
                    a {
                        color: #0066cc;
                        text-decoration: none;
                        display: block;
                    }
                    a:hover { color: #003366; }
                </style>
            </head>
            <body>
                <h1>Whirling Interface Demos</h1>
                <ul>
                    ${htmlFiles.map(file => `
                        <li><a href="/demo/${file.replace('.html', '')}">${file.replace('.html', '')}</a></li>
                    `).join('')}
                </ul>
            </body>
            </html>
        `;
        
        res.send(html);
    });
});

// Route /demo to the home page
app.get('/demo', (req, res) => {
    res.redirect('/');
});

// Route for demo files
app.get('/demo/:filename', (req, res) => {
    // If filename contains no extension, add .html
    const file = req.params.filename.includes('.') ? 
        req.params.filename : 
        `${req.params.filename}.html`;
    res.sendFile(path.join(__dirname, 'whirling/demo', file));
});

// Error handling for file not found
app.use((req, res) => {
    res.status(404).send('File not found');
});


// Add this before your static middleware
app.use((req, res, next) => {
    const allowedExtensions = ['.jpg', '.png', '.pdf', '.html'];
    if (allowedExtensions.includes(path.extname(req.url))) {
        next();
    } else {
        res.status(403).send('File type not allowed');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

