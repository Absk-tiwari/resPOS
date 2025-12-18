import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux'
import { useMakePaymentMutation } from '../../features/centerSlice';
// import pos from '../../asset/images/logo.png'
import pos from '../../assets/images/asmara.jpeg'
import { f, formatAmount, proper, returnPart, showQT, showTaxes, Warning } from '../../helpers/utils';
import axios from 'axios';
import toast, { LoaderIcon } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { chosenStyle, labelStyle, paymentToastStyle } from '../../objects/styles';
import { Address, TaxTable } from '../orders/Transaction';

let RETURNS=0



export default function Payment() 
{
    const targetDiv = useRef(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    let {table_number} = useParams();
    if(table_number === undefined) {
        table_number = "";
    }

    const [ makePayment ] = useMakePaymentMutation();
    const { currency, cartProducts, openingCash, categories, tableOrders } = useSelector(state => state.auth );
    
    const [ number, setNumber ] = useState('');
    const [ processing, setProcess ] = useState(0)
    const [receiptOn, setReceipt] = useState(JSON.parse(localStorage.getItem('prt_receipt')??'false'));
    const [ byAll, setByAll ] = useState({Cash:0, Card:0, Account:0});
    const [ paymentMethod, setPaymentMethod ] = useState([]);
    const [ paidAmount, setPaid ] = useState(byAll.Cash + byAll.Card + byAll.Account);
    const [ KartProducts, setKartProducts] = useState([]);
    const [ currentMethod, setCurrentMethod ] = useState('');

    const mode = { width:'96%', cursor:'pointer' }

    const choosePaymentMethod = (method, note=false) => {
        if( note ) {
            let previous = byAll.Cash;
            previous = parseFloat(previous);
            if(total < 0) {
                setByAll({...byAll, Cash: ( previous - parseInt(note) ) });
            } else {
                setByAll({...byAll, Cash: ( previous + parseInt(note) ) });
            }
        } else {
            let fillAmt = total - paid();
            if( fillAmt <= total ){
                setByAll(() => ({ ...byAll, [method]: fillAmt.toFixed(2) }));
            }
            setPaid(() => (byAll.Cash+ byAll.Card + byAll.Account))
        }
        if( !paymentMethod.includes(method) ) {
            setPaymentMethod([ ...paymentMethod, method ]);
        }
        setCurrentMethod(method);
        setNumber('');
    }

    const changeInput = input => {
        let newAmount = null;
        newAmount = formatAmount(number * 10 + input);
        setNumber((prev) => prev * 10 + input);
        setByAll({...byAll, [currentMethod]:newAmount});
    }

    const showTotal = () => {
        let additions=0;
        let returns=0;
        if(cartProducts[table_number]?.length || KartProducts[table_number]?.length) {
            if(cartProducts[table_number]?.length) {
                additions = cartProducts[table_number].filter( _ => _.return === undefined)
                returns = cartProducts[table_number].filter( _ => _.return === true)
            } else {
                additions = KartProducts[table_number].filter( _ => _.return === undefined)
                returns = KartProducts[table_number].filter( _ => _.return === true)
            }
            additions = additions.reduce((acc, cur)=> acc + (cur.stock * parseFloat(cur.price)),0)
            returns = returns.reduce((acc, cur)=> acc + (cur.stock * parseFloat(cur.price)),0)
        }
        RETURNS = returns
        return parseFloat(additions - returns)
    }

    const total = showTotal();

    const takeSnipAndPrint = async (products,order) => {
        try {
            if(window.electronAPI){
                window.electronAPI.printContent({ html: targetDiv.current.innerHTML, raw : { orderProducts:products, order }});
            } else {
                Warning("Printer not connected!")
            }
        } catch (error) {
            console.error("Error capturing image:", error);
        }

    }

    const onlyPayment = async () => {
        const {data} = await axios.post(`orders/payment-update/`)
    }
    
    const initPayment = async () => {
 
        if( processing ) return;
        if(total===0) return navigate('/pos');
        let paidAmount = parseFloat(byAll.Cash) + parseFloat(byAll.Card) + parseFloat(byAll.Account)
        if(total > 0 && paidAmount < total.toFixed(2)) { // paid-amount agr total se kam hai to laut jao
            return Warning("Pay the remaining amount!");
        }
        if(total < 0) { // total - me hai yani return ho rhe products
            if(f(paidAmount) > f(total)) { // aur ab agr paid-amount total se jyada hai(- k terms me) -2 > -5
                return Warning("Return the remaining amount!")
            }
        }
        setProcess(true);

        let cashForDrawer = total.toFixed(2); // cash in drawer = total
        let reducible = parseFloat(byAll.Card)

        if(reducible > 0 && reducible > total.toFixed(2)) {
            reducible = reducible - total.toFixed(2)
            cashForDrawer -= reducible
        }
        
        let thruAC = parseFloat(byAll.Account);
        if(thruAC > 0 && thruAC > total.toFixed(2)) {
            thruAC = thruAC - total.toFixed(2)
            cashForDrawer -= thruAC;
        }
        let returnHTML = returnPart(total, paid())

        const sessionData = cartProducts[table_number].reduce(
            (acc, { stock, id, price,  ...rest }) => {
                if( acc.products.indexOf(id) ===-1 ) { // quick hi ayega udhr se hmesa so its all done here
                    acc.products.push(id)
                }
                acc.quantity[id] = ((acc.quantity[id] || 0) - 0) + (stock-0);// Increment quantity
                acc.total = f(total); // Accumulate total price
                acc.price[id] = (acc.quantity[id] || 0) * f(price)
                acc.r = returnHTML;
                return acc;
            },
            { products: [], total: 0, quantity: {}, price:{}, r:'' }
        );

        const order_id = tableOrders[table_number!=='undefined' ? table_number: ""].id;

        const data = await makePayment({
            tables: table_number,
            customer_id:'',
            order_id,
            cash_register_id: openingCash.id,
            cashForDrawer,
            total,
            payment_mode: paymentMethod.toString(),
            modes: {...byAll, Cash: cashForDrawer, ogCash:byAll.Cash },
            returns: RETURNS,
            data: sessionData 
        }).unwrap();

        if(data.status) {

            toast.success("Order completed!");

            if( receiptOn ) {
                setKartProducts(cartProducts[table_number]);
                const replica = JSON.parse(JSON.stringify(cartProducts[table_number]));
                await takeSnipAndPrint(replica.map( p => {
                    if(categories[p?.category_id]) {
                        p.isVeg= true;
                    }
                    p.prices = sessionData.price ?? {};
                    p.units = sessionData.unit??{};
                    return p;
                }), data.order);

            } else {
                if(window.electronAPI){
                    window.electronAPI.drawCash();
                }
            }
            // if(cashdraw) window?.electronAPI?.drawCash() // this to enable only in Drawer controlled version

            window.electronAPI?.reloadWindow({manual:true});

            dispatch({ type: "STOP_LOADING" });
            
            toast((<div style={paymentToastStyle}>
                    <h2 style={{padding:'10px 30px',fontSize:"2.7rem",whiteSpace:'nowrap',fontWeight:900}}>{returnHTML}</h2>
                </div>), {
                duration:8000,
                position:"top-right"
            });

            // dispatch({
            //     type:"UNSET_ORDER",
            //     payload: table_number === 'undefined' ? "": table_number
            // });

            navigate(`/floors`);

        } else {
            toast.error("Failed to create the order!");
        }
       
        setProcess(false);

    }

    const toggleReceipt = mode => {
        localStorage.setItem('prt_receipt', mode)
        setReceipt(mode);
    }
    
    const [cashdraw, setCash] = useState(true);

    const paid = () => Object.values(byAll).reduce((p,c)=> p+parseFloat(c),0)

    return (
        <div className="content-wrapper">
            <div className="col-lg-12 grid-margin stretch-card d-flex" style={{justifyContent:'space-around'}}>
                <div className="col-lg-5">
                    <div className="row" >
                        <div className="container">
                            {[ 'Cash', 'Card', 'Account' ].map( (met,_) => <div className="row" key={met}>
                                <div className={`card ms-2 bg-secondary payment-${met.toLowerCase()} ${currentMethod===met && 'active'}`} style={mode} onClick={()=> choosePaymentMethod(met)}>
                                    <div className="card-body">
                                        <div className="d-flex text-white" style={{alignItems:'center',gap:'5px'}}>
                                            { _ === 0 && <i className="bx bx-cash" aria-hidden={true} />}
                                            { _ === 1 && <i className="bx bx-credit-card" aria-hidden={true} />}
                                            { _ === 2 && <i className="bx bx-user" aria-hidden={true} />} 
                                            <strong> <p className="m-0 text-white"> {met} </p>  </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>)}
                        </div>
                    </div>
                    {<div className="row">
                        <div className="col-sm-12 d-flex">
                            <button 
                                type="button" 
                                className="btn bg-white text-dark w-100 mt-3 justify-content-center" 
                                style={{width:'50%',alignContent:'center', color:'white', fontSize:'1.4rem', border:'1px solid'}} 
                                onClick={()=>toggleReceipt(!receiptOn)} 
                            >
                                Receipt 
                                <input
                                    type='checkbox' 
                                    checked={receiptOn} 
                                    style={{marginLeft:25, height:20,width:25}} 
                                    onChange={()=>{}} 
                                /> 
                            </button>
                        </div>
                        {false && <div className="col-sm-12 d-flex">
                            <button 
                                type="button" 
                                className="btn bg-white text-dark w-100 mt-3 justify-content-center" 
                                style={{width:'50%', alignContent:'center', color:'white', fontSize:'1.4rem', border:'1px solid'}} 
                                onClick={()=>setCash(!cashdraw)} 
                            > 
                                Draw Cash
                                <input
                                    type='checkbox' 
                                    checked={cashdraw} 
                                    style={{marginLeft:25, height:20,width:25}} 
                                    onChange={()=>{}} 
                                /> 
                            </button>
                        </div>}
                    </div>}
                    { paymentMethod.length ? (<>
                        <div className="calculator">
                            <div className="row mt-2 offset-2">
                                {[1,2,3].map( (btn,i) => <div className="col-sm-3" key={i} onClick={()=>changeInput(btn)}>
                                    <button style={{fontSize:'1.5rem'}} className="btn btn-light  w-100 text-dark"> <b> {btn} </b> </button>
                                </div> )}
                            </div>
                            <div className="row mt-1 offset-2">
                                {[4,5,6].map( (btn,i) => <div className="col-sm-3" key={i} onClick={()=>changeInput(btn)}>
                                    <button style={{fontSize:'1.5rem'}} className="btn btn-light  w-100 text-dark"> <b> {btn} </b> </button>
                                </div> )}
                            </div>
                            <div className="row mt-1 offset-2">
                                {[7,8,9].map( (btn,i) => <div className="col-sm-3" key={i} onClick={()=>changeInput(btn)}>
                                    <button style={{fontSize:'1.5rem'}} className="btn btn-light  w-100 text-dark"> <b> {btn} </b> </button>
                                </div> )}
                            </div>
                            <div className="row mt-1 offset-2">
                                {[0, ].map( it => <div key={it} className={`col-sm-6 `} onClick={()=> changeInput(it)}>
                                    <button style={{fontSize:'1.5rem'}} className="btn btn-light w-100 text-dark"> <b> {it} </b> </button>
                                </div> )}
                                <div className="col-sm-3" onClick={()=> {
                                    setByAll({...byAll, [currentMethod]:0});
                                    setNumber('')
                                }}>
                                    <button style={{fontSize:'1.5rem'}} className="btn btn-light w-100 text-dark"> <b> Clear </b> </button>
                                </div>
                            </div>
                            <div className="row mt-1">
                                <div className="col-sm-12 d-flex">
                                    <button type={`button`} className={`w-100 btn btn-light text-white validate`} 
                                        style={{width:'47%',backgroundColor: '#0d172c',opacity:1,textTransform:'uppercase'}}
                                        onClick={initPayment}
                                    >
                                    { processing ? <div className='d-grid' style={{placeItems:'center'}}>
                                        <LoaderIcon style={{ width:20, height:20 }}/>
                                    </div> :'Complete Payment' }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>)
                    : null }
                </div>
                <div className="final col-lg-6">
                    <div className="card">
                        <div className="card-body">
                            <h1 className="text-success" style={{textAlign:'center'}}>
                                <span className="total-amount">{currency + parseFloat(total).toFixed(2)}</span>
                            </h1>
                        </div>
                    </div>
                    <div className="card mt-3 w-100 parent">
                        <div className="row selections">
                            <strong className={`${paymentMethod.length && 'd-none'}`}>
                                <span className="info"> Please select a payment method </span>
                            </strong>
                            {paymentMethod.length ? ( // if any mode is selected start to display
                                <>
                                    { total < paid() || total === paidAmount ? (
                                        <div className={`card ${paid() > total ?'fulfilled':'remaining' }`} >
                                            <div className="card-body exception">
                                                <div className="d-flex" style={{ justifyContent:'space-between'}}>
                                                {
                                                    total > 0 ? (<>
                                                        <div className="d-flex">
                                                            <i className={`fa-solid fa-cash`} />
                                                            <p> Return </p>
                                                        </div>
                                                        <b>&nbsp; {currency} {Math.abs((total - paid()).toFixed(2))}</b>
                                                    </>) : (<>
                                                        <div className="d-flex">
                                                            <i className={`fa-solid fa-cash`} />
                                                            {
                                                                total > 0 && paid() > total ? <b className={total}> Put back { total.toFixed(2) - paid() }</b>
                                                                :(<><p> Return </p><b> &nbsp; {currency + Math.abs(total.toFixed(2) - paid())}</b></>)
                                                            }
                                                        </div>
                                                    </>)
                                                }
                                            </div>
                                        </div>
                                    </div>) : (
                                        <div className={`card remaining`}>
                                            <div className={`card-body exception`}>
                                                <div className="d-flex" style={{ justifyContent:'space-between' }}>
                                                    <div className="d-flex">
                                                        <i className={`fa-solid fa-cash`} />
                                                        {total > 0 ? <p>Remaining </p>: <p>Put Back</p>}
                                                    </div>
                                                    <b>&nbsp; {currency} {Math.abs((total - paid()).toFixed(2))}</b>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {
                                        paymentMethod.map( meth => <div className={`card methods payment-${meth.toLowerCase()} ${currentMethod===meth && 'active'}`} key={meth} onClick={()=> setCurrentMethod(meth)}>
                                            <div className={`card-body exception`} >
                                                <div className="d-flex" style={{justifyContent:'space-between'}}>
                                                    <div className="d-flex"> 
                                                        <p> { meth } </p>
                                                    </div>
                                                    <div className="d-flex">
                                                        &nbsp;{currency} &nbsp;<b className="price" > {byAll[meth]}</b>
                                                        <i className="mdi mdi-close mx-3" style={{cursor:'pointer'}} onClick={()=>setPaymentMethod(()=>{ 
                                                            setByAll({...byAll, [meth]:0})
                                                            return paymentMethod.filter(ite => ite !== meth)
                                                        })} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>) 
                                    }
                                </>
                            ): null}
                        </div>
                    </div>
                    <div className={`container`}>
                        <div className={`row`}>
                            {[5,10,20,50,100,200].map((note) => (
                                <div className="col-sm-4 mt-1" key={note} style={{maxHeight:'110px',cursor:'pointer'}} onClick={()=>choosePaymentMethod('Cash', note)}>
                                    <div className={'text-center bg-white'} style={{width:'100%',height:'100px',borderRadius:10, border:'1px solid',placeContent:'center'}} >
                                        <h2> <b>EUR {note}</b> </h2>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Receipt Area */}
            {<div className={`col-lg-5 ms-4 ${receiptOn ?'':'d-none'}`} id="receipt" >
                <div className="container" style={{ paddingBottom:40,borderRadius:15,alignSelf:'center' }} >
                    <div className="row d-flex w-100">
                        <div style={{justifyContent:'center',display:'grid',textAlign:'center',width:'100%'}}>
                            <img src={pos} alt="" style={{marginTop:30, filter:'grayscale(1)'}} height={150}/>
                        </div>
                    </div>
                    <div className="row" ref={targetDiv} style={{justifyContent:'center'}}>
                        <Address /> 
                        <div className="receipt mt-3 exception" style={{ width:'100%' }} >
                            {
                                cartProducts[table_number]?.map( (product,l) => <div key={l} className='row' style={{...chosenStyle, border:'none'}}>
                                    <div style={{ display:'flex',width:'100%',justifyContent:'space-between'}}>
                                        <div>
                                            <strong style={{fontSize:product.name.length > 35?'medium':'large',fontWeight:900,fontFamily:'Manrope, sans-serif',marginRight:6}}>
                                                { product.stock + ' '+ (product.unit??'') }x 
                                            </strong>
                                            <b style={{fontSize: product.name.length > 35?'medium':'larger',fontWeight:900,maxWidth:'80%',fontFamily:'Manrope, sans-serif'}}>
                                                {product.name}
                                            </b>
                                            { product.return ? (<><small className='toHide' style={labelStyle}>-</small></>): null } 
                                        </div>
                                        <strong className='price' style={{fontSize:'large', whiteSpace:'nowrap'}}>
                                            { `${product.return?'- ':''}` + currency + ' ' + parseFloat(product.stock * f(product.price)).toFixed(2) }
                                        </strong>
                                    </div>
                                    <div className={'toHide d-none'} style={{fontSize:'larger',width:'100%',fontWeight:900,display:'flex',justifyContent:'space-between'}}>
                                        <span style={{fontFamily:'Manrope, sans-serif'}}> 
                                            { currency +' '+ f(product.price) }
                                            { typeof product.id ==='string' && product.id.indexOf('quick') !== -1 ? ' x': ( product.unit ? ` /${product.unit}` : '/ Units')}
                                            {/* {(!product.other ? currency + f(product.price) + (product.unit? `/ ${product.unit}`:  '/ Units'):'')}  */}
                                        </span>
                                        <span className='toHide' style={{fontFamily:'Manrope, sans-serif'}}> 
                                            Qty: {product.unit ? proper(product.stock, product.unit): f(product.stock)}
                                        </span>
                                    </div>
                                </div>
                                )
                            }
                            <div style={{justifyContent:'right', textAlign:'right'}}>
                                <span style={{cssText:"font-size:1.3rem!important;font-weight:900;margin-top:15px"}}> 
                                    TOTAL &nbsp; {currency + ' ' + parseFloat(total).toFixed(2) }
                                </span> 
                                <div style={{cssText:"font-size:1rem;font-weight:600"}}>
                                    {paymentMethod.map( (m,i) => {
                                        if(byAll[m]) {
                                            return <span key={i} style={{cssText:"font-size:1rem;font-weight:600"}}>{m +': '+currency +' '+byAll[m]}</span>
                                        }
                                        return null;
                                    })}
                                </div>
                                <strong>{returnPart(total, paid())}</strong> <br/>
                                <span style={{cssText:"font-size:1rem;font-weight:400"}}> 
                                    Products: {cartProducts[table_number]? showQT(cartProducts[table_number]): 0}
                                </span>
                            </div>
                            <div className="row mt-2">
                                <TaxTable taxes={cartProducts[table_number]? showTaxes(cartProducts[table_number]): 0} />
                            </div>
                        </div>
                        <div style={{width:"100%", textAlign:'center'}}>
                            <p style={{paddingTop:10}}>Thank you! Visit Again!</p>
                        </div>
                    </div>
                </div>
            </div>}
        </div>
    )
}
