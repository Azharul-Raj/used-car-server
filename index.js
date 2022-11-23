const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
require('dotenv').config()
// middleware
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;

app.get('/', async (req, res) => {
    res.send('SERVER IS UP AND RUNNING')
})
app.listen(port, () => {
    console.log(`server is running at ${port}`);
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dnsrj7s.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
console.log(uri);
const connectDB = async () => {
    client.connect()
    console.log('db connected');
}
connectDB();
const categoryList = client.db('used_car_zone').collection('categories')

app.get('/categories', async (req, res) => {
    const categories = await categoryList.find({}).toArray();
    res.send(categories);
})
app.post('/categories', async (req, res) => {
    const info = req.body
    const result =await categoryList.insertOne(info)
    res.json(result)
})