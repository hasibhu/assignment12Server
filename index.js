const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3004;
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middlewares 
const corsOptions = {
    origin: ['http://localhost:5176', 'https://assignment12-a0d19.web.app', 'https://api.imgbb.com'],
    credentials: true,
    optionSuccessStatus: 200,
};

//middleware
app.use(cors(corsOptions));
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
const requestCollection = client.db("assignment12").collection("donationRequest");
const blogCollection = client.db("assignment12").collection("blogs");
const paymentCollection = client.db("assignment12").collection("payments");



// jwt related api 

app.post('/jwt', async (req, res) => {
    try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
        res.send({ token }) //name will be token and will take value of the toke from previous line.

    } catch (error) {
        console.log(error);
    }
});




// jwt middlewares 
const verifyToken = (req, res, next) => {
    console.log('Inside verify token', req.headers); //receive it from allUsers component
    console.log('Inside verify token', req.headers.authorization);

    if (!req.headers.authorization) {
        return res.status(401).send({ message: "Forbidden Access" })
    }

    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Acces Forbidden" })
        }
        req.decoded = decoded;
        console.log('decoded here', decoded);
        next();
    });
};

// const verifyToken = (req, res, next) => {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//         return res.status(401).send({ message: "Forbidden Access" });
//     }

//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//         if (err) {
//             return res.status(401).send({ message: "Access Forbidden" });
//         }
//         req.decoded = decoded;
//         next();
//     });
// };


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
app.get('/users', async (req, res) => {
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


//update profile api for UpdateProfile component

app.patch('/users/:email', async (req, res) => {
    const email = req.params.email;
    const updatedUser = req.body;

    const filter = { email: email };
    const updateDoc = {
        $set: updatedUser,
    };

    try {
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
    } catch (error) {
        res.status(500).send(error);
    }
});



// Endpoint to check if a user is an admin for dashboard component
app.get('/users/admin/:email', verifyToken, async (req, res) => {
    const email = req.params.email;

    if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'I am not getting the admin.' })
    }



    try {
        const user = await userCollection.findOne({ email: email });
        let userRole = false;
        if (user) {
            userRole = user?.role === 'admin' || 'donor' || 'volunteer'
        }
        res.json(userRole);
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});





// Endpoint to check if a user is a donor for dashboard component
app.get('/users/donor/:email', verifyToken, async (req, res) => {
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
app.get('/users/volunteer/:email', verifyToken, async (req, res) => {
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








// donationRequests save data in db from createDonationRequest component

//post/save data in db //basic code
app.post('/donationRequests', async (req, res) => {
    const info = req.body;
    const result = await requestCollection.insertOne(info);
    res.send(result);
})
//get data from db //basic code
app.get('/donationRequests', async (req, res) => {
    const result = await requestCollection.find().toArray();
    res.send(result);
})

//get id specific data in DonationRequestDetails component
app.get('/donationRequests/:id', async (req, res) => {
    const id = req.params.id;
    const result = await requestCollection.findOne({ _id: new ObjectId(id) });
    if (result) {
        res.send(result);
    } else {
        res.status(404).send('Donation request not found');
    }
});


app.patch('/donationRequests/status/:id', async (req, res) => {
    const userId = req.params.id;
    const newStatus = req.body.status;

    try {
        const result = await requestCollection.updateOne(
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











// payment 
app.post('/create-payment-intent', async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100);

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types: ['card']
        });

        res.send({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});




// payment data save api from checkOutForm component 
// app.post('/payments', async (req, res) => {
//     const payment = req.body;
//     const result = await paymentCollection.insertOne(payment);
// });



app.post('/payments', async (req, res) => {
    const payment = req.body;
    try {
        const result = await paymentCollection.insertOne(payment);
        res.status(201).send({ insertedId: result.insertedId });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// app.get('/payments', async (req, res) => {
//     const result = await paymentCollection.find().toArray();
//     res.send(result);
// });
app.get('/payments', async (req, res) => {
    try {
        const result = await paymentCollection.find().sort({ _id: -1 }).toArray();
        res.send(result);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});












//post/save blogs data in db //basic code
app.post('/blogs', async (req, res) => {
    const info = req.body;
    const result = await blogCollection.insertOne(info);
    res.send(result);
});

//get blogs data from db //basic code
app.get('/blogs', async (req, res) => {
    const result = await blogCollection.find().toArray();
    res.send(result);
});


//get id specific data in BlogDetails component
app.get('/blogs/:id', async (req, res) => {
    const id = req.params.id;
    const result = await blogCollection.findOne({ _id: new ObjectId(id) });
    if (result) {
        res.send(result);
    } else {
        res.status(404).send('Donation request not found');
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