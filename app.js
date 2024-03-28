const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const saltRounds = 10;

// Initialising the express app
const app = express();
const port = 9001;
// Middleware for JSON parsing
app.use(express.json());

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`);
    });
  } 
  catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();


const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if(authHeader !== undefined) jwtToken = authHeader.split(" ")[1];
  if(jwtToken === undefined){
    console.log("jwtToken is undefined");
    response.status(401);
    response.send("Invalid JWT Token");
  }
  else{
     jwt.verify(jwtToken, "JOIHU*GHGYWBWIH(IUWHY(()@HSILBDHB", async (error, payload) => {
      if (error) {
        console.log("jwt verification faliure");
        response.status(401);
        response.send("Invalid JWT Token");
      } 
      else{
        console.log("jwt verification success");
        console.log(payload);
        request.username = payload.username;
        request.user_id = payload.user_id;
        next(); 
      } 
        
    });
  }
  
}







app.get("/" ,  (req, res) => {
  res.send("Hello World!");
});



app.get("/users/",authenticateToken,  async (req, res) => {
  const query = `
    SELECT
      *
    FROM
      user;
    `;
  const result = await db.all(query);
  res.send(result);
});

// 
app.post("/register/", async (req, res) => {
  const {name , username, password, gender, email } = req.body;
  if(username === "" || password === "" || name === "" || gender === "", email === "") {
    res.status(400);
    res.send("required field missing");
  }
  if(password.length < 6){
    res.status(400);
    res.send("Password is too short");
  }
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined || dbUser === null) {
    console.log("Inside dbUser undefined condition");
    const createUserquery = `
    INSERT INTO user (name, username, password, gender, email)
    VALUES (?, ?, ?, ?, ?);`;
    const dbResponse = await db.run(createUserquery, [name, username, hashedPassword, gender, email]);
    const userId = dbResponse.lastID;
    res.send(`User created successfully with ${userId}`);
  }
  else {
    console.log("Inside user already exists condition");
    res.status(400);
    res.send("User already exists");
  }
    
});


app.post("/login/", async (req, res) => {
  const {username, password} = req.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  console.log(dbUser);
  if(dbUser === undefined || dbUser === null){
    res.status(400);
    res.send("Invalid user");
  }
  else{
    const isPasswordCorrect = await bcrypt.compare(password, dbUser.password);
    if(isPasswordCorrect){
      const payload = {
                      username: username,
                      user_id: dbUser.user_id
                      };
      const jwtToken = jwt.sign(payload, "JOIHU*GHGYWBWIH(IUWHY(()@HSILBDHB", {expiresIn: "1h"}, {algorithm: "HS256"});
      console.log(jwtToken);
      const responseBody = {jwtToken};
      res.status(200);
      res.send(responseBody);
    }
    else{
      res.status(400);
      res.send("Invalid password");
    }
  }

});

app.get("/user/tweets/feed/", authenticateToken, async (req, res) => {
  const {username} = req;
  const getTweetsQuery = `
    SELECT u.username , t.tweet_id, t.tweet, t.user_id, t.date_time
    FROM (follower f INNER JOIN tweet t ON f.following_user_id = t.user_id) AS T 
            INNER JOIN user u ON u.user_id = T.following_user_id
    WHERE u.username = '${username}' 
    ORDER BY t.date_time DESC
    LIMIT 4;
    `;
  const dbResponse = await db.all(getTweetsQuery);
  if(dbResponse === undefined || dbResponse === null){
    res.status(400);
    res.send("No tweets available");
  }
  res.status(200);
  res.send(dbResponse);
});


app.get("/user/following/", authenticateToken, async (req, res) => {
  const {username, user_id} = req;
  console.log("username is " + username);
  console.log("user_id is " + user_id);
  const getFollowingQuery = `
    SELECT u.name 
    FROM (follower f INNER JOIN user u ON f.following_user_id = u.user_id) AS T 
    WHERE f.follower_user_id = '${user_id}';
    `;
  console.log("query is " + getFollowingQuery);
  const dbResponse = await db.all(getFollowingQuery);
  if(dbResponse === undefined || dbResponse === null){
    res.status(400);
    res.send("db response is null");
  }
  res.status(200);
  res.send(dbResponse);
});


app.get("/user/followers/", authenticateToken, async (req, res) => {
  const {username, user_id} = req;
  console.log("username is " + username);
  console.log("user_id is " + user_id);
  const getFollowingQuery = `
    SELECT u.name
    FROM (follower f INNER JOIN user u ON f.following_user_id = u.user_id) AS T 
    WHERE f.follower_user_id = '${user_id}';
    `;
  // console.log("query is " + getFollowingQuery);
  const dbResponse = await db.all(getFollowingQuery);
  if(dbResponse === undefined || dbResponse === null){
    res.status(400);
    res.send("db response is null");
  }
  res.status(200);
  res.send(dbResponse);
});


// yet to be completed
app.get("/tweets/:tweetId/", authenticateToken, async (req, res) => {
  const {tweetId} = req.params;
  const {username, user_id} = req;
  const getTweetQuery = `
    SELECT *
    FROM follower f INNER JOIN tweet t ON f.following_user_id = t.user_id
    WHERE t.tweet_id = '${tweetId}' AND f.follower_user_id = '${user_id}';
    `;
  const getTweetResponse = await db.get(getTweetQuery);
  if(getTweetResponse === undefined || getTweetResponse === null){
    res.status(401);
    res.send("Invalid Request");
  }
  const {tweet, date_time} = getTweetResponse;
  const getLikesQuery = `
    SELECT COUNT(*) AS likes
    FROM like
    WHERE tweet_id = '${tweetId}';
    `;
  const likesResponse = await db.get(getLikesQuery);
  const {likes} = likesResponse;
  const getRepliesQuery = `
    SELECT COUNT(*) AS replies
    FROM reply
    WHERE tweet_id = '${tweetId}';
    `;
  const repliesResponse = await db.get(getRepliesQuery);
  const {replies} = repliesResponse;
  const responseBody = {
    tweet: tweet,
    likes: likes,
    replies: replies,
    dateTime: date_time,
  };
  res.status(200);
  res.send(responseBody);
});


app.get("/tweets/:tweetId/likes/", authenticateToken, async (req, res) => {
  const {tweetId} = req.params;
  const {username, user_id} = req;
  const getTweetQuery = `
    SELECT u.username
    FROM (follower f INNER JOIN like l ON f.following_user_id = l.user_id) AS T 
            INNER JOIN user u ON u.user_id = T.following_user_id
    WHERE t.tweet_id = '${tweetId}' AND f.follower_user_id = '${user_id}';
    `;
  const dbResponse = await db.all(getTweetQuery);
  if(dbResponse === undefined || dbResponse === null){
    res.status(401);
    res.send("Invalid Request");
  }
  res.status(200);
  res.send(dbResponse);
});


app.get("/tweets/:tweetId/replies/", authenticateToken, async (req, res) => {
  const {tweetId} = req.params;
  const {username, user_id} = req;
  const getRepliesQuery = `
    SELECT u.name, r.reply
    FROM (follower f INNER JOIN tweet t ON f.following_user_id = t.user_id) AS T
          INNER JOIN (reply r INNER JOIN user u ON r.user_id = u.user_id) as U
          ON T.tweet_id = U.tweet_id
    WHERE t.tweet_id = '${tweetId}' AND f.follower_user_id = '${user_id}';
    `;

  const dbResponse = await db.all(getRepliesQuery);
  if(dbResponse === undefined || dbResponse === null){
    res.status(401);
    res.send("Invalid Request");
  }
  const updatedResponse = dbResponse.map( each => ({"name": each.name, "reply": each.reply}));
  const responseBody = {replies: updatedResponse};
  res.status(200);
  res.send(responseBody);
});


app.get("/user/tweets/", authenticateToken, async (req, res) => {
  const {username, user_id} = req;
  const getTweetsQuery = `
    SELECT t.tweet_id, t.tweet, t.date_time
    FROM tweet t INNER JOIN user u ON t.user_id = u.user_id
    WHERE u.user_id = '${user_id}'
    ORDER BY t.tweet_id;
    `;
  const tweetObjectsList = await db.all(getTweetsQuery);
  // console.log(dbResponse);
  if(tweetObjectsList === undefined || tweetObjectsList === null){
    res.status(400);
    res.send("No tweets available");
  }
  const tweetIds = tweetObjectsList.map(each => each.tweet_id);
  console.log(tweetIds);
  const getLikesQuery = `
  SELECT tweet_id, COUNT(*) AS likes
  FROM like
  WHERE tweet_id IN (${tweetIds.join(",")})
  GROUP BY tweet_id
  ORDER BY tweet_id;`
    ;
  const likesResponse = await db.all(getLikesQuery);
  console.log(likesResponse);
  const getRepliesQuery = `
  SELECT tweet_id, COUNT(*) AS replies
  FROM reply
  WHERE tweet_id IN (${tweetIds.join(",")})
  GROUP BY tweet_id
  ORDER BY tweet_id;`
  ;
  const repliesResponse = await db.all(getRepliesQuery);
  console.log(repliesResponse);


  const responseBody = tweetObjectsList.map((tweetObject, index) => {
    const likes = likesResponse[index].likes ? likesResponse[index].likes : 0;
    const replies = repliesResponse[index].replies ? repliesResponse[index].replies : 0;
    return ({
      tweet_id: tweetObject.tweet_id,
      tweet: tweetObject.tweet,
      likes: likes,
      replies: replies,
      dateTime: tweetObject.date_time,
    });
  });
  res.status(200);
  res.send(responseBody);
});

const getUpdatedDateTime = () => {
  const date_time_object = new Date();
  const getYear = date_time_object.getFullYear();
  const getMonth = date_time_object.getMonth() + 1 < 10 ? `0${date_time_object.getMonth() + 1}` : date_time_object.getMonth() + 1;
  const getDate = date_time_object.getDate() < 10 ? `0${date_time_object.getDate()}` : date_time_object.getDate();
  const getHours = date_time_object.getHours() < 10 ? `0${date_time_object.getHours()}` : date_time_object.getHours();
  const getMinutes = date_time_object.getMinutes() < 10 ? `0${date_time_object.getMinutes()}` : date_time_object.getMinutes();
  const getSeconds = date_time_object.getSeconds() < 10 ? `0${date_time_object.getSeconds()}` : date_time_object.getSeconds();
  return `${getYear}-${getMonth}-${getDate} ${getHours}:${getMinutes}:${getSeconds}`;
}

app.post("/user/tweets/", authenticateToken, async (req, res) => {
  const {tweet} = req.body;
  const {username, user_id} = req;
  const updatedDateTimeString = getUpdatedDateTime();
  const createTweetQuery = `
    INSERT INTO tweet (tweet, user_id, date_time)
    VALUES ('${tweet}', '${user_id}', '${updatedDateTimeString}');
    `;
  const dbResponse = await db.run(createTweetQuery);
  if(dbResponse === undefined || dbResponse === null){
    res.status(400);
    res.send("Invalid Request");
  }
  res.status(200);
  res.send("Created a Tweet");
});


app.delete("/tweets/:tweetId/", authenticateToken, async (req, res) => {
  const {tweetId} = req.params;
  const {user_id} = req;
  const getTweetQuery = `
    SELECT *
    FROM tweet
    WHERE tweet_id = '${tweetId}' AND user_id = '${user_id}';
    `;
  const getTweetResponse = await db.get(getTweetQuery);
  if(getTweetResponse === undefined || getTweetResponse === null){
    res.status(401);
    res.send("Invalid Request");
  }
  const deleteTweetQuery = `
    DELETE FROM tweet
    WHERE tweet_id = '${tweetId}';
    `;
  const dbResponse = await db.run(deleteTweetQuery);
  res.status(200);
  res.send("Tweet Removed");
});

app.post("/user/follow/:follow_id/", authenticateToken, async (req, res) => {
  const {follow_id} = req.params;
  const {user_id} = req;
  const followUserQuery = `
    INSERT INTO follower (follower_user_id, following_user_id)
    VALUES ('${user_id}', '${follow_id}');
    `;
  const dbResponse = await db.run(followUserQuery);
  if(dbResponse === undefined || dbResponse === null){
    res.status(400);
    res.send("Invalid Request");
  }
  res.status(200);
  res.send("Request Success to user with id " + follow_id); 
});


app.delete("/user/unfollow/:unfollow_user_id/", authenticateToken, async (req, res) => {
  const {unfollow_user_id} = req.params;
  const {user_id} = req;
  const unfollowUserQuery = `
    DELETE FROM follower
    WHERE follower_user_id = '${user_id}' AND following_user_id = '${unfollow_user_id}';
    `;
  const dbResponse = await db.run(unfollowUserQuery);
  if(dbResponse === undefined || dbResponse === null){
    res.status(400);
    res.send("Invalid Request");
  }
  res.status(200);
  res.send("Request Success to unfollow user with id " + unfollow_user_id); 
});

