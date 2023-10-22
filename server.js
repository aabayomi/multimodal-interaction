const express = require('express');
const bodyParser = require('body-parser');
const path = require('path'); 
const app = express();
const http = require('http').Server(app);
const port = process.env.PORT || 3001;
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));  
app.use(bodyParser.json());

// app.listen(3000, () => {
//     console.log('Server is running on port 3000');
// });
http.listen(port, () => console.log('listening on port ' + port));