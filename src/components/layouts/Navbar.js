import axios from 'axios';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSearch } from '../../contexts/SearchContext';
import { calTax, sanitize, Warning } from '../../helpers/utils';
import toast from 'react-hot-toast';
import logo from '../../assets/images/asmara.jpeg';
import profile from "../../assets/images/users/avatar.jpg";
import { printDivById } from '../../helpers/attachments';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import Transaction, { Address } from '../orders/Transaction';

const sessionCall = async () => {

    return axios.get(`/pos/last-active-session/`,{ headers: {
        'Content-Type' : 'application/json',
        'asmara-token': localStorage.getItem('asmara-token')
    }})
    
}

function Navbar() {

    const { categories, hasKeyboard, loading, theme, myInfo, kitchenPrinter } = useSelector( state => state.auth );

    const location = useLocation();
    const params = useParams();
    
    const [ order, setOrder ] = useState({});
    const [ keyboard, setKeyboard ] = useState(hasKeyboard);     

    const keyboardRef = useRef(null);

    const removeOrders = async () => {
        const {data} = await axios.get(`/orders/remove-all`)
        if(data.status) {
            toast.success(data.message);
            setTimeout(() => window.location.reload(), 1000);
        }
    }

    const freeTables = async () => {
        const {data} = await axios.get(`/tables/free-all`)
        if(data.status) {
            toast.success(data.message);
            setTimeout(() => window.location.reload(), 1000);
        }
    }
    
    const handleKeyboard = () => {

        let chosen = !keyboard;
        setKeyboard(chosen);
        dispatch({ type: "KEYBOARD", payload: chosen });
        toast.success("Keyboard status updated!");

    }

    const checkforUpdates = async e => {

        e.preventDefault()
        localStorage.setItem(`_last_location`, location.pathname);
        try {
            dispatch({ type:"LOADING" });
            const {data} = await axios.get(`install-update`);
            if(data.status) {
                toast.success(data.message);
                setTimeout(() => window?.electronAPI.relaunch(), 2000);
            } else {
                if( data.relaunch ) {
                    toast.success("Update downloaded, click again to install updates!");
                    setTimeout(() => window?.electronAPI.relaunch(), 2000);
                } else {
                    toast.error(data.message);
                }
            }
        } catch (error) {
            if (error.code === "ERR_NETWORK") {
                toast.error("No internet connection!")
            } else {
                toast.error("Something went wrong!")
            }
        }
        dispatch({ type:"STOP_LOADING" });

    }

    const switchMode = e => {
        
        const html = document.getElementsByTagName('html')[0];
        dispatch({ type: "THEME", payload: theme === 'light' ? 'dark': "light" });
        html.dataset.bsTheme = theme === 'light' ? 'dark': "light";
        
    }

    const modalBody = useRef(null);
    const { setSearchQuery, searchQuery, displayImage, handleImageDisplay } = useSearch();

    const printReceipt = async () => {

        const elem = modalBody.current;
        if(!elem) return toast.error(`Sorry can't go further...`);

        try {
            if(window.electronAPI) {
                window.electronAPI?.printContent({ html: elem.innerHTML, raw: { orderProducts, order } });
            } else {
                Warning("Printer not connected!")
                printDivById('receipt')
            }
        } catch (error) {
            console.error("Error capturing image:", error);
        }

    }

    const [ orderModal, toggleOrderModal ] = useState(false);
    const [ printerModal, togglePrinterModal ] = useState(false);
    const [ total, setTotal ] = useState(0);
    const [ orderProducts, setOrderProducts] = useState([]);

    const [ availablePrinters, setAvailablePrinters ] = useState([]);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const nav = url => navigate(url);

    const updatePrinter = (e) => {
        const {name} = e.target?.dataset;
        toast.success("Printer updated!");
        dispatch({
            type:"KITCHEN_PRINTER",
            payload: name
        });
    }
 
    const [ preset, setPreset ] = useState('')
    
    useEffect(()=> {
        keyboardRef.current?.setInput(preset)
    },[preset])

    useEffect(()=> {
        setSearchQuery(searchQuery)
        return ()=> setSearchQuery('')
    },[searchQuery, setSearchQuery]);
    

    const logOut = async () => {
        dispatch({ type:"RESET_KART" });
        dispatch({ type:"LOGOUT" })
    }

    const [ taxes, setTaxAmounts ] = useState([]);

    const lastOrder = () => {

        dispatch({ type:`LOADING` });
        toggleOrderModal(!orderModal);

        axios.get(`orders/last-order`).then(({data})=> {

            const { products, session:sessionData, order } = data;
            setTotal(data.order.total);
            setOrder({ ...sessionData, ...order });
            let orderedProducts = Object.values(products).map( pr => ({...pr, stock:sessionData?.quantity[pr.id]}) );
            if((sessionData?.products??[]).indexOf('quick') !== -1) { // this is the place that contracts
                let overallExcept = orderedProducts.reduce( (pre,a) => pre + parseFloat((sessionData?.price[a.id] ?? a.price) * sessionData?.quantity[a.id]), 0);
                let otherPrice = data.order.amount - overallExcept;
                orderedProducts = [...orderedProducts, ...sessionData.products.filter( p=> orderedProducts.findIndex( o => o.id===p) === -1 ).map( p => (
                {
                    id: p, 
                    name: p, 
                    price: sessionData.price[p]??otherPrice, 
                    stock: sessionData?.quantity[p]
                })).flat()];
            }
            let cp =[];
            sessionData.products.forEach( pr => cp.push(orderedProducts.find(p=>p.id === pr)))
            
            setOrderProducts(cp.map( p => {
                if(categories[p?.category_id]) {
                    p.isVeg= true
                }
                p.prices = sessionData.price ?? {}
                p.units = sessionData.unit??{}
                return p;
            }));

            let xyz=[];
            cp.forEach(c => {
                let index = 0;
                let tax = sanitize(c.tax);
                index = xyz.findIndex( p => sanitize(p.tax) === tax );
                // now take the overall price like qt * unit price its in c.prices[c.id]
                if( index !== -1 ) {
                    xyz[index]['amount'] = Number(xyz[index].amount) + Number(calTax(tax, c.prices[c.id]));
                    xyz[index]['over'] = Number(xyz[index].over) + Number(c.prices[c.id]);
                } else {
                    xyz.push({ tax, amount: calTax(tax, c.prices[c.id]), over: Number(c.prices[c.id]) });
                }
            })
            xyz = xyz.sort((a, b) => a.tax - b.tax);
            setTaxAmounts(xyz);

        }).catch(error => {
            if(error.code === 'ERR_NETWORK') {
                toggleOrderModal(!orderModal)
                dispatch({type:"NOT_CONNECTED"})
            }
        })
        .finally( () => dispatch({ type:`STOP_LOADING` }));

    }

    const initSessions = useCallback(async( prom ) => 
    {
        const {data} = await prom;
        if(data.status && data?.session?.status) {
            dispatch({ type:"SET_CASH", payload: data.session });
        }

    },[]);
    
    useEffect(()=> {
        const gar = sessionCall();
        document.addEventListener("keydown", function(e) {
            if(e.key === 'Escape') {
                toggleOrderModal(false)
            }
        });
        if(window.electronAPI?.getPrinters){
            window.electronAPI.getPrinters().then((printers) => {
                console.log("available printers", printers);
                setAvailablePrinters(printers.map(p => ({name: p.name, default: p.isDefault})))
            });
        }
        initSessions(gar);
    },[]);

    const [full, setFull] = useState(true);
    const toggleScreen = e => {
        setFull(full => !full)
        if(window.electronAPI) {
            window.electronAPI.toggleFullscreen(full)
        }
    }

    const printerLookup = () => {
        togglePrinterModal(!printerModal)
    }
    
    if( params && params.type === 'customer' ) return null;
    
    return (
    <>
        <header className="topbar">
            <div className="container-fluid">
                <div className="navbar-header" style={{justifyContent:'space-between'}}>
                    <div className="d-flex align-items-center gap-3">
                        <div className="topbar-item">
                            <button type="button" className="button-toggle-menu me-2">
                                <Icon icon="solar:hamburger-menu-broken" className="fs-24 align-middle" />
                            </button>
                        </div>
                        <button className={'btn btn-primary'} type='button' onClick={()=>nav('/floors')}>
                            Home
                        </button>
                        <button className={'btn btn-primary'} type='button' onClick={()=>nav('/pos')}>
                            Register
                        </button>
                        <button className={'btn btn-secondary'} type='button' onClick={()=>nav('/orders')}>
                            Orders
                        </button>
                        {location.pathname.indexOf('/pos')!==-1 &&
                            <div className="topbar-item">
                                <h4 className={`mb-0 btn btn-rounded btn-sm btn-primary fs-4`}>{params?.table ? `Table No. ${params.table}`:'Direct Sale' }</h4>
                            </div>
                        }
                        <button className="btn btn-secondary" type='button' onClick={()=>lastOrder()}>
                            Last Order
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={()=> window.electronAPI?.drawCash()}>
                            Open drawer
                        </button>
                    </div>

                    <img src='/images/asmara.jpeg' alt={''} height={70} style={{borderRadius:16}} />

                    <div className="d-flex align-items-center gap-1">

                        <li className="nav-item d-flex align-items-center">
                            { location.pathname.indexOf('/pos') !==-1 && <button className='btn btn-rounded btn-sm btn-warning fs-4' 
                            onClick={()=> handleImageDisplay(!displayImage)}> 
                                <Icon icon={displayImage?'mdi:image-off-outline':"mdi:image-outline"} className="fs-34 align-middle" />
                            </button>}
                        </li>

                        <li className="nav-item d-flex">
                            <Link to={'#'} className='nav-link' onClick={toggleScreen}>
                                <Icon icon={`mdi:${full? 'fullscreen-exit':"fullscreen"}`} style={{fontSize:'2rem'}}/>
                            </Link>
                        </li>
                        <li className="nav-item d-flex">
                            <Link to="#" onClick={()=>window.location.reload()} title={'Refresh'}>
                                <Icon style={{fontSize:'2rem'}} icon="mdi:refresh" />
                            </Link>
                        </li>
                        <div className="topbar-item">
                            <button type="button" className="topbar-button" id="light-dark-mode" onClick={switchMode}>
                                <Icon icon={theme === 'light' ? "solar:moon-bold-duotone": "solar:sun-bold-duotone"} className="fs-34 align-middle"/>
                            </button>
                        </div>

                        <div className="dropdown topbar-item">
                            <button type="button" className="topbar-button position-relative" id="page-header-notifications-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" >
                                <Icon icon="solar:bell-bing-bold-duotone" className="fs-28 align-middle" />                              
                            </button>
                            <div className={`dropdown-menu py-0 dropdown-lg dropdown-menu-end `}
                                aria-labelledby="page-header-notifications-dropdown">
                                <div className="p-3 border-top-0 border-start-0 border-end-0 border-dashed border">
                                    <div className="row align-items-center">
                                        <div className="col">
                                            <h6 className="m-0 fs-16 fw-semibold"> Notifications</h6>
                                        </div>
                                        <div className="col-auto">
                                        </div>
                                    </div>
                                </div>
                                <div data-simplebar style={{maxHeight:280}} className="notifications">
                                </div>
                            </div>

                        </div>

                        <li className="nav-item dropdown d-none d-lg-block user-dropdown">
                            <Link className="nav-link" id="UserDropdown" to={"#"} data-bs-toggle="dropdown" aria-expanded="false">
                                <img className={"rounded-circle "} height={40} src={profile} alt="" /> 
                            </Link>
                            <div className="dropdown-menu dropdown-menu-left navbar-dropdown" aria-labelledby="UserDropdown" style={{ borderRadius:8 }}>
                                <div className="dropdown-header text-center">
                                    <img className={" rounded-circle"} src={profile} height={50} alt={''} />
                                    <p>{myInfo.name}</p>
                                    <p className="fw-light text-muted d-none mb-0"> Admin </p>
                                </div>

                                <Link className="dropdown-item d-flex gap-3" style={{justifyContent:'space-between'}} to={"#"}>
                                    <div>
                                        <i className="dropdown-item-icon mdi mdi-keyboard text-primary me-2"/> Keyboard 
                                    </div>
                                    <div onClick={handleKeyboard}>
                                        <input type={`checkbox`} style={{display:'none'}} id={`btn1991`}
                                        checked={keyboard} onChange={()=>{}} className='status'/>
                                        <label htmlFor={`btn1991`} />
                                        <div className='plate'/>    
                                    </div>
                                </Link>
                                { window.electronAPI || 1 ? 
                                (<>
                                    <Link className="dropdown-item" to={"#"} onClick={printerLookup}>
                                        <i className="dropdown-item-icon mdi mdi-update text-primary me-2" /> 
                                        Setup Kitchen Printer
                                    </Link>
                                    <Link className="dropdown-item" to={"#"} onClick={checkforUpdates}>
                                        <i className="dropdown-item-icon mdi mdi-update text-primary me-2" /> 
                                        Update
                                    </Link>
                                    </>
                                ) : null
                                }
                                {
                                    false && (<>
                                    <Link to={'#'} className='dropdown-item' onClick={removeOrders}>
                                        Remove orders
                                    </Link>
                                    <Link to={'#'} className='dropdown-item' onClick={freeTables}>
                                        Free tables
                                    </Link>
                                    </>
                                    )
                                }
                                <Link className="dropdown-item" to={"#"} onClick={logOut}>
                                    <i className="dropdown-item-icon mdi mdi-power text-primary me-2"/> 
                                    Sign Out
                                </Link>
                                { window.electronAPI ?
                                <Link className="dropdown-item" to={"#"} onClick={()=> {
                                    localStorage.removeItem("_last_location");
                                    window.electronAPI?.closeApp()
                                }}>
                                    <i className="dropdown-item-icon mdi mdi-close text-primary me-2"/> 
                                    Quit
                                </Link>
                                : null }
                            </div>
                        </li>

                    </div>

                </div>
            </div>
        </header>
        <Modal isOpen={orderModal}>
            <ModalHeader>
                <p style={{ fontSize:'1.5rem' }}> Previous Order Details </p>
            </ModalHeader>
            <ModalBody >
                <div className="col-lg-12" id="receipt" >
                    <div className="container" style={{ paddingBottom:'10px',borderRadius:'15px',fontSize:'larger' }} >
                        <div className="row" style={{display:'flex',fontSize:'larger'}}>
                            <div className="d-grid" style={{justifyContent:'center',textAlign:'center',width:'100%',display:'grid'}}>
                                <img src={logo} alt='' style={{filter:"grayscale(1)"}} height={120} />
                            </div>
                        </div>
                        <div className="row" ref={modalBody}>
                            <div style={{width:'100%'}}>
                                <Address />
                            </div>
                            <div className="receipt" style={{width:'100%',background:'#fff'}}>
                                <Transaction 
                                    isLoading={loading}
                                    orderProducts={orderProducts} 
                                    order={order}
                                    taxes={taxes}
                                    total={total}
                                    paymentMethod={order?.payment_mode}
                                />
                            </div>
                            <div style={{width:"100%", textAlign:'center'}}>
                                <p style={{paddingTop:0,paddingBottom:0}}>Thank you! Visit Again!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <button className='btn btn-light btn-rounded' onClick={()=> toggleOrderModal(!orderModal)}> Close </button>
                <button className='btn btn-primary btn-rounded' onClick={printReceipt}>Print</button>
            </ModalFooter>
        </Modal>
        <Modal isOpen={printerModal}>
            <ModalHeader>
                Select Printer for Kitchen
            </ModalHeader>
            <ModalBody>
                <div className="container">
                    <div className="row">
                        {availablePrinters.map( (p,i) => {
                            return <div class="form-check mb-2 d-block">
                                <input type="radio" id={`printer-${i}`} name={`printer-${i}`} class="form-check-input" data-name={p.name} onChange={updatePrinter} checked={kitchenPrinter===p.name} />
                                <label class="form-check-label" for={`printer-${i}`}>{p.name}</label>
                            </div>
                        })}
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <button className='btn btn-light btn-rounded' onClick={()=> togglePrinterModal(!printerModal)}> Close </button>
                <button className='btn btn-success btn-rounded' onClick={()=> togglePrinterModal(!printerModal)}>Done</button>
            </ModalFooter>
        </Modal>
    </>
    )
}

export default memo(Navbar)