import express from "express";
import bodyParser from "body-parser";
import pg from "pg";


const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123456",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1;",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}


async function getCurrentUser(){
  const result = await db.query("SELECT * FROM users");  
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();

  console.log(await checkVisited());

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"].trim();

  try {
    const result = await db.query(
      "SELECT country_code FROM world_countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;

    if(result.rows.length === 0){
      console.log("No matching country found for input: ", input);
      return res.status(404).send("Country not found");
    }

    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
console.log("Request body", req.body);
if (req.body.add === "new"){
  res.render("new.ejs");
} else {
  currentUserId = req.body.user;
  res.redirect("/");
}
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
    //https://www.postgresql.org/docs/current/dml-returning.html
  console.log("/new body data: ", req.body);
  const newUser = {
    name: req.body["name"],
    color: req.body["color"]
  };

  try{
    const result = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id", [newUser.name, newUser.color]);
    
    const newUserId = result.rows[0].id;

    currentUserId = newUserId;

    res.redirect("/");
  } catch(error) {
    console.log("Error adding new user: ", err);
    res.status(500).send("Error adding new user");
  }

});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
