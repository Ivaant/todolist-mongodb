//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistDB", { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.on('error', () => console.log("Connection error"));
db.once('open', () => console.log("Connected sucessfully to " + db.name));

const itemSchema = new mongoose.Schema({
    value: String
});

const Item = mongoose.model('Item', itemSchema);

let currentList = Item;

const defaultItems = [
    new Item({ value: "Welcome to your todolist!" }),
    new Item({ value: "Hit the + button to add a new item." }),
    new Item({ value: "<-- Hit this to delete the item." })
];

const listSchema = new mongoose.Schema({
    name: String,
    items: [itemSchema]
});

const List = mongoose.model("List", listSchema);



app.get("/", function(req, res) {

    Item.find({}, (err, items) => {
        if (err) console.log("Cannot get items from db");
        else if (items.length === 0) {
            Item.insertMany(defaultItems, (err, docs) => {
                if (err) console.log(err);
                //else console.log(docs);
            });
            res.redirect("/");
        } else {
            getAllLists().then(listNames => {
                res.render("list", { listNames: listNames, listTitle: "Today", newListItems: items });
            });
        }
    });
});

app.get("/:listName", function(req, res) {
    const name = req.params.listName;
    const listName = name[0].toUpperCase() + name.slice(1).toLowerCase();
    List.findOne({ name: listName }, (err, foundList) => {
        if (!err) {
            if (!foundList) {
                //create a new list
                const list = new List({
                    name: listName,
                    items: defaultItems
                });
                list.save();
                res.redirect(`/${listName}`);
            } else {
                //render the list
                getAllLists().then(listNames => {
                    res.render("list", { listNames: listNames, listTitle: listName, newListItems: foundList.items });
                });
            }
        }
    });
});

function getAllLists() {
    return new Promise((resolve, reject) => {
        List.find({}, (err, lists) => {
            if (err) reject(err);
            else {
                const listNames = lists.map(list => {
                    return list.name;
                });
                resolve(listNames);
            }
        });
    });
}
//getAllLists().then(listNames => console.log(listNames));

app.post("/", function(req, res) {
    const itemValue = req.body.newItem;
    const listName = req.body.list;
    const item = new Item({ value: itemValue });
    if (listName === "Today") {
        item.save();
        res.redirect("/");
    } else {
        List.findOne({ name: listName }, (err, foundList) => {
            if (err) console.log(err);
            else {
                foundList.items.push(item);
                foundList.save();
                res.redirect(`/${listName}`);
            }
        });
    }
});


app.get("/about", function(req, res) {
    res.render("about");
});

app.post("/delete", (req, res) => {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === "Today") {
        Item.findByIdAndRemove(checkedItemId, err => {
            if (err) console.log(err);
            res.redirect("/");
        });
    } else {
        List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } },
            (err, foundList) => {
                if (!err) res.redirect(`/${listName}`);
            });
    }

});

app.get("/delete/:listName", (req, res) => {
    const listName = req.params.listName;
    if (listName === "Today") {
        res.redirect("/");
    } else {
        List.deleteOne({ name: listName }, (err) => {
            if (err) console.log(err);
            else {
                console.log(`Sucessfully deleted collection ${listName}.`);
                res.redirect("/");
            }
        });
    }
});

app.listen(3000, function() {
    console.log("Server started on port 3000");
});