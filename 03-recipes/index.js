const express = require('express');
const cors = require('cors');
const { connect } = require('./db');
const { ObjectId } = require('mongodb');
require('dotenv').config();

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



}
main();

app.listen(3000, function () {
    console.log("Server has started");
})