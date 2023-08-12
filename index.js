const express = require("express");
const app = express();
const cors = require("cors");
require('dotenv').config();
const morgan = require('morgan');

// Import the client and dbConnect function from mongodb.config.js
const { dbConnect, client } = require("./mongodb/mongodb.config");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// run mongodb
dbConnect();

const categoryCollection = client.db('resalePhone').collection('categories');
app.get('/categories', async (req, res) => {
  const query = {};
  const result = await categoryCollection.find(query).toArray();
  res.send(result);
});

app.get('/', (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => console.log(`Server is listening on http://localhost:${port}`));