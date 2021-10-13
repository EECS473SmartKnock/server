import express from "express";
import path from "path";
const app = express();
const port = process.env.PORT ?? 8080;

app.get("/", (req, res) => {
    res.send("hi");
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});