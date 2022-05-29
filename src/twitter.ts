import { TwitterApi } from 'twitter-api-v2'
import { addAuthorData, addLikedData, addRetweetedData, getUserData, addScoreLogs, addFeedLogs } from './db';
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
    MIN_TH: number = 5;

    likes_count: number = 0;
    rt_count: number = 0;

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
                let data = results as ResultSetHeader;
                this.likes_count = users.data.data.length;
                //console.log('Get Liked Users Result : ' + data.info);
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
                    this.rt_count = users.data.data.length;
                    //console.log('Get Retweeted Users Result : ' + data.info);
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
                this.logFeeds()
            })
            .catch(error => {
                console.log('Get Author Error : ' + error);
            })
    }

    async reply(client: TwitterApi, replyMesseage: string) {
        const response = await client.v2.reply(replyMesseage, this.tweetId);
        
        console.log(response);
        
    }

    noDataReply(client: TwitterApi) {
        console.log('Not enough data');
        let replyMsg: string = 'Sorry, Not enough data to calculate a genuineness score.';
        this.reply(client, replyMsg);
    }

    async calculateScore(client: TwitterApi) {

        let finalAuthorScore: number = 0;
        let finalAuthorCount: number = 0;

        const likedUsers = await client.v2.tweetLikedBy(this.originalTweetId, { asPaginator: true });
        const rtUsers = await client.v2.tweetRetweetedBy(this.originalTweetId, { asPaginator: true });

        let tul: number = likedUsers.data.meta.result_count;
        let tur: number = rtUsers.data.meta.result_count
        console.log('Liked Count: ', tul);
        console.log('RT Count', tur);
        
        if (tul > this.MIN_TH && tur > this.MIN_TH) {

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

                let atc = authorScores['trueCount'] as number;
                let ltc = likeScores['trueCount'] as number;
                let rtc = retweetScores['trueCount'] as number;

                let afc = authorScores['fakeCount'] as number;
                let lfc = likeScores['fakeCount'] as number;
                let rfc = retweetScores['fakeCount'] as number;

                console.log('Author True Count: ', atc);
                console.log('Likes True Count: ', ltc);
                console.log('RTs True Count: ', rtc);

                console.log('Author Fake Count: ', afc);
                console.log('Likes Fake Count: ', lfc);
                console.log('RTs Fake Count: ', rfc);
                
                let totalTrueCount = atc * this.AUTHOR_WEIGHT + ltc * this.LIKE_WEIGHT + rtc * this.RT_WEIGHT;
                let totalFakeCount = afc * this.AUTHOR_WEIGHT + lfc * this.LIKE_WEIGHT + rfc * this.RT_WEIGHT;
    
                console.log('Total True Count', totalTrueCount);
                console.log('Total Fake Count', totalFakeCount);
    
                if(totalTrueCount > this.MIN_TH && totalFakeCount > this.MIN_TH) {
                    let finalScore = (totalTrueCount / (totalTrueCount+ totalFakeCount)) * 100;
                    console.log('Final Score: ', finalScore.toFixed(2));

                    let replyMsg: string = 'SathyapalaBot predicts ' + finalScore.toFixed(2) + '% genuineness for this tweet.';

                    if((atc + afc) > this.MIN_TH ) {
                        
                        finalAuthorScore = (atc / (atc + afc)) * 100;
                        
                        finalAuthorCount = atc + afc;
                        
                        replyMsg = replyMsg +  '\nSathyapalaBot predicts ' + finalAuthorScore.toFixed(2) + '% genuineness for the OP based on ' + finalAuthorCount + ' tweets.'
                    }

                    this.logScores(this.originalTweetId, this.requester, finalScore, finalAuthorScore, atc, afc, ltc, lfc, rtc, rfc, tul, tur)
                    this.reply(client, replyMsg);

                } else {
                    console.log('Not enough data in the system');
                    this.noDataReply(client);
                }
            });

        } else {
            this.noDataReply(client);
        }

    }

    logScores = (tweet_id: string, requester: string, final_score: number, author_score: number, atc: number, afc: number, ltc: number, lfc: number, rtc: number, rfc: number, tul: number, tur: number) => 
        new Promise((resolve, reject) => {
            addScoreLogs(tweet_id, requester, final_score, author_score, atc, afc, ltc, lfc, rtc, rfc, tul, tur)
                .then(results => {
                    let data = results as ResultSetHeader
                    console.log('Score Log : ' + data.affectedRows);
                    
                    resolve(data)
                }).catch(error => {
                    console.log(error);
                    reject(error)
                });
        });

    logFeeds = () => 
        new Promise((resolve, reject) => {
            addFeedLogs(this.tweetId, this.requester, this.authorId, this.likes_count, this.rt_count, this.isGenuine)
                .then(results => {
                    let data = results as ResultSetHeader
                    console.log('Feed Log : ' + data.affectedRows);
                    
                    resolve(data)
                }).catch(error => {
                    console.log(error);
                    reject(error)
                });
        });

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