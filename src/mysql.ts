import mysql from 'mysql2';
let config;

import dotenv from 'dotenv';
dotenv.config();

const params = {
    host: process.env.HOST,
    user: process.env.USERNAME,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
};

const dev_params = {
    host: process.env.DEV_HOST,
    user: process.env.DEV_USERNAME,
    password: process.env.DEV_PASSWORD,
    database: process.env.DEV_DATABASE
};

if (process.env.NODE_ENV === 'dev') {
    config = dev_params
} else {
    config = params
}

const Connect = async () => 
    new Promise<mysql.Connection>((resolve, reject) => {
        const connection = mysql.createConnection(config);

        connection.connect((error) => {
            if(error) {
                reject(error);
                return;
            }

            resolve(connection);
        });
    });

const Query = async (connection: mysql.Connection, query: string) => 
    new Promise((resolve, reject) => {
        connection.query(query, connection, (error, result) => {
            if(error) {
                reject(error);
                return;
            }

            resolve(result);
        });
    });

export { Connect, Query }