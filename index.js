const express = require("express");
const app = express();
const cors = require("cors");
 const stripe = require("stripe")('sk_test_51M66GGIo1LJSizd52lmGNVzhlq6Zg9xPhKmCDiFs0O0JWW4QSCnJcMAPuN0Lkaaj3vJn5KrUuRsJnDvpLXDeMNSX00HO7rHyvl');
 const jwt = require('jsonwebtoken');
require('dotenv').config();
const morgan = require('morgan');

// Import the client and dbConnect function from mongodb.config.js
const { dbConnect, client } = require("./mongodb/mongodb.config");
const { ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// run mongodb
dbConnect();

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      res.status(401).send({ message: 'Unauthorized access' });
    } else {
      req.decoded = decoded;
      next(); // Move this line here
    }
  });
}

const categoryCollection = client.db('resalePhone').collection('categories');
const reviewCollection=client.db('resalePhone').collection('reviews');
const productsCollection=client.db('resalePhone').collection('products');
const bookingCollection=client.db('resalePhone').collection('bookings');
const usersCollection=client.db('resalePhone').collection('users');
const mobileCollection=client.db('resalePhone').collection('mobiles');
const paymentCollection=client.db('resalePhone').collection('payments');

 app.post('/jwt',async(req,res)=>{
  const user=req.body;
  const token=jwt.sign(user,process.env.ACCESS_TOKEN,{expiresIn:'2 days'})
  res.send({token})
 })


app.get('/categories', async (req, res) => {
  const query = {};
  const result = await categoryCollection.find(query).toArray();
  res.send(result);
});

app.post("/create-payment-intent", async (req, res) => {
  const booking = req.body;
  const price = booking.price;
  const amount = price * 100;
  const paymentIntent = await stripe.paymentIntents.create({
    currency: "usd",
    amount: amount,
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});
app.post('/payments',async(req,res)=>{
  const payment=req.body;
  const result=await paymentCollection.insertOne(payment);
  const id=payment.bookingId;
  const filter={_id:new ObjectId(id)};
  const updatedDoc={
    $set:{
      paid:true,
      transactionId:payment.transactionId
    }
  }
  const updatedResult=await bookingCollection.updateOne(filter,updatedDoc)
  res.send(result)
})

app.post('/review',async(req,res)=>{
  const review=req.body;
  const result=await reviewCollection.insertOne(review);
  res.send(result)
});
app.get('/reviews',async(req,res)=>{
  const query={};
  const result=await reviewCollection.find(query).toArray();
  res.send(result)
});
app.get('/products/:categoryId', async (req, res) => {
  const categoryId = req.params.categoryId;
  console.log(categoryId)
  const query = { categoryId };
  const result = await productsCollection.find(query).toArray();
  res.set('Cache-Control', 'no-store'); // Add this line to disable caching
  res.send(result);
});
app.post('/bookings',async(req,res)=>{
  const booking=req.body;
  const result=await bookingCollection.insertOne(booking);
  res.send(result)
});
app.get('/bookings/:id',verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    console.log('Received id:', id); // Add this line to log the id
    const query = { _id: new ObjectId(id) };
    const result = await bookingCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.send({
      success: false,
      error: error.message
    });
  }
});

app.put('/users/seller/:id/verify', async (req, res) => {
  const id = req.params.id;
  try {
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        verification: 'verified'
      }
    };
    const result = await usersCollection.updateOne(filter, updateDoc);
    
    if (result.modifiedCount > 0) {
      res.send({ success: true });
    } else {
      res.send({ success: false, message: 'Seller not found or not modified' });
    }
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});
  
app.post('/users',async(req,res)=>{
  const user=req.body;
  const result=await usersCollection.insertOne(user);
  res.send(result)
});
app.get('/users/admin/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await usersCollection.findOne(query);
  res.send({ isAdmin: user?.type === 'admin' });
});
app.get('/users/buyer/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await usersCollection.findOne(query);
  res.send({ isBuyer: user?.type === 'Buyer' });
});
app.get('/users/seller/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await usersCollection.findOne(query);
  res.send({ isSeller: user?.type === 'Seller' });
});
  

app.get('/users/seller',async(req,res)=>{
  const seller={type:'Seller'}
  const result=await usersCollection.find(seller).toArray();
  res.send(result)
})
app.get('/users/buyer',async(req,res)=>{
  const seller={type:'Buyer'}
  const result=await usersCollection.find(seller).toArray();
  res.send(result)
})
app.delete('/users/buyer/:id',async (req, res) => {
  try {
    const id = req.params.id;
    const filter={_id:new ObjectId(id)}
    const result = await usersCollection.deleteOne(filter);
    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});
app.delete('/users/seller/:id',async (req, res) => {
  try {
    const id = req.params.id;
    const filter={_id:new ObjectId(id)}
    const result = await usersCollection.deleteOne(filter);
    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});
app.post('/addmobiles',async(req,res)=>{
  const mobile=req.body;
  const result=await mobileCollection.insertOne(mobile);
  res.send(result)
});
app.get('/addmobiles',async(req,res)=>{
  const query={};
  const result=await mobileCollection.find(query).toArray();
  res.send(result)
});
app.delete('/addmobiles/:id',async (req, res) => {
  try {
    const id = req.params.id;
    const filter={_id:new ObjectId(id)}
    const result = await mobileCollection.deleteOne(filter);
    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

app.get('/bookings', verifyJWT, async (req, res) => {
  const decoded = req.decoded;
  // console.log('inside orders api', decoded);
  if(decoded.email!==req.query.email){
    res.status(403).send({message:'Unauthorezed access'})
  }
  let query;
  if(req.query.email){
    query={
      email:req.query.email
    }
  }
  const cursor=bookingCollection.find(query);
  const bookings=await cursor.toArray();
  res.send(bookings)
});
app.get('/', (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => console.log(`Server is listening on http://localhost:${port}`));