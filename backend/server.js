require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Model } = require('objection');
const Knex = require('knex');
const path = require('path');
const { mysqlConfig } = require('./db');
const { downloadUpdate } = require('./utils');
// const buildPath = path.join(__dirname, 'client/build');

const knex = Knex(mysqlConfig);

Model.knex(knex);

const app = express();
const port = 5101;

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'tmp')));
// app.use(express.static(buildPath));

app.use("/auth", require("./routes/auth"));
app.use("/tables", require("./routes/tables"));
app.use("/menu", require("./routes/menu"));
app.use("/items", require("./routes/items"));
app.use("/orders", require("./routes/orders"));
app.use("/pos", require("./routes/pos"));
app.use("/tax", require("./routes/tax"));
app.use("/config", require("./routes/config"));


app.get('/install-update', async(req, res)=> {
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


app.get('/check-connection', async(req,res) => {
    knex.raw('SELECT 1')
    .then(() => res.json({status:true, message: '✅ Database connected successfully!'}))
    .catch((err) => res.json({status:false, message: '❌ Database connection failed'}))
})

app.listen(port);