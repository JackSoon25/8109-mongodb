const express = require('express');
const {connect} = require('./db');

require('dotenv').config();
const mongoUri = process.env.MONGO_URI;
const dbName = "sample_mflix";

// 1. create the express application
const app = express();
// 2. use the JSON middleware so that we can recieve JSON requests
app.use(express.json());

// 3. route
app.get('/health', function(req,res){
    res.json({
        "message":"I'm alive!"
    })
})

async function main() {

    try {
        const db = await connect(mongoUri, dbName );
        app.get('/movies', async function(req,res){
            try {
                const movies = await db.collection("movies")
                    .find({})
                    .project({
                        "title": 1,
                        "plot": 1
                    })
                    .limit(10)
                    .toArray();
                res.json({
                    "movies": movies
                })

            } catch (error) {
                console.error(error);
                res.json({
                    'error':error
                })
            }
        });

    } catch (error) {
        console.error(error);
    }

}
main();

app.listen(3000, function(){
    console.log("Server has started");
})