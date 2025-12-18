import DataTable from "react-data-table-component";
import CreatableSelect from 'react-select/creatable'
import { dataTableStyle } from '../../objects/meta'
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import pos from './../../assets/images/asmara.jpeg';
import { commonApiSlice, useGetOrdersQuery, useMakeOrderMutation, useZReportMutation } from "../../features/centerSlice";
import { Card, CardBody, Form, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import Transaction, { Address } from './Transaction';
import { capitalFirst, getEuropeanDate, timeAgo, Warning, wrapText } from "../../helpers/utils";
import { printDivById } from '../../helpers/attachments';
import { useNavigate } from "react-router-dom";
import ExpandedTable from './Expandable';

export default function OrdersTable() {

    const { products: cachedProducts } = useSelector(
        (state) => commonApiSlice.endpoints.getPosItems.select()(state)?.data ?? []
    );

    const dispatch = useDispatch();
    const modalBody = useRef(null);
    const navigator = useNavigate();

    const { data, isSuccess } = useGetOrdersQuery();
    const [zReport] = useZReportMutation();
    const [makeOrder] = useMakeOrderMutation();

    const [order, setOrder] = useState({});
    const [orders, setOrders] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [total, setTotal] = useState(0);
    const { categories, loading, cartProducts } = useSelector(s => s.auth);
    const [productNames, setProductNames] = useState({});
    const [reportModal, setReportModal] = useState(false);
    const [reportType, setReportType] = useState('X');

    const [orderProducts, setOrderProducts] = useState([]);
    const [open, setModal] = useState(false);
    const [taxes, setTaxAmounts] = useState([])
    const [today, setToday] = useState(true);
    const [payload, setPayload] = useState({
        today,
        register_id: null
    });

    const toggleModal = () => setModal(!open);

    const toggleReport = () => setReportModal(!reportModal);

    const addToPOS = async (orderID, table, status) => {
        table = table.indexOf(`"`) !== -1 ? JSON.parse(table) : table;
        let products = [];

        const obj = orderSession.find(o => o.id === orderID);
        if (!obj) return;

        if (['completed'].indexOf(status) !== -1) return;

        for (const prID in obj.session) {
            let thisProduct = cachedProducts.find(p => p.id === Number(prID))
            products = [...products, { ...thisProduct, stock: Number(obj.session[prID]) }]
        }

        if (!cartProducts[table]) {
            dispatch({
                type: "CHOOSEN_PRODUCT",
                payload: { ...cartProducts, [table]: products }
            });

        } else if (cartProducts[table].length !== products.length) {

            dispatch({
                type: "CHOOSEN_PRODUCT",
                payload: { ...cartProducts, [table]: products }
            });

        }

    }

    const generateReceipt = async (e) => {

        e.preventDefault();

        if (reportType) {

            if (reportType === 'X') {

                dispatch({ type: "LOADING" })
                const { data } = await axios.post(`/orders/x-report`, payload);
                if (data.status) {
                    toast.success(data.message);
                    if (window.electronAPI) {
                        window.electronAPI.printReport(data.html);
                    } else {
                        Warning("Printer not connected!");
                    }
                } else {
                    toast.error(data.message);
                }
                dispatch({ type: "STOP_LOADING" });

            } else {

                if (window.confirm("This will reset all sessions for current cash registered!")) {

                    dispatch({ type: "LOADING" })
                    await zReport({
                        payload
                    }).unwrap()

                }

            }
        } else {
            Warning("Select type of report!");
        }
    }

    const calTax = (percent, price) => percent && percent !== 'null' ? (price * parseFloat(percent) / 100).toFixed(2) : 0.00;

    const toPayment = async (oId, table_number, status) => {
        table_number = table_number.indexOf(`"`) !== -1 ? JSON.parse(table_number) : table_number;
        await addToPOS(oId, table_number, status);
        navigator(`/payment/${table_number}`)
    }

    const sanitize = tax => {
        if (tax === 'undefined' || tax === 'null' || tax === null || tax === undefined) {
            return '0';
        }
        if (!tax) return '0';
        if (typeof tax === 'number') return tax
        return tax.replace(/\D/g, "");
    }

    const print = async e => {
        try {
            e.preventDefault()
            if (window.electronAPI) {
                window.electronAPI.printContent(modalBody.current.innerHTML);
            } else {
                printDivById('receipt');
                Warning("Printer not connected!");
            }
        } catch (error) {
            console.error("Error capturing image:", error);
        }
    }

    const [orderSession, setSession] = useState([]);

    const viewOrder = order => {

        dispatch({ type: `LOADING` });
        axios.get(`orders/view-order/${order.id}`).then(({ data }) => {

            const { products, session, order } = data;
            const sessionData = session;
            setOrder({ ...order, ...sessionData });
            setTotal(data.order.total);
            let orderedProducts = Object.values(products).map(pr => ({ ...pr, stock: sessionData?.quantity[pr.id] }));

            if ((sessionData?.products ?? []).indexOf('quick') !== -1) {

                orderedProducts = [...orderedProducts, ...sessionData.products.filter(p => orderedProducts.findIndex(o => o.id === p) === -1).map(p => (
                    {
                        id: p,
                        name: typeof p === 'string' && p.indexOf('quick') !== -1 ? 'Others' : p,
                        price: sessionData.price[p],
                        stock: sessionData?.quantity[p]
                    }
                ))];

            }

            let cp = [];

            sessionData.products.forEach(pr => cp.push(orderedProducts.find(p => p.id === pr)));

            setOrderProducts(cp.map(p => {
                if (categories[p.category_id]) {
                    p.isVeg = true
                }
                p.prices = sessionData.price ?? {}
                p.units = sessionData.unit ?? {}
                p.modes = sessionData.modes ?? {}
                return p
            }));

            let xyz = [];

            cp.forEach(c => {

                let index = 0;
                if (typeof c.id === 'string' && c.id.indexOf('quick') !== -1) {
                    c = { ...c, tax: '9' };
                }
                let tax = sanitize(c.tax);
                index = xyz.findIndex(p => sanitize(p.tax) === tax);
                // now take the overall price like qt * unit price its in c.prices[c.id];
                if (index !== -1) {
                    xyz[index]['amount'] = Number(xyz[index].amount) + Number(calTax(tax, c.prices[c.id]));
                    xyz[index]['over'] = Number(xyz[index].over) + Number(c.prices[c.id]);
                } else {
                    xyz.push({ tax, amount: calTax(tax, c.prices[c.id]), over: Number(c.prices[c.id]) });
                }

            });

            xyz = xyz.sort((a, b) => a.tax - b.tax);
            setTaxAmounts(xyz)
            toggleModal();

        }).catch((e) => {
            toast.error("Order details not ready!");
            console.log(e);
        })
            .finally(() => dispatch({ type: `STOP_LOADING` }));

    }

    useEffect(() => {
        if (isSuccess) {

            setProductNames(data.products);
            setSessions(data.sessions);

            let pNames = data.products;
            let orders = [];
            let dispatchable = [];

            for (let order of data?.orders ?? []) {

                const session = typeof order.data === 'string' ? JSON.parse(order.data) : order.data;
                let orderData = [];
                if (session) {
                    for (const prod in session.quantity) {
                        if (!Object.hasOwn(session.quantity, prod)) continue;
                        orderData.push({
                            sq: cachedProducts?.find(p => Number(p.id) === Number(prod))?.seq ?? "",
                            name: pNames[prod],
                            quantity: session.quantity[prod],
                            price: session.price[prod],
                        });
                    }
                    dispatchable.push({ id: order.id, session: session.quantity });
                }
                orders.push({ ...order, items: orderData });

            }

            dispatch({
                type: "KEEP_ORDER",
                payload: dispatchable
            })
            setSession(dispatchable)

            setOrders(orders);

        }

    }, [data, isSuccess])

    const orderColumns = [
        {
            name: "Order #",
            selector: row => row.id,
            sortable: true,
            width: '180px'
        },
        {
            name: "Table(s)",
            selector: row => row.tables ? row.tables : "Direct Sale",
            sortable: true,
            width: '125px'
        },
        {
            name: "Items",
            selector: row => {
                let session = row.data;

                if (session) {
                    session = typeof session === 'string' ? JSON.parse(session) : session;
                    let prs = []
                    for (const prod in session.quantity) {
                        if (!Object.hasOwn(session.quantity, prod)) continue;

                        const qt = session.quantity[prod];
                        prs.push(`${qt}x ${productNames[prod]}`)
                    }
                    return (<>{prs.toString().length > 45 ? wrapText(prs.toString(), 45) : prs.toString()}
                        {prs.toString().length > 45 && <span className="badge bg-primary">{"More items"}</span>}
                    </>);

                }

                return "Order in progress...";

            },
            wrap: true,
            grow: 2
        },
        {
            name: "Total (€)",
            selector: row => `${row.total ? '€ ' + row.total : '...'}`,
            sortable: true,
            right: true,
            width: "150px"
        },
        {
            name: "Payment",
            selector: row => row.payment_status,
            cell: row => (
                <span
                    className={`badge ${row.payment_status === "paid"
                            ? "bg-success"
                            : row.payment_status === "pending"
                                ? "bg-warning"
                                : "bg-secondary"
                        }`}
                >
                    {capitalFirst(row.payment_status)}
                </span>
            ),
            sortable: true,
            width: "140px"
        },
        {
            name: "Status",
            selector: row => row.status,
            cell: row => (
                <span
                    className={`badge ${row.orderStatus === "completed"
                            ? "bg-success"
                            : row.orderStatus === "in-kitchen"
                                ? "bg-info"
                                : row.orderStatus === "cancelled"
                                    ? "bg-danger"
                                    : "bg-secondary"
                        }`}
                >
                    {capitalFirst(row.status)}
                </span>
            ),
            sortable: true,
            width: '110px'
        },
        {
            name: "Time",
            selector: row => timeAgo(row.created_at),
            sortable: true,
            width: "200px"
        },
        {
            name: "Actions",
            cell: row => (
                <div style={{ display: "flex", gap: "8px" }}>
                    {
                        row.payment_status === 'pending' && row.items.length !== 0 ?
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => toPayment(row.id, row.tables, row.status)}
                                onPointerUp={() => toPayment(row.id, row.tables, row.status)}
                            >
                                Payment
                            </button> :
                            (row.items.length !== 0 ? <button className="btn btn-sm btn-primary" onClick={print}> Print </button> : null)
                    }
                    {(row.status === 'ongoing' && row.items.length !== 0) ? (<button className="btn btn-sm btn-warning"
                        onClick={() => makeOrder({ id: row.table_number, body: { order_id: row.id } })}>
                        Order
                    </button>) : ''}
                    <button className="btn btn-sm btn-primary" onClick={() => viewOrder(row)}>View</button>
                </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
            width: "240px"
        }
    ];


    return (
        <>
            <div className='d-block position-absolute' style={{ zIndex: 1, right: 60 }}>
                <button className='btn btn-success btn-rounded' onClick={toggleReport}> Generate Report </button>
            </div>
            <div className="container-fluid order-table">
                <DataTable
                    title="Orders"
                    columns={orderColumns}
                    data={orders}
                    pagination
                    expandableRows
                    expandableRowsComponent={props => <ExpandedTable {...props} />}
                    onRowExpandToggled={(expanded, row) => {
                        if (expanded) addToPOS(row.id, row.tables, row.status);
                    }}
                    highlightOnHover
                    striped
                    responsive
                    customStyles={dataTableStyle}
                />
            </div>
            {/* Order Detail to view */}
            <Modal isOpen={open} >
                <ModalHeader>
                    <p style={{ fontSize: '1.5rem' }}>Order Details</p>
                </ModalHeader>
                <ModalBody>
                    <div style={{ width: '100%' }}>
                        <div className="container" style={{ backgroundColor: 'white', paddingBottom: '10px', borderRadius: '15px', fontSize: 'larger' }} id='receipt'>
                            <div style={{ display: 'flex', fontSize: 'larger' }}>
                                <div style={{ justifyContent: 'center', width: '100%', textAlign: 'center', display: 'grid' }}>
                                    <img src={pos} alt={''} style={{ filter: "grayscale(1)" }} height={140} />
                                </div>
                            </div>
                            <div style={{ marginTop: 5 }} >
                                <Address />
                                <div className='receipt' ref={modalBody} style={{ width: '100%', background: '#fff' }}>
                                    <Transaction
                                        isLoading={loading}
                                        orderProducts={orderProducts}
                                        order={order}
                                        total={total}
                                        taxes={taxes}
                                    />
                                </div>
                                <div style={{ width: "100%", textAlign: 'center' }}>
                                    <p style={{ paddingTop: 10, paddingBottom: 10 }}>Thank you! Visit Again!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <button className='btn btn-light btn-rounded' onClick={() => toggleModal(!open)}> Close </button>
                    <button type='button' className='btn btn-primary btn-rounded' onClick={print}> Print </button>
                </ModalFooter>
            </Modal>
            {/*  X & Z report generating modal */}
            <Modal isOpen={reportModal} >
                <Form onSubmit={generateReceipt}>
                    <ModalHeader>
                        <span className="report-type"> Generate-Report</span>
                    </ModalHeader>
                    <ModalBody>
                        <Card>
                            <CardBody className="asking">
                                <div className="container-fluid" style={{ placeItems: 'center' }}>
                                    <div className="row mt-2 w-100 d-flex" >
                                        <div className="col-12">
                                            <div className="form-group">
                                                <label htmlFor="current">
                                                    <b>Current Session</b>
                                                </label>
                                                <input
                                                    type="checkbox"
                                                    id="current"
                                                    className="form-group ms-4"
                                                    onChange={() => setToday(!today)}
                                                    checked={today}
                                                />
                                            </div>
                                            <hr />
                                            <div className="text-center w-100">
                                                <h4>OR</h4>
                                            </div>
                                            <div className="form-group mb-4">
                                                <label htmlFor="selected">
                                                    <b>Choose Session</b>
                                                </label>
                                                <CreatableSelect
                                                    id="selected"
                                                    options={sessions}
                                                    onChange={e => { setPayload({ ...payload, register_id: e.value }); setToday(false) }}
                                                />
                                            </div>
                                        </div>
                                        <div className="row text-center mb-3">
                                            <h4>
                                                <b> Select Type of Report </b>
                                            </h4>
                                        </div>
                                        <button className={`btn btn-rounded col-5 ms-1 btn-success  ${reportType && reportType !== 'X' ? 'btn-inactive' : ''}`} type='button' onClick={() => setReportType('X')} style={{ border: '5px solid #afe9f5' }}> X-Report </button>
                                        <button className={`btn btn-rounded col-5 offset-1 btn-danger ${reportType && reportType !== 'Z' ? 'btn-inactive' : ''}`} type='button' onClick={() => setReportType('Z')} style={{ border: '5px solid #afe9f5' }}> Z-Report </button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="bg-light btn btn-rounded" onClick={toggleReport}>Close</button>
                        <button className="bg-info btn text-white btn-rounded" > Generate </button>
                    </ModalFooter>
                </Form>
            </Modal>
        </>
    );

}
