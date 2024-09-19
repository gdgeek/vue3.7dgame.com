const express = require('express');
const path = require('path');
const app = require('https-localhost')("test.mrpp.com");



// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.listen(8888)
