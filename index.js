const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
var jwt = require('jsonwebtoken');
const stripe = require('stripe')(STRIPE_SECRET);


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
// jwt middleware
const verifyJWT = (req, res, next) => {
    const authHead = req.headers.authorization;
    if (!authHead) {
        res.status(401).send('UNAUTHORIZED')
    }
    const token = authHead.split(' ')[1]
    jwt.verify(token, process.env.JWT_SECRET, (err,decoded) => {
        if (err) {
            return res.status(401).send('INVALID TOKEN')
        }
        req.decoded = decoded;
        next();
    })
}

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
const paymentsCollection = client.db('used_car_zone').collection('payments');

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
// check user admin or not 
app.get('/user/admin:email', async (req, res) => {
    const { email } = req.params;
    const query={email}
    const user = await usersCollection.find(query);
    if (user) {
        res.send(us)
    }
})
// payment add and update paid status
app.post('/payments', async (req, res) => {
    const payment = req.body;
    const id = payment.productID
    const filter = { _id: ObjectId(id) };
    const updateDoc = {
        $set: {
            isPaid:true
        }
    }
    const updatePaymentStatus = await productsList.updateOne(filter, updateDoc);
    const result = await paymentsCollection.insertOne(payment);
    res.send(result);
})
// stripe payment intent
app.post('/create-payment-intent', async (req, res) => {
    const price= req.body.price;
    const amount=price*100
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card']
    });
    res.send({
        clientSecret: paymentIntent.client_secret,
      });
})

// jwt function
app.get('/jwt', async (req, res) => {
    const { email } = req.params;
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.send({token:token})
})