const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

//REGISTER USER API
app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';` //SELECT USER QUERY
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    if (password.length < 5) {
      //check password length
      response.status(400)
      response.send('Password is too short')
    } else {
      //CREATE USER
      const createUserQuery = `
      INSERT INTO
        user (username, name, password, gender, location)
      VALUES
        (
          '${username}',
          '${name}',
          '${hashedPassword}',
          '${gender}',
          '${location}'
        );
      `
      await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    //Invalid user
    response.status(400)
    response.send('User already exists')
  }
})

//LOGIN USER API
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';` //SELECT USER QUERY
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    //Invalid user
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//UPDATE THE PASSWORD API
app.put('/change-password/', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';` //SELECT USER QUERY
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    //Inalid user
    response.status(400)
    response.send('Invalid user')
  } else {
    const isCurrentPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password,
    )
    if (isCurrentPasswordMatched === true) {
      if (newPassword.length < 5) {
        //check password length
        response.status(400)
        response.send('Password is too short')
      } else {
        const newChangedPassword = await bcrypt.hash(newPassword, 10);
        const changePasswordQuery = `
        UPDATE 
          user
        SET
          password = '${newChangedPassword}';
        `
        await db.run(changePasswordQuery)
        response.status(200)
        response.send('Password updated')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
