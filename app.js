const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, "userData.db");
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({ filename: databasePath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Database Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//1.REGISTER API

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(selectUserQuery);

  if (dbUser === undefined) {
    // checking password length and create new user

    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createUserQuery = `INSERT INTO 
        user(username,name,password,gender,location)
        VALUES 
        ('${username}','${name}','${hashedPassword}', '${gender}','${location}');`;
      await database.run(createUserQuery);
      response.send("User created successfully");
    }
  } else {
    //send user already exists
    response.status(400);
    response.send("User already exists");
  }
});

// LOGIN API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// CHANGE PASSWORD API

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(selectUserQuery);

  if (dbUser !== undefined) {
    const isOldPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isOldPasswordMatched === true) {
      if (newPassword.length >= 5) {
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        const updateUserPasswordQuery = `UPDATE user SET password = '${hashedNewPassword}';`;
        await database.run(updateUserPasswordQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
