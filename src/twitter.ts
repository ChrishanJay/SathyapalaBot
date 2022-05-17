import { TwitterApi } from 'twitter-api-v2'
import { addAuthorData, addLikedData, addRetweetedData } from './db';
import { ResultSetHeader } from 'mysql2';
import { resolve } from 'path';
import { rejects } from 'assert';


export class Twitter {
    tweet: any;
    text: string;
    requester: string;
    authorId: string;
    originalTweetId: string;
    requesterUserName: string;
    tweetId: string;
    isGenuine: boolean;

    constructor(tweet: any) {
        this.tweet = tweet;
        this.text = tweet.text;
        this.requester = tweet.user.id_str;
        this.authorId = tweet.in_reply_to_user_id_str;
        this.originalTweetId = tweet.in_reply_to_status_id_str;
        this.requesterUserName = tweet.user.screen_name;
        this.tweetId = tweet.id_str;

        this.isGenuine = tweet.text.toUpperCase().includes('TRUE')
    }

    async getLikedUsers(client: TwitterApi): Promise<any> {
        const users = await client.v2.tweetLikedBy(this.originalTweetId, { asPaginator: true });
        
        if(users.data.meta.result_count > 0) {
            console.log('Liked count for %s : %d', this.originalTweetId, users.data.data.length);
            addLikedData(users, this.originalTweetId, this.isGenuine)
            .then((results)=> {
                let data = results as ResultSetHeader
                console.log('Get Liked Users Result : ' + data.info);
            })
            .catch(error => {
                console.log('Get Liked Users Error : ' + error);
            })
        } else {
            console.log("No public liked data");
        }
       
    }

    async getRetweetedUsers(client: TwitterApi) {
        const users = await client.v2.tweetRetweetedBy(this.originalTweetId, { asPaginator: true });

        if(users.data.meta.result_count > 0) {
            console.log('Retweeted count for %s : %d', this.originalTweetId, users.data.data.length);
            addRetweetedData(users, this.originalTweetId, this.isGenuine)
                .then((results)=> {
                    let data = results as ResultSetHeader
                    console.log('Get Retweeted Users Result : ' + data.info);
                })
                .catch(error => {
                    console.log('Get Retweeted Users Error : ' + error);
                })
        } else {
            console.log("No public retweeted data");
        }
        
    }

    async getAuthor(client: TwitterApi) {
        const author = await client.v2.user(this.authorId, { 'user.fields': ['id', 'verified'] });

        addAuthorData(author, this.originalTweetId, this.isGenuine)
            .then((results)=> {
                let data = results as ResultSetHeader
                console.log('Get Author Result : ' + data.affectedRows);
            })
            .catch(error => {
                console.log('Get Author Error : ' + error);
            })
    }

    async reply(client: TwitterApi, replyMesseage: string) {
        const response = await client.v2.reply(replyMesseage, this.tweetId);
        
        console.log(response);
        
    }

}