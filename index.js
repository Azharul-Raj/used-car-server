const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
var jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET);


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
    const query={category_id:id,isPaid:false}
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
/*
advertise items getting api
*/
app.get('/advertise',verifyJWT, async (req, res) => {
    const query = { isAdvertise: true };
    const allAdvertise = await productsList.find(query).toArray();
    res.send(allAdvertise);
})
// booking api
app.post('/orders', async (req, res) => {
    const orderInfo = req.body;
    const id = orderInfo.carId;
    const options = { upsert: true };
    const filter = { _id: ObjectId(id) };
    const updateDoc = {
        $set: {
            isSold:false
        }
    }
    const updateResult = await productsList.updateOne(filter, updateDoc,options);
    const result = await ordersCollection.insertOne(orderInfo);
    res.send({updateResult});
})
// user order getting api
app.get('/orders',verifyJWT, async (req, res) => {
    const email = req.query.email;
    const query={email:email}
    const orders = await ordersCollection.find(query).toArray();
    res.send(orders);
})
// single order getting api
app.get('/payment/:id', async (req, res) => {
    const { id } = req.params;
    const query = { _id: ObjectId(id) };
    const order = await ordersCollection.findOne(query);
    res.send(order)
})

// payment add and update paid status
app.post('/payments', async (req, res) => {
    const payment = req.body;
    const id = payment.orderID;
    const productId = payment.productID;
    const options = { upsert: true };
    const filter = { _id: ObjectId(id) };
    const productFilter={_id:ObjectId(productId)}
    const updateDoc = {
        $set: {
            isPaid:true
        }
    }
    const result = await paymentsCollection.insertOne(payment);
    const updatePaymentStatus = await ordersCollection.updateOne(filter, updateDoc, options);
    const updateProductStatus = await productsList.updateOne(productFilter, updateDoc, options);
    res.send({result,updatePaymentStatus});
})
// stripe payment intent
app.post('/create-payment-intent', async (req, res) => {
    const price = req.body.price;
    const amount=price*100
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card']
    });
    // console.log(paymentIntent.client_secret);
    res.send({
        clientSecret: paymentIntent.client_secret,
      });
})
// check user status api
app.get('/user/role/:email', async (req, res) => {
    const { email } = req.params;
    const query={email}
    const position = await usersCollection.findOne(query);
    res.send({position:position.role})
})
/**
 * ADMIN
 // all buyers getting api
 */
app.get('/identity/:role',verifyJWT, async (req, res) => {
    const { role } = req.params;
    const query={role:role}
    const buyers = await usersCollection.find(query).toArray();
    res.send(buyers);
})
/******* 
 * REPORT POSTING ISSUE
*/
app.put('/report/:id', async (req, res) => {
    const { id } = req.params;
    const filter = { _id: ObjectId(id) };
    const updateDoc = {
        $set: {
            isReported:true
        }
    }
    const result = await productsList.updateOne(filter, updateDoc);
    res.send(result)
})
// reported item getting api
app.get('/reported', async (req, res) => {
    const query = { isReported:true };
    const reported = await productsList.find(query).toArray();
    res.send(reported);
})
// seller delete api
app.delete('/seller/:id', async (req, res) => {
    const { id } = req.params;
    const query = { _id: ObjectId(id) };
    const result = await usersCollection.deleteOne(query);
    res.send(result);
})
// buyer delete api
app.delete('/buyer/:id', async (req, res) => {
    const { id } = req.params;
    const query = { _id: ObjectId(id) };
    const result = await usersCollection.deleteOne(query);
    res.send(result);
})
/*
 **ADMIN
*/

/***SELLER START*/
app.get('/my_products/:name', async (req, res) => {
    const { name } = req.params;
    const query = { sellerName: name }
    const myproducts = await productsList.find(query).toArray();
    res.send(myproducts);
})
//  product adding api
app.post('/add_product', async (req, res) => {
    const product = req.body;
    const result = await productsList.insertOne(product);
    res.send(result);
})
// advertise api here
app.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const filter = { _id: ObjectId(id) };
    const updateDoc = {
        $set: {
            isAdvertise:true
        }
    }
    const result = await productsList.updateOne(filter, updateDoc);
    res.send(result)
})
// delete product api 
app.delete('/product_delete/:id', async (req, res) => {
    const { id } = req.params;
    const query = { _id: ObjectId(id) };
    const result = await productsList.deleteOne(query);
    res.send(result);
})
// update a seller status
app.put('/verify/:name', async (req, res) => {
    const { name } = req.params;
    console.log(name);
    const userFilter = { name };
    const productsFilter = { sellerName: name };
    const updateDoc = {
        $set: {
            isVerified:true
        }
    }
    // products part update
    const userUpdate = await usersCollection.updateOne(userFilter, updateDoc);
    const updateSeller = await productsList.updateMany(productsFilter, updateDoc);
    res.send({userUpdate,updateSeller})
})
 /***SELLER END*/


// jwt function
app.get('/jwt', async (req, res) => {
    const { email } = req.params;
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.send({token:token})
})