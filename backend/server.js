require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Model } = require('objection');
const Knex = require('knex');
const path = require('path');
const { mysqlConfig } = require('./db');
const { downloadUpdate } = require('./utils');

const knex = Knex(mysqlConfig);

Model.knex(knex);

const server = express();
const port = 5101;

server.use(cors());
server.use(express.json());
server.use('/images', express.static(path.join(__dirname, 'tmp')));

server.get("/", (r, res) => res.send("Exit"));

server.use("/auth", require("./routes/auth"));
server.use("/tables", require("./routes/tables"));
server.use("/menu", require("./routes/menu"));
server.use("/items", require("./routes/items"));
server.use("/orders", require("./routes/orders"));
server.use("/pos", require("./routes/pos"));
server.use("/tax", require("./routes/tax"));
server.use("/config", require("./routes/config"));


server.get('/install-update', async(req, res)=> {
    try {

        const fs = require('fs');
        const outputPath = path.join(path.join(__dirname, './tmp'), 'updates.zip');
        const destination = path.join(__dirname, 'client');

        const looper = [
            { uri: 'updates/download', source: outputPath, destination },
            { uri: 'backend-updates/download', source: outputPath, destination: fs.existsSync(path.join(__dirname,'../../../resources'))? path.join(__dirname,'../../../resources'): path.join(__dirname, './') },
        ]

        for (const { uri, source, destination } of looper) {
            const response = await downloadUpdate(uri, source, destination);
            if (!response.status) {
                throw new Error("Error downloading updates: " + response.message);
            }
        }

        return res.json({
            status: true,
            message: "Updates downloaded!"
        });

    } catch (error) {
        return res.json({
            status:false, 
            message:error.message
        });
    }

})


server.get('/check-connection', async(req,res) => {
    knex.raw('SELECT 1')
    .then(() => res.json({status:true, message: '✅ Database connected successfully!'}))
    .catch((err) => res.json({status:false, message: '❌ Database connection failed'}))
})

server.listen(port);