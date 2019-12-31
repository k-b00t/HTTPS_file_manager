'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');


const template = (data)=>{
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css'>
            <style>
                body {
                    font-family: arial;
                }
                .container {
                    width: 100%;
                    margin: 10vh auto;
                    max-width: 600px;
                    padding: 2% 5%;
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    box-shadow: 0 0 10px 10px #eee;
                }
                .prev-path,
                .item {
                    cursor: pointer;
                }
                .hidden-input-file {
                    display:none;
                }
                .form-file {
                    position:relative;
                    left: 75%;
                }
                .btn {
                    padding: 5px 10px;
                    background: #fff;
                    border: 1px solid #999;
                    border-radius: 5px;
                }
            </style>
        </head>
        <body>
            <div class='container'>
                <form class='form-file' method='post' enctype='multipart/form-data'>
                    <input class='hidden-input-file' type='file' name='file'>
                    <button class='fake-input-file btn'>Choose file</button>
                    <button class='btn' type='submit'>Upload</button>
                </form>
                <div class='content'>
                    <p class='prev-path'>..</p>
                    ${data}
                </div>
            </div>
        </body>
        <script>
            const path = window.location.origin;
            document.querySelectorAll('.item').forEach(d=>{
                d.addEventListener('click', function(){
                    const urlLastCchar = window.location.href[window.location.href.length -1];

                    (urlLastCchar === '/')
                        ? window.location.href += this.innerHTML
                        : window.location.href += ('/' + this.innerHTML);
                });
            });
            document.querySelector('.prev-path').addEventListener('click', ()=>{
                let routes = window.location.href.replace(path, '').split('/')
                if(routes.length > 0) {
                    routes.pop();
                    window.location.href = path + routes.join('/');
                };
            });
            document.querySelector('.fake-input-file').addEventListener('click', ()=>{
                document.querySelector('.hidden-input-file').click();
            });
            document.querySelector('.form-file').addEventListener('submit', (event)=>{
                event.preventDefault();
                if(document.querySelector('.hidden-input-file').files[0]) {
                    const file = document.querySelector('.hidden-input-file').files[0];
                    const xhttp = new XMLHttpRequest();
                    xhttp.onload = function() {
                        if(this.status === 200 && xhttp.responseText === 'success') {
                            document.querySelector('.content').innerHTML += "<p><i class='far fa-file'></i> -- <span class='item'>" + file.name + "</span></p>"
                        };
                    };
                    xhttp.open('POST', window.location.href, true);
                    xhttp.setRequestHeader('filetype', file.type);
                    xhttp.setRequestHeader('filename', file.name);
                    xhttp.send(file);
                };
            });
        </script>
        </html>
    `;
};


const route = process.argv[2] + '/' || './'

const middlewareRedirect = (req, res)=> {
    res.writeHead(301, {Location: `https://${req.headers.host}:443/`});
    res.end();
};

const middlewareHttps = (req, res)=>{
    if(req.method === 'GET') {
        if(req.url == '/') {
            console.log(`source: ${req.connection.remoteAddress}    ||   path: ${route}`)
            listDir(res, route);
        } else {
            readFile(req, res);
        };
    } else if(req.method === 'POST'){
        writeFile(req, res);
    };
};

const listDir = (res, path)=> {
    fs.readdir(path, (err, data)=>{
        let buffer = '';
        if(data) {
            data.forEach(d=> {
                (fs.lstatSync(`${path}/${d}`).isDirectory())
                    ? buffer += `<p><i class="far fa-folder"></i> -- <span class='item'>${d}</span></p>`
                    : buffer += `<p><i class="far fa-file"></i> -- <span class='item'>${d}</span></p>`;
            });
        };
        res.end(template(buffer));
    });
};

const readFile = (req, res)=>{
    const path = route + req.url.slice(1, );
    if(path !== '/favicon.ico') {
        fs.lstat(path, (err, stat)=>{
            if(!err) {
                console.log(`source: ${req.connection.remoteAddress}    ||   path: ${path}`)
                stat.isDirectory()
                    ? listDir(res, path)
                    : fs.readFile(path, (err, data)=>{
                        res.end((data) ? data : '');
                    });
            } else {
                res.end();
            };
        });
    } else {
        res.end();
    };
};

const writeFile = (req, res)=> {
    const path = `${route + req.url.slice(1, )}/${req.headers.filename || Date.now() + 'undefined'}`;
    fs.readFile(path, (err, data)=>{
        if(!data) {
            let data = '';
            let encoding;
            if(req.headers.filetype && req.headers.filetype !=='text/plain') {
                req.setEncoding('binary');
                encoding = 'binary'
            } else {
                encoding = 'utf-8'
            };
            req.on('data', (chunk)=>{
                data += chunk;
            });
            req.on('end', ()=>{
                if(data) {
                    fs.writeFile(path, data, {encoding}, (err)=>{
                        if(!err) {
                            res.end('success');
                        } else {
                            res.end('error');
                        };
                    });
                } else {
                    res.end('error');
                };
            });
        } else {
            res.end('error');
        };
    });
};



http.createServer(middlewareRedirect).listen(80, ()=>{
    console.log('node0:80 connected');
});

https.createServer({
    key: fs.readFileSync('./certificate/key'),
    cert: fs.readFileSync('./certificate/crt'),
}, middlewareHttps).listen(443, ()=>{
    console.log('node1:443 connected\n');
});