const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 3004;

// middlewares 
app.use(cors());
app.use(express.json());















app.get('/', (req, res) => {
    res.send("Assignment12 server is running..........");
})

app.listen(port, () => {
    console.log(`Assignment12 Server is running on port: ${port}`);
});
