import { Connect, Query } from './mysql';
import { TweetLikingUsersV2Paginator, TweetRetweetersUsersV2Paginator, UserV2Result } from 'twitter-api-v2';

    const addLikedData = async (users: TweetLikingUsersV2Paginator, tweetId: string, isGenuine: boolean) => 
        new Promise((resolve, reject) => {
            let baseQuery:string = "INSERT INTO users (tweet_id, user_id, is_like, is_genuine) values ";

            let valueQuery:string = "";
            for (const user of users) {
                valueQuery = valueQuery.concat('(', tweetId, ',', user.id, ',', '1', ',', isGenuine.toString(), '),');
            }
            let query: string = baseQuery + valueQuery.replace(/.$/,";");

            Connect()
            .then(connection => {
                Query(connection, query)
                .then(results => {
                    resolve(results);
                })
                .catch(error => {
                    reject(error);
                })
                .finally(() => {
                    connection.end();
                })
            })
            .catch(error => {
                reject(error);
            })
        });

    const addRetweetedData = async (users: TweetRetweetersUsersV2Paginator, tweetId: string, isGenuine: boolean) => 
        new Promise((resolve, reject) => {
            let baseQuery:string = "INSERT INTO users (tweet_id, user_id, is_retweet, is_genuine) values ";

            let valueQuery:string = "";
            for (const user of users) {
                valueQuery = valueQuery.concat('(', tweetId, ',', user.id, ',', '1', ',', isGenuine.toString(), '),');
            }
            let query: string = baseQuery + valueQuery.replace(/.$/,";");

            Connect()
            .then(connection => {
                Query(connection, query)
                .then(results => {
                    resolve(results);
                })
                .catch(error => {
                    reject(error);
                })
                .finally(() => {
                    connection.end();
                })
            })
            .catch(error => {
                reject(error);
            })
        });

    const addAuthorData = async (author: UserV2Result, tweetId: string, isGenuine: boolean) => 
        new Promise((resolve, reject) => {
            
            let isVerified:number = author.data.verified ? 1 : 0;
            let query:string = `INSERT INTO users (tweet_id, user_id, is_author, is_verified, is_genuine) values ('${tweetId}', '${author.data.id}', 1, ${isVerified}, ${isGenuine.toString()});`;

            Connect()
            .then(connection => {
                Query(connection, query)
                .then(results => {
                    resolve(results);
                })
                .catch(error => {
                    reject(error);
                })
                .finally(() => {
                    connection.end();
                })
            })
            .catch(error => {
                reject(error);
            })
        });

    const getUserData =async (userID: string, columnName: string) => 
        new Promise((resolve, reject) => {

            let query: string = `SELECT 
                                    COUNT(CASE WHEN user_id='${userID}' AND ${columnName}=1 AND is_genuine=1 THEN 1 END) as TrueCount,
                                    COUNT(CASE WHEN user_id='${userID}' AND ${columnName}=1 AND is_genuine=0 THEN 1 END) as FakeCount
                                FROM users;`
                                
            Connect()
            .then(connection => {
                Query(connection, query)
                .then(results => {
                    resolve(results);
                })
                .catch(error => {
                    reject(error);
                })
                .finally(() => {
                    connection.end();
                })
            })
            .catch(error => {
                reject(error);
            })

        });

    const addScoreLogs = async (tweet_id: string, requester: string, final_score: number, author_score: number, author_count: number, liked_count: number, rt_count: number) => 
        new Promise((resolve, reject) => {
            
            let query:string = `INSERT INTO score_logs 
                            (tweet_id, requester, final_score, author_score, author_count, liked_count, rt_count) 
                            VALUES('${tweet_id}', '${requester}', ${final_score}, ${author_score}, ${author_count}, ${liked_count}, ${rt_count});`;

            Connect()
            .then(connection => {
                Query(connection, query)
                .then(results => {
                    resolve(results);
                })
                .catch(error => {
                    reject(error);
                })
                .finally(() => {
                    connection.end();
                })
            })
            .catch(error => {
                reject(error);
            })
        });


    const addFeedLogs = async (tweet_id: string, requester: string, author_id: string, likes: number, rts: number, sentiment: boolean) => 
        new Promise((resolve, reject) => {
            
            let query:string = `INSERT INTO feed_logs
                            (tweet_id, requester, author_id, likes, rts, sentiment) 
                            VALUES('${tweet_id}', '${requester}', ${author_id}, ${likes}, ${rts}, ${sentiment.toString()});`;

            Connect()
            .then(connection => {
                Query(connection, query)
                .then(results => {
                    resolve(results);
                })
                .catch(error => {
                    reject(error);
                })
                .finally(() => {
                    connection.end();
                })
            })
            .catch(error => {
                reject(error);
            })
        });

export { addLikedData, addRetweetedData, addAuthorData, getUserData, addScoreLogs, addFeedLogs }