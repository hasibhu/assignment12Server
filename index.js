const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3004;
var jwt = require('jsonwebtoken');

// middlewares 
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


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



// jwt related api 

app.post('/jwt', async (req, res) => {
    try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
        res.send({ token })

    } catch (error) {
        console.log(error);
    }
})

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




// PATCH endpoint to change user role in usermanagement component
app.patch('/users/role/:email', async (req, res) => {
    const userEmail = req.params.email;
    console.log(userEmail);
    const newRole = req.body.role;

    try {
        // Find the user first
        const user = await userCollection.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure only non-admin users can have their roles changed // TODO: email specific user can't change his own role
        // if (user.email === 'admin') {
        //     return res.status(400).json({ message: 'Cannot change role for admin users' });
        // }

        // Update the user's role using $set
        const result = await userCollection.updateOne(
            { email: userEmail },
            { $set: { role: newRole } }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: 'Role updated successfully', modifiedCount: result.modifiedCount });
        } else {
            res.status(400).json({ message: 'Role update failed' });
        }
    } catch (error) {
        console.error('Error changing role:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



app.patch('/users/status/:id', async (req, res) => {
    const userId = req.params.id;
    const newStatus = req.body.status;

    try {
        const result = await userCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { status: newStatus } }
        );

        if (result.modifiedCount > 0) {
            res.json({ message: 'User status updated successfully', modifiedCount: result.modifiedCount });
        } else {
            res.status(404).json({ message: 'User not found or status not modified' });
        }
    } catch (error) {
        console.error('Error changing user status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});




// Endpoint to check if a user is an admin for dashboard component
app.get('/users/admin/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const user = await userCollection.findOne({ email: email });
        res.json({ admin: user?.role === 'admin' });
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Endpoint to check if a user is a donor for dashboard component
app.get('/users/donor/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const user = await userCollection.findOne({ email: email });
        if (user && user.role === 'donor') {
            res.json({ donor: true });
        } else {
            res.json({ donor: false });
        }
    } catch (error) {
        console.error('Error checking donor status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Endpoint to check if a user is a volunteer for dashboard component
app.get('/users/volunteer/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const user = await userCollection.findOne({ email: email });
        if (user && user.role === 'volunteer') {
            res.json({ volunteer: true });
        } else {
            res.json({ volunteer: false });
        }
    } catch (error) {
        console.error('Error checking volunteer status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
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
