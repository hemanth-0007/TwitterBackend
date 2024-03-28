-- SQLite
SELECT t.tweet_id, t.tweet, t.user_id, t.date_time
FROM (follower f INNER JOIN tweet t ON f.following_user_id = t.user_id) AS T 
        INNER JOIN user u ON u.user_id = f.follwer_user_id
WHERE f.follower_user_id = 1  
ORDER BY t.date_time DESC
LIMIT 4;

CREATE TABLE follower (
            follower_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            follower_user_id INT,
            following_user_id	INT,
            FOREIGN KEY(follower_user_id) REFERENCES user(user_id) ON DELETE CASCADE,
            FOREIGN KEY(following_user_id) REFERENCES user(user_id) ON DELETE CASCADE
          )

SELECT u.username , t.tweet_id, t.tweet, t.user_id, t.date_time
FROM (follower f INNER JOIN tweet t ON f.following_user_id = t.user_id) AS T 
        INNER JOIN user u ON u.user_id = T.following_user_id
WHERE f.follower_user_id = 1 
-- WHERE u.user_id = 5
ORDER BY t.date_time DESC
LIMIT 4;