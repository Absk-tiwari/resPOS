const router = require("express").Router();
const User = require('../models/User');
const Table = require('../models/Table');
const Order = require('../models/Order');
const Product = require('../models/Item');
const CashRegister = require('../models/CashRegister');
const fetchuser= require('../middlewares/loggedIn');
const Report = require('../models/Report');
const storage = require('../utils/storage');
const { format } = require('date-fns');
const path = require('path');
const pdf = require('html-pdf');
const fs = require('fs');

const nonKitchenItems = [
    'drink', 
    'beverage', 
    'juice',
    'cocktail', 
    'smoothie', 
    'tea', 
    'coffee', 
    'milk', 
    'soda', 
    'water',
    'soft drink', 
    'wine', 
    'beer', 
    'alcohol'
];
const { generatePdf, europeanDate } = require('../utils');
const imgPath = path.join(__dirname,'../tmp/logo-bw.png');

let b64 = fs.readFileSync(imgPath, 'base64');

let error = { status : false, message:'Something went wrong!' }

router.get('/', async(req, res) => {

    const orders = await Order.query() // where('user_id', req.body.myID)
    .withGraphFetched('[cashier(selectName), register]')
    .modifiers({
        selectName(build) {
            build.select('id', 'name');
        }
    })
    .orderBy('created_at', 'desc');
    
    let prs = await Product.query().select('id','name');
    let products = {};

    prs.forEach( pr => {
        products[pr.id] = pr.name;
    });

    const sessions = await CashRegister.query().select(['id','date']).groupBy('date');

    let options = sessions.map( se => ({ value: se.id, label: se.date }));

    let tableOrders = {};
    orders.forEach( order => {
        if(order && order.status!=='completed') {
            tableOrders[order.tables] = {
                id: order.id,
                data: JSON.parse(order.data??'{}'),
                status: order.status,
                payment: order.payment_status,
                taste: order.taste,
                total: order.total,
                note: order.note
            };
        }
    });

    return res.json({
        status:true,
        orders,
        products,
        sessions: options,
        tableOrders,
    });

});

router.get('/cancel/:order/:table', async(req,res) => {
    try {
        const deleted = await Order.query().deleteById(req.params.order);

        await Table.query().whereIn('table_number', req.params.table.split("+")).patch({
            status: "free"
        });
        
        return res.json({
            status:true,
            message: "Order cancelled!",
            deleted
        });

    } catch (error) {
        return res.json({
            status:false,
            message: error.message
        });   
    }
});

router.get('/finish/:order/:table', async(req,res) => {
    try {

        const order = await Order.query().patchAndFetchById(req.params.order, {
            status: "completed"
        });

        const tables = req.params.table.indexOf('+')=== -1 ? [ req.params.table ] : req.params.table.split('+');

        await Table.query().whereIn('table_number', tables).patch({
            status: "free",
            linked_to: null
        });
        
        return res.json({
            status:true,
            message: "Order completed & table freed!",
            order
        });
        
    } catch (error) {
        return res.json({
            status:false,
            message: error.message
        });   
    }
});

router.post('/create', fetchuser, async(req, res) => 
{ 
    try 
    {
        let lastSession = await CashRegister.query().where('status', true).select('id').first().orderBy('id','DESC');
        if(lastSession) {
            lastSession = lastSession.id;
        }
        const notifications = [];
        let modes = req.body.modes;

        if( (req.body.payment_mode).indexOf(',') !==-1 ) {
            modes = {...req.body.data, modes };
        } else {
            modes = req.body.data;
        }

        let payload = {
            // order_number: req.body.order_number,
            total: req.body.total,
            payment_mode: req.body.payment_mode,
            data: JSON.stringify(modes),
            cash_register_id: lastSession ?? req.body.cash_register_id,
            payment_status: "paid"
        };
        
        if(req.body.extra) {
            payload.added_total = null
        }
        
        const order = await Order.query().patchAndFetchById(req.body.order_id,payload);

        if (!order) {
            throw new Error('Error creating order');
        }
        
        // if(order.status !== 'in-kitchen') {
        //     const tables = req.body.tables.split('+');
        //     await Table.query().whereIn('table_number', tables).update({
        //         status:"free"
        //     });
        // }
        
        if (req.body.data) 
        {
            await CashRegister.query().findById( lastSession ).patch({
                closing_cash: CashRegister.raw(`closing_cash + ?`, [ order.total ]),
            });

            return res.status(200).json({ 
                status: true,
                message: 'Transaction completed!',
                html: req.body.receiptData,
                order: {...order, ...modes},
                notifications
            });
            
        }

        return res.status(200).json({ status: false });

    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ status: false, message: 'An error occurred', error: error.message });
    }
})

router.get('/link/:tables', fetchuser, async(req,res) => {

    try 
    {
        let link = req.params.tables;
        await Table.query().whereIn('table_number', link.split("+")).patch({
            linked_to: link
        });

        return res.json({
            status: true,
            message: "Tables merged!",
            link
        });

    } catch (error) {
        console.log(error);
        return res.json({
            status: false,
            message: error.message
        });
    }

});

router.get('/init/:table', fetchuser, async(req,res) => 
{
    try
    {
        if((req.params.table).indexOf('+') === -1) {
            const table = await Table.query().where('table_number',req.params.table).first();
            if(table.status!== 'free') {
                return res.status(403).json({
                    status:false,
                    message:"Table is not available!",
                    table
                });
            }
        }
        
        const register = await CashRegister.query()
        .orderBy('id', "DESC")
        .where('user_id', req.body.myID )
        .where("status", true)
        .select('id')
        .first();

        if(!register) {
            console.log('kuch to gadbad hai daya!')
            return res.json({status:false, message: "Start with cash register to continue!"})
        }
        const created = await Order.query().insert({
            customer_id: req.body.customer_id,
            cash_register_id: register.id,
            user_id: req.body.myID,
            tables: req.params.table
        });

        const order = await Order.query().findById(created.id);

        const tables = req.params.table.split('+');

        await Table.query().whereIn('table_number', tables).update({
            status:"order ongoing"
        });

        return res.json({ order, status: true });

    } catch (err) {

        console.log(err.message);
        return res.status(500).json({ ...error, exception: err.message });

    }

})

router.post('/to-kitchen/:table?', async(req,res) => {
    try {
        let payload = { status : 'in-kitchen' }

        if(req.body.data) {
            payload = {
                ...payload,
                data: JSON.stringify(req.body.data),
                total: req.body.total
            }
        }

        let order;
        let updatedQt =  {};
        let msg = 'Order sent to kitchen!';
        if(req.body.order_id) {
            let previousOrder = await Order.query().findById(req.body.order_id);
            if(previousOrder.status === 'in-kitchen') { // updating the stock value of in-kitchen order;
                msg = 'Order updated!';
                const {quantity:oldQt} = JSON.parse(previousOrder.data??'{}');
                const {quantity:newQt} = req.body.data;
                Object.keys(newQt).forEach( prID => {
                    if(oldQt[prID]) {
                        if(newQt[prID] === oldQt[prID]) { // stock
                            // to skip
                        } else {
                            updatedQt[prID] = newQt[prID] - oldQt[prID];
                        }
                    } else {
                        updatedQt[prID] = newQt[prID];
                    }
                });
                payload.in_kitchen = JSON.stringify(updatedQt);
            } else {
                updatedQt = {...req.body.data.quantity};
            }
            order = await Order.query().patchAndFetchById(req.body.order_id, payload);
            if(order.tables) {
                const tables = order.tables ? [order.tables] : order.tables.split('+');
                await Table.query().whereIn('table_number', tables).patch({ status : "occupied" });
            }
        } else {
            order = await Order.query().insertAndFetch({...payload, note: "From direct sale." });
        }
        let prIDs = Object.keys( updatedQt );
        const products = await Product.query().select(['id']).withGraphFetched('category').modifyGraph('category', (builder) => {
            builder.select(
                'menu_categories.name as catName'
            );
        }).whereIn('id', prIDs);

        
        products.forEach( pr => {
            let catName = (pr.category?.catName??'').toLowerCase();
            if(catName && nonKitchenItems.some(ite => catName.includes(ite)) ) {
                delete updatedQt[pr.id];
            } 
        });


        return res.json({ 
            status:true, 
            message: msg, 
            order,
            only:updatedQt
        });

    } catch (error) {
        console.log(error.message)
        return res.json({status:false})
    }
})

router.post('/payment-update', fetchuser, async(req,res) => {
    try {

        let modes = req.body.modes;
        if( (req.body.payment_mode).indexOf(',') !==-1 ) {
            modes = {...req.body.data, modes };
        } else {
            modes = req.body.data;
        }

        const order = await Order.query().findById(req.body.order_id).patch({
            payment_status:"paid", 
            updated_at: europeanDate(),
            data: modes
        });

        return res.json({
            status:true,
            message: "Payment completed!",
            order
        });

    } catch (error) {
        return res.json({status:false, exception: error.message, message: "An error occurred!"});
    }    
})

router.get('/view-order/:id', fetchuser, async(req, res) =>{
    try 
    { 
        let orderID = req.params.id;
        
        let order = await Order.query().where('id', orderID ).withGraphFetched('cashier').first();
        
        let data = typeof order.data ==='string' ? JSON.parse(order.data): order.data;
        const products = await Product.query().whereIn( 'id', data?.products );
        const pairs = {};
        products.forEach( pr => {
            pr.taxAmount = pr.tax && pr.tax!=='null'? (pr.price.replace(/\s+/g, '')?.replace(",",'.') * parseFloat(pr.tax) / 100).toFixed(2) : 0.00;
            pairs[pr.id] = pr;
        });

        return res.json({
            status: true,
            order,
            products: pairs,
            session:data,
            cashier: order.cashier
        });

    } catch (e) {
        
        error.message = e.message;
        console.log(e.message);
        return res.json({
            status: false,
            order:{},
            products: [],
            session: [],
        }) 

    }
});

router.get(`/info/:order/:print?`, async(req,res) => {
    try 
    {
        let order = await Order.query().findById(req.params.order);
        let data = JSON.parse(order.data);
        let in_kitchen = JSON.parse(order.in_kitchen??'{}');
        let toPrint = [];
        
        const products = await Product.query().select(['id','name','price','category_id','tax','stock']).withGraphFetched('category').modifyGraph('category', (builder) => {
                builder.select(
                    'menu_categories.name as catName'
                );
            }).whereIn('id', data?.products??[]);
        const pairs = [];
        
        products.forEach( pr => {
            pr.taxAmount = pr.tax && pr.tax!=='null'? (pr.price.replace(/\s+/g, '')?.replace(",",'.') * parseFloat(pr.tax) / 100).toFixed(2) : 0.00;
            pr.stock = data.quantity[pr.id];
            let catName = (pr.category?.catName??'').toLowerCase();
            if(in_kitchen && in_kitchen[pr.id]) { 
                if(in_kitchen[pr.id] === data.quantity[pr.id]) {
                    pairs.push(pr);
                    // skipping
                } else {
                    pr.stock = in_kitchen[pr.id];
                    pairs.push(pr);
                    if(catName && !nonKitchenItems.some(ite => catName.includes(ite)) ) {
                        toPrint.push(pr);
                    };
                }
            } else {
                pairs.push(pr);
                if(catName && !nonKitchenItems.some(ite => catName.includes(ite)) ) {
                    toPrint.push(pr);
                };
            }

        });

        return res.json({
            status: true,
            order,
            table: order.tables,
            products: pairs,
            print: req.params.print!=='false'? toPrint: []
        });

    } catch (e) {

        error.message = e.message;
        console.log("error getting the information: ",e.message);
        return res.json({
            status: false,
            order:{},
            table: null,
            products: []
        });

    }

})

router.get(`/last-order`, fetchuser, async(req,res) => {
    try 
    {
        let order = await Order.query().where('status', '<>', 'ongoing').orderBy( "created_at", "DESC" ).withGraphFetched('cashier').first();
        const cashier = order?.cashier;
        let data = JSON.parse(order.data);
        
        const products = await Product.query().whereIn('id', data.products);
        const pairs = {};
        products.forEach( pr => {
            pr.taxAmount = pr.tax && pr.tax!=='null'? (pr.price.replace(/\s+/g, '')?.replace(",",'.') * parseFloat(pr.tax) / 100).toFixed(2) : 0.00;
            pairs[pr.id] = pr;
        });

        return res.json({
            status: true,
            order,
            products: pairs,
            session:data,
            cashier
        });

    } catch (e) {

        error.message = e.message;
        console.log(e.message)
        return res.json({
            status: false,
            order:{},
            products: [],
            session: [],
        });

    }

})



router.post(`/x-report`, fetchuser, async(req,res) => {
    try {
        
        const payload = req.body;
        const { status, message, html } = await generateReport({ ...payload, type:'X' });
        return res.json({
            status,
            message,
            html
        });

    } catch (error) {
        return res.json({
            status:false, 
            message:error.message
        });
    }
});

router.post(`/z-report`, fetchuser, async(req,res) => {
    try {
        const payload = req.body;
        const {status, message, html, register_id} = await generateReport({...payload, type:'Z'})
        if(status){
            if(register_id) {
                await CashRegister.query().where('id', register_id).patch({
                    status:false
                });
            }
            await Table.query().patch({
                status: "free"
            });
        }
        res.json({ status, message, html});

    } catch (error) {
        console.log(error)
        res.json({status: false, message:error.message })
    }    
})

async function generateReport(payload) {

    const { type:Rtype, register_id, currency } = payload;

    let totals = {
        totalProducts: 0,
        total: 0,
        returns: 0,
        tax: 0,
        cash: 0,
        card: 0,
        account: 0,
        discounts: 0
    };

    let customers = [];
    let categories = {};

    const taxes = {};
    const qt = {};
    let lastRegisterID = null;

    let ordersQuery = Order.query().select(['data', 'payment_mode']).where('payment_status','paid');

    if (payload.today) {
        
        const lastSession = await CashRegister.query().where('status', true).select('id').first().orderBy('id','DESC');
        if(lastSession) {
            lastRegisterID = lastSession.id
            ordersQuery
            .where('cash_register_id', lastSession.id );
        }

    } else {

        lastRegisterID = register_id;
        ordersQuery.where('cash_register_id', register_id).select('*'); // x-report always

    }
    const orders = await ordersQuery;
    if (!orders.length) {
        return { status: true, html: '', message: 'No transactions found' };
    }
    const productIds = [];

    const parsedOrders = orders.map(o => {
        const data = JSON.parse(o.data);
        if(data === null) return {...o};
        (data.products??[]).forEach(id => {
            productIds.push(id);
        });
        return { ...o, parsed: data };
    });

    // 3️⃣ Fetch products ONCE
    const products = await Product.query()
    .withGraphFetched('category(selectName)')
    .modifiers({
        selectName(build) {
            build.select('name');
        }
    })
    .whereIn('id', productIds)
    .select(['id', 'price', 'tax']);

    const productMap = {};
    products.forEach(p => {
        productMap[p.id] = p;
    })

    for (const order of parsedOrders) {

        const { parsed:d, payment_mode } = order;
        if(order.data===null) continue; // ignore the ongoing orders

        totals.total += Number(d.total);

        Object.values(d.quantity || {}).forEach(q => {
            totals.totalProducts += parseInt(q);
        });
        
        if (payment_mode === 'Cash') totals.cash =totals.cash + Number(d.total);
        else if (payment_mode === 'Card') totals.card =totals.card + Number(d.total);
        else if (payment_mode === 'Account') totals.account =totals.account + Number(d.total);

        else if (d.modes) {
            const { Cash = 0, Card = 0, Account = 0, ogCash } = d.modes;

            totals.cash = totals.cash + ((ogCash && Number(ogCash) < Number(Cash))? Number(ogCash): Number(Cash));
            totals.card = totals.card + Number(Card);
            totals.account = totals.account + Number(Account);

        }
        for (const [id, qty] of Object.entries(d.quantity || {})) {

            if (id.indexOf('quick')!== -1 ) {
                categories.Others = (categories.Others || 0) + Number(d.otherAmount || 0);
                qt.Others = (qt.Others || 0) + Number(qty);
                continue;
            }
    
            const product = productMap[id];
            if (!product) continue;

            if (product.tax) {
                const [value, type] = product.tax.split(' ');
                if(value === undefined || value == null || value === 'null') continue;
                if( type!== undefined && type.toUpperCase()!== 'VAT') {
                    taxes[type] = value;
                } else {
                    taxes['VAT'] = value;
                }
                const noNumberRegex = /^[^0-9]*$/
                let cal = noNumberRegex.test(value) ? parseFloat(type??0) : parseFloat(value??0);

                totals.tax += (cal / 100) *
                    (d.price?.[id] ?? product.price);
            }

            if(product.category) {
                categories[product.category.name] = (categories[product.category.name] || 0) +
                    ((d.price?.[id] ?? (product.price * qty)));
                qt[product.category.name] = (qt[product.category.name] || 0) + Number(qty);
            }

            totals.discounts +=
                (d.price?.[id] ?? product.price) - product.price;

        }

    }

    let me = await User.query().where('id', payload.myID ).first();
    let registerCash = await CashRegister.query().where('id', payload.register_id?? lastRegisterID ).first();

    // now we have the meta-data
    let data = {
        total_products: totals.totalProducts,
        total_customers: customers.length,
        return_amount: totals.returns,
        total_tax: totals.tax,
        total_amount: Number(totals.cash) + Number(totals.card) + Number(totals.account),
        cash: totals.cash,
        card: totals.card,
        account: totals.account,
        discounts: totals.discounts,
        number_of_transactions: orders.length,
        categories,
        taxes,
        qt,
        Rtype,
        print: false,
        currency,
        userName: me?.name,
        b64
    };
    let tot = Number(totals.cash) + Number(totals.card) + Number(totals.account);
    if(registerCash) {
        data.register = {
            id: registerCash.id,
            open: registerCash?.opening_cash??0 ,
            close: '€ ' + (tot + Number(registerCash.opening_cash.replace('€ ',''))),
        }
    };
    let view = await generatePdf(data); // Pass data to a template renderer
    const options = { format: 'A4' };

    if (Rtype === 'X') {

        // await Order.query().where('cash_register_id', lastRegisterID ).where('data', null).orWhere('payment_status', 'pending').delete();
        // await Table.query().patch({
        //     status:'free',
        //     linked_to:null
        // });

        let path = `reports/${format(new Date(), 'dd_MM_yyyy')}_Z_report.pdf`;
        if(payload.today) { // more likely the current session
 
            pdf.create(view, options).toBuffer(async(err, fileBuffer) => {
                if (err) {
                    console.error(err);
                } else {
                    await storage.put(path, fileBuffer);
                }
            });
            // await Report.query().insert({
            //     path,
            //     date: europeanDate(),
            //     user_id: payload.myID,
            //     cash_register_id: lastRegisterID?? 0,
            //     html: view
            // });

        }
        
    } 
    
    return { 
        status: true,
        message: Rtype==='Z'? 'Z-report generated!'+ (payload.today ? ' Sessions are reset': ""):"X-report generated!",
        html: view,
        register_id: lastRegisterID
    };
    
}

router.get('/reports', fetchuser, async(req,res) => {
    try { // it is updated with user_id
        const reports = await Report.query().where('user_id', req.body.myID ).orderBy('id','desc');
        return res.json({status:true, reports})
    } catch (error) {
        return res.json({status:false, reports:[]})
    }
})

router.get('/day-close/:id', fetchuser, async(req,res)=> {
    try {
        await generateReport({
            register_id: req.params.id, 
            type: 'Z', 
            myID: req.body.myID,
            currency: '€ '
        });
        await CashRegister.query()
        .where('id', req.params.id )
        .patch({ status:false }) // marking it as inactive session now
        
        return res.json({ status:true });

    } catch (error) {
        console.log(error)
        return res.json({ status:false, message:error.message })
    }
})

router.get('/remove-report/:id', async(req,res) => {
    try {
        const report = await Report.query().findById(req.params.id);
        try {
            if(fs.existsSync(path.join(__dirname,'../tmp/'+report.path))) {
                fs.unlinkSync(path.join(__dirname,'../tmp/'+report.path));
            }
        } catch (error) {throw new Error("Failed to remove the file:"+error.message)}
        await Report.query().deleteById(req.params.id);
        return res.json({status:true, message:"Report removed!"});

    } catch (error) {
        return res.json({status:false})
    }
})

router.get('/remove-all' , async (req,res) => {
    try {
        await Order.query().delete();
        await Table.query().patch({
            status:"free"
        });
        return res.json({
            status:true,
            message: "orders deleted!"
        })
    } catch (error) {
        return res.json({
            status:false,
            message: error.message
        });
    }
})
module.exports=router 