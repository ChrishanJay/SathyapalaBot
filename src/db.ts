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


export { addLikedData, addRetweetedData, addAuthorData, getUserData }