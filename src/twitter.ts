import { TwitterApi } from 'twitter-api-v2'
import { addAuthorData, addLikedData, addRetweetedData, getUserData } from './db';
import { ResultSetHeader } from 'mysql2';


export class Twitter {
    tweet: any;
    text: string;
    requester: string;
    authorId: string;
    originalTweetId: string;
    requesterUserName: string;
    tweetId: string;
    isGenuine: boolean;

    LIKE_WEIGHT: number = 1;
    RT_WEIGHT: number = 5;
    AUTHOR_WEIGHT: number = 10;

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

    async calculateScore(client: TwitterApi) {

        Promise.all([
            this.calculateAuthorScore(), 
            this.calculateLikeScore(client),
            this.calculateRetweetScore(client)
        ])
        .then(results => {
            let json = JSON.parse(JSON.stringify(results));
            let authorScores = json[0];
            let likeScores = json[1];
            let retweetScores = json[2];
            
            let totalTrueCount = authorScores['trueCount'] * this.AUTHOR_WEIGHT + likeScores['trueCount'] * this.LIKE_WEIGHT + retweetScores['trueCount'] * this.RT_WEIGHT;
            let totalFakeCount = authorScores['fakeCount'] * this.AUTHOR_WEIGHT + likeScores['fakeCount'] * this.LIKE_WEIGHT + retweetScores['fakeCount'] * this.RT_WEIGHT;

            console.log('Total True Count', totalTrueCount);
            console.log('Total Fake Count', totalFakeCount);
            
            let finalScore = (totalTrueCount / (totalTrueCount+ totalFakeCount)) * 100;

            console.log('Final Score: ', finalScore);
            
        })

    }


    calculateAuthorScore = () => 
        new Promise((resolve, reject) => {
            getUserData(this.authorId, 'is_author')
                .then(results => {
                    let json = JSON.parse(JSON.stringify(results));
                    
                    resolve({
                        trueCount: json[0]['TrueCount'],
                        fakeCount: json[0]['FakeCount']
                    })
                }).catch(error => {
                    console.log(error);
                    reject(error)
                });
        });

    calculateLikeScore = (client: TwitterApi) => new Promise(async (resolve, reject) => {
        const users = await client.v2.tweetLikedBy(this.originalTweetId, { asPaginator: true });
        
        if(users.data.meta.result_count > 0) {
            let trueCount: number = 0;
            let fakeCount: number = 0;
            for (const user of users) {
                let userPromise = new Promise((resolve, reject) => {
                    getUserData(user.id, 'is_like')
                        .then(results => {
                            let json = JSON.parse(JSON.stringify(results));
                            resolve(json);
                        }).catch(error => {
                            console.log(error);
                            reject(error);
                        });
                });

                await userPromise.then((result) => {
                    let json = JSON.parse(JSON.stringify(result));
                    
                    trueCount = trueCount + json[0]['TrueCount'];
                    fakeCount = fakeCount + json[0]['FakeCount'];
                });
            }
            
            resolve({
                trueCount: trueCount,
                fakeCount: fakeCount
            })
        } else {
            resolve({
                trueCount: 0,
                fakeCount: 0
            })
        }
    })

    calculateRetweetScore = (client: TwitterApi) => new Promise(async (resolve, reject) => {
        const users = await client.v2.tweetLikedBy(this.originalTweetId, { asPaginator: true });
        
        if(users.data.meta.result_count > 0) {
            let trueCount: number = 0;
            let fakeCount: number = 0;
            for (const user of users) {
                let userPromise = new Promise((resolve, reject) => {
                    getUserData(user.id, 'is_retweet')
                        .then(results => {
                            let json = JSON.parse(JSON.stringify(results));
                            resolve(json);
                        }).catch(error => {
                            console.log(error);
                            reject(error);
                        });
                });

                await userPromise.then((result) => {
                    let json = JSON.parse(JSON.stringify(result));
                    
                    trueCount = trueCount + json[0]['TrueCount'];
                    fakeCount = fakeCount + json[0]['FakeCount'];
                });
            }
            
            resolve({
                trueCount: trueCount,
                fakeCount: fakeCount
            })
        } else {
            resolve({
                trueCount: 0,
                fakeCount: 0
            })
        }
    })
    

}