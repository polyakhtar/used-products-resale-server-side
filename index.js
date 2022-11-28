const express=require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express();
require('dotenv').config();
var jwt = require('jsonwebtoken');
const cors=require('cors');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port =process.env.PORT||5000;


// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mjqzqbo.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req,res,next){
    const authHeader=req.headers.authorization;
    // console.log(authHeader)
    if(!authHeader){
      return res.status(403).send('Unauthorized Access')
    }
    const token=authHeader.split(' ')[1];
    // console.log(token)
    jwt.verify(token,process.env.ACCESS_TOKEN,function(err,decoded){
      console.log(process.env.ACCESS_TOKEN)
      if(err){
        // console.log(err)
        return res.status(403).send({message:'forbidden access'})
      }
      req.decoded=decoded;
      next();
    })
  }
async function run(){
    try{
const categoryCollection=client.db('resalePhones').collection('categories');
const productsCollection=client.db('resalePhones').collection('Products');
const mobilesCollection=client.db('resalePhones').collection('addmobiles');
const usersCollection=client.db('resalePhones').collection('users');
const bookingsCollection=client.db('resalePhones').collection('bookings');
const paymentsCollection=client.db('resalePhones').collection('payments');
const verifyAdmin=async(req,res,next)=>{
  console.log('inside admin',req.decoded.email);
  const decodedEmail=req.decoded.email;
  const query={email:decodedEmail};
  const user=await usersCollection.findOne(query);
  if(user?.type!=='admin'){
      return res.status(403).send({message:'forbidden access2'})
  }
  next();
}
app.get('/categories',async(req,res)=>{
    const query={};
    const result=await categoryCollection.find(query).toArray();
    res.send(result)
})
app.get('/products/:id',async(req,res)=>{
    const id=req.params.id;
    const query={categoryId:id}
const product=await productsCollection.find(query).toArray();
res.send(product)
})
app.get('/addmobiles',async(req,res)=>{
  const query={};
  const result=await mobilesCollection.find(query).toArray();
  res.send(result)
})
app.post('/addmobiles',async(req,res)=>{
  const mobile=req.body;
  const result=await mobilesCollection.insertOne(mobile);
  res.send(result);
})
app.delete('/addmobiles/:id',async(req,res)=>{
  const id=req.params.id;
  const filter={_id:ObjectId(id)};
  const result=await mobilesCollection.deleteOne(filter);
  res.send(result);
})
app.get('/users',async(req,res)=>{
    const query={}
    const user=await usersCollection.find(query).toArray();
    res.send(user)
  })
  app.get('/users/admin/:email',async(req,res)=>{
    const email=req.params.email;
    const query={email};
    const user=await usersCollection.findOne(query);
    res.send({isAdmin:user?.type==='admin'})
})
app.get('/users/Seller/:email',async(req,res)=>{
  const email=req.params.email;
  const query={email};
  const user=await usersCollection.findOne(query);
  res.send({isSeller:user?.type==='Seller'})
})
app.get('/users/User/:email',async(req,res)=>{
  const email=req.params.email;
  const query={email};
  const user=await usersCollection.findOne(query);
  res.send({isUser:user?.type==='User'})
})

app.get('/users/:type',async(req,res)=>{
  const type=req.params.type;
  const query={type:type}
  if(type==="Seller"){
   const result=await usersCollection.find(query).toArray();
  res.send(result);
  }
  else if(type==="User"){
    const result=await usersCollection.find(query).toArray();
    res.send(result)
  }
})
app.post('/users',async(req,res)=>{
  const user=req.body;
  const result=await usersCollection.insertOne(user);
  res.send(result);
})
app.delete('/users/User/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id:ObjectId(id)};
  const result=await usersCollection.deleteOne(query);
  res.send(result);
})
app.delete('/users/Seller/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id:ObjectId(id)};
  const result=await usersCollection.deleteOne(query);
  res.send(result)
})
app.put('/users/Seller/:id',async(req,res)=>{
  const id=req.params.id;
  const filter={_id:ObjectId(id)};
  const options={upsert:true}
  const updateDoc={
    $set:{
     verification:'verified'
    }
  }
  const result=await usersCollection.updateOne(filter,updateDoc,options);
  res.send(result)
})
app.get('/bookings',async(req,res)=>{
  let query={};
    if(req.query?.email){
        query={
            email:req.query?.email
        }
    }
  const result=await bookingsCollection.find(query).toArray();
  res.send(result)
})
app.get('/bookings/:id',async(req,res)=>{
  const id=req.params.id;
  const query={_id:ObjectId(id)};
  const booking=await bookingsCollection.findOne(query);
  res.send(booking)
})
app.post('/bookings',async(req,res)=>{
  const booking=req.body;
  const result=await bookingsCollection.insertOne(booking);
  res.send(result)
})
app.post("/create-payment-intent",async(req,res)=>{
  const booking=req.body;
  const price=booking.productPrice;
  const amount=price*100;
  const paymentIntent = await stripe.paymentIntents.create({
    currency: "usd",
    amount:amount,
    "payment_method_types": [
      "card"
    ],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
})
app.post('/payments',async(req,res)=>{
  const payment=req.body;
  const result=await paymentsCollection.insertOne(payment);
  const id=payment.bookingId;
  const filter={_id:ObjectId(id)};
  const updateDoc={
    $set:{
      paid:true,
      transactionId:payment.transactionId
    }
  }
  const updatedResult=await bookingsCollection.updateOne(filter,updateDoc)
  res.send(result)
})
app.get('/jwt',async(req,res)=>{
    const email=req.query.email;
    const query={email:email};
    const user=await usersCollection.findOne(query);
      const token=jwt.sign({email},process.env.ACCESS_TOKEN,{expiresIn:'1h'})
      return res.send({accessToken:token})
  })

    }
    finally{

    }
}
run().catch(console.log)



app.get('/',(req,res)=>{
    res.send('resale phone api running')
})
app.listen(port,()=>{
    console.log(`resale phone api running on port ${port}`)
})