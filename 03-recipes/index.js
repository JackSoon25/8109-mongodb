const express = require('express');
const cors = require('cors');
const { connect } = require('./db');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
require('dotenv').config();
const jwt = require('jsonwebtoken');

function generateAccessToken(id) {
    // arg 1: the claims, or the payload
    // arg 2: the hashing key
    // arg 3: configuration options
    return jwt.sign({
        "user_id": id,
        "role": "user"
    }, process.env.TOKEN_SECRET, {
        "expiresIn":"3w"
    })
}

// a middleware function happens before the routes is called
// the next parameter will refer to the next middleware
// or if there is no more middleware, then the actual route itself

function verifyToken(req, res, next) {

    // extract out the token from the Authorization
    const authHeader = req.headers['authorization'];
    if (authHeader) {
         const token = authHeader.split(" ")[1];

        if (token) {

            // verify the token's claims and expiry matches the signature
            jwt.verify(token, process.env.TOKEN_SECRET, function(err,claims){
                if (err) {
                    res.status(400).json({
                        "message":"Token invalid or expired"
                    })
                } else {
                    // save in the request the logged in user's information
                    req.user = claims;
                    next();
                }
            })

        } else {
            res.status(400).json({
                'message':"Token not found"
            })
        }

    } else {
        res.status(400).json({
            'message':"Authroization headers not found"
        })
    }
   

   
}

const app = express();

// use JSON requests (prevent req.body is undefined)
app.use(express.json());

async function main() {

    const db = await connect(process.env.MONGO_URI, "8109_recipes");

    // routes will in here

    // Search for recipes
    // the req.query can contain following parameters:
    // name: string pattern for the name
    // tags: a comma delimited string list, eg. "easy,spicy"
    app.get("/api/recipes", async function (req, res) {

        const criteria = {};

        if (req.query.name) {
            criteria.name = {
                $regex: req.query.name,
                $options: "i"
            }
        }

        if (req.query.cuisine) {
            criteria["cuisine.name"] = {
                $regex: req.query.cuisine,
                $options: "i"
            }
        }

        if (req.query.tags) {
            // "easy,spicy".split(",") = ["easy", "spicy"];
            const wantedTags = req.query.tags.split(",");
            criteria['tags.name'] = {
                "$in": wantedTags
            }
        }

        // we'll expect req.query.ingredients to be a comma delimited strings
        // "chicken,flour,eggs".split(",") = ["chicken","flour","eggs"]
        if (req.query.ingredients) {
            const ingredientArray = req.query.ingredients.split(",")
            const regexArray = [];

            for (let ingredient of ingredientArray) {
                regexArray.push(new RegExp(ingredient, "i"));
            }

            criteria["ingredients.name"] = {
                $in: regexArray
            }
        }

        const recipes = await db.collection("recipes").find(criteria).toArray();
        res.json({
            recipes: recipes
        })
    })

    app.post("/api/recipes", async function (req, res) {
        // get the new recipe from the request's body
        const newRecipe = req.body;

        // find the cuisine and assoicate the recipe with the cuisine
        const cuisine = await db.collection("cuisines").findOne({
            name: newRecipe.cuisine
        })

        const tags = await db.collection("tags").find({
            name: {
                $in: req.body.tags
            }
        }).toArray();

        // replace the newRecipe's cuisine and tags with the ones from the database
        newRecipe.cuisine = cuisine;
        newRecipe.tags = tags;

        const response = await db.collection("recipes").insertOne(newRecipe);
        res.json({
            message: "Successfully created recipe",
            recipeId: response.insertedId
        })
    })

    app.delete("/api/recipes/:recipeId", async function (req, res) {
        const recipeId = req.params.recipeId;

        // delete one document which _id is the same ObjectId(<given id>)
        const result = await db.collection("recipes").deleteOne({
            _id: new ObjectId(recipeId)
        });
        res.json({
            "message": "The recipe has been deleted"
        })
    })

    // PATCH or PUT
    app.put("/api/recipes/:recipeId", async function (req, res) {
        // get the new recipe from the request's body
        const newRecipe = req.body;

        // find the cuisine and assoicate the recipe with the cuisine
        const cuisine = await db.collection("cuisines").findOne({
            name: newRecipe.cuisine
        })

        const tags = await db.collection("tags").find({
            name: {
                $in: req.body.tags
            }
        }).toArray();

        // replace the newRecipe's cuisine and tags with the ones from the database
        newRecipe.cuisine = cuisine;
        newRecipe.tags = tags;

        const response = await db.collection("recipes").updateOne({
            _id: new ObjectId(req.params.recipeId)
        }, {
            $set: newRecipe
        });

        res.json({
            message: "Successfully updated recipe",

        })
    })

    // REGISTER A NEW USE
    // shape of req.body:
    // {
    // email: String
    // password: String} 
    //
    app.post('/api/users', async function (req, res) {
        const result = await db.collection("users").insertOne({
            email: req.body.email,
            password: await bcrypt.hash(req.body.password, 12)
        });
        res.json({
            message: "New user has been created",
            userId: result.insertedId
        })
    })

    app.post('/api/login', async function (req, res) {
        const email = req.body.email;
        const password = req.body.password;

        // find the user by email
        const user = await db.collection("users").findOne({
            "email": email
        });
        if (user) {
            // check if the password matches
            // bcrypt.compare(<plain password>, <hashed password>)
            if (await bcrypt.compare(password, user.password)) {
                // create the JWT and send back
                const token = generateAccessToken(user._id);

                // create and send back the JWT
                res.json({
                    "token": token,
                    "message":"Login is successful"
                })
            } else {
                res.status(401).json({
                    "message": "Wrong email or password"
                })
            }

        } else {
            res.status(401).json({
                "message": "Wrong email or password"
            })
        }

    
    })


    app.get('/api/me', [verifyToken], async function(req,res){
        const user = await db.collection("users").findOne({
            _id : new ObjectId(req.user.user_id)
        });
        delete user.password;
        res.json({
            "user": user
        })
    })

}
main();

app.listen(3000, function () {
    console.log("Server has started");
})