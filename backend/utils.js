const normalizeSpaces = (str) => {
    return str.replace(/\s+/g, ' ').trim();
}

const getCurrentDate = (format='dmy') => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0'); // Add leading zero if needed
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    if(format==='dmy') return `${day}-${month}-${year}`;
    if(format==='hours') return `${day}-${month}-${year} ${hours}:${minutes}`;
    return `${year}-${month}-${day}`;
};

async function generatePdf(data){

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @page {
                size:auto;
                margin:-2mm 3mm 3mm 0mm;
            }
            *{
                font-weight:400!important;
                text-transform:uppercase;
                font-size:0.85rem!important;
                font-family:system-ui!important;
            }
            small {font-size:0.65rem!important}
            .head { 
                border-bottom: 2px solid black;
                display:grid;
                width:100%;
                text-align:center;
                padding-bottom:10px;
                margin-bottom:10px;
            }
            td:nth-child(2) {text-align:right!important}
            .head p:first-child { border-bottom: 1px solid black; }
            td {padding: 0px 8px 0px 8px!important;}
        </style>
    </head>
    <body style="width:32vw!important;margin:0px!important;padding:0px!important;">

        <div style="background:white;width:50vw!important;padding-bottom:40px;border-radius:15px;border:2px dashed gray;">

            <div class="head" >
                <img src="data:image/png;base64,${data.b64}" alt="Logo" style="height:80px;object-fit:contain"/>
                <p>${data.Rtype.toUpperCase()} - Report</p>
            </div>
            <div class="row">
                <table style="width:100%;border-bottom:1px dashed gray">
                    <tbody>
                        ${data.register? 
                            `<tr><td><b>Cash Register ID</b>:</td><td>#${data.register.id}</td></tr>
                            <tr><td><b>Opening Cash</b>:</td><td>${data.register.open}</td></tr>
                            <tr><td><b>Closing Cash</b>:</td><td>${data.register.close}</td></tr>`
                        :``}
                        <tr><td><b>Report Date</b>:</td><td>${new Date().toLocaleDateString()}</td></tr>
                        <tr><td><b>Report Time</b>:</td><td>${new Date().toLocaleTimeString()}</td></tr>
                        <tr><td><b>Transactions</b>:</td><td>${data.number_of_transactions}</td></tr>
                        <tr><td><b>Total Products</b>:</td><td>${data.total_products}</td></tr>
                        <tr><td><b>Cash </b>:</td><td>€ ${data.cash.toFixed(2)}</td></tr>
                        <tr><td><b>Card </b>:</td><td>€ ${data.card.toFixed(2)}</td></tr>
                        <tr><td><b>Account </b>:</td><td>€ ${data.account.toFixed(2)}</td></tr>
                        <tr><td><b>Tax</b>:</td><td>${data.total_tax.toFixed(2)}</td></tr>
                        <tr style="border-top:1px dashed gray">
                            <td colspan="2"><small>Sale By Categories</small></td>
                        </tr>
                        ${Object.entries(data.categories).map(([cat, amount]) => `
                            <tr>
                                <td><b>${cat}</b>:</td>
                                <td>${amount}</td>
                            </tr>`).join('')}
                        <tr>
                        <tr style="border-top:1px dashed gray">
                            <td colspan="2"><small>Included Taxes</small></td>
                        </tr>
                        ${Object.entries(data.taxes).map(([type, value]) => `
                            <tr>
                                <td><b>${type}</b>:</td>
                                <td>${value.indexOf('%') === -1 ? value + "%" : value}</td>
                            </tr>`).join('')}
                        <tr>
                            <td><b>TOTAL</b></td>
                            <td><b style="font-size:1.5rem!important">€ ${(data.total_amount).toFixed(2)}</b></td>
                        </tr>
                        <tr>
                            <td>Generated</td>
                            <td>${getCurrentDate()}</td>
                        </tr>
                        <tr>
                            <td><b style="color:transparent">wsdhfk</b></td>
                            <td><b style="color:transparent"> ${new Date().toLocaleString()}</b></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </body>
    </html>`;
}

/*
${ Object.values(data.categories).reduce((a,c)=> a + c ,0 ) !==0  ?`<b style="text-align:center">Department Sales</b>
    <div class="row chosen-product mb-0">
        <table style="width: 100%;">
            <thead>
                <tr>
                    <td><b>Type</b></td>
                    <td><b>Quantity</b></td>
                    <td><b>Amount</b></td>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(data.categories).reverse().map(([name, price]) => `
                <tr>
                    <td>${name}:</td>
                    <td>${data.qt[name] || ''}</td>
                    <td>${data.currency}${price.toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`: ``}
*/ 

async function runCommand(command) {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr) {
            return {output:`⚠️ Command executed with warnings: ${stderr}`};
        }        
        return {output:`✅ Command successful:\n${stdout}`};

    } catch (error) { 
        return {output:`❌ Command failed: ${error.message}`};
    }
}

async function uploadFile(filePath, uploadUrl, clientName) {
    const axios = require('axios');
    const fs = require('fs')
    const FormData = require("form-data");
    const path = require('path')
    try {
        const fileStream = fs.createReadStream(filePath);
        const formData = new FormData();
        formData.append("file", fileStream);
        formData.append("client", clientName);
        formData.append("path", path.resolve(__dirname, './database/db.sqlite'));

        const headers = {
            ...formData.getHeaders()
        };
        const {data} = await axios.post(uploadUrl, formData, { headers });

        return data.status;

    } catch (error) {
        console.error("Error uploading file:", error.message);
        if (error.message.includes('column')) {
            await runCommand(`npm install form-data dotenv`); 
            return { status: false, relaunch:true, message: "Module installed, please restart." };
        }
        return false
    }
}

function getRandomHexColor() {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

function generateOrderId() {
  // Get current date in YYYYMMDD format
  const crypto = require('crypto');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(now.getDate()).padStart(2, '0');

  // Generate a random 5-character alphanumeric string
  const randomStr = crypto.randomBytes(3).toString('hex').slice(0, 5).toUpperCase();

  return `ORD-${year}${month}${day}-${randomStr}`;
}

const europeanDate = () => new Date().toISOString("en-US", { timeZone: "Europe/Amsterdam" })

const uploadToServer = async (formData, axios) => {
    
    try {
        const {data} = await axios.post(process.env.SERVER_URL, formData, {
            headers:{ 
                "Accept"       :"application/json",
                "Content-Type" : "multipart/form-data",
            }
        });
        return data;

    } catch (error) {
        return {
            status:false,
            exception: error.message
        }
    }
}

const queueProduct = async (path, axios, request) => {
    try 
    {
        if(!request.header('Authorization')){
            return {
                status: false,
                message: "Application key not specified"
            };
        }
        const payload = {
            barCode: request.body.barcode?? request.body.code,
            name: request.body.name,
            price: request.body.price,
            quantity: request.body.quantity?? 5000,
            tax: request.body.tax??'0%',
            category: request.body.catName?? "",
            synced: true
        }
        const {data} = await axios.post(`${process.env.REMOTE_SERVER + path}`, payload, {
            headers: {
                "Accept": "application/json",
                "Authorization": request.header('Authorization')
            }
        })
        return data;

    } catch (error) {
        return {
            status:false,
            exception: error.message
        }
    }
}

module.exports = { 
    normalizeSpaces, 
    getCurrentDate, 
    generatePdf, 
    uploadFile, 
    getRandomHexColor, 
    europeanDate,
    uploadToServer,
    queueProduct,
    generateOrderId
};
