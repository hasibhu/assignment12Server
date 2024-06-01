const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3004;

// middlewares 
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qoryues.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const dbConnect = async () => {
    try {
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.log(error);
    }
}
dbConnect();


// collections 
const userCollection = client.db("assignment12").collection("users");
const locationCollection = client.db("assignment12").collection("locations");




// user related apis 

// post/save data in db //basic code
// app.post('/users', async (req, res) => {
//     const user = req.body;
//     const result = await userCollection.insertOne(user);
//     res.send(result);
// })

// post/save data in db //conditional code
app.post('/users', async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const userExist = await userCollection.findOne(query);
    if (userExist) {
        return res.status(200).json({ message: 'User is already in the database', insertedId: null });
    }

    const result = await userCollection.insertOne(user);
    // Send the insertedId in the response
    res.status(200).json({ message: 'User added to the database', insertedId: result.insertedId });
});




// get all users TODO: verification add-
app.get('/users',  async (req, res) => {
    // console.log('Request Headers:', req.headers); //receive it from allUsers component

    try {
        const result = await userCollection.find().toArray();
        res.send(result);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});





















// get all locations for 

app.get('/locations', async (req, res) => {
    const result = await locationCollection.find().toArray();
    res.send(result);
})



app.get('/', (req, res) => {
    res.send("Assignment12 server is running..........");
})

app.listen(port, () => {
    console.log(`Assignment12 Server is running on port: ${port}`);
});
