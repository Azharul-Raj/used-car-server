const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
var jwt = require('jsonwebtoken');

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
const productsList = client.db('used_car_zone').collection('category');
const usersCollection = client.db('used_car_zone').collection('users');
const ordersCollection = client.db('used_car_zone').collection('orders');

app.get('/categories', async (req, res) => {
    const categories = await categoryList.find({}).toArray();
    res.send(categories);
})
// 
app.get('/category/:id', async (req, res) => {
    const id=parseInt(req.params.id)
    const query={category_id:id}
    const brandCategory = await productsList.find(query).toArray();
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
// booking api
app.post('/orders', async (req, res) => {
    const orderInfo = req.body;
    const id = orderInfo.carId;
    const filter = { _id: ObjectId(id) };
    const updateDoc = {
        $set: {
            isSold:true
        }
    }
    const updateResult = await productsList.updateOne(filter, updateDoc);
    const result = await ordersCollection.insertOne(orderInfo);
    res.send({result,updateResult});
})
// order getting api
app.get('/orders', async (req, res) => {
    const email = req.query.email;
    const query={email:email}
    const orders = await ordersCollection.find(query).toArray();
    res.send(orders);
})
// jwt function
app.get('/jwt', async (req, res) => {
    const { email } = req.params;
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.send({token:token})
})