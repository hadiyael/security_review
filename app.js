const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const csurf = require("csurf");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const app = express();
// Dummy database of users
const users = [{ id: 1, username: "admin", password: "password" }];
// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(csurf({ cookie: true }));

// Routes
app.get("/", (req, res) => {
  res.render("index", { csrfToken: req.csrfToken() });
  console.log("CSRF Token:", req.csrfToken());
});

app.post(
  "/login",

  (req, res, next) => {
    if (req.csrfToken() !== req.body._csrf) {
      console.log("Login CSRFtoken:", req.csrfToken());
      return res.status(403).send("Invalid CSRF token");
    }
    next();
  },
  [
    body("username").trim().escape(),
    body("password").trim().escape(),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    },
  ],
  (req, res) => {
    const { username, password } = req.body;
    const user = users.find(
      (u) => u.username === username && u.password === password
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, "secret_key", {
      expiresIn: "2h",
    });
    res.json({ token });
  }
);

function ensureToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    const bearerToken = bearerHeader.split(" ")[1];
    req.token = bearerToken;
    next();
  } else {
    res.sendStatus(403);
  }
}
app.get("/dashboard", ensureToken, (req, res) => {
  jwt.verify(req.token, "secret_key", (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    const user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.send("Welcome to the dashboard");
  });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
