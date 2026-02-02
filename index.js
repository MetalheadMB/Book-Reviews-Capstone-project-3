import express from "express";
import axios from "axios";
import bodyparser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Books",
  password: "22411011",
  port: 5432,
});

db.connect();


app.use(express.static("public"));
app.use(bodyparser.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT title, isbn, description,rating FROM books"
    );

    const books = result.rows.map(it => ({
      bookisbn: it.isbn,
      booktitle: it.title,
      bookdescp: it.description,
      bookrating : it.rating,
      coverUrl: `https://covers.openlibrary.org/b/isbn/${it.isbn}-M.jpg`
    }));

    res.render("index.ejs", { books });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/add" , (req,res) => {
   res.render("add.ejs");
})

app.post("/add" , async (req,res) => {
    const title = req.body.title;
  
    const search = await axios(
   `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`
    );

    const doc = search.data.docs?.[0];
    if (!doc || !doc.cover_edition_key)
    throw new Error("No edition found");

    const coverkey = doc.cover_edition_key;

    const edition = await axios(
   `https://openlibrary.org/books/${coverkey}.json`
    );

    const isbn =
    edition.data.isbn_13?.[0] ||
    edition.data.isbn_10?.[0];

    const descp = req.body.description;
    
    const rating = req.body.rating;

    await db.query(
   `INSERT INTO books (isbn, title, description, rating)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (isbn) DO NOTHING`,
    [isbn, title, descp, rating] 
    );
        
    res.redirect("/");
});

app.post("/delete" , async (req,res) => {
  try{
      const isbn = req.body.isbn;
      await db.query("DELETE FROM books WHERE books.isbn=$1",[isbn]);
      res.redirect("/");
  } catch(err) {
     console.error(err);
     res.status(500).send("Delete failed");
  }
});

app.post("/edit" , async (req,res) => {
  try{
     const isbn = req.body.bookisbn;
     const descp = req.body.updateddescp;
     
     await db.query("UPDATE books SET description = $1 WHERE isbn = $2",[descp,isbn]);

     res.redirect("/");
    } catch(err) {
    console.error(err);
    res.status(500).send('Update failed');
  }
});


app.post("/sort" , async (req,res) => {
  try{
   const result =  await db.query("SELECT * FROM books ORDER BY rating DESC");
   
   
   const books = result.rows.map(it => ({
      bookisbn: it.isbn,
      booktitle: it.title,
      bookdescp: it.description,
      bookrating: it.rating,
      coverUrl: `https://covers.openlibrary.org/b/isbn/${it.isbn}-M.jpg`
    }));

   res.render("index.ejs", { books});
  } catch(err) {
     console.error(err);
     res.status(500).send('sorting failed');
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});