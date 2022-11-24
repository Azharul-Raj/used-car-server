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

const connectDB = async () => {
    client.connect()
    console.log('db connected');
}
connectDB();
const categoryList = client.db('used_car_zone').collection('categories');
const brandsList = client.db('used_car_zone').collection('category');
const usersCollection = client.db('used_car_zone').collection('users');

app.get('/categories', async (req, res) => {
    const categories = await categoryList.find({}).toArray();
    res.send(categories);
})
// 
app.get('/category/:id', async (req, res) => {
    const id=parseInt(req.params.id)
    console.log(typeof id);
    const query={category_id:id}
    const brandCategory = await brandsList.find(query).toArray();
    res.send(brandCategory)
})
// post a user
app.post('/users', async (req, res) => {
    const userInfo = req.body;
    const email = req.query.email;
    const query={email:email}
    const isExist = await usersCollection.find(query).toArray();
    if (isExist.length) {
        return res.send({isExist:true})
    }
    const result = await usersCollection.insertOne(userInfo);
    res.send(result);
})